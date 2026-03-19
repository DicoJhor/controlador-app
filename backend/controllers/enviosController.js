const db = require("../config/db")

// CREAR ENVÍO
exports.crearEnvio = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { guia, comentario, fecha_envio, productos } = req.body
    const sede_id = Number(req.body.sede_id)
    const usuario_id = req.user.id

    if (!sede_id)     return res.status(400).json({ message: "La sede es obligatoria" })
    if (!guia)        return res.status(400).json({ message: "La guía es obligatoria" })
    if (!fecha_envio) return res.status(400).json({ message: "La fecha es obligatoria" })
    if (!productos || productos.length === 0)
      return res.status(400).json({ message: "Debe seleccionar al menos un producto" })

    // Verificar stock suficiente
    for (const item of productos) {
      const [[prod]] = await conn.query(
        "SELECT stock_total, nombre FROM productos WHERE id = ?",
        [item.producto_id]
      )
      if (!prod)
        return res.status(404).json({ message: `Producto no encontrado (id: ${item.producto_id})` })
      if (prod.stock_total < item.cantidad)
        return res.status(400).json({ message: `Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock_total}` })
    }

    // Crear envío — sede_origen es la sede del usuario (admin = sede central = 2)
    const sede_origen_id = req.user.sede_id || 2
    const [result] = await conn.query(
      `INSERT INTO envios (sede_id, sede_origen_id, usuario_id, guia, comentario, fecha_envio)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sede_id, sede_origen_id, usuario_id, guia, comentario || null, fecha_envio]
    )
    const envio_id = result.insertId

    for (const item of productos) {
      // Detalle del envío
      await conn.query(
        "INSERT INTO envio_detalles (envio_id, producto_id, cantidad) VALUES (?, ?, ?)",
        [envio_id, item.producto_id, item.cantidad]
      )

      // Descontar stock global
      await conn.query(
        "UPDATE productos SET stock_total = stock_total - ? WHERE id = ?",
        [item.cantidad, item.producto_id]
      )

      // Agregar al stock_sede destino (upsert)
      const [[existing]] = await conn.query(
        "SELECT id FROM stock_sede WHERE sede_id = ? AND producto_id = ?",
        [sede_id, item.producto_id]
      )
      if (existing) {
        await conn.query(
          "UPDATE stock_sede SET cantidad = cantidad + ? WHERE sede_id = ? AND producto_id = ?",
          [item.cantidad, sede_id, item.producto_id]
        )
      } else {
        await conn.query(
          "INSERT INTO stock_sede (sede_id, producto_id, cantidad) VALUES (?, ?, ?)",
          [sede_id, item.producto_id, item.cantidad]
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
        `SELECT ed.cantidad, p.nombre, p.codigo, p.unidad
         FROM envio_detalles ed
         JOIN productos p ON p.id = ed.producto_id
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