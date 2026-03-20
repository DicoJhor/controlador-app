const db = require("../config/db")

// OBTENER VARIANTES DE UN PRODUCTO
exports.obtenerVariantes = async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await db.query(
      `SELECT v.*,
        COALESCE(ss.cantidad, 0) as stock_sede
       FROM producto_variantes v
       LEFT JOIN stock_sede_variante ss ON ss.variante_id = v.id
       WHERE v.producto_id = ?
       ORDER BY v.genero, v.talla`,
      [id]
    )
    res.json(rows)
  } catch (err) {
    console.error("❌ Error obtenerVariantes:", err.message)
    res.status(500).json({ message: "Error al obtener variantes", error: err.message })
  }
}

// CREAR VARIANTE
exports.crearVariante = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { id: producto_id } = req.params
    const { talla, genero, stock_total, stock_minimo, codigo } = req.body

    if (!talla && !genero) {
      return res.status(400).json({ message: "Debe especificar al menos talla o género" })
    }

    // Verificar que no exista ya esa combinación
    const [[existing]] = await conn.query(
      "SELECT id FROM producto_variantes WHERE producto_id = ? AND talla = ? AND genero = ?",
      [producto_id, talla ?? null, genero ?? null]
    )
    if (existing) {
      return res.status(400).json({ message: "Ya existe una variante con esa talla y género" })
    }

    const stockInicial = Number(stock_total) || 0

    // Crear variante
    const [result] = await conn.query(
      `INSERT INTO producto_variantes (producto_id, talla, genero, stock_total, stock_minimo, codigo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [producto_id, talla ?? null, genero ?? null, stockInicial, stock_minimo || 0, codigo || null]
    )

    // Marcar producto como tiene_variantes
    await conn.query(
      "UPDATE productos SET tiene_variantes = 1 WHERE id = ?",
      [producto_id]
    )

    if (stockInicial > 0) {
      // Insertar en stock_sede_variante para sede central
      await conn.query(
        `INSERT INTO stock_sede_variante (variante_id, sede_id, cantidad)
         VALUES (?, 2, ?)`,
        [result.insertId, stockInicial]
      )

      // Sumar al stock_total del producto
      await conn.query(
        "UPDATE productos SET stock_total = stock_total + ? WHERE id = ?",
        [stockInicial, producto_id]
      )

      // Upsert en stock_sede para sede central
      const [[existingSede]] = await conn.query(
        "SELECT id FROM stock_sede WHERE sede_id = 2 AND producto_id = ?",
        [producto_id]
      )
      if (existingSede) {
        await conn.query(
          "UPDATE stock_sede SET cantidad = cantidad + ? WHERE sede_id = 2 AND producto_id = ?",
          [stockInicial, producto_id]
        )
      } else {
        await conn.query(
          "INSERT INTO stock_sede (sede_id, producto_id, cantidad) VALUES (2, ?, ?)",
          [producto_id, stockInicial]
        )
      }
    }

    await conn.commit()

    const [[nueva]] = await conn.query(
      "SELECT * FROM producto_variantes WHERE id = ?",
      [result.insertId]
    )
    res.status(201).json(nueva)
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error crearVariante:", err.message)
    res.status(500).json({ message: "Error al crear variante", error: err.message })
  } finally {
    conn.release()
  }
}

// ACTUALIZAR VARIANTE
exports.actualizarVariante = async (req, res) => {
  try {
    const { varianteId } = req.params
    const { talla, genero, stock_total, stock_minimo, codigo, estado } = req.body

    await db.query(
      `UPDATE producto_variantes SET
        talla = ?, genero = ?, stock_total = ?,
        stock_minimo = ?, codigo = ?, estado = ?
       WHERE id = ?`,
      [talla ?? null, genero ?? null, stock_total, stock_minimo, codigo || null, estado ?? 1, varianteId]
    )

    const [[updated]] = await db.query(
      "SELECT * FROM producto_variantes WHERE id = ?",
      [varianteId]
    )
    res.json(updated)
  } catch (err) {
    console.error("❌ Error actualizarVariante:", err.message)
    res.status(500).json({ message: "Error al actualizar variante", error: err.message })
  }
}

// ELIMINAR VARIANTE
exports.eliminarVariante = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { varianteId } = req.params

    // Obtener producto_id antes de eliminar
    const [[variante]] = await conn.query(
      "SELECT producto_id FROM producto_variantes WHERE id = ?",
      [varianteId]
    )
    if (!variante) return res.status(404).json({ message: "Variante no encontrada" })

    // Eliminar stock por sede de esta variante
    await conn.query("DELETE FROM stock_sede_variante WHERE variante_id = ?", [varianteId])

    // Eliminar variante
    await conn.query("DELETE FROM producto_variantes WHERE id = ?", [varianteId])

    // Si no quedan más variantes, desmarcar tiene_variantes
    const [[{ total }]] = await conn.query(
      "SELECT COUNT(*) as total FROM producto_variantes WHERE producto_id = ?",
      [variante.producto_id]
    )
    if (total === 0) {
      await conn.query(
        "UPDATE productos SET tiene_variantes = 0 WHERE id = ?",
        [variante.producto_id]
      )
    }

    await conn.commit()
    res.json({ message: "Variante eliminada" })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error eliminarVariante:", err.message)
    res.status(500).json({ message: "Error al eliminar variante", error: err.message })
  } finally {
    conn.release()
  }
}

// ENTRADA DE STOCK A VARIANTE
exports.entradaStockVariante = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { varianteId } = req.params
    const { cantidad, sede_id } = req.body

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({ message: "Cantidad inválida" })
    }

    const sedeDestino = Number(sede_id) || 2

    // Sumar al stock total de la variante
    await conn.query(
      "UPDATE producto_variantes SET stock_total = stock_total + ? WHERE id = ?",
      [cantidad, varianteId]
    )

    // Upsert stock_sede_variante
    const [[existing]] = await conn.query(
      "SELECT id FROM stock_sede_variante WHERE variante_id = ? AND sede_id = ?",
      [varianteId, sedeDestino]
    )
    if (existing) {
      await conn.query(
        "UPDATE stock_sede_variante SET cantidad = cantidad + ? WHERE variante_id = ? AND sede_id = ?",
        [cantidad, varianteId, sedeDestino]
      )
    } else {
      await conn.query(
        "INSERT INTO stock_sede_variante (variante_id, sede_id, cantidad) VALUES (?, ?, ?)",
        [varianteId, sedeDestino, cantidad]
      )
    }

    await conn.commit()

    const [[updated]] = await conn.query(
      "SELECT * FROM producto_variantes WHERE id = ?",
      [varianteId]
    )
    res.json(updated)
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error entradaStockVariante:", err.message)
    res.status(500).json({ message: "Error al registrar entrada", error: err.message })
  } finally {
    conn.release()
  }
}