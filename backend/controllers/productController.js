const db = require("../config/db")

// LISTAR PRODUCTOS
exports.obtenerProductos = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, codigo, nombre, descripcion, categoria, unidad, stock_total, stock_minimo, estado,
              es_medible, metros_por_unidad, metros_disponibles
       FROM productos`
    )
    res.json(rows)
  } catch (err) {
    console.error("❌ Error obtenerProductos:", err.message)
    res.status(500).json({ message: "Error al obtener productos", error: err.message })
  }
}

// CREAR PRODUCTO
exports.crearProducto = async (req, res) => {
  try {
    const {
      codigo, nombre, descripcion, categoria, unidad,
      stock_total, stock_minimo,
      es_medible, metros_por_unidad
    } = req.body

    if (!nombre) return res.status(400).json({ message: "El nombre es obligatorio" })

    const esMedible      = es_medible ? 1 : 0
    const metrosPorUnidad = esMedible ? (Number(metros_por_unidad) || null) : null
    const metrosDisponibles = esMedible && metrosPorUnidad
      ? (Number(stock_total) || 0) * metrosPorUnidad
      : null

    const [result] = await db.query(
      `INSERT INTO productos
         (codigo, nombre, descripcion, categoria, unidad, stock_total, stock_minimo, estado,
          es_medible, metros_por_unidad, metros_disponibles)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        codigo || null, nombre, descripcion || null, categoria || null,
        unidad || null, stock_total || 0, stock_minimo || 0,
        esMedible, metrosPorUnidad, metrosDisponibles
      ]
    )

    res.status(201).json({
      id: result.insertId, codigo, nombre, descripcion,
      categoria, unidad,
      stock_total: stock_total || 0,
      stock_minimo: stock_minimo || 0,
      estado: 1,
      es_medible: esMedible,
      metros_por_unidad: metrosPorUnidad,
      metros_disponibles: metrosDisponibles
    })
  } catch (err) {
    console.error("❌ Error crearProducto:", err.message)
    res.status(500).json({ message: "Error al crear producto", error: err.message })
  }
}

// ACTUALIZAR PRODUCTO
exports.actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params
    const {
      codigo, nombre, descripcion, categoria, unidad,
      stock_total, stock_minimo, estado,
      es_medible, metros_por_unidad, metros_disponibles
    } = req.body

    const esMedible       = es_medible ? 1 : 0
    const metrosPorUnidad = esMedible ? (Number(metros_por_unidad) || null) : null
    const metrosDisp      = esMedible
      ? (metros_disponibles !== undefined ? Number(metros_disponibles) : null)
      : null

    await db.query(
      `UPDATE productos SET
         codigo=?, nombre=?, descripcion=?, categoria=?,
         unidad=?, stock_total=?, stock_minimo=?, estado=?,
         es_medible=?, metros_por_unidad=?, metros_disponibles=?
       WHERE id=?`,
      [
        codigo || null, nombre, descripcion || null, categoria || null,
        unidad || null, stock_total, stock_minimo, estado,
        esMedible, metrosPorUnidad, metrosDisp, id
      ]
    )
    res.json({ message: "Producto actualizado" })
  } catch (err) {
    console.error("❌ Error actualizarProducto:", err.message)
    res.status(500).json({ message: "Error al actualizar producto", error: err.message })
  }
}

// REGISTRAR ENTRADA DE STOCK (admin) - múltiples productos con guía
exports.entradaStockAdmin = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { guia, sede_id, comentario, fecha, productos } = req.body
    const usuario_id = req.user.id
    const SEDE_CENTRAL = 2

    if (!guia)
      return res.status(400).json({ message: "La guía es obligatoria" })
    if (!productos || productos.length === 0)
      return res.status(400).json({ message: "Debe agregar al menos un producto" })

    const sedeDestino  = Number(sede_id) || SEDE_CENTRAL
    const fechaEntrada = fecha || new Date().toISOString().split("T")[0]

    for (const item of productos) {
      if (!item.producto_id || !item.cantidad || item.cantidad <= 0)
        return res.status(400).json({ message: "Producto o cantidad inválidos" })

      // Registrar en entradas_stock con guía
      await conn.query(
        `INSERT INTO entradas_stock (producto_id, cantidad, fecha, registrado_por, guia, sede_id, comentario)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [item.producto_id, item.cantidad, fechaEntrada, usuario_id, guia, sedeDestino, comentario || null]
      )

      // Sumar al stock global
      await conn.query(
        "UPDATE productos SET stock_total = stock_total + ? WHERE id = ?",
        [item.cantidad, item.producto_id]
      )

      // Upsert stock_sede
      const [[existing]] = await conn.query(
        "SELECT id FROM stock_sede WHERE sede_id = ? AND producto_id = ?",
        [sedeDestino, item.producto_id]
      )
      if (existing) {
        await conn.query(
          "UPDATE stock_sede SET cantidad = cantidad + ? WHERE sede_id = ? AND producto_id = ?",
          [item.cantidad, sedeDestino, item.producto_id]
        )
      } else {
        await conn.query(
          "INSERT INTO stock_sede (sede_id, producto_id, cantidad) VALUES (?, ?, ?)",
          [sedeDestino, item.producto_id, item.cantidad]
        )
      }

      // Si es medible, sumar metros
      const [[prod]] = await conn.query(
        "SELECT es_medible, metros_por_unidad FROM productos WHERE id = ?",
        [item.producto_id]
      )
      if (prod?.es_medible && prod?.metros_por_unidad) {
        await conn.query(
          "UPDATE productos SET metros_disponibles = COALESCE(metros_disponibles, 0) + ? WHERE id = ?",
          [item.cantidad * prod.metros_por_unidad, item.producto_id]
        )
      }
    }

    await conn.commit()

    // Devolver productos actualizados
    const ids = productos.map(p => p.producto_id)
    const [updated] = await conn.query(
      `SELECT id, codigo, nombre, stock_total, es_medible, metros_disponibles, metros_por_unidad
       FROM productos WHERE id IN (?)`,
      [ids]
    )
    res.json({ message: "Entrada registrada correctamente", productos: updated })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error entradaStockAdmin:", err.message)
    res.status(500).json({ message: "Error al registrar entrada", error: err.message })
  } finally {
    conn.release()
  }
}

// ELIMINAR PRODUCTO
exports.eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params
    await db.query("DELETE FROM productos WHERE id = ?", [id])
    res.json({ message: "Producto eliminado" })
  } catch (err) {
    console.error("❌ Error eliminarProducto:", err.message)
    res.status(500).json({ message: "Error al eliminar producto", error: err.message })
  }
}

// OBTENER STOCK POR SEDE — solo productos con stock real en esa sede
exports.obtenerStockPorSede = async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await db.query(
      `SELECT
         p.id, p.codigo, p.nombre, p.descripcion,
         p.categoria, p.unidad, p.stock_minimo, p.estado,
         p.es_medible, p.metros_por_unidad,
         ss.cantidad as stock_total
       FROM productos p
       INNER JOIN stock_sede ss ON ss.producto_id = p.id AND ss.sede_id = ?
       WHERE p.estado = 1 AND ss.cantidad > 0
       ORDER BY p.nombre`,
      [id]
    )
    res.json(rows)
  } catch (err) {
    console.error("❌ Error obtenerStockPorSede:", err.message)
    res.status(500).json({ message: "Error al obtener stock por sede", error: err.message })
  }
}