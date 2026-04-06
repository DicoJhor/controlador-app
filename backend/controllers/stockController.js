const db = require("../config/db")

// VER STOCK DE UNA SEDE
exports.verStock = async (req, res) => {
  try {
    const sede_id = req.user.sede_id || req.query.sede_id
    const [rows] = await db.query(`
      SELECT 
        ss.id, ss.cantidad,
        p.id as producto_id, p.nombre as producto,
        p.codigo, p.categoria, p.unidad, p.stock_minimo,
        p.es_medible, p.metros_por_unidad,
        CASE
          WHEN p.es_medible = 1 AND p.metros_por_unidad IS NOT NULL
          THEN ss.cantidad * p.metros_por_unidad
          ELSE NULL
        END as metros_disponibles
      FROM stock_sede ss
      JOIN productos p ON ss.producto_id = p.id
      WHERE ss.sede_id = ?
    `, [sede_id])
    res.json(rows)
  } catch (err) {
    console.error("❌ Error verStock:", err.message)
    res.status(500).json({ message: "Error al obtener stock", error: err.message })
  }
}

// REGISTRAR ENTRADA DE STOCK
exports.entradaStock = async (req, res) => {
  try {
    const { producto_id, cantidad, motivo, comentario } = req.body
    const sede_id = req.user.sede_id
    const registrado_por = req.user.id

    if (!producto_id || !cantidad || !motivo)
      return res.status(400).json({ message: "Faltan campos obligatorios" })

    await db.query(
      "INSERT INTO entradas_stock (producto_id, cantidad, fecha, registrado_por) VALUES (?, ?, NOW(), ?)",
      [producto_id, cantidad, registrado_por]
    )

    const [existing] = await db.query(
      "SELECT id FROM stock_sede WHERE sede_id = ? AND producto_id = ?",
      [sede_id, producto_id]
    )

    if (existing.length > 0) {
      await db.query(
        "UPDATE stock_sede SET cantidad = cantidad + ? WHERE sede_id = ? AND producto_id = ?",
        [cantidad, sede_id, producto_id]
      )
    } else {
      await db.query(
        "INSERT INTO stock_sede (sede_id, producto_id, cantidad) VALUES (?, ?, ?)",
        [sede_id, producto_id, cantidad]
      )
    }

    await db.query(
      "UPDATE productos SET stock_total = stock_total + ? WHERE id = ?",
      [cantidad, producto_id]
    )

    res.json({ message: "Entrada registrada correctamente" })
  } catch (err) {
    console.error("❌ Error entradaStock:", err.message)
    res.status(500).json({ message: "Error al registrar entrada", error: err.message })
  }
}

// REGISTRAR SALIDA SIMPLE
exports.salidaStock = async (req, res) => {
  try {
    const { producto_id, tecnico_id, cantidad, motivo, comentario } = req.body
    const sede_id = req.user.sede_id
    const registrado_por = req.user.id

    if (!producto_id || !tecnico_id || !cantidad || !motivo)
      return res.status(400).json({ message: "Faltan campos obligatorios" })

    const [[stockActual]] = await db.query(
      "SELECT cantidad FROM stock_sede WHERE sede_id = ? AND producto_id = ?",
      [sede_id, producto_id]
    )

    if (!stockActual || stockActual.cantidad < cantidad)
      return res.status(400).json({ message: "Stock insuficiente en la sede" })

    await db.query(
      "INSERT INTO entregas_tecnicos (producto_id, tecnico_id, cantidad, fecha, registrado_por) VALUES (?, ?, ?, NOW(), ?)",
      [producto_id, tecnico_id, cantidad, registrado_por]
    )

    await db.query(
      "UPDATE stock_sede SET cantidad = cantidad - ? WHERE sede_id = ? AND producto_id = ?",
      [cantidad, sede_id, producto_id]
    )

    const [asignacion] = await db.query(
      "SELECT id FROM asignaciones_tecnicos WHERE tecnico_id = ? AND producto_id = ? AND sede_id = ?",
      [tecnico_id, producto_id, sede_id]
    )

    if (asignacion.length > 0) {
      await db.query(
        "UPDATE asignaciones_tecnicos SET cantidad = cantidad + ? WHERE tecnico_id = ? AND producto_id = ? AND sede_id = ?",
        [cantidad, tecnico_id, producto_id, sede_id]
      )
    } else {
      await db.query(
        "INSERT INTO asignaciones_tecnicos (tecnico_id, producto_id, sede_id, cantidad, fecha) VALUES (?, ?, ?, ?, NOW())",
        [tecnico_id, producto_id, sede_id, cantidad]
      )
    }

    res.json({ message: "Salida registrada correctamente" })
  } catch (err) {
    console.error("❌ Error salidaStock:", err.message)
    res.status(500).json({ message: "Error al registrar salida", error: err.message })
  }
}

// REGISTRAR SALIDA MÚLTIPLE
exports.salidaStockMultiple = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { tecnico_id, motivo, comentario, items } = req.body
    const sede_id = req.user.sede_id
    const registrado_por = req.user.id

    if (!tecnico_id || !motivo || !items || items.length === 0)
      return res.status(400).json({ message: "Faltan campos obligatorios" })

    // Verificar stock antes de procesar
    for (const item of items) {
      const [[stockActual]] = await conn.query(
        "SELECT cantidad FROM stock_sede WHERE sede_id = ? AND producto_id = ?",
        [sede_id, item.producto_id]
      )
      if (!stockActual || stockActual.cantidad < item.cantidad)
        return res.status(400).json({ message: `Stock insuficiente para el ítem ID ${item.producto_id}` })

      const [[prod]] = await conn.query(
        "SELECT es_medible, metros_por_unidad FROM productos WHERE id = ?",
        [item.producto_id]
      )
      if (prod?.es_medible && item.metros !== undefined) {
        const [[stockSede]] = await conn.query(
          "SELECT cantidad FROM stock_sede WHERE sede_id = ? AND producto_id = ?",
          [sede_id, item.producto_id]
        )
        const metrosDisponibles = (stockSede?.cantidad ?? 0) * (prod.metros_por_unidad ?? 0)
        if (metrosDisponibles < item.metros)
          return res.status(400).json({ message: `Metros insuficientes para el ítem ID ${item.producto_id}. Disponibles: ${metrosDisponibles}m` })
      }
    } // cierre for verificación

    // Procesar cada ítem
    for (const item of items) {
      await conn.query(
        "INSERT INTO entregas_tecnicos (producto_id, tecnico_id, cantidad, fecha, registrado_por) VALUES (?, ?, ?, NOW(), ?)",
        [item.producto_id, tecnico_id, item.cantidad, registrado_por]
      )

      await conn.query(
        "UPDATE stock_sede SET cantidad = cantidad - ? WHERE sede_id = ? AND producto_id = ?",
        [item.cantidad, sede_id, item.producto_id]
      )

      const [asignacion] = await conn.query(
        "SELECT id FROM asignaciones_tecnicos WHERE tecnico_id = ? AND producto_id = ? AND sede_id = ?",
        [tecnico_id, item.producto_id, sede_id]
      )

      if (asignacion.length > 0) {
        await conn.query(
          "UPDATE asignaciones_tecnicos SET cantidad = cantidad + ? WHERE tecnico_id = ? AND producto_id = ? AND sede_id = ?",
          [item.cantidad, tecnico_id, item.producto_id, sede_id]
        )
      } else {
        await conn.query(
          "INSERT INTO asignaciones_tecnicos (tecnico_id, producto_id, sede_id, cantidad, fecha) VALUES (?, ?, ?, ?, NOW())",
          [tecnico_id, item.producto_id, sede_id, item.cantidad]
        )
      }
    } // cierre for procesamiento

    await conn.commit()
    res.json({ message: "Salida múltiple registrada correctamente" })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error salidaStockMultiple:", err.message)
    res.status(500).json({ message: "Error al registrar salida", error: err.message })
  } finally {
    conn.release()
  }
}

// STATS DEL CONTROLADOR
exports.statsControlador = async (req, res) => {
  try {
    const sede_id = req.user.sede_id

    const [[{ tecnicos }]] = await db.query(
      "SELECT COUNT(*) as tecnicos FROM usuarios WHERE sede_id = ? AND rol = 'tecnico' AND estado = 1",
      [sede_id]
    )

    const [[{ itemsEnSede }]] = await db.query(
      "SELECT COALESCE(SUM(cantidad), 0) as itemsEnSede FROM stock_sede WHERE sede_id = ?",
      [sede_id]
    )

    const [[{ movimientosHoy }]] = await db.query(`
      SELECT (
        SELECT COUNT(*) FROM entradas_stock 
        WHERE registrado_por = ? AND DATE(fecha) = CURDATE()
      ) + (
        SELECT COUNT(*) FROM entregas_tecnicos 
        WHERE registrado_por = ? AND DATE(fecha) = CURDATE()
      ) as movimientosHoy
    `, [req.user.id, req.user.id])

    const [stockBajo] = await db.query(`
      SELECT p.nombre, ss.cantidad as stock, p.stock_minimo as minimo
      FROM stock_sede ss
      JOIN productos p ON ss.producto_id = p.id
      WHERE ss.sede_id = ? AND p.stock_minimo > 0 AND ss.cantidad <= p.stock_minimo
    `, [sede_id])

    const [ultimasSalidas] = await db.query(`
      SELECT et.id, et.fecha, p.nombre as item, et.cantidad,
             u.nombre as tecnico
      FROM entregas_tecnicos et
      JOIN productos p ON et.producto_id = p.id
      JOIN usuarios u ON et.tecnico_id = u.id
      WHERE et.registrado_por = ?
      ORDER BY et.fecha DESC LIMIT 5
    `, [req.user.id])

    const [misTecnicos] = await db.query(`
      SELECT u.id, u.nombre, u.email, u.estado, u.sede_id,
        COALESCE(SUM(a.cantidad), 0) as itemsAsignados
      FROM usuarios u
      LEFT JOIN asignaciones_tecnicos a ON a.tecnico_id = u.id AND a.sede_id = ?
      WHERE u.sede_id = ? AND u.rol = 'tecnico'
      GROUP BY u.id
    `, [sede_id, sede_id])

    res.json({ tecnicos, itemsEnSede, movimientosHoy, stockBajo, ultimasSalidas, misTecnicos })
  } catch (err) {
    console.error("❌ Error statsControlador:", err.message)
    res.status(500).json({ message: "Error al obtener stats", error: err.message })
  }
}

// AUDITORIA DE LA SEDE
exports.auditoriaControlador = async (req, res) => {
  try {
    const sede_id = req.user.sede_id

    const [rows] = await db.query(`
      SELECT et.id, et.fecha, 'salida' as tipo,
        p.nombre as item, et.cantidad,
        u.nombre as tecnico, u.id as tecnico_id,
        NULL as motivo, NULL as comentario
      FROM entregas_tecnicos et
      JOIN productos p ON et.producto_id = p.id
      JOIN usuarios u ON et.tecnico_id = u.id
      WHERE u.sede_id = ?

      UNION ALL

      SELECT ct.id, ct.fecha, 'consumo' as tipo,
        p.nombre as item, ct.cantidad,
        u.nombre as tecnico, u.id as tecnico_id,
        ct.motivo, ct.descripcion as comentario
      FROM consumo_tecnico ct
      JOIN productos p ON ct.producto_id = p.id
      JOIN usuarios u ON ct.tecnico_id = u.id
      WHERE u.sede_id = ?

      ORDER BY fecha DESC
    `, [sede_id, sede_id])

    res.json(rows)
  } catch (err) {
    console.error("❌ Error auditoriaControlador:", err.message)
    res.status(500).json({ message: "Error al obtener auditoría", error: err.message })
  }
}