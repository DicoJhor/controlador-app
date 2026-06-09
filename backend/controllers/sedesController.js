const db = require("../config/db")

// GET /api/sedes
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, nombre, direccion, estado, puede_enviar FROM sedes"
    )
    res.json(rows)
  } catch (err) {
    console.error("❌ Error getAll sedes:", err.message)
    res.status(500).json({ message: "Error al obtener sedes", error: err.message })
  }
}

// POST /api/sedes
exports.create = async (req, res) => {
  try {
    const { nombre, direccion } = req.body
    if (!nombre) return res.status(400).json({ message: "El nombre es obligatorio" })

    const [result] = await db.query(
      "INSERT INTO sedes (nombre, direccion, estado) VALUES (?, ?, 1)",
      [nombre, direccion || null]
    )
    res.status(201).json({ id: result.insertId, nombre, direccion, estado: 1 })
  } catch (err) {
    console.error("❌ Error create sede:", err.message)
    res.status(500).json({ message: "Error al crear sede", error: err.message })
  }
}

// PUT /api/sedes/:id
exports.update = async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, direccion, estado, puede_enviar } = req.body
    await db.query(
      "UPDATE sedes SET nombre=?, direccion=?, estado=?, puede_enviar=? WHERE id=?",
      [nombre, direccion || null, estado, puede_enviar ?? 0, id]
    )
    res.json({ message: "Sede actualizada" })
  } catch (err) {
    console.error("❌ Error update sede:", err.message)
    res.status(500).json({ message: "Error al actualizar sede", error: err.message })
  }
}

// DELETE /api/sedes/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params
    await db.query("DELETE FROM sedes WHERE id = ?", [id])
    res.json({ message: "Sede eliminada" })
  } catch (err) {
    console.error("❌ Error remove sede:", err.message)
    res.status(500).json({ message: "Error al eliminar sede", error: err.message })
  }
}