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
      SELECT r.id, r.codigo, r.cliente, r.direccion, r.serie,
             r.tipo_equipo, r.estado, r.comentario, r.created_at,
             u.nombre as tecnico, u.id as tecnico_id
      FROM recojos r
      JOIN usuarios u ON r.tecnico_id = u.id
      WHERE u.sede_id = ?
      ORDER BY r.created_at DESC
    `, [sede_id])

    for (const r of rows) {
      r.fotos = await getFotos(db, "recojo", r.id)
    }

    res.json(rows)
  } catch (err) {
    console.error("❌ Error getAll recojos:", err.message)
    res.status(500).json({ message: "Error al obtener recojos", error: err.message })
  }
}

// ── create (controlador crea orden con múltiples equipos) ─────────────────

exports.create = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const { tecnico_id, cliente, direccion, equipos } = req.body
    // equipos = [{ tipo_equipo, codigo_pon }]
    const registrado_por = req.user.id

    if (!tecnico_id || !Array.isArray(equipos) || equipos.length === 0)
      return res.status(400).json({ message: "Técnico y al menos un equipo son obligatorios" })

    const año    = new Date().getFullYear()
    const patron = `GR-${año}-%`
    const [[{ total }]] = await conn.query(
      "SELECT COUNT(DISTINCT grupo_orden) as total FROM recojos WHERE grupo_orden LIKE ?", [patron]
    )
    const grupo_orden = `GR-${año}-${String(Number(total) + 1).padStart(5, "0")}`

    const insertados = []
    for (const eq of equipos) {
      if (!eq.tipo_equipo) continue
      const [result] = await conn.query(
        `INSERT INTO recojos
           (tecnico_id, cliente, direccion, tipo_equipo, codigo_pon, estado, registrado_por, grupo_orden)
         VALUES (?, ?, ?, ?, ?, 'pendiente', ?, ?)`,
        [tecnico_id, cliente || null, direccion || null,
         eq.tipo_equipo, eq.codigo_pon || null, registrado_por, grupo_orden]
      )
      insertados.push({
        id:          result.insertId,
        tipo_equipo: eq.tipo_equipo,
        codigo_pon:  eq.codigo_pon || null,
      })
    }

    await conn.commit()
    res.status(201).json({ grupo_orden, tecnico_id, cliente, direccion, equipos: insertados })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error create recojo:", err.message)
    res.status(500).json({ message: "Error al crear recojo", error: err.message })
  } finally {
    conn.release()
  }
}

// ── getMisRecojos (técnico) ────────────────────────────────────────────────

exports.getMisRecojos = async (req, res) => {
  try {
    const tecnico_id = req.user.id
    const [rows] = await db.query(`
      SELECT id, codigo, grupo_orden, cliente, direccion, serie, codigo_pon,
             tipo_equipo, estado, comentario, created_at
      FROM recojos
      WHERE tecnico_id = ?
      ORDER BY created_at DESC
    `, [tecnico_id])

    for (const r of rows) {
      r.fotos = await getFotos(db, "recojo", r.id)
    }
    res.json(rows)
  } catch (err) {
    res.status(500).json({ message: "Error al obtener recojos", error: err.message })
  }
}

// ── confirmarTecnico ───────────────────────────────────────────────────────
// El técnico confirma el recojo e indica el producto_id exacto del catálogo
// para cada equipo. Body esperado (FormData):
//   comentario   — string opcional
//   fotos        — archivos imagen (hasta 5)
//   items        — JSON string: [{ id: recojo_id, producto_id, codigo_pon? }]

exports.confirmarTecnico = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { id }       = req.params   // cualquier recojo_id del grupo
    const tecnico_id   = req.user.id
    const { comentario, items } = req.body
    // items = JSON string: [{ id, producto_id, codigo_pon }]

    // Obtener grupo_orden
    const [[orden]] = await conn.query(
      "SELECT grupo_orden FROM recojos WHERE id = ? AND tecnico_id = ? AND estado = 'pendiente'",
      [id, tecnico_id]
    )
    if (!orden)
      return res.status(404).json({ message: "Orden no encontrada o ya confirmada" })

    const grupo = orden.grupo_orden

    // Todos los items pendientes del grupo
    const [pendientes] = await conn.query(
      `SELECT r.id, r.tipo_equipo, r.codigo_pon, u.sede_id
       FROM recojos r
       JOIN usuarios u ON r.tecnico_id = u.id
       WHERE r.grupo_orden = ? AND r.tecnico_id = ? AND r.estado = 'pendiente'`,
      [grupo, tecnico_id]
    )
    if (pendientes.length === 0)
      return res.status(404).json({ message: "No hay items pendientes en esta orden" })

    // Parsear items enviados por el técnico: { recojo_id -> { producto_id, codigo_pon } }
    let itemsMap = {}
    if (items) {
      try {
        JSON.parse(items).forEach(i => { itemsMap[i.id] = i })
      } catch (_) {}
    }

    const codigo    = await generarCodigo(conn, "RC", "recojos")
    const sede_id   = pendientes[0].sede_id

    for (const item of pendientes) {
      const itemData      = itemsMap[item.id] || {}
      const producto_id   = itemData.producto_id || null
      const codigoPonFinal = itemData.codigo_pon || item.codigo_pon || null

      // Actualizar recojo
      await conn.query(
        `UPDATE recojos
         SET estado = 'recogido', comentario = ?, codigo = ?,
             codigo_pon = ?, producto_id = ?
         WHERE id = ?`,
        [comentario || null, codigo, codigoPonFinal, producto_id, item.id]
      )

      // Insertar en onus_recicladas (para todos los tipos, no solo ONU)
      // Buscar onu_id solo si es ONU y tiene codigo_pon
      let onu_id = null
      if (item.tipo_equipo === "ONU" && codigoPonFinal) {
        const [[onuExistente]] = await conn.query(
          "SELECT id FROM onus WHERE codigo_pon = ?", [codigoPonFinal]
        )
        onu_id = onuExistente?.id ?? null
      }

      await conn.query(
        `INSERT INTO onus_recicladas
           (recojo_id, tipo_equipo, onu_id, codigo_pon, producto_id, sede_id, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'revision')`,
        [item.id, item.tipo_equipo, onu_id, codigoPonFinal, producto_id, sede_id]
      )
    }

    // Fotos asociadas al primer item del grupo
    await moverYGuardarFotos(conn, {           // ✅ CAMBIAR
      tipo:        "recojo",
      registro_id: pendientes[0].id,
      sede_id:     sede_id,
      cliente:     pendientes[0].cliente,
      archivos:    req.files || [],
    })

    await conn.commit()
    res.json({ message: "Recojo confirmado", codigo, grupo_orden: grupo })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error confirmarTecnico:", err.message)
    res.status(500).json({ message: "Error al confirmar recojo", error: err.message })
  } finally {
    conn.release()
  }
}

// ── getEquiposReciclados (controlador) ────────────────────────────────────
// Devuelve todos los equipos en revisión/aprobados/malogrados de la sede

exports.getEquiposReciclados = async (req, res) => {
  try {
    const sede_id = req.user.sede_id
    const [rows] = await db.query(`
      SELECT
        er.id, er.tipo_equipo, er.codigo_pon, er.estado,
        er.comentario, er.created_at, er.recojo_id,
        r.cliente, r.direccion, r.codigo AS recojo_codigo,
        u.nombre AS tecnico,
        p.nombre AS producto, p.id AS producto_id
      FROM onus_recicladas er
      JOIN recojos r    ON er.recojo_id  = r.id
      JOIN usuarios u   ON r.tecnico_id  = u.id
      LEFT JOIN productos p ON er.producto_id = p.id
      WHERE er.sede_id = ?
      ORDER BY er.created_at DESC
    `, [sede_id])
    res.json(rows)
  } catch (err) {
    console.error("❌ Error getEquiposReciclados:", err.message)
    res.status(500).json({ message: "Error al obtener equipos reciclados", error: err.message })
  }
}

// ── revisarEquipo (controlador aprueba o marca como malogrado) ────────────

exports.revisarEquipo = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { id }                 = req.params
    const { estado, comentario } = req.body
    const revisado_por           = req.user.id
    const sede_id                = req.user.sede_id

    if (!["aprobada", "malograda"].includes(estado))
      return res.status(400).json({ message: "Estado inválido" })

    const [[equipo]] = await conn.query(
      "SELECT * FROM onus_recicladas WHERE id = ? AND sede_id = ?",
      [id, sede_id]
    )
    if (!equipo)
      return res.status(404).json({ message: "Equipo no encontrado" })
    if (equipo.estado !== "revision")
      return res.status(400).json({ message: "Este equipo ya fue revisado" })

    await conn.query(
      `UPDATE onus_recicladas
       SET estado = ?, comentario = ?, revisado_por = ?
       WHERE id = ?`,
      [estado, comentario || null, revisado_por, id]
    )

    if (estado === "aprobada" && equipo.producto_id) {
      if (equipo.tipo_equipo === "ONU") {
        // ONUs: reactivar en tabla onus o crear nueva
        if (equipo.onu_id) {
          await conn.query(
            `UPDATE onus
             SET tecnico_id = NULL, activacion_id = NULL, averia_id = NULL,
                 sede_id = ?, cliente = NULL
             WHERE id = ?`,
            [sede_id, equipo.onu_id]
          )
        } else {
          await conn.query(
            `INSERT INTO onus (codigo_pon, producto_id, sede_id) VALUES (?, ?, ?)`,
            [equipo.codigo_pon || null, equipo.producto_id, sede_id]
          )
        }
      }

      // Todos los tipos aprobados: sumar +1 al stock_sede y stock_total
      const [[stockExiste]] = await conn.query(
        "SELECT id FROM stock_sede WHERE sede_id = ? AND producto_id = ?",
        [sede_id, equipo.producto_id]
      )
      if (stockExiste) {
        await conn.query(
          "UPDATE stock_sede SET cantidad = cantidad + 1 WHERE sede_id = ? AND producto_id = ?",
          [sede_id, equipo.producto_id]
        )
      } else {
        await conn.query(
          "INSERT INTO stock_sede (sede_id, producto_id, cantidad) VALUES (?, ?, 1)",
          [sede_id, equipo.producto_id]
        )
      }
      await conn.query(
        "UPDATE productos SET stock_total = stock_total + 1 WHERE id = ?",
        [equipo.producto_id]
      )
    }

    await conn.commit()
    res.json({ message: `Equipo marcado como ${estado}` })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error revisarEquipo:", err.message)
    res.status(500).json({ message: "Error al revisar equipo", error: err.message })
  } finally {
    conn.release()
  }
}

// ── getAllAdmin ────────────────────────────────────────────────────────────

exports.getAllAdmin = async (req, res) => {
  try {
    const { sede_id } = req.query
    const [rows] = await db.query(`
      SELECT r.id, r.codigo, r.cliente, r.direccion, r.serie, r.tipo_equipo,
             r.estado, r.comentario, r.created_at,
             u.nombre as tecnico, u.id as tecnico_id,
             s.nombre as sede_nombre
      FROM recojos r
      JOIN usuarios u ON r.tecnico_id = u.id
      JOIN sedes s ON s.id = u.sede_id
      ${sede_id && sede_id !== "todas" ? "WHERE u.sede_id = ?" : ""}
      ORDER BY r.created_at DESC
    `, sede_id && sede_id !== "todas" ? [sede_id] : [])

    for (const r of rows) {
      r.fotos = await getFotos(db, "recojo", r.id)
    }
    res.json(rows)
  } catch (err) {
    console.error("❌ Error getAllAdmin recojos:", err.message)
    res.status(500).json({ message: "Error al obtener recojos", error: err.message })
  }
}

// Mantener aliases para compatibilidad con rutas existentes
exports.getOnusRecicladas = exports.getEquiposReciclados
exports.revisarOnu        = exports.revisarEquipo

// ── eliminarEntrada ────────────────────────────────────────────────────────

exports.eliminarEntrada = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const { id } = req.params

    // Verificar que existe
    const [[recojo]] = await conn.query(
      "SELECT id, grupo_orden FROM recojos WHERE id = ?", [id]
    )
    if (!recojo)
      return res.status(404).json({ message: "Entrada no encontrada" })

    // Eliminar fotos asociadas
    await conn.query(
      "DELETE FROM fotos_registro WHERE tipo = 'recojo' AND registro_id = ?", [id]
    )

    // Eliminar de onus_recicladas si existe
    await conn.query(
      "DELETE FROM onus_recicladas WHERE recojo_id = ?", [id]
    )

    // Eliminar el recojo
    await conn.query("DELETE FROM recojos WHERE id = ?", [id])

    await conn.commit()
    res.json({ message: "Entrada eliminada correctamente" })
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error eliminarEntrada:", err.message)
    res.status(500).json({ message: "Error al eliminar entrada", error: err.message })
  } finally {
    conn.release()
  }
}