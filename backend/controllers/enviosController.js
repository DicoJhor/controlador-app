const db = require("../config/db")

// CREAR ENVÍO
exports.crearEnvio = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { guia, comentario, fecha_envio, productos } = req.body
    const sede_id      = Number(req.body.sede_id)
    const usuario_id   = req.user.id
    const sede_origen_id = req.user.sede_id || 2

    if (!sede_id)     return res.status(400).json({ message: "La sede es obligatoria" })
    if (!guia)        return res.status(400).json({ message: "La guía es obligatoria" })
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
          for (let i = 0; i < item.cantidad; i++) {
            await conn.query(
              "INSERT INTO onus (producto_id, sede_id, codigo_pon) VALUES (?, ?, NULL)",
              [item.producto_id, sede_id]
            )
          }
        }
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
    const [rows] = await db.query(
      `SELECT e.id, e.guia, e.comentario, e.fecha_envio, e.created_at,
              s.nombre AS sede_nombre,
              u.nombre AS usuario_nombre
       FROM envios e
       JOIN sedes s ON s.id = e.sede_id
       JOIN usuarios u ON u.id = e.usuario_id
       ORDER BY e.created_at DESC`
    )

    for (const envio of rows) {
      const [detalles] = await db.query(
        `SELECT ed.cantidad, ed.variante_id,
                p.nombre, p.codigo, p.unidad,
                pv.talla, pv.genero
         FROM envio_detalles ed
         JOIN productos p ON p.id = ed.producto_id
         LEFT JOIN producto_variantes pv ON pv.id = ed.variante_id
         WHERE ed.envio_id = ?`,
        [envio.id]
      )
      envio.productos = detalles
    }

    res.json(rows)
  } catch (err) {
    console.error("❌ Error obtenerEnvios:", err.message)
    res.status(500).json({ message: "Error al obtener envíos", error: err.message })
  }
}