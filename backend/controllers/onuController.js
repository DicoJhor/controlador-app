const db = require("../config/db")

// POST /api/onus — Crear una ONU (con o sin codigo_pon)
exports.crearOnu = async (req, res) => {
  try {
    const { producto_id, codigo_pon } = req.body
    const sede_id = req.user.sede_id

    if (!producto_id)
      return res.status(400).json({ message: "Faltan campos obligatorios" })

    // Validar unicidad global del codigo_pon si viene
    if (codigo_pon) {
      const [[existe]] = await db.query(
        "SELECT id FROM onus WHERE codigo_pon = ?",
        [codigo_pon]
      )
      if (existe)
        return res.status(400).json({ message: `El PON-SN "${codigo_pon}" ya está registrado` })
    }

    const [result] = await db.query(
      "INSERT INTO onus (producto_id, sede_id, codigo_pon) VALUES (?, ?, ?)",
      [producto_id, sede_id, codigo_pon || null]
    )

    res.json({ id: result.insertId, message: "ONU registrada correctamente" })
  } catch (err) {
    console.error("❌ Error crearOnu:", err.message)
    res.status(500).json({ message: "Error al crear ONU", error: err.message })
  }
}

// GET /api/onus/sede/:sede_id/producto/:producto_id — ONUs de una sede/producto
// DESPUÉS
exports.getBySedeProducto = async (req, res) => {
  try {
    const { sede_id, producto_id } = req.params
    const { solo_disponibles } = req.query

    let query = `
      SELECT id, codigo_pon, tecnico_id, activacion_id, cliente, created_at, salida_directa
      FROM onus
      WHERE sede_id = ? AND producto_id = ?`

    if (solo_disponibles === "true") {
      query += ` AND tecnico_id IS NULL
                 AND activacion_id IS NULL
                 AND averia_id IS NULL
                 AND salida_directa = 0`
    }

    query += ` ORDER BY created_at DESC`

    const [rows] = await db.query(query, [sede_id, producto_id])
    res.json(rows)
  } catch (err) {
    console.error("❌ Error getBySedeProducto:", err.message)
    res.status(500).json({ message: "Error al obtener ONUs", error: err.message })
  }
}

// PATCH /api/onus/:id/codigo — Actualizar PON-SN de una ONU existente
exports.actualizarCodigo = async (req, res) => {
  try {
    const { id } = req.params
    const { codigo_pon } = req.body

    if (!codigo_pon)
      return res.status(400).json({ message: "El código PON-SN es requerido" })

    // Validar unicidad global
    const [[existe]] = await db.query(
      "SELECT id FROM onus WHERE codigo_pon = ? AND id != ?",
      [codigo_pon, id]
    )
    if (existe)
      return res.status(400).json({ message: `El PON-SN "${codigo_pon}" ya está registrado` })

    const [result] = await db.query(
      "UPDATE onus SET codigo_pon = ? WHERE id = ?",
      [codigo_pon, id]
    )

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "ONU no encontrada" })

    res.json({ message: "PON-SN actualizado correctamente" })
  } catch (err) {
    console.error("❌ Error actualizarCodigo:", err.message)
    res.status(500).json({ message: "Error al actualizar PON-SN", error: err.message })
  }
}

// ── getDisponiblesSede — ONUs con PON-SN sin técnico asignado ─────────────
exports.getDisponiblesSede = async (req, res) => {
  try {
    const { producto_id } = req.params
    const sede_id = req.user.sede_id

    const [rows] = await db.query(
      `SELECT id, codigo_pon
       FROM onus
       WHERE sede_id = ?
         AND producto_id = ?
         AND codigo_pon IS NOT NULL
         AND tecnico_id IS NULL
         AND activacion_id IS NULL
         AND salida_directa = 0
       ORDER BY codigo_pon ASC`,
      [sede_id, producto_id]
    )
    res.json(rows)
  } catch (err) {
    console.error("❌ Error getDisponiblesSede:", err.message)
    res.status(500).json({ message: "Error al obtener ONUs disponibles", error: err.message })
  }
}

// ── asignarTecnico — asigna una o varias ONUs a un técnico ───────────────
exports.asignarTecnico = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { tecnico_id, onu_ids } = req.body
    const sede_id      = req.user.sede_id
    const registrado_por = req.user.id

    if (!tecnico_id || !onu_ids || onu_ids.length === 0)
      return res.status(400).json({ message: "Faltan campos obligatorios" })

    for (const onu_id of onu_ids) {
      // Verificar que la ONU pertenece a esta sede y está disponible
      const [[onu]] = await conn.query(
        `SELECT id, producto_id FROM onus
         WHERE id = ? AND sede_id = ? AND tecnico_id IS NULL AND activacion_id IS NULL`,
        [onu_id, sede_id]
      )
      if (!onu) {
        await conn.rollback()
        return res.status(400).json({ message: `ONU ID ${onu_id} no disponible` })
      }

      // Asignar técnico en tabla onus
      await conn.query(
        "UPDATE onus SET tecnico_id = ? WHERE id = ?",
        [tecnico_id, onu_id]
      )

      // Registrar en entregas_tecnicos (cantidad 1 por ONU)
      await conn.query(
        `INSERT INTO entregas_tecnicos (producto_id, tecnico_id, cantidad, fecha, registrado_por)
         VALUES (?, ?, 1, NOW(), ?)`,
        [onu.producto_id, tecnico_id, registrado_por]
      )

      // Descontar stock_sede
      await conn.query(
        `UPDATE stock_sede SET cantidad = cantidad - 1
         WHERE sede_id = ? AND producto_id = ?`,
        [sede_id, onu.producto_id]
      )

      // Actualizar asignaciones_tecnicos
      const [asig] = await conn.query(
        `SELECT id FROM asignaciones_tecnicos
         WHERE tecnico_id = ? AND producto_id = ? AND sede_id = ?`,
        [tecnico_id, onu.producto_id, sede_id]
      )
      if (asig.length > 0) {
        await conn.query(
          `UPDATE asignaciones_tecnicos SET cantidad = cantidad + 1
           WHERE tecnico_id = ? AND producto_id = ? AND sede_id = ?`,
          [tecnico_id, onu.producto_id, sede_id]
        )
      } else {
        await conn.query(
          `INSERT INTO asignaciones_tecnicos (tecnico_id, producto_id, sede_id, cantidad, fecha)
           VALUES (?, ?, ?, 1, NOW())`,
          [tecnico_id, onu.producto_id, sede_id]
        )
      }
    }

    await conn.commit()
    res.json({ message: `${onu_ids.length} ONU(s) asignadas correctamente` })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error asignarTecnico:", err.message)
    res.status(500).json({ message: "Error al asignar ONUs", error: err.message })
  } finally {
    conn.release()
  }
}

// ── getMisOnus — ONUs asignadas al técnico (con PON-SN) ──────────────────
exports.getMisOnus = async (req, res) => {
  try {
    const tecnico_id = req.user.id

    const [rows] = await db.query(
      `SELECT o.id, o.codigo_pon, o.producto_id,
              p.nombre AS producto_nombre, p.codigo AS producto_codigo
       FROM onus o
       JOIN productos p ON p.id = o.producto_id
       WHERE o.tecnico_id = ?
         AND o.activacion_id IS NULL
         AND o.averia_id IS NULL
         AND o.codigo_pon IS NOT NULL
       ORDER BY p.nombre ASC, o.codigo_pon ASC`,
      [tecnico_id]
    )

    res.json(rows)
  } catch (err) {
    console.error("❌ Error getMisOnus:", err.message)
    res.status(500).json({ message: "Error al obtener ONUs del técnico", error: err.message })
  }
}
