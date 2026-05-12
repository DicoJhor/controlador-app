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

// ── Inventario ─────────────────────────────────────────────────────────────

exports.getMiInventario = async (req, res) => {
  try {
    const tecnico_id = req.user.id
    const [rows] = await db.query(`
      SELECT
        a.id,
        p.id       AS producto_id,
        p.codigo,
        p.nombre,
        p.unidad,
        p.es_medible,
        p.categoria,
        p.metros_por_unidad,
        a.cantidad AS asignado_unidades,
        CASE
          WHEN p.es_medible = 1 AND p.metros_por_unidad IS NOT NULL
          THEN a.cantidad * p.metros_por_unidad
          ELSE a.cantidad
        END             AS asignado,
        COALESCE(SUM(c.cantidad), 0) AS usado
      FROM asignaciones_tecnicos a
      JOIN productos p ON a.producto_id = p.id
      LEFT JOIN consumo_tecnico c
        ON c.producto_id = p.id AND c.tecnico_id = a.tecnico_id
      WHERE a.tecnico_id = ?
      GROUP BY a.id, p.id
    `, [tecnico_id])

    const inventario = rows.map(r => ({
      ...r,
      asignado:          parseFloat(r.asignado),
      asignado_unidades: parseFloat(r.asignado_unidades),
      metros_por_unidad: r.metros_por_unidad ? parseFloat(r.metros_por_unidad) : null,
      usado:             parseFloat(r.usado),
      disponible:        parseFloat(r.asignado) - parseFloat(r.usado),
      es_medible:        Boolean(r.es_medible),
    }))

    res.json(inventario)
  } catch (err) {
    console.error("❌ getMiInventario:", err.message)
    res.status(500).json({ message: "Error al obtener inventario", error: err.message })
  }
}

// ── Historial ──────────────────────────────────────────────────────────────

exports.getMiHistorial = async (req, res) => {
  try {
    const tecnico_id = req.user.id

    const [activaciones] = await db.query(`
      SELECT
        a.id, a.fecha, a.codigo, a.cliente, a.direccion,
        a.nro_orden, a.comentario,
        o.servicio,
        'activacion' AS tipo
      FROM activaciones a
      LEFT JOIN ordenes_servicio o ON o.id = a.orden_id
      WHERE a.tecnico_id = ?
      ORDER BY a.fecha DESC
    `, [tecnico_id])

    const [averias] = await db.query(`
      SELECT
        av.id, av.fecha, av.codigo, av.cliente, av.direccion,
        av.nro_orden, av.comentario,
        o.servicio,
        'averia' AS tipo
      FROM averias av
      LEFT JOIN ordenes_servicio o ON o.id = av.orden_id
      WHERE av.tecnico_id = ?
      ORDER BY av.fecha DESC
    `, [tecnico_id])

    // Combinar y ordenar por fecha desc
    const historial = [...activaciones, ...averias]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

    res.json(historial)
  } catch (err) {
    console.error("❌ getMiHistorial:", err.message)
    res.status(500).json({ message: "Error al obtener historial", error: err.message })
  }
}

// ── Registrar salida simple ────────────────────────────────────────────────

const MOTIVOS_VALIDOS = ['averia', 'instalacion', 'activacion', 'reconexion', 'cambio_onu']

exports.registrarSalida = async (req, res) => {
  try {
    const tecnico_id = req.user.id
    const { producto_id, cantidad, motivo, comentario } = req.body

    if (!producto_id || !cantidad || !motivo)
      return res.status(400).json({ message: "Faltan campos obligatorios" })

    if (!MOTIVOS_VALIDOS.includes(motivo))
      return res.status(400).json({ message: `Motivo inválido: ${motivo}. Válidos: ${MOTIVOS_VALIDOS.join(', ')}` })

    const [[asignacion]] = await db.query(
      "SELECT cantidad FROM asignaciones_tecnicos WHERE tecnico_id = ? AND producto_id = ?",
      [tecnico_id, producto_id]
    )
    if (!asignacion)
      return res.status(400).json({ message: "No tenés ese ítem asignado" })

    const [[{ consumido }]] = await db.query(
      "SELECT COALESCE(SUM(cantidad), 0) AS consumido FROM consumo_tecnico WHERE tecnico_id = ? AND producto_id = ?",
      [tecnico_id, producto_id]
    )
    const disponible = parseFloat(asignacion.cantidad) - parseFloat(consumido)
    if (parseFloat(cantidad) > disponible)
      return res.status(400).json({ message: `Stock insuficiente. Disponible: ${disponible}` })

    await db.query(
      "INSERT INTO consumo_tecnico (tecnico_id, producto_id, cantidad, motivo, descripcion, fecha) VALUES (?, ?, ?, ?, ?, NOW())",
      [tecnico_id, producto_id, cantidad, motivo, comentario || null]
    )
    res.json({ message: "Salida registrada correctamente" })
  } catch (err) {
    console.error("❌ registrarSalida:", err.message)
    res.status(500).json({ message: "Error al registrar salida", error: err.message })
  }
}

// ── Registrar avería (múltiples fotos + código) ────────────────────────────

exports.registrarSalidaMultiple = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const tecnico_id = req.user.id
    const { comentario, nro_orden, cliente, direccion, onu_id } = req.body

    const itemsParsed = typeof req.body.items === "string"
      ? JSON.parse(req.body.items)
      : (req.body.items || [])

    const onuIdsParsed = typeof req.body.onu_ids === "string"
      ? JSON.parse(req.body.onu_ids)
      : (req.body.onu_ids || [])

    const onuId = onu_id ? Number(onu_id)
      : (onuIdsParsed.length > 0 ? Number(onuIdsParsed[0]) : null)

    if (!itemsParsed.length && !onuId)
      return res.status(400).json({ message: "Agregá al menos un material" })

    // ── Validar ONU si viene ───────────────────────────────────────────────
    if (onuId) {
      const [[onu]] = await conn.query(
        `SELECT id FROM onus
         WHERE id = ? AND tecnico_id = ? AND averia_id IS NULL AND activacion_id IS NULL`,
        [onuId, tecnico_id]
      )
      if (!onu) {
        await conn.rollback()
        return res.status(400).json({ message: "La ONU seleccionada no está disponible" })
      }
    }

    // ── Verificar stock para cada ítem normal ──────────────────────────────
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
        "SELECT COALESCE(SUM(cantidad), 0) AS consumido FROM consumo_tecnico WHERE tecnico_id = ? AND producto_id = ?",
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

    // ── Generar código AV-2026-00001 ───────────────────────────────────────
    const codigo = await generarCodigo(conn, "AV", "averias")

    // ── Crear avería (con cliente, direccion y onu_id si vienen) ──────────
    const [result] = await conn.query(
      `INSERT INTO averias
         (codigo, tecnico_id, comentario, nro_orden, cliente, direccion, onu_id, fecha)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [codigo, tecnico_id, comentario || null, nro_orden || null,
       cliente || null, direccion || null, onuId]
    )
    const averia_id = result.insertId

    // ── Guardar hasta 5 fotos ──────────────────────────────────────────────
    await moverYGuardarFotos(conn, {           // ✅ CAMBIAR
      tipo:        "averia",
      registro_id: averia_id,
      sede_id:     req.user.sede_id,
      cliente:     cliente,
      archivos:    req.files || [],
    })

    // ── Registrar materiales normales y consumo ────────────────────────────
    for (const item of itemsParsed) {
      await conn.query(
        "INSERT INTO averia_materiales (averia_id, producto_id, cantidad) VALUES (?, ?, ?)",
        [averia_id, item.producto_id, item.cantidad]
      )
      await conn.query(
        `INSERT INTO consumo_tecnico
           (tecnico_id, producto_id, cantidad, motivo, descripcion, fecha)
         VALUES (?, ?, ?, 'averia', ?, NOW())`,
        [tecnico_id, item.producto_id, item.cantidad, comentario || null]
      )
    }
    // Vincular ONU a la avería y al cliente
    if (onuId) {
      await conn.query(
        `UPDATE onus SET averia_id = ?, cliente = ?, tecnico_id = NULL WHERE id = ?`,
        [averia_id, cliente || null, onuId]
      )

      // Descontar del inventario del técnico
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
           VALUES (?, ?, 1, 'averia', ?, NOW())`,
          [tecnico_id, onuProducto.producto_id, `Avería ${codigo} — ${cliente || "—"}`]
        )
      }
    }

    // ── Registrar ONU recogida del cliente → equipos reciclados ──────────
    const onuRecogidaProductoId = req.body.onu_recogida_producto_id
      ? Number(req.body.onu_recogida_producto_id) : null
    const onuRecogidaCodigoPon  = req.body.onu_recogida_codigo_pon || null

    if (onuRecogidaProductoId && onuRecogidaCodigoPon) {
      const sede_id = req.user.sede_id
      await conn.query(
        `INSERT INTO onus_recicladas
           (recojo_id, tipo_equipo, onu_id, codigo_pon, producto_id, sede_id, estado)
         VALUES (NULL, 'ONU', NULL, ?, ?, ?, 'revision')`,
        [onuRecogidaCodigoPon, onuRecogidaProductoId, sede_id]
      )
    }

    await conn.commit()
    res.json({ message: "Avería registrada correctamente", codigo })
  } catch (err) {
    await conn.rollback()
    console.error("❌ registrarSalidaMultiple:", err.message)
    res.status(500).json({ message: "Error al registrar avería", error: err.message })
  } finally {
    conn.release()
  }
}

// ── Averías para controlador ───────────────────────────────────────────────

exports.getAverias = async (req, res) => {
  try {
    const sede_id = req.user.sede_id
    const [rows] = await db.query(`
      SELECT
        av.id, av.codigo, av.nro_orden, av.fecha, av.comentario,
        av.cliente, av.direccion,
        u.nombre AS tecnico, u.id AS tecnico_id
      FROM averias av
      JOIN usuarios u ON u.id = av.tecnico_id
      WHERE u.sede_id = ?
      ORDER BY av.fecha DESC
    `, [sede_id])

    for (const av of rows) {
      const [mats] = await db.query(`
        SELECT p.nombre, p.unidad, p.es_medible, am.cantidad
        FROM averia_materiales am
        JOIN productos p ON p.id = am.producto_id
        WHERE am.averia_id = ?
      `, [av.id])
      av.materiales = mats.map(m => ({ ...m, cantidad: parseFloat(m.cantidad) }))
      av.fotos = await getFotos(db, "averia", av.id)
    }

    res.json(rows)
  } catch (err) {
    console.error("❌ getAverias:", err.message)
    res.status(500).json({ message: "Error al obtener averías", error: err.message })
  }
}

exports.getAveriasAdmin = async (req, res) => {
  try {
    const { sede_id } = req.query
    const filtro = sede_id && sede_id !== "todas" ? "WHERE u.sede_id = ?" : ""
    const params = sede_id && sede_id !== "todas" ? [sede_id] : []

    const [rows] = await db.query(`
      SELECT av.id, av.codigo, av.nro_orden, av.fecha, av.comentario,
             av.cliente, av.direccion,
             u.nombre AS tecnico, u.id AS tecnico_id,
             s.nombre AS sede_nombre
      FROM averias av
      JOIN usuarios u ON u.id = av.tecnico_id
      JOIN sedes s ON s.id = u.sede_id
      ${filtro}
      ORDER BY av.fecha DESC
    `, params)

    for (const av of rows) {
      const [mats] = await db.query(`
        SELECT p.nombre, p.unidad, p.es_medible, am.cantidad
        FROM averia_materiales am
        JOIN productos p ON p.id = am.producto_id
        WHERE am.averia_id = ?
      `, [av.id])
      av.materiales = mats.map(m => ({ ...m, cantidad: parseFloat(m.cantidad) }))
      av.fotos = await getFotos(db, "averia", av.id)
    }

    res.json(rows)
  } catch (err) {
    console.error("❌ getAveriasAdmin:", err.message)
    res.status(500).json({ message: "Error al obtener averías", error: err.message })
  }
}

exports.getCatalogoOnus = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, nombre FROM productos WHERE categoria = 'onu' AND estado = 1 ORDER BY nombre ASC"
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ message: "Error al obtener catálogo ONUs", error: err.message })
  }
}

// ── Órdenes pendientes para técnico ───────────────────────────────────────

exports.getOrdenesPendientes = async (req, res) => {
  try {
    const sede_id = req.user.sede_id   // ← filtra por sede, no por técnico

    const [rows] = await db.query(`
      SELECT
        os.id, os.nro_orden, os.nro_contrato, os.abonado,
        os.doc_identidad, os.telefono, os.servicio, os.tecnologia,
        os.sector, os.direccion, os.referencia, os.observacion,
        os.estado_app,
        ar.ip_local, ar.mascara, ar.gateway,
        ar.modelo_onu, ar.perfil_onu, ar.id AS red_id
      FROM ordenes_servicio os
      LEFT JOIN activacion_red ar ON ar.orden_id = os.id
      WHERE os.sede_id = ? AND os.estado_app = 'pendiente'
      ORDER BY os.created_at ASC
    `, [sede_id])

    res.json(rows)
  } catch (err) {
    console.error("❌ getOrdenesPendientes:", err.message)
    res.status(500).json({ message: "Error al obtener órdenes", error: err.message })
  }
}

// ── Completar orden ────────────────────────────────────────────────────────

exports.completarOrden = async (req, res) => {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const tecnico_id = req.user.id
    const orden_id   = req.params.id

    // Verificar que la orden pertenece al técnico
    const [[orden]] = await conn.query(
      `SELECT id, nro_orden, nro_contrato, abonado, direccion, servicio
      FROM ordenes_servicio
      WHERE id = ? AND estado_app = 'pendiente'`,
      [orden_id]
    )
    if (!orden) {
      await conn.rollback()
      return res.status(404).json({ message: "Orden no encontrada o ya completada" })
    }

    const itemsParsed    = typeof req.body.items === "string"
      ? JSON.parse(req.body.items) : (req.body.items || [])
    const onuId          = req.body.onu_id ? Number(req.body.onu_id) : null
    const comentario     = req.body.comentario || null
    const esCambioEquipo = (orden.servicio ?? "").toUpperCase().includes("CAMBIO DE EQUIPO")

    // Verificar ONU si viene
    if (onuId) {
      const [[onu]] = await conn.query(
        `SELECT id FROM onus
         WHERE id = ? AND tecnico_id = ? AND activacion_id IS NULL AND averia_id IS NULL`,
        [onuId, tecnico_id]
      )
      if (!onu) {
        await conn.rollback()
        return res.status(400).json({ message: "La ONU seleccionada no está disponible" })
      }
    }

    // Verificar y descontar stock de materiales
    for (const item of itemsParsed) {
      const [[asig]] = await conn.query(
        `SELECT a.cantidad, p.es_medible, p.metros_por_unidad
         FROM asignaciones_tecnicos a
         JOIN productos p ON p.id = a.producto_id
         WHERE a.tecnico_id = ? AND a.producto_id = ?`,
        [tecnico_id, item.producto_id]
      )
      if (!asig) {
        await conn.rollback()
        return res.status(400).json({ message: `No tenés el ítem ID ${item.producto_id} asignado` })
      }
      const [[{ consumido }]] = await conn.query(
        "SELECT COALESCE(SUM(cantidad), 0) AS consumido FROM consumo_tecnico WHERE tecnico_id = ? AND producto_id = ?",
        [tecnico_id, item.producto_id]
      )
      const mpu        = parseFloat(asig.metros_por_unidad) || 1
      const asignado   = asig.es_medible
        ? parseFloat(asig.cantidad) * mpu
        : parseFloat(asig.cantidad)
      const disponible = asignado - parseFloat(consumido)
      if (parseFloat(item.cantidad) > disponible) {
        await conn.rollback()
        return res.status(400).json({ message: `Stock insuficiente para ítem ID ${item.producto_id}. Disponible: ${disponible}` })
      }
    }

    // Generar código de activación
    const codigo = await generarCodigo(conn, "ACT", "activaciones")

    // Crear activación
    const [result] = await conn.query(
      `INSERT INTO activaciones
         (codigo, nro_orden, nro_contrato, orden_id, tecnico_id,
          cliente, direccion, comentario, estado, onu_id, fecha)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completada', ?, NOW())`,
      [codigo, orden.nro_orden, orden.nro_contrato, orden_id,
       tecnico_id, orden.abonado, orden.direccion, comentario, onuId]
    )
    const activacion_id = result.insertId

    // Registrar materiales y consumo
    for (const item of itemsParsed) {
      await conn.query(
        "INSERT INTO activacion_materiales (activacion_id, producto_id, cantidad) VALUES (?, ?, ?)",
        [activacion_id, item.producto_id, item.cantidad]
      )
      await conn.query(
        `INSERT INTO consumo_tecnico
           (tecnico_id, producto_id, cantidad, motivo, descripcion, fecha)
         VALUES (?, ?, ?, 'activacion', ?, NOW())`,
        [tecnico_id, item.producto_id, item.cantidad, comentario]
      )
    }

    // Vincular ONU (solo instalaciones — cambio de equipo lo maneja más abajo)
    if (onuId && !esCambioEquipo) {
      await conn.query(
        `UPDATE onus SET activacion_id = ?, cliente = ?, tecnico_id = NULL WHERE id = ?`,
        [activacion_id, orden.abonado, onuId]
      )
      const [[onuProd]] = await conn.query("SELECT producto_id FROM onus WHERE id = ?", [onuId])
      if (onuProd) {
        await conn.query(
          `UPDATE asignaciones_tecnicos SET cantidad = cantidad - 1 WHERE tecnico_id = ? AND producto_id = ?`,
          [tecnico_id, onuProd.producto_id]
        )
        await conn.query(
          `INSERT INTO consumo_tecnico (tecnico_id, producto_id, cantidad, motivo, descripcion, fecha)
          VALUES (?, ?, 1, 'activacion', ?, NOW())`,
          [tecnico_id, onuProd.producto_id, `Activación ${codigo} — ${orden.abonado}`]
        )
      }
    }
    // Guardar fotos
    await moverYGuardarFotos(conn, {
      tipo:        "activacion",
      registro_id: activacion_id,
      sede_id:     req.user.sede_id,
      cliente:     orden.abonado,
      archivos:    req.files || [],
    })

    // ONU recogida (cambio de equipo)
    const onuRecogidaPon        = req.body.onu_recogida_codigo_pon || null
    const onuRecogidaProductoId = req.body.onu_recogida_producto_id
      ? Number(req.body.onu_recogida_producto_id) : null

    if (onuRecogidaPon) {
      // 1. Crear recojo y reciclado de la ONU vieja
      const codigoRecojo = `REC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      const [recojoIns] = await conn.query(
        `INSERT INTO recojos
          (codigo, tecnico_id, cliente, direccion, tipo_equipo, codigo_pon,
            producto_id, estado, registrado_por)
        VALUES (?, ?, ?, ?, 'ONU', ?, ?, 'recogido', ?)`,
        [codigoRecojo, tecnico_id, orden.abonado || null, orden.direccion || null,
        onuRecogidaPon, onuRecogidaProductoId || null, tecnico_id]
      )
      const recojoId = recojoIns.insertId

      await conn.query(
        `INSERT INTO onus_recicladas
          (recojo_id, tipo_equipo, codigo_pon, producto_id, sede_id, estado, estado_tecnico)
        VALUES (?, 'ONU', ?, ?, ?, 'revision', 'en_mano')`,
        [recojoId, onuRecogidaPon, onuRecogidaProductoId || null, req.user.sede_id]
      )

      // 2. Desvincular ONU vieja del cliente
      await conn.query(
        `UPDATE onus
        SET activacion_id = NULL, averia_id = NULL, cliente = NULL, tecnico_id = NULL
        WHERE codigo_pon = ?`,
        [onuRecogidaPon]
      )
    }

    // 3. Si es cambio de equipo y hay ONU nueva, actualizar la activación recién creada
    if (esCambioEquipo && onuId) {
      await conn.query(
        `UPDATE activaciones SET onu_id = ? WHERE id = ?`,
        [onuId, activacion_id]
      )
      // Vincular ONU nueva al cliente y a la activación
      await conn.query(
        `UPDATE onus SET activacion_id = ?, cliente = ?, tecnico_id = NULL WHERE id = ?`,
        [activacion_id, orden.abonado, onuId]
      )
      // Descontar del inventario del técnico
      const [[onuProd]] = await conn.query(
        "SELECT producto_id FROM onus WHERE id = ?", [onuId]
      )
      if (onuProd) {
        await conn.query(
          `UPDATE asignaciones_tecnicos SET cantidad = cantidad - 1
          WHERE tecnico_id = ? AND producto_id = ?`,
          [tecnico_id, onuProd.producto_id]
        )
        await conn.query(
          `INSERT INTO consumo_tecnico (tecnico_id, producto_id, cantidad, motivo, descripcion, fecha)
          VALUES (?, ?, 1, 'instalacion', ?, NOW())`,
          [tecnico_id, onuProd.producto_id, `Cambio ONU orden #${orden.nro_orden} — ${orden.abonado}`]
        )
      }
    }

    // Leer coordenadas del body
    const lat = req.body.lat ? parseFloat(req.body.lat) : null
    const lng = req.body.lng ? parseFloat(req.body.lng) : null

    console.log("📍 lat:", req.body.lat, "→", lat, "| lng:", req.body.lng, "→", lng)

    // Marcar orden como completada
    await conn.query(
      `UPDATE ordenes_servicio
      SET estado_app = 'completada', tecnico_id = ?, activacion_id = ?, completada_en = NOW(),
          lat = ?, lng = ?
      WHERE id = ?`,
      [tecnico_id, activacion_id, lat, lng, orden_id]  // ← agregá lat y lng acá
    )

    await conn.commit()
    res.json({ message: "Orden completada correctamente", codigo })
  } catch (err) {
    await conn.rollback()
    console.error("❌ completarOrden:", err.message)
    res.status(500).json({ message: "Error al completar orden", error: err.message })
  } finally {
    conn.release()
  }
}