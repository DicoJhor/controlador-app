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
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { producto_id, cantidad, motivo, comentario } = req.body
    const sede_id = req.user.sede_id
    const registrado_por = req.user.id

    if (!producto_id || !cantidad || !motivo)
      return res.status(400).json({ message: "Faltan campos obligatorios" })

    await conn.query(
      "INSERT INTO entradas_stock (producto_id, cantidad, fecha, registrado_por) VALUES (?, ?, NOW(), ?)",
      [producto_id, cantidad, registrado_por]
    )

    const [existing] = await conn.query(
      "SELECT id FROM stock_sede WHERE sede_id = ? AND producto_id = ?",
      [sede_id, producto_id]
    )

    if (existing.length > 0) {
      await conn.query(
        "UPDATE stock_sede SET cantidad = cantidad + ? WHERE sede_id = ? AND producto_id = ?",
        [cantidad, sede_id, producto_id]
      )
    } else {
      await conn.query(
        "INSERT INTO stock_sede (sede_id, producto_id, cantidad) VALUES (?, ?, ?)",
        [sede_id, producto_id, cantidad]
      )
    }

    await conn.query(
      "UPDATE productos SET stock_total = stock_total + ? WHERE id = ?",
      [cantidad, producto_id]
    )

    await conn.commit()
    res.json({ message: "Entrada registrada correctamente" })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error entradaStock:", err.message)
    res.status(500).json({ message: "Error al registrar entrada", error: err.message })
  } finally {
    conn.release()
  }
}

// REGISTRAR SALIDA SIMPLE
exports.salidaStock = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { producto_id, tecnico_id, cantidad, motivo, comentario } = req.body
    const sede_id = req.user.sede_id
    const registrado_por = req.user.id

    if (!producto_id || !tecnico_id || !cantidad || !motivo)
      return res.status(400).json({ message: "Faltan campos obligatorios" })

    const [[stockActual]] = await conn.query(
      "SELECT cantidad FROM stock_sede WHERE sede_id = ? AND producto_id = ?",
      [sede_id, producto_id]
    )

    if (!stockActual || stockActual.cantidad < cantidad) {
      await conn.rollback()
      return res.status(400).json({ message: "Stock insuficiente en la sede" })
    }

    await conn.query(
      "INSERT INTO entregas_tecnicos (producto_id, tecnico_id, cantidad, fecha, registrado_por) VALUES (?, ?, ?, NOW(), ?)",
      [producto_id, tecnico_id, cantidad, registrado_por]
    )

    await conn.query(
      "UPDATE stock_sede SET cantidad = cantidad - ? WHERE sede_id = ? AND producto_id = ?",
      [cantidad, sede_id, producto_id]
    )

    const [asignacion] = await conn.query(
      "SELECT id FROM asignaciones_tecnicos WHERE tecnico_id = ? AND producto_id = ? AND sede_id = ?",
      [tecnico_id, producto_id, sede_id]
    )

    if (asignacion.length > 0) {
      await conn.query(
        "UPDATE asignaciones_tecnicos SET cantidad = cantidad + ? WHERE tecnico_id = ? AND producto_id = ? AND sede_id = ?",
        [cantidad, tecnico_id, producto_id, sede_id]
      )
    } else {
      await conn.query(
        "INSERT INTO asignaciones_tecnicos (tecnico_id, producto_id, sede_id, cantidad, fecha) VALUES (?, ?, ?, ?, NOW())",
        [tecnico_id, producto_id, sede_id, cantidad]
      )
    }

    await conn.commit()
    res.json({ message: "Salida registrada correctamente" })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error salidaStock:", err.message)
    res.status(500).json({ message: "Error al registrar salida", error: err.message })
  } finally {
    conn.release()
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

      UNION ALL

      SELECT sd.id, sd.fecha, 'salida_directa' as tipo,
        p.nombre as item, sd.cantidad,
        NULL as tecnico, NULL as tecnico_id,
        NULL as motivo, sd.comentario
      FROM salidas_directas sd
      JOIN productos p ON sd.producto_id = p.id
      WHERE sd.sede_id = ?

      ORDER BY fecha DESC
    `, [sede_id, sede_id, sede_id])

    res.json(rows)
  } catch (err) {
    console.error("❌ Error auditoriaControlador:", err.message)
    res.status(500).json({ message: "Error al obtener auditoría", error: err.message })
  }
}

// ASIGNACIÓN COMPLETA (items normales + ONUs) en una sola transacción
exports.asignarCompleto = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { tecnico_id, motivo, comentario, items, onu_ids } = req.body
    const sede_id        = req.user.sede_id
    const registrado_por = req.user.id

    if (!tecnico_id)
      return res.status(400).json({ message: "Faltan campos obligatorios" })

    // ── Items normales ──────────────────────────────────────────────────
    for (const item of (items ?? [])) {
      const [[stockActual]] = await conn.query(
        "SELECT cantidad FROM stock_sede WHERE sede_id = ? AND producto_id = ?",
        [sede_id, item.producto_id]
      )
      if (!stockActual || stockActual.cantidad < item.cantidad) {
        await conn.rollback()
        return res.status(400).json({ message: `Stock insuficiente para producto ID ${item.producto_id}` })
      }

      await conn.query(
        "INSERT INTO entregas_tecnicos (producto_id, tecnico_id, cantidad, fecha, registrado_por) VALUES (?, ?, ?, NOW(), ?)",
        [item.producto_id, tecnico_id, item.cantidad, registrado_por]
      )
      await conn.query(
        "UPDATE stock_sede SET cantidad = cantidad - ? WHERE sede_id = ? AND producto_id = ?",
        [item.cantidad, sede_id, item.producto_id]
      )

      const [asig] = await conn.query(
        "SELECT id FROM asignaciones_tecnicos WHERE tecnico_id = ? AND producto_id = ? AND sede_id = ?",
        [tecnico_id, item.producto_id, sede_id]
      )
      if (asig.length > 0) {
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
    }

    // ── ONUs ────────────────────────────────────────────────────────────
    for (const onu_id of (onu_ids ?? [])) {
      const [[onu]] = await conn.query(
        "SELECT id, producto_id FROM onus WHERE id = ? AND sede_id = ? AND tecnico_id IS NULL AND activacion_id IS NULL",
        [onu_id, sede_id]
      )
      if (!onu) {
        await conn.rollback()
        return res.status(400).json({ message: `ONU ID ${onu_id} no disponible` })
      }

      await conn.query("UPDATE onus SET tecnico_id = ? WHERE id = ?", [tecnico_id, onu_id])

      await conn.query(
        "INSERT INTO entregas_tecnicos (producto_id, tecnico_id, cantidad, fecha, registrado_por) VALUES (?, ?, 1, NOW(), ?)",
        [onu.producto_id, tecnico_id, registrado_por]
      )
      await conn.query(
        "UPDATE stock_sede SET cantidad = cantidad - 1 WHERE sede_id = ? AND producto_id = ?",
        [sede_id, onu.producto_id]
      )

      const [asig] = await conn.query(
        "SELECT id FROM asignaciones_tecnicos WHERE tecnico_id = ? AND producto_id = ? AND sede_id = ?",
        [tecnico_id, onu.producto_id, sede_id]
      )
      if (asig.length > 0) {
        await conn.query(
          "UPDATE asignaciones_tecnicos SET cantidad = cantidad + 1 WHERE tecnico_id = ? AND producto_id = ? AND sede_id = ?",
          [tecnico_id, onu.producto_id, sede_id]
        )
      } else {
        await conn.query(
          "INSERT INTO asignaciones_tecnicos (tecnico_id, producto_id, sede_id, cantidad, fecha) VALUES (?, ?, ?, 1, NOW())",
          [tecnico_id, onu.producto_id, sede_id]
        )
      }
    }

    await conn.commit()
    res.json({ message: "Asignación registrada correctamente" })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error asignarCompleto:", err.message)
    res.status(500).json({ message: "Error al registrar asignación", error: err.message })
  } finally {
    conn.release()
  }
}

// SALIDA DIRECTA (sin técnico)
exports.salidaDirecta = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { comentario, items, onu_ids } = req.body
    const sede_id        = req.user.sede_id
    const registrado_por = req.user.id

    const tieneItems = Array.isArray(items)   && items.length   > 0
    const tieneOnus  = Array.isArray(onu_ids) && onu_ids.length > 0

    if (!comentario?.trim() || (!tieneItems && !tieneOnus))
      return res.status(400).json({ message: "Faltan campos obligatorios" })

    for (const item of (items ?? [])) {
      const [[stockActual]] = await conn.query(
        "SELECT cantidad FROM stock_sede WHERE sede_id = ? AND producto_id = ?",
        [sede_id, item.producto_id]
      )
      if (!stockActual || stockActual.cantidad < item.cantidad) {
        await conn.rollback()
        return res.status(400).json({ message: `Stock insuficiente para producto ID ${item.producto_id}` })
      }

      await conn.query(
        "UPDATE stock_sede SET cantidad = cantidad - ? WHERE sede_id = ? AND producto_id = ?",
        [item.cantidad, sede_id, item.producto_id]
      )

      await conn.query(
        `INSERT INTO salidas_directas (producto_id, sede_id, cantidad, comentario, registrado_por, fecha)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [item.producto_id, sede_id, item.cantidad, comentario, registrado_por]
      )
    }

    // ONUs
    for (const onu_id of (onu_ids ?? [])) {
      const [[onu]] = await conn.query(
        "SELECT id, producto_id FROM onus WHERE id = ? AND sede_id = ? AND tecnico_id IS NULL AND activacion_id IS NULL AND salida_directa = 0",
        [onu_id, sede_id]
      )
      if (!onu) {
        await conn.rollback()
        return res.status(400).json({ message: `ONU ID ${onu_id} no disponible` })
      }

      await conn.query("UPDATE onus SET salida_directa = 1 WHERE id = ?", [onu_id])

      await conn.query(
        `INSERT INTO salidas_directas (producto_id, sede_id, cantidad, comentario, registrado_por, fecha)
         VALUES (?, ?, 1, ?, ?, NOW())`,
        [onu.producto_id, sede_id, comentario, registrado_por]
      )

      await conn.query(
        "UPDATE stock_sede SET cantidad = cantidad - 1 WHERE sede_id = ? AND producto_id = ?",
        [sede_id, onu.producto_id]
      )
    }

    await conn.commit()
    res.json({ message: "Salida directa registrada correctamente" })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error salidaDirecta:", err.message)
    res.status(500).json({ message: "Error al registrar salida directa", error: err.message })
  } finally {
    conn.release()
  }
}
// INVENTARIO ACTUAL DE UN TÉCNICO
exports.inventarioTecnico = async (req, res) => {
  try {
    const { id }    = req.params
    const sede_id   = req.user.sede_id

    const [rows] = await db.query(`
      SELECT
        a.id,
        p.id       AS producto_id,
        p.codigo,
        p.nombre,
        p.unidad,
        p.es_medible,
        p.categoria,
        p.metros_por_unidad,
        a.cantidad AS asignado_unidades,
        CASE
          WHEN p.es_medible = 1 AND p.metros_por_unidad IS NOT NULL
          THEN a.cantidad * p.metros_por_unidad
          ELSE a.cantidad
        END AS asignado,
        COALESCE(SUM(c.cantidad), 0) AS usado
      FROM asignaciones_tecnicos a
      JOIN productos p ON a.producto_id = p.id
      LEFT JOIN consumo_tecnico c
        ON c.producto_id = p.id AND c.tecnico_id = a.tecnico_id
      WHERE a.tecnico_id = ?
      GROUP BY a.id, p.id
    `, [id])

    const items = rows.map(r => ({
      ...r,
      asignado:          parseFloat(r.asignado),
      asignado_unidades: parseFloat(r.asignado_unidades),
      metros_por_unidad: r.metros_por_unidad ? parseFloat(r.metros_por_unidad) : null,
      usado:             parseFloat(r.usado),
      disponible:        parseFloat(r.asignado) - parseFloat(r.usado),
      es_medible:        Boolean(r.es_medible),
    }))

    const [onus] = await db.query(`
      SELECT
        o.id,
        o.codigo_pon,
        p.id     AS producto_id,
        p.nombre,
        p.codigo AS codigo_producto
      FROM onus o
      JOIN productos p ON p.id = o.producto_id
      WHERE o.tecnico_id = ?
        AND o.activacion_id IS NULL
        AND o.averia_id IS NULL
      ORDER BY o.id ASC
    `, [id])

    res.json({ items, onus })
  } catch (err) {
    console.error("❌ inventarioTecnico:", err.message)
    res.status(500).json({ message: err.message })
  }
}

// ACTIVIDAD DE HOY DE UN TÉCNICO (órdenes completadas + materiales usados)
exports.actividadHoyTecnico = async (req, res) => {
  try {
    const { id } = req.params
    const sede_id = req.user.sede_id

    const [ordenes] = await db.query(`
      SELECT 
        o.id, o.nro_orden, o.abonado, o.direccion, o.servicio,
        o.completada_en,
        CASE
          WHEN o.activacion_id IS NOT NULL THEN 'activacion'
          WHEN o.averia_id     IS NOT NULL THEN 'averia'
          ELSE 'otro'
        END as tipo,
        o.activacion_id, o.averia_id
      FROM ordenes_servicio o
      WHERE o.tecnico_id = ?
        AND o.sede_id = ?
        AND DATE(o.completada_en) = CURDATE()
        AND o.estado_app = 'completada'
      ORDER BY o.completada_en DESC
    `, [id, sede_id])

    // Para cada orden, traer los materiales usados
    for (const orden of ordenes) {
      if (orden.tipo === 'activacion' && orden.activacion_id) {
        const [mats] = await db.query(`
          SELECT p.nombre, p.unidad, am.cantidad
          FROM activacion_materiales am
          JOIN productos p ON am.producto_id = p.id
          WHERE am.activacion_id = ?
        `, [orden.activacion_id])
        orden.materiales = mats
      } else if (orden.tipo === 'averia' && orden.averia_id) {
        const [mats] = await db.query(`
          SELECT p.nombre, p.unidad, am.cantidad
          FROM averia_materiales am
          JOIN productos p ON am.producto_id = p.id
          WHERE am.averia_id = ?
        `, [orden.averia_id])
        orden.materiales = mats
      } else {
        orden.materiales = []
      }
      // limpiar campos internos
      delete orden.activacion_id
      delete orden.averia_id
    }

    res.json(ordenes)
  } catch (err) {
    console.error("❌ actividadHoyTecnico:", err.message)
    res.status(500).json({ message: err.message })
  console.error("❌ actividadHoyTecnico:", err.message)
    res.status(500).json({ message: err.message })
  }
}

// HISTORIAL DE ASIGNACIONES A TÉCNICOS
exports.getAsignaciones = async (req, res) => {
  try {
    const sede_id    = req.user.sede_id
    const { tecnico_id, desde, hasta } = req.query

    let where = "WHERE u.sede_id = ?"
    const params = [sede_id]

    if (tecnico_id) { where += " AND et.tecnico_id = ?";      params.push(tecnico_id) }
    if (desde)      { where += " AND DATE(et.fecha) >= ?";    params.push(desde) }
    if (hasta)      { where += " AND DATE(et.fecha) <= ?";    params.push(hasta) }

    const [rows] = await db.query(`
      SELECT
        et.tecnico_id,
        u.nombre        AS tecnico_nombre,
        DATE_FORMAT(et.fecha, '%Y-%m-%dT%H:%i:%s') AS fecha,
        et.producto_id,
        p.nombre        AS producto_nombre,
        p.codigo,
        p.unidad,
        et.cantidad
      FROM entregas_tecnicos et
      JOIN usuarios  u ON u.id = et.tecnico_id
      JOIN productos p ON p.id = et.producto_id
      ${where}
      ORDER BY et.fecha DESC
    `, params)

    // Agrupar por tecnico + minuto (cada lote entra casi al mismo tiempo)
    const grupos = []
    const mapa   = new Map()

    for (const row of rows) {
      const clave = `${row.tecnico_id}_${row.fecha.slice(0, 16)}` // YYYY-MM-DDTHH:MM
      if (!mapa.has(clave)) {
        const grupo = {
          tecnico_id:      row.tecnico_id,
          tecnico_nombre:  row.tecnico_nombre,
          fecha:           row.fecha,
          items:           [],
          onus:            [],
        }
        mapa.set(clave, grupo)
        grupos.push(grupo)
      }
      mapa.get(clave).items.push({
        producto_id: row.producto_id,
        nombre:      row.producto_nombre,
        codigo:      row.codigo,
        unidad:      row.unidad,
        cantidad:    row.cantidad,
      })
    }

    // Agregar ONUs por técnico en el rango
    const onuWhere  = ["o.sede_id = ?"]
    const onuParams = [sede_id]
    if (tecnico_id) { onuWhere.push("o.tecnico_id = ?"); onuParams.push(tecnico_id) }

    const [onus] = await db.query(`
      SELECT o.id, o.tecnico_id, o.codigo_pon, p.nombre AS modelo
      FROM onus o
      JOIN productos p ON p.id = o.producto_id
      WHERE ${onuWhere.join(" AND ")}
        AND o.tecnico_id IS NOT NULL
      ORDER BY o.id DESC
    `, onuParams)

    // Asignar ONUs al grupo del técnico más reciente (mejor aproximación sin tabla envio_onus)
    for (const onu of onus) {
      const grupo = grupos.find(g => g.tecnico_id === onu.tecnico_id)
      if (grupo) grupo.onus.push({ id: onu.id, codigo_pon: onu.codigo_pon, modelo: onu.modelo })
    }

    res.json(grupos)
  } catch (err) {
    console.error("❌ getAsignaciones:", err.message)
    res.status(500).json({ message: err.message })
  }
}