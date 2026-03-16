const db = require("../config/db")

exports.getAll = async (req, res) => {
  try {
    const sede_id = req.user.sede_id
    const [rows] = await db.query(`
      SELECT r.id, r.cliente, r.direccion, r.serie, r.estado,
             r.comentario, r.foto, r.created_at,
             u.nombre as tecnico, u.id as tecnico_id
      FROM recojos r
      JOIN usuarios u ON r.tecnico_id = u.id
      WHERE u.sede_id = ?
      ORDER BY r.created_at DESC
    `, [sede_id])
    res.json(rows)
  } catch (err) {
    console.error("❌ Error getAll recojos:", err.message)
    res.status(500).json({ message: "Error al obtener recojos", error: err.message })
  }
}

exports.create = async (req, res) => {
  try {
    const { tecnico_id, cliente, direccion, serie } = req.body
    const registrado_por = req.user.id

    if (!tecnico_id || !serie)
      return res.status(400).json({ message: "Técnico y serie son obligatorios" })

    const [result] = await db.query(
      "INSERT INTO recojos (tecnico_id, cliente, direccion, serie, estado, registrado_por) VALUES (?, ?, ?, ?, 'pendiente', ?)",
      [tecnico_id, cliente || null, direccion || null, serie, registrado_por]
    )
    res.status(201).json({ id: result.insertId, tecnico_id, cliente, direccion, serie, estado: "pendiente" })
  } catch (err) {
    console.error("❌ Error create recojo:", err.message)
    res.status(500).json({ message: "Error al crear recojo", error: err.message })
  }
}

exports.confirmar = async (req, res) => {
  try {
    const { id } = req.params
    const { comentario } = req.body
    const foto = req.file ? req.file.filename : null

    await db.query(
      "UPDATE recojos SET estado = 'recogido', comentario = ?, foto = ? WHERE id = ?",
      [comentario || null, foto, id]
    )

    res.json({ message: "Recojo confirmado", foto })
  } catch (err) {
    console.error("❌ Error confirmar recojo:", err.message)
    res.status(500).json({ message: "Error al confirmar recojo", error: err.message })
  }
}

// Para técnico
exports.getMisRecojos = async (req, res) => {
  try {
    const tecnico_id = req.user.id
    const [rows] = await db.query(`
      SELECT id, cliente, direccion, serie, estado,
             comentario, foto, created_at
      FROM recojos
      WHERE tecnico_id = ?
      ORDER BY created_at DESC
    `, [tecnico_id])
    res.json(rows)
  } catch (err) {
    console.error("❌ Error getMisRecojos:", err.message)
    res.status(500).json({ message: "Error al obtener recojos", error: err.message })
  }
}

exports.confirmarTecnico = async (req, res) => {
  try {
    const { id } = req.params
    const tecnico_id = req.user.id
    const { comentario } = req.body
    const foto = req.file ? req.file.filename : null

    await db.query(
      "UPDATE recojos SET estado = 'recogido', comentario = ?, foto = ? WHERE id = ? AND tecnico_id = ?",
      [comentario || null, foto, id, tecnico_id]
    )

    res.json({ message: "Recojo confirmado", foto })
  } catch (err) {
    console.error("❌ Error confirmarTecnico:", err.message)
    res.status(500).json({ message: "Error al confirmar recojo", error: err.message })
  }
}