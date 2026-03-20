const db   = require("../config/db")

const toRelative = (file) => {
  if (!file) return null
  const dest = file.destination.replace(/\\/g, "/").replace(/^uploads\/?/, "")
  return `${dest}/${file.filename}`
}

exports.getAll = async (req, res) => {
  try {
    const sede_id = req.user.sede_id
    const [rows] = await db.query(`
      SELECT a.id, a.cliente, a.direccion, a.comentario,
             a.foto_antes, a.foto_despues, a.estado, a.fecha,
             u.nombre as tecnico, u.id as tecnico_id
      FROM activaciones a
      JOIN usuarios u ON u.id = a.tecnico_id
      WHERE u.sede_id = ?
      ORDER BY a.fecha DESC
    `, [sede_id])

    // Cargar materiales de cada activación
    for (const a of rows) {
      const [mats] = await db.query(`
        SELECT p.nombre, p.unidad, am.cantidad
        FROM activacion_materiales am
        JOIN productos p ON p.id = am.producto_id
        WHERE am.activacion_id = ?
      `, [a.id])
      a.materiales = mats
    }

    res.json(rows)
  } catch (err) {
    console.error("❌ Error getAll activaciones:", err.message)
    res.status(500).json({ message: "Error al obtener activaciones", error: err.message })
  }
}

exports.getMias = async (req, res) => {
  try {
    const tecnico_id = req.user.id
    const [rows] = await db.query(`
      SELECT id, cliente, direccion, comentario,
             foto_antes, foto_despues, estado, fecha
      FROM activaciones
      WHERE tecnico_id = ?
      ORDER BY fecha DESC
    `, [tecnico_id])

    for (const a of rows) {
      const [mats] = await db.query(`
        SELECT p.nombre, p.unidad, am.cantidad
        FROM activacion_materiales am
        JOIN productos p ON p.id = am.producto_id
        WHERE am.activacion_id = ?
      `, [a.id])
      a.materiales = mats
    }

    res.json(rows)
  } catch (err) {
    console.error("❌ Error getMias activaciones:", err.message)
    res.status(500).json({ message: "Error al obtener activaciones", error: err.message })
  }
}

exports.create = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const tecnico_id = req.user.id
    const { cliente, direccion, comentario, items } = req.body
    const itemsParsed = items ? (typeof items === "string" ? JSON.parse(items) : items) : []

    const foto_antes   = toRelative(req.files?.foto_antes?.[0])
    const foto_despues = toRelative(req.files?.foto_despues?.[0])

    // Verificar stock de cada material
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

    // Crear activación
    const [result] = await conn.query(
      `INSERT INTO activaciones
         (tecnico_id, cliente, direccion, comentario, foto_antes, foto_despues, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'completado')`,
      [tecnico_id, cliente || null, direccion || null,
       comentario || null, foto_antes, foto_despues]
    )
    const activacion_id = result.insertId

    // Registrar materiales usados
    for (const item of itemsParsed) {
      await conn.query(
        "INSERT INTO activacion_materiales (activacion_id, producto_id, cantidad) VALUES (?, ?, ?)",
        [activacion_id, item.producto_id, item.cantidad]
      )
      await conn.query(
        "INSERT INTO consumo_tecnico (tecnico_id, producto_id, cantidad, motivo, descripcion, fecha) VALUES (?, ?, ?, 'instalacion', ?, NOW())",
        [tecnico_id, item.producto_id, item.cantidad, `Activación cliente: ${cliente || "—"}`]
      )
    }

    await conn.commit()

    const [[nueva]] = await conn.query(
      "SELECT * FROM activaciones WHERE id = ?", [activacion_id]
    )
    res.status(201).json(nueva)
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error create activacion:", err.message)
    res.status(500).json({ message: "Error al crear activación", error: err.message })
  } finally {
    conn.release()
  }
}