const db = require("../config/db")
const bcrypt = require("bcrypt")

// GET /api/usuarios
exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, nombre, email, rol, sede_id, estado FROM usuarios"
    )
    res.json(rows)
  } catch (err) {
    console.error("❌ Error getAll:", err.message)
    res.status(500).json({ message: "Error al obtener usuarios", error: err.message })
  }
}

// POST /api/usuarios
exports.create = async (req, res) => {
  try {
    const { nombre, email, rol, sede_id, password } = req.body

    if (!nombre || !email || !rol || !password)
      return res.status(400).json({ message: "Faltan campos obligatorios" })

    const hashedPassword = await bcrypt.hash(password, 10)

    const [result] = await db.query(
      "INSERT INTO usuarios (nombre, email, rol, sede_id, password, estado) VALUES (?, ?, ?, ?, ?, 1)",
      [nombre, email, rol, sede_id || null, hashedPassword]
    )

    res.status(201).json({ id: result.insertId, nombre, email, rol, sede_id, estado: 1 })
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(400).json({ message: "El email ya está registrado" })
    console.error("❌ Error create:", err.message)
    res.status(500).json({ message: "Error al crear usuario", error: err.message })
  }
}

// PUT /api/usuarios/:id
exports.update = async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, email, rol, sede_id, estado } = req.body

    await db.query(
      "UPDATE usuarios SET nombre=?, email=?, rol=?, sede_id=?, estado=? WHERE id=?",
      [nombre, email, rol, sede_id || null, estado, id]
    )

    res.json({ message: "Usuario actualizado" })
  } catch (err) {
    console.error("❌ Error update:", err.message)
    res.status(500).json({ message: "Error al actualizar usuario", error: err.message })
  }
}

// DELETE /api/usuarios/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params
    await db.query("DELETE FROM usuarios WHERE id = ?", [id])
    res.json({ message: "Usuario eliminado" })
  } catch (err) {
    console.error("❌ Error remove:", err.message)
    res.status(500).json({ message: "Error al eliminar usuario", error: err.message })
  }
}