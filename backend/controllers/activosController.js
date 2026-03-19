const db = require("../config/db")

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*, s.nombre AS sede_nombre
      FROM activos a
      JOIN sedes s ON a.sede_id = s.id
      ORDER BY s.nombre, a.area, a.nombre
    `)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ message: "Error del servidor", error: err.message })
  }
}

exports.getBySede = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM activos WHERE sede_id = ? ORDER BY area, nombre",
      [req.params.id]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ message: "Error del servidor", error: err.message })
  }
}

exports.create = async (req, res) => {
  try {
    const { sede_id, area, nombre, descripcion, nro_serie, estado } = req.body
    const [result] = await db.query(
      "INSERT INTO activos (sede_id, area, nombre, descripcion, nro_serie, estado) VALUES (?, ?, ?, ?, ?, ?)",
      [sede_id, area, nombre, descripcion ?? null, nro_serie ?? null, estado ?? "operativo"]
    )
    const [rows] = await db.query("SELECT * FROM activos WHERE id = ?", [result.insertId])
    res.status(201).json(rows[0])
  } catch (err) {
    res.status(500).json({ message: "Error del servidor", error: err.message })
  }
}

exports.update = async (req, res) => {
  try {
    const { nombre, descripcion, nro_serie, estado, sede_id, area } = req.body
    const rolUsuario = req.user.rol

    if ((sede_id !== undefined || area !== undefined) && rolUsuario !== "superadmin") {
      return res.status(403).json({ message: "Solo el superadmin puede mover activos entre sedes o áreas" })
    }

    await db.query(
      `UPDATE activos SET
        nombre      = ?,
        descripcion = ?,
        nro_serie   = ?,
        estado      = ?,
        sede_id     = COALESCE(?, sede_id),
        area        = COALESCE(?, area)
      WHERE id = ?`,
      [nombre, descripcion ?? null, nro_serie ?? null, estado, sede_id ?? null, area ?? null, req.params.id]
    )

    const [rows] = await db.query("SELECT * FROM activos WHERE id = ?", [req.params.id])
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ message: "Error del servidor", error: err.message })
  }
}

exports.remove = async (req, res) => {
  try {
    await db.query("DELETE FROM activos WHERE id = ?", [req.params.id])
    res.json({ message: "Activo eliminado" })
  } catch (err) {
    res.status(500).json({ message: "Error del servidor", error: err.message })
  }
}