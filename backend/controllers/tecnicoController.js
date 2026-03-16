const db = require("../config/db")

// INVENTARIO DEL TÉCNICO
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

// HISTORIAL DEL TÉCNICO
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

// REGISTRAR SALIDA (CONSUMO)
exports.registrarSalida = async (req, res) => {
  try {
    const tecnico_id = req.user.id
    const { producto_id, cantidad, motivo, comentario } = req.body

    if (!producto_id || !cantidad || !motivo)
      return res.status(400).json({ message: "Faltan campos obligatorios" })

    // Verificar que el técnico tiene suficiente stock asignado
    const [[asignacion]] = await db.query(
      "SELECT cantidad FROM asignaciones_tecnicos WHERE tecnico_id = ? AND producto_id = ?",
      [tecnico_id, producto_id]
    )

    if (!asignacion)
      return res.status(400).json({ message: "No tenés ese ítem asignado" })

    // Calcular consumo anterior
    const [[{ consumido }]] = await db.query(
      "SELECT COALESCE(SUM(cantidad), 0) as consumido FROM consumo_tecnico WHERE tecnico_id = ? AND producto_id = ?",
      [tecnico_id, producto_id]
    )

    const disponible = asignacion.cantidad - Number(consumido)

    if (Number(cantidad) > disponible)
      return res.status(400).json({ message: `Stock insuficiente. Disponible: ${disponible}` })

    // Registrar consumo
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

// RECOJOS DEL TÉCNICO
exports.getMisRecojos = async (req, res) => {
  try {
    const tecnico_id = req.user.id

    const [rows] = await db.query(`
      SELECT id, cliente, direccion, serie, estado, created_at
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

// CONFIRMAR RECOJO
exports.confirmarRecojo = async (req, res) => {
  try {
    const { id } = req.params
    const tecnico_id = req.user.id

    await db.query(
      "UPDATE recojos SET estado = 'recogido' WHERE id = ? AND tecnico_id = ?",
      [id, tecnico_id]
    )

    res.json({ message: "Recojo confirmado" })
  } catch (err) {
    console.error("❌ Error confirmarRecojo:", err.message)
    res.status(500).json({ message: "Error al confirmar recojo", error: err.message })
  }
}