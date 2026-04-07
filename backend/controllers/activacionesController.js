const db = require("../config/db")

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
    const { cliente, direccion, comentario, items } = req.body
    const itemsParsed = items
      ? (typeof items === "string" ? JSON.parse(items) : items)
      : []

    // Verificar stock
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

    // Generar código AC-2026-00001
    const codigo = await generarCodigo(conn, "AC", "activaciones")

    // Crear activación
    const [result] = await conn.query(
      `INSERT INTO activaciones (codigo, tecnico_id, cliente, direccion, comentario, estado, fecha)
       VALUES (?, ?, ?, ?, ?, 'completado', NOW())`,
      [codigo, tecnico_id, cliente || null, direccion || null, comentario || null]
    )
    const activacion_id = result.insertId

    // Guardar hasta 5 fotos
    await guardarFotos(conn, "activacion", activacion_id, req.files || [])

    // Registrar materiales y consumo
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