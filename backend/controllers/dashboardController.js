const db = require("../config/db")

exports.getStats = async (req, res) => {
  try {
    // Contar sedes activas
    const [[{ sedes }]] = await db.query(
      "SELECT COUNT(*) as sedes FROM sedes WHERE estado = 1"
    )

    // Contar usuarios activos
    const [[{ usuarios }]] = await db.query(
      "SELECT COUNT(*) as usuarios FROM usuarios WHERE estado = 1"
    )

    // Stock total de productos
    const [[{ stockTotal }]] = await db.query(
      "SELECT COALESCE(SUM(cantidad), 0) as stockTotal FROM stock_sede WHERE sede_id = 2"
    )

    // Movimientos de hoy (entradas + entregas)
    const [[{ movimientosHoy }]] = await db.query(`
      SELECT (
        SELECT COUNT(*) FROM entradas_stock WHERE DATE(fecha) = CURDATE()
      ) + (
        SELECT COUNT(*) FROM entregas_tecnicos WHERE DATE(fecha) = CURDATE()
      ) as movimientosHoy
    `)

    // Productos con stock bajo mínimo
    const [stockBajo] = await db.query(`
      SELECT
        p.nombre,
        ss.cantidad as stock,
        p.stock_minimo as minimo,
        s.nombre as sede,
        s.id as sede_id
      FROM productos p
      JOIN stock_sede ss ON ss.producto_id = p.id
      JOIN sedes s ON s.id = ss.sede_id
      WHERE p.stock_minimo > 0 AND ss.cantidad <= p.stock_minimo
      ORDER BY ss.cantidad ASC, s.nombre ASC
    `)

    // Últimos 5 movimientos (entradas + entregas combinados)
    const [movimientos] = await db.query(`
      SELECT 
        e.id, e.fecha, 'entrada' as tipo,
        p.nombre as item, e.cantidad,
        s.nombre as sede, u.nombre as usuario
      FROM entradas_stock e
      JOIN productos p ON e.producto_id = p.id
      LEFT JOIN usuarios u ON e.registrado_por = u.id
      LEFT JOIN sedes s ON s.id = (
        SELECT sede_id FROM stock_sede WHERE producto_id = p.id LIMIT 1
      )
      UNION ALL
      SELECT 
        et.id, et.fecha, 'salida' as tipo,
        p.nombre as item, et.cantidad,
        s.nombre as sede, u.nombre as usuario
      FROM entregas_tecnicos et
      JOIN productos p ON et.producto_id = p.id
      LEFT JOIN usuarios u ON et.tecnico_id = u.id
      LEFT JOIN usuarios uc ON et.registrado_por = uc.id
      LEFT JOIN sedes s ON s.id = (
        SELECT sede_id FROM asignaciones_tecnicos 
        WHERE tecnico_id = et.tecnico_id LIMIT 1
      )
      ORDER BY fecha DESC
      LIMIT 5
    `)

    // Estado por sede
    const [sedesEstado] = await db.query(`
      SELECT 
        s.id, s.nombre,
        COUNT(DISTINCT u.id) as tecnicos,
        COALESCE(SUM(ss.cantidad), 0) as items
      FROM sedes s
      LEFT JOIN usuarios u ON u.sede_id = s.id AND u.rol = 'tecnico'
      LEFT JOIN stock_sede ss ON ss.sede_id = s.id
      WHERE s.estado = 1
      GROUP BY s.id, s.nombre
    `)

    res.json({ sedes, usuarios, stockTotal, movimientosHoy, stockBajo, movimientos, sedesEstado })

  } catch (err) {
    console.error("❌ Error getStats:", err.message)
    res.status(500).json({ message: "Error al obtener estadísticas", error: err.message })
  }
}