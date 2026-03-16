const db = require("../config/db")

// LISTAR PRODUCTOS
exports.obtenerProductos = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, codigo, nombre, descripcion, categoria, unidad, stock_total, stock_minimo, estado FROM productos"
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
    const { codigo, nombre, descripcion, categoria, unidad, stock_total, stock_minimo } = req.body
    if (!nombre) return res.status(400).json({ message: "El nombre es obligatorio" })

    const [result] = await db.query(
      `INSERT INTO productos (codigo, nombre, descripcion, categoria, unidad, stock_total, stock_minimo, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [codigo || null, nombre, descripcion || null, categoria || null, unidad || null,
       stock_total || 0, stock_minimo || 0]
    )
    res.status(201).json({
      id: result.insertId, codigo, nombre, descripcion,
      categoria, unidad, stock_total: stock_total || 0,
      stock_minimo: stock_minimo || 0, estado: 1
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
    const { codigo, nombre, descripcion, categoria, unidad, stock_total, stock_minimo, estado } = req.body

    await db.query(
      `UPDATE productos SET codigo=?, nombre=?, descripcion=?, categoria=?,
       unidad=?, stock_total=?, stock_minimo=?, estado=? WHERE id=?`,
      [codigo || null, nombre, descripcion || null, categoria || null,
       unidad || null, stock_total, stock_minimo, estado, id]
    )
    res.json({ message: "Producto actualizado" })
  } catch (err) {
    console.error("❌ Error actualizarProducto:", err.message)
    res.status(500).json({ message: "Error al actualizar producto", error: err.message })
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