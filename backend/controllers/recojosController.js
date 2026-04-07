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

// ── getAll (controlador) ───────────────────────────────────────────────────

exports.getAll = async (req, res) => {
  try {
    const sede_id = req.user.sede_id
    const [rows] = await db.query(`
      SELECT r.id, r.codigo, r.cliente, r.direccion, r.serie,
             r.tipo_equipo, r.estado, r.comentario, r.created_at,
             u.nombre as tecnico, u.id as tecnico_id
      FROM recojos r
      JOIN usuarios u ON r.tecnico_id = u.id
      WHERE u.sede_id = ?
      ORDER BY r.created_at DESC
    `, [sede_id])

    for (const r of rows) {
      r.fotos = await getFotos(db, "recojo", r.id)
    }

    res.json(rows)
  } catch (err) {
    console.error("❌ Error getAll recojos:", err.message)
    res.status(500).json({ message: "Error al obtener recojos", error: err.message })
  }
}

// ── create (controlador crea la orden) ────────────────────────────────────

exports.create = async (req, res) => {
  try {
    const { tecnico_id, cliente, direccion, serie, tipo_equipo } = req.body
    const registrado_por = req.user.id

    if (!tecnico_id || !tipo_equipo)
      return res.status(400).json({ message: "Técnico y tipo de equipo son obligatorios" })

    const [result] = await db.query(
      `INSERT INTO recojos (tecnico_id, cliente, direccion, serie, tipo_equipo, estado, registrado_por)
       VALUES (?, ?, ?, ?, ?, 'pendiente', ?)`,
      [tecnico_id, cliente || null, direccion || null, serie || null, tipo_equipo, registrado_por]
    )
    res.status(201).json({
      id: result.insertId, tecnico_id, cliente, direccion,
      serie: serie || null, tipo_equipo, estado: "pendiente"
    })
  } catch (err) {
    console.error("❌ Error create recojo:", err.message)
    res.status(500).json({ message: "Error al crear recojo", error: err.message })
  }
}

// ── confirmar (controlador) ────────────────────────────────────────────────

exports.confirmar = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const { id }         = req.params
    const { comentario } = req.body

    const codigo = await generarCodigo(conn, "RC", "recojos")

    await conn.query(
      "UPDATE recojos SET estado = 'recogido', comentario = ?, codigo = ? WHERE id = ?",
      [comentario || null, codigo, id]
    )
    await guardarFotos(conn, "recojo", Number(id), req.files || [])

    await conn.commit()
    res.json({ message: "Recojo confirmado", codigo })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error confirmar recojo:", err.message)
    res.status(500).json({ message: "Error al confirmar recojo", error: err.message })
  } finally {
    conn.release()
  }
}

// ── getMisRecojos (técnico) ────────────────────────────────────────────────

exports.getMisRecojos = async (req, res) => {
  try {
    const tecnico_id = req.user.id
    const [rows] = await db.query(`
      SELECT id, codigo, cliente, direccion, serie, tipo_equipo,
             estado, comentario, created_at
      FROM recojos
      WHERE tecnico_id = ?
      ORDER BY created_at DESC
    `, [tecnico_id])

    for (const r of rows) {
      r.fotos = await getFotos(db, "recojo", r.id)
    }

    res.json(rows)
  } catch (err) {
    console.error("❌ Error getMisRecojos:", err.message)
    res.status(500).json({ message: "Error al obtener recojos", error: err.message })
  }
}

// ── confirmarTecnico ───────────────────────────────────────────────────────

exports.confirmarTecnico = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { id }         = req.params
    const tecnico_id     = req.user.id
    const { comentario } = req.body

    const [[orden]] = await conn.query(
      "SELECT id FROM recojos WHERE id = ? AND tecnico_id = ? AND estado = 'pendiente'",
      [id, tecnico_id]
    )
    if (!orden) {
      await conn.rollback()
      return res.status(404).json({ message: "Orden no encontrada o ya confirmada" })
    }

    // Generar código RC-2026-00001
    const codigo = await generarCodigo(conn, "RC", "recojos")

    await conn.query(
      "UPDATE recojos SET estado = 'recogido', comentario = ?, codigo = ? WHERE id = ?",
      [comentario || null, codigo, id]
    )

    // Guardar hasta 5 fotos
    await guardarFotos(conn, "recojo", Number(id), req.files || [])

    await conn.commit()
    res.json({ message: "Recojo confirmado", codigo })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error confirmarTecnico:", err.message)
    res.status(500).json({ message: "Error al confirmar recojo", error: err.message })
  } finally {
    conn.release()
  }
}

// ── getAllAdmin ────────────────────────────────────────────────────────────

exports.getAllAdmin = async (req, res) => {
  try {
    const { sede_id } = req.query
    const [rows] = await db.query(`
      SELECT r.id, r.codigo, r.cliente, r.direccion, r.serie, r.tipo_equipo,
             r.estado, r.comentario, r.created_at,
             u.nombre as tecnico, u.id as tecnico_id,
             s.nombre as sede_nombre
      FROM recojos r
      JOIN usuarios u ON r.tecnico_id = u.id
      JOIN sedes s ON s.id = u.sede_id
      ${sede_id && sede_id !== "todas" ? "WHERE u.sede_id = ?" : ""}
      ORDER BY r.created_at DESC
    `, sede_id && sede_id !== "todas" ? [sede_id] : [])

    for (const r of rows) {
      r.fotos = await getFotos(db, "recojo", r.id)
    }

    res.json(rows)
  } catch (err) {
    console.error("❌ Error getAllAdmin recojos:", err.message)
    res.status(500).json({ message: "Error al obtener recojos", error: err.message })
  }
}