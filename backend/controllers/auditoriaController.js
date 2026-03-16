const db = require("../config/db")

exports.getMovimientos = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        e.id,
        e.fecha,
        'entrada' as tipo,
        p.nombre as item,
        e.cantidad,
        s.nombre as sede,
        u.nombre as usuario,
        u.rol,
        NULL as motivo,
        NULL as comentario
      FROM entradas_stock e
      JOIN productos p ON e.producto_id = p.id
      LEFT JOIN usuarios u ON e.registrado_por = u.id
      LEFT JOIN sedes s ON s.id = (
        SELECT sede_id FROM stock_sede WHERE producto_id = p.id LIMIT 1
      )

      UNION ALL

      SELECT
        et.id,
        et.fecha,
        'salida' as tipo,
        p.nombre as item,
        et.cantidad,
        s.nombre as sede,
        u.nombre as usuario,
        u.rol,
        NULL as motivo,
        NULL as comentario
      FROM entregas_tecnicos et
      JOIN productos p ON et.producto_id = p.id
      LEFT JOIN usuarios u ON et.tecnico_id = u.id
      LEFT JOIN sedes s ON s.id = (
        SELECT sede_id FROM asignaciones_tecnicos 
        WHERE tecnico_id = et.tecnico_id LIMIT 1
      )

      UNION ALL

      SELECT
        ct.id,
        ct.fecha,
        'salida' as tipo,
        p.nombre as item,
        ct.cantidad,
        s.nombre as sede,
        u.nombre as usuario,
        u.rol,
        ct.motivo,
        ct.descripcion as comentario
      FROM consumo_tecnico ct
      JOIN productos p ON ct.producto_id = p.id
      LEFT JOIN usuarios u ON ct.tecnico_id = u.id
      LEFT JOIN sedes s ON s.id = (
        SELECT sede_id FROM asignaciones_tecnicos 
        WHERE tecnico_id = ct.tecnico_id LIMIT 1
      )

      ORDER BY fecha DESC
    `)

    res.json(rows)
  } catch (err) {
    console.error("❌ Error getMovimientos:", err.message)
    res.status(500).json({ message: "Error al obtener movimientos", error: err.message })
  }
}