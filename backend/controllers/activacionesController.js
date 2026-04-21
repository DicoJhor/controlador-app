const db = require("../config/db")
const { moverYGuardarFotos } = require("../helpers/fotos")

// ── Helpers ────────────────────────────────────────────────────────────────

async function generarCodigo(conn, prefijo, tabla) {
  const año    = new Date().getFullYear()
  const patron = `${prefijo}-${año}-%`
  const [[{ total }]] = await conn.query(
    `SELECT COUNT(*) as total FROM \`${tabla}\` WHERE codigo LIKE ?`, [patron]
  )
  return `${prefijo}-${año}-${String(Number(total) + 1).padStart(5, "0")}`
}

async function guardarFotos(conn, tipo, registro_id, archivos = []) {
  for (const file of archivos) {
    const ruta = file.path.replace(/\\/g, "/").replace(/^.*uploads\//, "")
    await conn.query(
      "INSERT INTO fotos_registro (tipo, registro_id, ruta) VALUES (?, ?, ?)",
      [tipo, registro_id, ruta]
    )
  }
}

async function getFotos(conn, tipo, registro_id) {
  const [rows] = await conn.query(
    "SELECT id, ruta FROM fotos_registro WHERE tipo = ? AND registro_id = ? ORDER BY id ASC",
    [tipo, registro_id]
  )
  return rows
}

// ── getAll (controlador) ───────────────────────────────────────────────────

exports.getAll = async (req, res) => {
  try {
    const sede_id = req.user.sede_id
    const [rows] = await db.query(`
      SELECT a.id, a.codigo, a.cliente, a.direccion, a.comentario,
             a.estado, a.fecha,
             u.nombre as tecnico, u.id as tecnico_id
      FROM activaciones a
      JOIN usuarios u ON u.id = a.tecnico_id
      WHERE u.sede_id = ?
      ORDER BY a.fecha DESC
    `, [sede_id])

    for (const a of rows) {
      const [mats] = await db.query(`
        SELECT p.nombre, p.unidad, p.es_medible, am.cantidad
        FROM activacion_materiales am
        JOIN productos p ON p.id = am.producto_id
        WHERE am.activacion_id = ?
      `, [a.id])
      a.materiales = mats.map(m => ({ ...m, cantidad: parseFloat(m.cantidad) }))
      a.fotos = await getFotos(db, "activacion", a.id)
    }

    res.json(rows)
  } catch (err) {
    console.error("❌ Error getAll activaciones:", err.message)
    res.status(500).json({ message: "Error al obtener activaciones", error: err.message })
  }
}

// ── getMias (técnico) ──────────────────────────────────────────────────────

exports.getMias = async (req, res) => {
  try {
    const tecnico_id = req.user.id
    const [rows] = await db.query(`
      SELECT id, codigo, cliente, direccion, comentario, estado, fecha
      FROM activaciones
      WHERE tecnico_id = ?
      ORDER BY fecha DESC
    `, [tecnico_id])

    for (const a of rows) {
      const [mats] = await db.query(`
        SELECT p.nombre, p.unidad, p.es_medible, am.cantidad
        FROM activacion_materiales am
        JOIN productos p ON p.id = am.producto_id
        WHERE am.activacion_id = ?
      `, [a.id])
      a.materiales = mats.map(m => ({ ...m, cantidad: parseFloat(m.cantidad) }))
      a.fotos = await getFotos(db, "activacion", a.id)
    }

    res.json(rows)
  } catch (err) {
    console.error("❌ Error getMias activaciones:", err.message)
    res.status(500).json({ message: "Error al obtener activaciones", error: err.message })
  }
}

// ── create ─────────────────────────────────────────────────────────────────

exports.create = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const tecnico_id  = req.user.id
    const { cliente, direccion, comentario, items, onu_id } = req.body

    const itemsParsed = items
      ? (typeof items === "string" ? JSON.parse(items) : items)
      : []

    const onuId = onu_id ? Number(onu_id) : null

    // ── Validar ONU si viene ───────────────────────────────────────────────
    if (onuId) {
      const [[onu]] = await conn.query(
        `SELECT id FROM onus
         WHERE id = ? AND tecnico_id = ? AND activacion_id IS NULL`,
        [onuId, tecnico_id]
      )
      if (!onu) {
        await conn.rollback()
        return res.status(400).json({ message: "La ONU seleccionada no está disponible" })
      }
    }

    // ── Verificar stock de items normales ──────────────────────────────────
    for (const item of itemsParsed) {
      const [[asignacion]] = await conn.query(
        `SELECT a.cantidad, p.es_medible, p.metros_por_unidad
         FROM asignaciones_tecnicos a
         JOIN productos p ON p.id = a.producto_id
         WHERE a.tecnico_id = ? AND a.producto_id = ?`,
        [tecnico_id, item.producto_id]
      )
      if (!asignacion) {
        await conn.rollback()
        return res.status(400).json({ message: `No tenés el ítem ID ${item.producto_id} asignado` })
      }

      const [[{ consumido }]] = await conn.query(
        "SELECT COALESCE(SUM(cantidad), 0) as consumido FROM consumo_tecnico WHERE tecnico_id = ? AND producto_id = ?",
        [tecnico_id, item.producto_id]
      )
      const esMedible        = Boolean(asignacion.es_medible)
      const mpu              = parseFloat(asignacion.metros_por_unidad) || 1
      const asignadoEfectivo = esMedible
        ? parseFloat(asignacion.cantidad) * mpu
        : parseFloat(asignacion.cantidad)
      const disponible = asignadoEfectivo - parseFloat(consumido)
      if (parseFloat(item.cantidad) > disponible) {
        await conn.rollback()
        return res.status(400).json({
          message: `Stock insuficiente para ítem ID ${item.producto_id}. Disponible: ${disponible}`
        })
      }
    }

    // ── Generar código AC-2026-00001 ───────────────────────────────────────
    const codigo = await generarCodigo(conn, "AC", "activaciones")

    // ── Crear activación (con onu_id si viene) ─────────────────────────────
    const [result] = await conn.query(
      `INSERT INTO activaciones
         (codigo, tecnico_id, cliente, direccion, comentario, estado, onu_id, fecha)
       VALUES (?, ?, ?, ?, ?, 'completado', ?, NOW())`,
      [codigo, tecnico_id, cliente || null, direccion || null, comentario || null, onuId]
    )
    const activacion_id = result.insertId

    // ── Guardar hasta 5 fotos ──────────────────────────────────────────────
    await moverYGuardarFotos(conn, {           // ✅ CAMBIAR
      tipo:        "activacion",
      registro_id: activacion_id,
      sede_id:     req.user.sede_id,
      cliente:     cliente,
      archivos:    req.files || [],
    })

    // ── Registrar materiales normales y consumo ────────────────────────────
    for (const item of itemsParsed) {
      await conn.query(
        "INSERT INTO activacion_materiales (activacion_id, producto_id, cantidad) VALUES (?, ?, ?)",
        [activacion_id, item.producto_id, item.cantidad]
      )
      await conn.query(
        `INSERT INTO consumo_tecnico
           (tecnico_id, producto_id, cantidad, motivo, descripcion, fecha)
         VALUES (?, ?, ?, 'instalacion', ?, NOW())`,
        [tecnico_id, item.producto_id, item.cantidad, `Activación ${codigo} — ${cliente || "—"}`]
      )
    }

    // ── Vincular ONU a la activación y al cliente ──────────────────────────
    if (onuId) {
      await conn.query(
        `UPDATE onus
         SET activacion_id = ?, cliente = ?, tecnico_id = NULL
         WHERE id = ?`,
        [activacion_id, cliente || null, onuId]
      )

      // Descontar 1 unidad del stock de asignaciones del técnico para la ONU
      const [[onuProducto]] = await conn.query(
        "SELECT producto_id FROM onus WHERE id = ?",
        [onuId]
      )
      if (onuProducto) {
        await conn.query(
          `UPDATE asignaciones_tecnicos
           SET cantidad = cantidad - 1
           WHERE tecnico_id = ? AND producto_id = ?`,
          [tecnico_id, onuProducto.producto_id]
        )
        await conn.query(
          `INSERT INTO consumo_tecnico
             (tecnico_id, producto_id, cantidad, motivo, descripcion, fecha)
           VALUES (?, ?, 1, 'instalacion', ?, NOW())`,
          [tecnico_id, onuProducto.producto_id, `Activación ${codigo} — ${cliente || "—"}`]
        )
      }
    }

    await conn.commit()
    res.status(201).json({ message: "Activación registrada", codigo, id: activacion_id })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error create activacion:", err.message)
    res.status(500).json({ message: "Error al crear activación", error: err.message })
  } finally {
    conn.release()
  }
}

// ── getAllAdmin ────────────────────────────────────────────────────────────

exports.getAllAdmin = async (req, res) => {
  try {
    const { sede_id } = req.query
    const [rows] = await db.query(`
      SELECT a.id, a.codigo, a.cliente, a.direccion, a.comentario,
             a.estado, a.fecha,
             u.nombre as tecnico, u.id as tecnico_id,
             s.nombre as sede_nombre
      FROM activaciones a
      JOIN usuarios u ON u.id = a.tecnico_id
      JOIN sedes s ON s.id = u.sede_id
      ${sede_id && sede_id !== "todas" ? "WHERE u.sede_id = ?" : ""}
      ORDER BY a.fecha DESC
    `, sede_id && sede_id !== "todas" ? [sede_id] : [])

    for (const a of rows) {
      const [mats] = await db.query(`
        SELECT p.nombre, p.unidad, p.es_medible, am.cantidad
        FROM activacion_materiales am
        JOIN productos p ON p.id = am.producto_id
        WHERE am.activacion_id = ?
      `, [a.id])
      a.materiales = mats.map(m => ({ ...m, cantidad: parseFloat(m.cantidad) }))
      a.fotos = await getFotos(db, "activacion", a.id)
    }

    res.json(rows)
  } catch (err) {
    console.error("❌ Error getAllAdmin activaciones:", err.message)
    res.status(500).json({ message: "Error al obtener activaciones", error: err.message })
  }
}

// ── Buscar cliente existente ───────────────────────────────────────────────

exports.buscarCliente = async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.trim().length < 2)
      return res.status(400).json({ message: "Ingresá al menos 2 caracteres" })

    const sede_id = req.user.sede_id

    const [rows] = await db.query(`
      SELECT cliente, direccion,
            o.id AS onu_id, o.codigo_pon, o.producto_id,
            p.nombre AS modelo_onu
      FROM activaciones a
      LEFT JOIN onus o ON o.activacion_id = a.id
      LEFT JOIN productos p ON p.id = o.producto_id
      JOIN usuarios u ON u.id = a.tecnico_id
      WHERE u.sede_id = ? AND a.cliente LIKE ?

      UNION

      SELECT cliente, direccion,
            NULL AS onu_id, NULL AS codigo_pon, NULL AS producto_id,
            NULL AS modelo_onu
      FROM averias av
      JOIN usuarios u ON u.id = av.tecnico_id
      WHERE u.sede_id = ? AND av.cliente LIKE ?

      ORDER BY cliente ASC
      LIMIT 10
    `, [sede_id, `%${q}%`, sede_id, `%${q}%`])
    res.json(rows)
  } catch (err) {
    console.error("❌ buscarCliente:", err.message)
    res.status(500).json({ message: "Error al buscar cliente", error: err.message })
  }
}