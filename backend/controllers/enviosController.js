const db = require("../config/db")

// CREAR ENVÍO
exports.crearEnvio = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { guia, comentario, fecha_envio, productos, onu_ids = [] } = req.body
    const sede_id      = Number(req.body.sede_id)
    const usuario_id   = req.user.id
    const sede_origen_id = req.user.sede_id || 2

    if (!sede_id)     return res.status(400).json({ message: "La sede es obligatoria" })
    if (!guia)        return res.status(400).json({ message: "La guía es obligatoria" })

    // Verificar que la sede origen tenga permiso de envío
    const [[sedeOrigen]] = await conn.query(
      "SELECT puede_enviar FROM sedes WHERE id = ?",
      [sede_origen_id]
    )
    if (!sedeOrigen?.puede_enviar) {
      return res.status(403).json({ message: "Tu sede no tiene permiso para realizar envíos." })
    }
    if (!fecha_envio) return res.status(400).json({ message: "La fecha es obligatoria" })
    if (!productos || productos.length === 0)
      return res.status(400).json({ message: "Debe seleccionar al menos un producto" })

    // Verificar stock suficiente por sede origen
    for (const item of productos) {
      if (item.variante_id) {
        const [[varianteSede]] = await conn.query(
          `SELECT ssv.cantidad, pv.talla, pv.genero
           FROM stock_sede_variante ssv
           JOIN producto_variantes pv ON pv.id = ssv.variante_id
           WHERE ssv.sede_id = ? AND ssv.variante_id = ?`,
          [sede_origen_id, item.variante_id]
        )
        if (!varianteSede)
          return res.status(404).json({ message: `Variante no encontrada en tu sede (id: ${item.variante_id})` })
        if (varianteSede.cantidad < item.cantidad)
          return res.status(400).json({ message: `Stock insuficiente para variante ${varianteSede.genero} - ${varianteSede.talla}. Disponible en sede: ${varianteSede.cantidad}` })
      } else {
        const [[prod]] = await conn.query(
          "SELECT categoria FROM productos WHERE id = ?", [item.producto_id]
        )
        // ONUs de sedes no-centrales: el stock se valida por onu_ids, no por cantidad numérica
        const esOnuNocentral = prod?.categoria === "onu" && sede_origen_id !== 2
        if (!esOnuNocentral) {
          const [[stockSede]] = await conn.query(
            `SELECT ss.cantidad, p.nombre
             FROM stock_sede ss
             JOIN productos p ON p.id = ss.producto_id
             WHERE ss.sede_id = ? AND ss.producto_id = ?`,
            [sede_origen_id, item.producto_id]
          )
          if (!stockSede)
            return res.status(404).json({ message: `Producto no encontrado en tu sede (id: ${item.producto_id})` })
          if (stockSede.cantidad < item.cantidad)
            return res.status(400).json({ message: `Stock insuficiente para "${stockSede.nombre}". Disponible en sede: ${stockSede.cantidad}` })
        }
      }
    }

    // ── VALIDAR que onu_ids coincide con cantidad declarada ──
    if (onu_ids.length > 0 && sede_origen_id !== 2) {
      let totalOnuEsperadas = 0
      for (const item of productos) {
        const [[prod]] = await conn.query(
          "SELECT categoria FROM productos WHERE id = ?", [item.producto_id]
        )
        if (prod?.categoria === "onu") totalOnuEsperadas += item.cantidad
      }
      if (onu_ids.length !== totalOnuEsperadas) {
        await conn.rollback()
        return res.status(400).json({
          message: `Cantidad de ONUs no coincide. Esperadas: ${totalOnuEsperadas}, recibidas: ${onu_ids.length}`
        })
      }
    }

    // Crear envío
    const [result] = await conn.query(
      `INSERT INTO envios (sede_id, sede_origen_id, usuario_id, guia, comentario, fecha_envio)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sede_id, sede_origen_id, usuario_id, guia, comentario || null, fecha_envio]
    )
    const envio_id = result.insertId

    for (const item of productos) {
      if (item.variante_id) {
        // ── Envío de variante ──────────────────────────
        await conn.query(
          "INSERT INTO envio_detalles (envio_id, producto_id, variante_id, cantidad) VALUES (?, ?, ?, ?)",
          [envio_id, item.producto_id, item.variante_id, item.cantidad]
        )

        // Descontar stock de la variante
        await conn.query(
          "UPDATE producto_variantes SET stock_total = stock_total - ? WHERE id = ?",
          [item.cantidad, item.variante_id]
        )

        // Descontar stock global del producto
        await conn.query(
          "UPDATE productos SET stock_total = stock_total - ? WHERE id = ?",
          [item.cantidad, item.producto_id]
        )

        // Descontar de stock_sede origen
        await conn.query(
          "UPDATE stock_sede SET cantidad = cantidad - ? WHERE sede_id = ? AND producto_id = ?",
          [item.cantidad, sede_origen_id, item.producto_id]
        )

        // Descontar de stock_sede_variante origen
        await conn.query(
          "UPDATE stock_sede_variante SET cantidad = cantidad - ? WHERE sede_id = ? AND variante_id = ?",
          [item.cantidad, sede_origen_id, item.variante_id]
        )

        // ✅ FIX: Upsert atómico con ON DUPLICATE KEY UPDATE
        // Evita duplicados por race condition entre SELECT + INSERT separados
        await conn.query(
          `INSERT INTO stock_sede_variante (sede_id, variante_id, cantidad)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)`,
          [sede_id, item.variante_id, item.cantidad]
        )

        // ✅ FIX: Upsert atómico para stock_sede destino
        await conn.query(
          `INSERT INTO stock_sede (sede_id, producto_id, cantidad)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)`,
          [sede_id, item.producto_id, item.cantidad]
        )

      } else {
        // ── Envío de producto normal ───────────────────
        await conn.query(
          "INSERT INTO envio_detalles (envio_id, producto_id, cantidad) VALUES (?, ?, ?)",
          [envio_id, item.producto_id, item.cantidad]
        )

        // Descontar stock global
        await conn.query(
          "UPDATE productos SET stock_total = stock_total - ? WHERE id = ?",
          [item.cantidad, item.producto_id]
        )

        // Descontar de stock_sede origen
        await conn.query(
          "UPDATE stock_sede SET cantidad = cantidad - ? WHERE sede_id = ? AND producto_id = ?",
          [item.cantidad, sede_origen_id, item.producto_id]
        )

        // ✅ FIX: Upsert atómico para stock_sede destino
        await conn.query(
          `INSERT INTO stock_sede (sede_id, producto_id, cantidad)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)`,
          [sede_id, item.producto_id, item.cantidad]
        )

        // Si es ONU → crear registros sin código en tabla onus (sede destino)
        const [[prod]] = await conn.query(
          "SELECT categoria FROM productos WHERE id = ?",
          [item.producto_id]
        )
        if (prod?.categoria === "onu") {
          // Solo sede central crea registros nuevos sin código
          if (sede_origen_id === 2) {
            for (let i = 0; i < item.cantidad; i++) {
              await conn.query(
                "INSERT INTO onus (producto_id, sede_id, codigo_pon) VALUES (?, ?, NULL)",
                [item.producto_id, sede_id]
              )
            }
          }
          // Las demás sedes mueven sus ONUs existentes vía onu_ids (se maneja abajo)
        }
      }
    }

    // Mover ONUs seleccionadas (solo sedes no centrales)
    if (onu_ids.length > 0) {
      const onuIdsParsed = onu_ids.map(id => Number(id))
      const placeholders = onuIdsParsed.map(() => "?").join(",")
      const [onusVerificadas] = await conn.query(
        `SELECT id FROM onus 
         WHERE id IN (${placeholders}) 
         AND sede_id = ? 
         AND tecnico_id IS NULL 
         AND activacion_id IS NULL`,
        [...onuIdsParsed, sede_origen_id]
      )
      if (onusVerificadas.length !== onu_ids.length) {
        await conn.rollback()
        return res.status(400).json({ message: "Algunas ONUs no están disponibles en tu sede." })
      }

      // ✅ Leer producto_id ANTES de mover
      const [onusMovidas] = await conn.query(
        `SELECT producto_id, COUNT(*) as cantidad
         FROM onus WHERE id IN (${placeholders})
         GROUP BY producto_id`,
        [...onuIdsParsed]
      )

      await conn.query(
        `UPDATE onus SET sede_id = ? WHERE id IN (${placeholders})`,
        [sede_id, ...onuIdsParsed]
      )

      // ✅ Sincronizar stock_sede origen y destino
      for (const { producto_id, cantidad } of onusMovidas) {
        await conn.query(
          `UPDATE stock_sede SET cantidad = cantidad - ? WHERE sede_id = ? AND producto_id = ?`,
          [cantidad, sede_origen_id, producto_id]
        )
        await conn.query(
          `INSERT INTO stock_sede (sede_id, producto_id, cantidad)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)`,
          [sede_id, producto_id, cantidad]
        )
      }
    }

    await conn.commit()
    res.status(201).json({ message: "Envío creado correctamente", id: envio_id })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error crearEnvio:", err.message)
    res.status(500).json({ message: "Error al crear envío", error: err.message })
  } finally {
    conn.release()
  }
}

// LISTAR ENVÍOS
exports.obtenerEnvios = async (req, res) => {
  try {
    const sede_origen_id = req.user.sede_id
    const { sede_destino_id, estado, desde, hasta } = req.query

    let where = "WHERE e.sede_origen_id = ?"
    const params = [sede_origen_id]

    if (sede_destino_id) { where += " AND e.sede_id = ?";             params.push(sede_destino_id) }
    if (estado)          { where += " AND e.estado = ?";              params.push(estado) }
    if (desde)           { where += " AND DATE(e.fecha_envio) >= ?";  params.push(desde) }
    if (hasta)           { where += " AND DATE(e.fecha_envio) <= ?";  params.push(hasta) }

    const [rows] = await db.query(
      `SELECT e.id, e.guia, e.comentario, e.fecha_envio, e.estado,
              e.fecha_recepcion, e.created_at,
              s.nombre  AS sede_destino_nombre,
              so.nombre AS sede_origen_nombre,
              u.nombre  AS usuario_nombre
       FROM envios e
       JOIN sedes s  ON s.id  = e.sede_id
       JOIN sedes so ON so.id = e.sede_origen_id
       JOIN usuarios u ON u.id = e.usuario_id
       ${where}
       ORDER BY e.fecha_envio DESC`,
      params
    )

    for (const envio of rows) {
      const [detalles] = await db.query(
        `SELECT ed.producto_id, ed.cantidad, ed.variante_id,
                p.nombre, p.codigo, p.unidad,
                pv.talla, pv.genero
         FROM envio_detalles ed
         JOIN productos p ON p.id = ed.producto_id
         LEFT JOIN producto_variantes pv ON pv.id = ed.variante_id
         WHERE ed.envio_id = ?`,
        [envio.id]
      )
      envio.productos = detalles

      // ONUs: las que tienen sede_id = destino y fueron movidas en este envío
      // Como no hay tabla envio_onus, mostramos las ONUs actuales en sede destino
      // asociadas a los productos de este envío
      const productoIds = detalles.map(d => d.producto_id)
      if (productoIds.length > 0) {
        const placeholders = productoIds.map(() => "?").join(",")
        const [onus] = await db.query(
          `SELECT o.id, o.codigo_pon, p.nombre AS modelo
           FROM onus o
           JOIN productos p ON p.id = o.producto_id
           WHERE o.sede_id = ?
             AND o.producto_id IN (${placeholders})
             AND o.tecnico_id IS NULL
             AND o.activacion_id IS NULL`,
          [envio.sede_id, ...productoIds]
        )
        envio.onus = onus
      } else {
        envio.onus = []
      }
    }

    res.json(rows)
  } catch (err) {
    console.error("❌ Error obtenerEnvios:", err.message)
    res.status(500).json({ message: "Error al obtener envíos", error: err.message })
  }
}

// EDITAR ENVÍO (solo superadmin)
exports.editarEnvio = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { id } = req.params
    const { guia, comentario, fecha_envio, sede_id, productos } = req.body

    // Obtener envío original
    const [[envioOriginal]] = await conn.query(
      "SELECT * FROM envios WHERE id = ?", [id]
    )
    if (!envioOriginal)
      return res.status(404).json({ message: "Envío no encontrado" })

    const sedeOrigenId  = envioOriginal.sede_origen_id
    const sedeDestinoOriginal = envioOriginal.sede_id
    const sedeDestinoNueva    = Number(sede_id) || sedeDestinoOriginal

    // Obtener detalles originales
    const [detallesOriginales] = await conn.query(
      "SELECT * FROM envio_detalles WHERE envio_id = ?", [id]
    )

    // ── REVERTIR stock original completamente ──────────────
    for (const det of detallesOriginales) {
      if (det.variante_id) {
        // Devolver a origen
        await conn.query(
          "UPDATE stock_sede_variante SET cantidad = cantidad + ? WHERE sede_id = ? AND variante_id = ?",
          [det.cantidad, sedeOrigenId, det.variante_id]
        )
        await conn.query(
          "UPDATE stock_sede SET cantidad = cantidad + ? WHERE sede_id = ? AND producto_id = ?",
          [det.cantidad, sedeOrigenId, det.producto_id]
        )
        // Quitar de destino original
        await conn.query(
          "UPDATE stock_sede_variante SET cantidad = cantidad - ? WHERE sede_id = ? AND variante_id = ?",
          [det.cantidad, sedeDestinoOriginal, det.variante_id]
        )
        await conn.query(
          "UPDATE stock_sede SET cantidad = cantidad - ? WHERE sede_id = ? AND producto_id = ?",
          [det.cantidad, sedeDestinoOriginal, det.producto_id]
        )
        // Restaurar stock global variante
        await conn.query(
          "UPDATE producto_variantes SET stock_total = stock_total + ? WHERE id = ?",
          [det.cantidad, det.variante_id]
        )
      } else {
        // Devolver a origen
        await conn.query(
          "UPDATE stock_sede SET cantidad = cantidad + ? WHERE sede_id = ? AND producto_id = ?",
          [det.cantidad, sedeOrigenId, det.producto_id]
        )
        // Quitar de destino original
        await conn.query(
          "UPDATE stock_sede SET cantidad = cantidad - ? WHERE sede_id = ? AND producto_id = ?",
          [det.cantidad, sedeDestinoOriginal, det.producto_id]
        )
      }
      // Restaurar stock global producto
      await conn.query(
        "UPDATE productos SET stock_total = stock_total + ? WHERE id = ?",
        [det.cantidad, det.producto_id]
      )
    }

    // ── ELIMINAR detalles viejos ───────────────────────────
    await conn.query("DELETE FROM envio_detalles WHERE envio_id = ?", [id])

    // ── ACTUALIZAR cabecera del envío ──────────────────────
    await conn.query(
      `UPDATE envios SET guia = ?, comentario = ?, fecha_envio = ?, sede_id = ? WHERE id = ?`,
      [guia, comentario || null, fecha_envio, sedeDestinoNueva, id]
    )

    // ── APLICAR nuevos productos y stock ──────────────────
    for (const item of productos) {
      if (item.variante_id) {
        await conn.query(
          "INSERT INTO envio_detalles (envio_id, producto_id, variante_id, cantidad) VALUES (?, ?, ?, ?)",
          [id, item.producto_id, item.variante_id, item.cantidad]
        )
        await conn.query(
          "UPDATE producto_variantes SET stock_total = stock_total - ? WHERE id = ?",
          [item.cantidad, item.variante_id]
        )
        await conn.query(
          "UPDATE productos SET stock_total = stock_total - ? WHERE id = ?",
          [item.cantidad, item.producto_id]
        )
        await conn.query(
          "UPDATE stock_sede SET cantidad = cantidad - ? WHERE sede_id = ? AND producto_id = ?",
          [item.cantidad, sedeOrigenId, item.producto_id]
        )
        await conn.query(
          "UPDATE stock_sede_variante SET cantidad = cantidad - ? WHERE sede_id = ? AND variante_id = ?",
          [item.cantidad, sedeOrigenId, item.variante_id]
        )
        await conn.query(
          `INSERT INTO stock_sede_variante (sede_id, variante_id, cantidad)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)`,
          [sedeDestinoNueva, item.variante_id, item.cantidad]
        )
        await conn.query(
          `INSERT INTO stock_sede (sede_id, producto_id, cantidad)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)`,
          [sedeDestinoNueva, item.producto_id, item.cantidad]
        )
      } else {
        await conn.query(
          "INSERT INTO envio_detalles (envio_id, producto_id, cantidad) VALUES (?, ?, ?)",
          [id, item.producto_id, item.cantidad]
        )
        await conn.query(
          "UPDATE productos SET stock_total = stock_total - ? WHERE id = ?",
          [item.cantidad, item.producto_id]
        )
        await conn.query(
          "UPDATE stock_sede SET cantidad = cantidad - ? WHERE sede_id = ? AND producto_id = ?",
          [item.cantidad, sedeOrigenId, item.producto_id]
        )
        await conn.query(
          `INSERT INTO stock_sede (sede_id, producto_id, cantidad)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)`,
          [sedeDestinoNueva, item.producto_id, item.cantidad]
        )
      }
    }

    await conn.commit()
    res.json({ message: "Envío actualizado correctamente" })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error editarEnvio:", err.message)
    res.status(500).json({ message: "Error al editar envío", error: err.message })
  } finally {
    conn.release()
  }
}

// ELIMINAR ENVÍO (solo superadmin) — revierte stock completo
exports.eliminarEnvio = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { id } = req.params

    const [[envio]] = await conn.query("SELECT * FROM envios WHERE id = ?", [id])
    if (!envio) return res.status(404).json({ message: "Envío no encontrado" })

    const [detalles] = await conn.query(
      "SELECT * FROM envio_detalles WHERE envio_id = ?", [id]
    )

    for (const det of detalles) {
      if (det.variante_id) {
        await conn.query(
          "UPDATE stock_sede_variante SET cantidad = cantidad + ? WHERE sede_id = ? AND variante_id = ?",
          [det.cantidad, envio.sede_origen_id, det.variante_id]
        )
        await conn.query(
          "UPDATE stock_sede SET cantidad = cantidad + ? WHERE sede_id = ? AND producto_id = ?",
          [det.cantidad, envio.sede_origen_id, det.producto_id]
        )
        await conn.query(
          "UPDATE stock_sede_variante SET cantidad = cantidad - ? WHERE sede_id = ? AND variante_id = ?",
          [det.cantidad, envio.sede_id, det.variante_id]
        )
        await conn.query(
          "UPDATE stock_sede SET cantidad = cantidad - ? WHERE sede_id = ? AND producto_id = ?",
          [det.cantidad, envio.sede_id, det.producto_id]
        )
        await conn.query(
          "UPDATE producto_variantes SET stock_total = stock_total + ? WHERE id = ?",
          [det.cantidad, det.variante_id]
        )
      } else {
        await conn.query(
          "UPDATE stock_sede SET cantidad = cantidad + ? WHERE sede_id = ? AND producto_id = ?",
          [det.cantidad, envio.sede_origen_id, det.producto_id]
        )
        await conn.query(
          "UPDATE stock_sede SET cantidad = cantidad - ? WHERE sede_id = ? AND producto_id = ?",
          [det.cantidad, envio.sede_id, det.producto_id]
        )
      }
      await conn.query(
        "UPDATE productos SET stock_total = stock_total + ? WHERE id = ?",
        [det.cantidad, det.producto_id]
      )
    }

    await conn.query("DELETE FROM envio_detalles WHERE envio_id = ?", [id])
    await conn.query("DELETE FROM envios WHERE id = ?", [id])

    await conn.commit()
    res.json({ message: "Envío eliminado y stock revertido correctamente" })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error eliminarEnvio:", err.message)
    res.status(500).json({ message: "Error al eliminar envío", error: err.message })
  } finally {
    conn.release()
  }
}

// EDITAR ENTRADA DE STOCK
exports.editarEntrada = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { cantidad, comentario, motivo } = req.body;

    // Obtener entrada original
    const [[entradaOriginal]] = await conn.query(
      `SELECT e.*, p.nombre as producto_nombre 
       FROM entradas_stock e 
       JOIN productos p ON p.id = e.producto_id 
       WHERE e.id = ?`, 
      [id]
    );
    
    if (!entradaOriginal) {
      return res.status(404).json({ message: "Entrada no encontrada" });
    }

    const diferenciaCantidad = cantidad - entradaOriginal.cantidad;

    // Actualizar stock del producto
    await conn.query(
      "UPDATE productos SET stock_total = stock_total + ? WHERE id = ?",
      [diferenciaCantidad, entradaOriginal.producto_id]
    );

    // Si tiene sede, actualizar stock_sede
    if (entradaOriginal.sede_id) {
      await conn.query(
        `UPDATE stock_sede SET cantidad = cantidad + ? 
         WHERE sede_id = ? AND producto_id = ?`,
        [diferenciaCantidad, entradaOriginal.sede_id, entradaOriginal.producto_id]
      );
    }

    // Actualizar la entrada
    await conn.query(
      `UPDATE entradas_stock 
       SET cantidad = ?, comentario = ?, motivo = ? 
       WHERE id = ?`,
      [cantidad, comentario || null, motivo || null, id]
    );

    await conn.commit();
    res.json({ message: "Entrada actualizada correctamente" });
  } catch (err) {
    await conn.rollback();
    console.error("❌ Error editarEntrada:", err.message);
    res.status(500).json({ message: "Error al editar entrada", error: err.message });
  } finally {
    conn.release();
  }
};

// ELIMINAR ENTRADA DE STOCK
exports.eliminarEntrada = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const [[entrada]] = await conn.query(
      "SELECT * FROM entradas_stock WHERE id = ?", 
      [id]
    );
    
    if (!entrada) {
      return res.status(404).json({ message: "Entrada no encontrada" });
    }

    // Revertir stock
    await conn.query(
      "UPDATE productos SET stock_total = stock_total - ? WHERE id = ?",
      [entrada.cantidad, entrada.producto_id]
    );

    if (entrada.sede_id) {
      await conn.query(
        "UPDATE stock_sede SET cantidad = cantidad - ? WHERE sede_id = ? AND producto_id = ?",
        [entrada.cantidad, entrada.sede_id, entrada.producto_id]
      );
    }

    // Eliminar la entrada
    await conn.query("DELETE FROM entradas_stock WHERE id = ?", [id]);

    await conn.commit();
    res.json({ message: "Entrada eliminada correctamente" });
  } catch (err) {
    await conn.rollback();
    console.error("❌ Error eliminarEntrada:", err.message);
    res.status(500).json({ message: "Error al eliminar entrada", error: err.message });
  } finally {
    conn.release();
  }
};