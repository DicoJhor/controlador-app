const db = require("../config/db")

exports.enviarAlmacenAActivos = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { sede_id, producto_id, area, unidades } = req.body
    const sede_origen_id = req.user.sede_id || 2

    if (!sede_id)                          return res.status(400).json({ message: "La sede destino es obligatoria" })
    if (!producto_id)                      return res.status(400).json({ message: "El producto es obligatorio" })
    if (!area)                             return res.status(400).json({ message: "El área es obligatoria" })
    if (!unidades || unidades.length === 0) return res.status(400).json({ message: "Debe agregar al menos una unidad" })

    const cantidad = unidades.length

    // Verificar producto y stock
    const [[producto]] = await conn.query(
      "SELECT id, nombre FROM productos WHERE id = ?",
      [producto_id]
    )
    if (!producto) return res.status(404).json({ message: "Producto no encontrado" })

    const [[stockSede]] = await conn.query(
      "SELECT cantidad FROM stock_sede WHERE sede_id = ? AND producto_id = ?",
      [sede_origen_id, producto_id]
    )
    if (!stockSede || stockSede.cantidad < cantidad)
      return res.status(400).json({ message: `Stock insuficiente. Disponible: ${stockSede?.cantidad ?? 0}` })

    // Descontar stock global y de sede origen
    await conn.query(
      "UPDATE productos SET stock_total = stock_total - ? WHERE id = ?",
      [cantidad, producto_id]
    )
    await conn.query(
      "UPDATE stock_sede SET cantidad = cantidad - ? WHERE sede_id = ? AND producto_id = ?",
      [cantidad, sede_origen_id, producto_id]
    )

    // Crear un activo por cada unidad
    const activosCreados = []
    for (const unidad of unidades) {
      const [result] = await conn.query(
        "INSERT INTO activos (sede_id, area, nombre, descripcion, nro_serie, estado) VALUES (?, ?, ?, ?, ?, ?)",
        [
          sede_id,
          area,
          producto.nombre,
          unidad.descripcion || null,
          unidad.nro_serie   || null,
          unidad.estado      || "operativo",
        ]
      )
      const [[nuevo]] = await conn.query("SELECT * FROM activos WHERE id = ?", [result.insertId])
      activosCreados.push(nuevo)
    }

    await conn.commit()
    res.status(201).json({ message: "Activos creados correctamente", activos: activosCreados })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error enviarAlmacenAActivos:", err.message)
    res.status(500).json({ message: "Error al enviar a activos", error: err.message })
  } finally {
    conn.release()
  }
}