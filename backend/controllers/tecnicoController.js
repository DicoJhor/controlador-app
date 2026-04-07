const db = require("../config/db")

// ── Helpers ────────────────────────────────────────────────────────────────

async function generarCodigo(conn, prefijo, tabla) {
  const año    = new Date().getFullYear()
  const patron = `${prefijo}-${año}-%`
  const [[{ total }]] = await conn.query(
    `SELECT COUNT(*) as total FROM \`${tabla}\` WHERE codigo LIKE ?`, [patron]
  )
  return `${prefijo}-${año}-${String(Number(total) + 1).padStart(5, "0")}`
}

async function guardarFotos(conn, tipo, registro_id, archivos = []) {
  for (const file of archivos) {
    const ruta = file.path.replace(/\\/g, "/").replace(/^.*uploads\//, "")
    await conn.query(
      "INSERT INTO fotos_registro (tipo, registro_id, ruta) VALUES (?, ?, ?)",
      [tipo, registro_id, ruta]
    )
  }
}

async function getFotos(conn, tipo, registro_id) {
  const [rows] = await conn.query(
    "SELECT id, ruta FROM fotos_registro WHERE tipo = ? AND registro_id = ? ORDER BY id ASC",
    [tipo, registro_id]
  )
  return rows
}

// ── Inventario ─────────────────────────────────────────────────────────────

exports.getMiInventario = async (req, res) => {
  try {
    const tecnico_id = req.user.id
    const [rows] = await db.query(`
      SELECT
        a.id,
        p.id       AS producto_id,
        p.codigo,
        p.nombre,
        p.unidad,
        p.es_medible,
        a.cantidad AS asignado_unidades,
        CASE
          WHEN p.es_medible = 1 AND p.metros_por_unidad IS NOT NULL
          THEN a.cantidad * p.metros_por_unidad
          ELSE a.cantidad
        END             AS asignado,
        COALESCE(SUM(c.cantidad), 0) AS usado
      FROM asignaciones_tecnicos a
      JOIN productos p ON a.producto_id = p.id
      LEFT JOIN consumo_tecnico c
        ON c.producto_id = p.id AND c.tecnico_id = a.tecnico_id
      WHERE a.tecnico_id = ?
      GROUP BY a.id, p.id
    `, [tecnico_id])

    const inventario = rows.map(r => ({
      ...r,
      asignado:   parseFloat(r.asignado),
      asignado_unidades: parseFloat(r.asignado_unidades),
      metros_por_unidad: r.metros_por_unidad ? parseFloat(r.metros_por_unidad) : null,   
      usado:      parseFloat(r.usado),
      disponible: parseFloat(r.asignado) - parseFloat(r.usado),
      es_medible: Boolean(r.es_medible),
    }))

    res.json(inventario)
  } catch (err) {
    console.error("❌ getMiInventario:", err.message)
    res.status(500).json({ message: "Error al obtener inventario", error: err.message })
  }
}

// ── Historial ──────────────────────────────────────────────────────────────

exports.getMiHistorial = async (req, res) => {
  try {
    const tecnico_id = req.user.id
    const [rows] = await db.query(`
      SELECT
        ct.id, ct.fecha,
        p.nombre AS item, p.unidad, p.es_medible,
        ct.cantidad, ct.motivo,
        ct.descripcion AS comentario
      FROM consumo_tecnico ct
      JOIN productos p ON ct.producto_id = p.id
      WHERE ct.tecnico_id = ?
      ORDER BY ct.fecha DESC
    `, [tecnico_id])

    res.json(rows.map(r => ({
      ...r,
      cantidad:   parseFloat(r.cantidad),
      es_medible: Boolean(r.es_medible),
    })))
  } catch (err) {
    console.error("❌ getMiHistorial:", err.message)
    res.status(500).json({ message: "Error al obtener historial", error: err.message })
  }
}

// ── Registrar salida simple ────────────────────────────────────────────────

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
      "SELECT COALESCE(SUM(cantidad), 0) AS consumido FROM consumo_tecnico WHERE tecnico_id = ? AND producto_id = ?",
      [tecnico_id, producto_id]
    )
    const disponible = parseFloat(asignacion.cantidad) - parseFloat(consumido)
    if (parseFloat(cantidad) > disponible)
      return res.status(400).json({ message: `Stock insuficiente. Disponible: ${disponible}` })

    await db.query(
      "INSERT INTO consumo_tecnico (tecnico_id, producto_id, cantidad, motivo, descripcion, fecha) VALUES (?, ?, ?, ?, ?, NOW())",
      [tecnico_id, producto_id, cantidad, motivo, comentario || null]
    )
    res.json({ message: "Salida registrada correctamente" })
  } catch (err) {
    console.error("❌ registrarSalida:", err.message)
    res.status(500).json({ message: "Error al registrar salida", error: err.message })
  }
}

// ── Registrar avería (múltiples fotos + código) ────────────────────────────

exports.registrarSalidaMultiple = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const tecnico_id  = req.user.id
    const { comentario, nro_orden } = req.body
    const itemsParsed = typeof req.body.items === "string"
      ? JSON.parse(req.body.items)
      : (req.body.items || [])

    if (!itemsParsed || itemsParsed.length === 0)
      return res.status(400).json({ message: "Agregá al menos un material" })

    // Verificar stock para cada ítem
    for (const item of itemsParsed) {
      const [[asignacion]] = await conn.query(
          `SELECT a.cantidad, p.es_medible, p.metros_por_unidad
          FROM asignaciones_tecnicos a
          JOIN productos p ON p.id = a.producto_id
          WHERE a.tecnico_id = ? AND a.producto_id = ?`,
          [tecnico_id, item.producto_id]
        )
      if (!asignacion) {
        await conn.rollback()
        return res.status(400).json({ message: `No tenés el ítem ID ${item.producto_id} asignado` })
      }

      const [[{ consumido }]] = await conn.query(
        "SELECT COALESCE(SUM(cantidad), 0) AS consumido FROM consumo_tecnico WHERE tecnico_id = ? AND producto_id = ?",
        [tecnico_id, item.producto_id]
      )
      const esMedible        = Boolean(asignacion.es_medible)
      const mpu              = parseFloat(asignacion.metros_por_unidad) || 1
      const asignadoEfectivo = esMedible
        ? parseFloat(asignacion.cantidad) * mpu
        : parseFloat(asignacion.cantidad)
      const disponible = asignadoEfectivo - parseFloat(consumido)
      if (parseFloat(item.cantidad) > disponible) {
        await conn.rollback()
        return res.status(400).json({
          message: `Stock insuficiente para ítem ID ${item.producto_id}. Disponible: ${disponible}`
        })
      }
    }

    // Generar código AV-2026-00001
    const codigo = await generarCodigo(conn, "AV", "averias")

    // Crear avería
    const [result] = await conn.query(
      "INSERT INTO averias (codigo, tecnico_id, comentario, nro_orden, fecha) VALUES (?, ?, ?, ?, NOW())",
      [codigo, tecnico_id, comentario || null, nro_orden || null]
    )
    const averia_id = result.insertId

    // Guardar hasta 5 fotos
    await guardarFotos(conn, "averia", averia_id, req.files || [])

    // Registrar materiales y consumo
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
    res.json({ message: "Avería registrada correctamente", codigo })
  } catch (err) {
    await conn.rollback()
    console.error("❌ registrarSalidaMultiple:", err.message)
    res.status(500).json({ message: "Error al registrar avería", error: err.message })
  } finally {
    conn.release()
  }
}

// ── Averías para controlador ───────────────────────────────────────────────

exports.getAverias = async (req, res) => {
  try {
    const sede_id = req.user.sede_id
    const [rows] = await db.query(`
      SELECT
        av.id, av.codigo, av.nro_orden, av.fecha, av.comentario,
        u.nombre AS tecnico, u.id AS tecnico_id
      FROM averias av
      JOIN usuarios u ON u.id = av.tecnico_id
      WHERE u.sede_id = ?
      ORDER BY av.fecha DESC
    `, [sede_id])

    for (const av of rows) {
      const [mats] = await db.query(`
        SELECT p.nombre, p.unidad, p.es_medible, am.cantidad
        FROM averia_materiales am
        JOIN productos p ON p.id = am.producto_id
        WHERE am.averia_id = ?
      `, [av.id])
      av.materiales = mats.map(m => ({ ...m, cantidad: parseFloat(m.cantidad) }))
      av.fotos = await getFotos(db, "averia", av.id)
    }

    res.json(rows)
  } catch (err) {
    console.error("❌ getAverias:", err.message)
    res.status(500).json({ message: "Error al obtener averías", error: err.message })
  }
}

exports.getAveriasAdmin = async (req, res) => {
  try {
    const { sede_id } = req.query
    const filtro = sede_id && sede_id !== "todas" ? "WHERE u.sede_id = ?" : ""
    const params = sede_id && sede_id !== "todas" ? [sede_id] : []

    const [rows] = await db.query(`
      SELECT av.id, av.codigo, av.nro_orden, av.fecha, av.comentario,
             u.nombre AS tecnico, u.id AS tecnico_id,
             s.nombre AS sede_nombre
      FROM averias av
      JOIN usuarios u ON u.id = av.tecnico_id
      JOIN sedes s ON s.id = u.sede_id
      ${filtro}
      ORDER BY av.fecha DESC
    `, params)

    for (const av of rows) {
      const [mats] = await db.query(`
        SELECT p.nombre, p.unidad, p.es_medible, am.cantidad
        FROM averia_materiales am
        JOIN productos p ON p.id = am.producto_id
        WHERE am.averia_id = ?
      `, [av.id])
      av.materiales = mats.map(m => ({ ...m, cantidad: parseFloat(m.cantidad) }))
      av.fotos = await getFotos(db, "averia", av.id)
    }

    res.json(rows)
  } catch (err) {
    console.error("❌ getAveriasAdmin:", err.message)
    res.status(500).json({ message: "Error al obtener averías", error: err.message })
  }
}