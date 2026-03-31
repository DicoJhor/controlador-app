const db = require("../config/db")

exports.getMiInventario = async (req, res) => {
  try {
    const tecnico_id = req.user.id
    const [rows] = await db.query(`
      SELECT 
        a.id, p.id as producto_id,
        p.codigo, p.nombre, p.unidad,
        a.cantidad as asignado,
        COALESCE(SUM(c.cantidad), 0) as usado
      FROM asignaciones_tecnicos a
      JOIN productos p ON a.producto_id = p.id
      LEFT JOIN consumo_tecnico c ON c.producto_id = p.id AND c.tecnico_id = a.tecnico_id
      WHERE a.tecnico_id = ?
      GROUP BY a.id, p.id
    `, [tecnico_id])

    const inventario = rows.map(r => ({
      ...r,
      usado:      Number(r.usado),
      disponible: r.asignado - Number(r.usado),
    }))

    res.json(inventario)
  } catch (err) {
    console.error("❌ Error getMiInventario:", err.message)
    res.status(500).json({ message: "Error al obtener inventario", error: err.message })
  }
}

exports.getMiHistorial = async (req, res) => {
  try {
    const tecnico_id = req.user.id
    const [rows] = await db.query(`
      SELECT 
        ct.id, ct.fecha,
        p.nombre as item, p.unidad,
        ct.cantidad, ct.motivo,
        ct.descripcion as comentario
      FROM consumo_tecnico ct
      JOIN productos p ON ct.producto_id = p.id
      WHERE ct.tecnico_id = ?
      ORDER BY ct.fecha DESC
    `, [tecnico_id])
    res.json(rows)
  } catch (err) {
    console.error("❌ Error getMiHistorial:", err.message)
    res.status(500).json({ message: "Error al obtener historial", error: err.message })
  }
}

exports.registrarSalida = async (req, res) => {
  try {
    const tecnico_id = req.user.id
    const { producto_id, cantidad, motivo, comentario } = req.body

    if (!producto_id || !cantidad || !motivo)
      return res.status(400).json({ message: "Faltan campos obligatorios" })

    const [[asignacion]] = await db.query(
      "SELECT cantidad FROM asignaciones_tecnicos WHERE tecnico_id = ? AND producto_id = ?",
      [tecnico_id, producto_id]
    )
    if (!asignacion)
      return res.status(400).json({ message: "No tenés ese ítem asignado" })

    const [[{ consumido }]] = await db.query(
      "SELECT COALESCE(SUM(cantidad), 0) as consumido FROM consumo_tecnico WHERE tecnico_id = ? AND producto_id = ?",
      [tecnico_id, producto_id]
    )
    const disponible = asignacion.cantidad - Number(consumido)
    if (Number(cantidad) > disponible)
      return res.status(400).json({ message: `Stock insuficiente. Disponible: ${disponible}` })

    await db.query(
      "INSERT INTO consumo_tecnico (tecnico_id, producto_id, cantidad, motivo, descripcion, fecha) VALUES (?, ?, ?, ?, ?, NOW())",
      [tecnico_id, producto_id, cantidad, motivo, comentario || null]
    )
    res.json({ message: "Salida registrada correctamente" })
  } catch (err) {
    console.error("❌ Error registrarSalida:", err.message)
    res.status(500).json({ message: "Error al registrar salida", error: err.message })
  }
}

// REGISTRAR AVERÍA MÚLTIPLE
exports.registrarSalidaMultiple = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const tecnico_id  = req.user.id
    const { comentario, items } = req.body
    const itemsParsed = typeof items === "string" ? JSON.parse(items) : items

    if (!itemsParsed || itemsParsed.length === 0)
      return res.status(400).json({ message: "Agregá al menos un material" })

    // Verificar stock
    for (const item of itemsParsed) {
      const [[asignacion]] = await conn.query(
        "SELECT cantidad FROM asignaciones_tecnicos WHERE tecnico_id = ? AND producto_id = ?",
        [tecnico_id, item.producto_id]
      )
      if (!asignacion)
        return res.status(400).json({ message: `No tenés el ítem ID ${item.producto_id} asignado` })

      const [[{ consumido }]] = await conn.query(
        "SELECT COALESCE(SUM(cantidad), 0) as consumido FROM consumo_tecnico WHERE tecnico_id = ? AND producto_id = ?",
        [tecnico_id, item.producto_id]
      )
      const disponible = asignacion.cantidad - Number(consumido)
      if (Number(item.cantidad) > disponible)
        return res.status(400).json({ message: `Stock insuficiente para ítem ID ${item.producto_id}. Disponible: ${disponible}` })
    }

    // Guardar foto si existe
    const foto = req.file
      ? req.file.destination.replace(/\\/g, "/").replace(/^uploads\/?/, "") + "/" + req.file.filename
      : null

    // Crear registro de avería
    const [result] = await conn.query(
      "INSERT INTO averias (tecnico_id, comentario, foto) VALUES (?, ?, ?)",
      [tecnico_id, comentario || null, foto]
    )
    const averia_id = result.insertId

    // Registrar materiales
    for (const item of itemsParsed) {
      await conn.query(
        "INSERT INTO averia_materiales (averia_id, producto_id, cantidad) VALUES (?, ?, ?)",
        [averia_id, item.producto_id, item.cantidad]
      )
      await conn.query(
        "INSERT INTO consumo_tecnico (tecnico_id, producto_id, cantidad, motivo, descripcion, fecha) VALUES (?, ?, ?, 'averia', ?, NOW())",
        [tecnico_id, item.producto_id, item.cantidad, comentario || null]
      )
    }

    await conn.commit()
    res.json({ message: "Avería registrada correctamente" })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error registrarSalidaMultiple:", err.message)
    res.status(500).json({ message: "Error al registrar avería", error: err.message })
  } finally {
    conn.release()
  }
}

// AVERÍAS para el controlador
exports.getAverias = async (req, res) => {
  try {
    const sede_id = req.user.sede_id
    const [rows] = await db.query(`
      SELECT
        av.id, av.fecha, av.comentario, av.foto,
        u.nombre as tecnico, u.id as tecnico_id
      FROM averias av
      JOIN usuarios u ON u.id = av.tecnico_id
      WHERE u.sede_id = ?
      ORDER BY av.fecha DESC
    `, [sede_id])

    for (const av of rows) {
      const [mats] = await db.query(`
        SELECT p.nombre, p.unidad, am.cantidad
        FROM averia_materiales am
        JOIN productos p ON p.id = am.producto_id
        WHERE am.averia_id = ?
      `, [av.id])
      av.materiales = mats
    }

    res.json(rows)
  } catch (err) {
    console.error("❌ Error getAverias:", err.message)
    res.status(500).json({ message: "Error al obtener averías", error: err.message })
  }
}
exports.getAveriasAdmin = async (req, res) => {
  try {
    const { sede_id } = req.query
    const [rows] = await db.query(`
      SELECT av.id, av.fecha, av.comentario, av.foto,
             u.nombre as tecnico, u.id as tecnico_id,
             s.nombre as sede_nombre
      FROM averias av
      JOIN usuarios u ON u.id = av.tecnico_id
      JOIN sedes s ON s.id = u.sede_id
      ${sede_id && sede_id !== "todas" ? "WHERE u.sede_id = ?" : ""}
      ORDER BY av.fecha DESC
    `, sede_id && sede_id !== "todas" ? [sede_id] : [])

    for (const av of rows) {
      const [mats] = await db.query(`
        SELECT p.nombre, p.unidad, am.cantidad
        FROM averia_materiales am
        JOIN productos p ON p.id = am.producto_id
        WHERE am.averia_id = ?
      `, [av.id])
      av.materiales = mats
    }

    res.json(rows)
  } catch (err) {
    console.error("❌ Error getAveriasAdmin:", err.message)
    res.status(500).json({ message: "Error al obtener averías", error: err.message })
  }
}