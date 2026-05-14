const express = require("express");
const XLSX = require("xlsx");
const router = express.Router();
const db = require("../config/db");
const { authMiddleware, requireRol } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { moverYGuardarFotos } = require("../helpers/fotos");

function limpiar(val) {
  return String(val ?? "").replace(/\r\n|\r|\n/g, " ").replace(/\s+/g, " ").trim();
}

function parsearExcel(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const headerRowIdx = rawRows.findIndex(row =>
    row.some(c => String(c).includes("Nº de Orden") || String(c).includes("Abonado"))
  );
  if (headerRowIdx === -1) throw new Error("Formato de Excel no reconocido: no se encontraron los encabezados.");

  const headers = rawRows[headerRowIdx];
  const dataRows = rawRows.slice(headerRowIdx + 1);

  const COL = {
    "Sector": "sector",
    "Via": "via",
    "Direccion": "direccion",
    "Referencia": "referencia",
    "Nº de Orden": "nro_orden",
    "Estado Orden": "estado_orden",
    "Servicio": "servicio",
    "Tecnologia": "tecnologia",
    "Fecha Crea": "fecha_crea",
    "Tecnico Jefe": "tecnico_jefe",
    "Tecnico Asistente": "tecnico_asistente",
    "Abonado": "abonado",
    "Doc. Identidad": "doc_identidad",
    "Telefono": "telefono",
    "Nº Contrato": "nro_contrato",
    "Estado Contrato": "estado_contrato",
    "Observacion Inicial": "observacion",
  };

  return dataRows
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        const key = COL[String(h).trim()];
        if (key) obj[key] = limpiar(row[i]);
      });
      return obj;
    })
    .filter(r => r.nro_contrato && r.nro_contrato !== "0" && r.nro_orden);
}

/* ── POST /admin/ordenes/upload ─────────────────────────────────────────── */
router.post(
  "/admin/ordenes/upload",
  authMiddleware,
  requireRol(["admin", "superadmin", "controlador", "secretaria"]),
  upload.single("archivo"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No se recibió ningún archivo." });

    let filas;
    try {
      const buffer = require("fs").readFileSync(req.file.path);
      filas = parsearExcel(buffer);
    } catch (e) {
      return res.status(422).json({ error: e.message });
    }

    const sedeId = req.user.sede_id;
    const conn = await db.getConnection();
    const resumen = { insertadas: 0, actualizadas: 0, duplicadas: [] };
    console.log("🔍 sedeId del usuario:", sedeId, "| rol:", req.user.rol, "| user_id:", req.user.id); // ← ACÁ


    try {
      await conn.beginTransaction();

      for (const fila of filas) {
        const {
          nro_contrato, nro_orden, servicio, tecnologia,
          estado_orden, sector, via, direccion, referencia,
          abonado, doc_identidad, telefono, observacion,
          tecnico_jefe, tecnico_asistente, fecha_crea,
        } = fila;

        let clienteId = null;
        if (doc_identidad) {
          const [existentes] = await conn.execute(
            "SELECT id FROM clientes WHERE doc_identidad = ?",
            [doc_identidad]
          );
          if (existentes.length > 0) {
            clienteId = existentes[0].id;
            await conn.execute(
              "UPDATE clientes SET nombre = ?, telefono = ? WHERE id = ?",
              [abonado, telefono || null, clienteId]
            );
          } else {
            const [ins] = await conn.execute(
              "INSERT INTO clientes (doc_identidad, nombre, telefono, sede_id) VALUES (?,?,?,?)",
              [doc_identidad, abonado, telefono || null, sedeId]
            );
            clienteId = ins.insertId;
          }
        }
        console.log("Buscando duplicado:", { nro_contrato, fecha_crea, sedeId });

        // Buscar duplicado por CONTRATO + FECHA (sin nro_orden)
        const [dup] = await conn.execute(
          `SELECT id, estado_app
           FROM ordenes_servicio
           WHERE nro_contrato = ? AND fecha_crea = ? AND sede_id = ?`,
          [nro_contrato, fecha_crea, sedeId]
        );

        console.log("Resultado dup:", dup); // ← Y ACÁ

        if (dup.length > 0) {
          // ES DUPLICADO detectado por SELECT
          resumen.duplicadas.push({
            orden_id: dup[0].id,
            estado_app: dup[0].estado_app,
            nro_contrato, nro_orden, abonado, fecha_crea,
            servicio, tecnologia, estado_orden,
            sector, via, direccion, referencia,
            doc_identidad, telefono, observacion,
            tecnico_jefe, tecnico_asistente,
          });
        } else {
          try {
            await conn.execute(
              `INSERT INTO ordenes_servicio
                (nro_orden, nro_contrato, cliente_id, abonado, doc_identidad, telefono,
                  servicio, tecnologia, estado_orden,
                  sector, via, direccion, referencia,
                  observacion, tecnico_jefe, tecnico_asistente,
                  fecha_crea, sede_id)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
              [
                nro_orden, nro_contrato, clienteId, abonado, doc_identidad || null, telefono || null,
                servicio, tecnologia || null, estado_orden,
                sector || null, via || null, direccion || null, referencia || null,
                observacion || null, tecnico_jefe || null, tecnico_asistente || null,
                fecha_crea || null, sedeId,
              ]
            );
            resumen.insertadas++;

            console.log("✅ Insertada:", nro_contrato); // ← ACÁ
          } catch (insertErr) {
            console.error("❌ Error insertando:", nro_contrato, insertErr.code, insertErr.message); // ← ACÁ
            if (insertErr.code === "ER_DUP_ENTRY") {
              const [dupTardio] = await conn.execute(
                `SELECT id, estado_app
                 FROM ordenes_servicio
                 WHERE nro_contrato = ? AND fecha_crea = ? AND sede_id = ?`,
                [nro_contrato, fecha_crea, sedeId]
              );
              resumen.duplicadas.push({
                orden_id: dupTardio[0]?.id ?? null,
                estado_app: dupTardio[0]?.estado_app ?? null,
                nro_contrato, nro_orden, abonado, fecha_crea,
                servicio, tecnologia, estado_orden,
                sector, via, direccion, referencia,
                doc_identidad, telefono, observacion,
                tecnico_jefe, tecnico_asistente,
              });
            } else {
              throw insertErr;
            }
          }
        }

      }  // ← cierra el fo

      // TODO el proceso fue bien, hacemos COMMIT
      await conn.commit();
      res.json({ ok: true, resumen });

    } catch (err) {
      // Si algo falló, hacemos ROLLBACK
      await conn.rollback();
      console.error(err);
      res.status(500).json({ error: "Error al procesar el Excel." });
    } finally {
      conn.release();
    }
  }
);

/* ── POST /admin/ordenes/upload/confirmar-duplicada ─────────────────────── */
router.post(
  "/admin/ordenes/upload/confirmar-duplicada",
  authMiddleware,
  requireRol(["admin", "superadmin", "controlador"]),
  async (req, res) => {
    console.log("BODY RECIBIDO:", JSON.stringify(req.body));
    const { orden_id, datos } = req.body;
    if (!datos) return res.status(400).json({ error: "Faltan datos." });
    
    // Si orden_id es null, buscar el registro existente
    let resolvedOrdenId = orden_id;
    if (!resolvedOrdenId && datos.nro_contrato && datos.fecha_crea) {
      const [found] = await db.execute(
        "SELECT id FROM ordenes_servicio WHERE nro_contrato = ? AND fecha_crea = ? AND sede_id = ?",
        [datos.nro_contrato, datos.fecha_crea, req.user.sede_id]
      );
      if (found.length === 0) return res.status(404).json({ error: "Orden no encontrada." });
      resolvedOrdenId = found[0].id;
    }
    if (!resolvedOrdenId) return res.status(400).json({ error: "No se pudo identificar la orden." });

    try {
      await db.execute(
        `UPDATE ordenes_servicio SET
          nro_orden=?, servicio=?, tecnologia=?, estado_orden=?,
          sector=?, via=?, direccion=?, referencia=?,
          abonado=?, doc_identidad=?, telefono=?,
          observacion=?, tecnico_jefe=?, tecnico_asistente=?,
          fecha_crea=?, estado_app='pendiente',
          averia_id=NULL, activacion_id=NULL,
          tecnico_id=NULL, completada_en=NULL,
          sede_id=?
        WHERE id=? AND sede_id=?`,
        [
          datos.nro_orden, datos.servicio, datos.tecnologia ?? null, datos.estado_orden,
          datos.sector ?? null, datos.via ?? null, datos.direccion ?? null, datos.referencia ?? null,
          datos.abonado, datos.doc_identidad ?? null, datos.telefono ?? null,
          datos.observacion ?? null, datos.tecnico_jefe ?? null, datos.tecnico_asistente ?? null,
          datos.fecha_crea ?? null,
          req.user.sede_id,
          resolvedOrdenId,
          req.user.sede_id,  // ← nuevo
        ]
      );
      res.json({ ok: true });
    } catch (err) {
      console.error("Error confirmando duplicado:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* ── GET /admin/ordenes ─────────────────────────────────────────────────── */
router.get(
  "/admin/ordenes",
  authMiddleware,
  requireRol(["admin", "superadmin", "controlador", "secretaria"]),
  async (req, res) => {
    console.log("🔍 GET /admin/ordenes - user:", req.user)
    const { estado, sede_id } = req.query;
    const rol = req.user.rol;
    const miSede = req.user.sede_id;

    const where = ["1=1"];
    const params = [];

    if (rol === "controlador" || rol === "secretaria") {
      where.push("o.sede_id = ?");
      params.push(miSede);
    } else if (sede_id) {
      where.push("o.sede_id = ?");
      params.push(sede_id);
    }

    if (estado && estado !== "todas") {
      where.push("o.estado_app = ?");
      params.push(estado);
    }

    try {
      const [rows] = await db.execute(
        `SELECT o.*,
                s.nombre AS sede_nombre,
                c.nombre AS cliente_nombre,
                u.nombre AS tecnico_nombre
         FROM ordenes_servicio o
         LEFT JOIN sedes s ON o.sede_id = s.id
         LEFT JOIN clientes c ON o.cliente_id = c.id
         LEFT JOIN usuarios u ON o.tecnico_id = u.id
         WHERE ${where.join(" AND ")}
         ORDER BY o.created_at DESC`,
        params
      );
      console.log("Órdenes enviadas:", rows.length);
      res.json(rows);
    } catch (err) {
      console.error("Error GET /admin/ordenes:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* ── GET /admin/ordenes/:id ─────────────────────────────────────────────── */
router.get(
  "/admin/ordenes/:id",
  authMiddleware,
  requireRol(["admin", "superadmin", "controlador", "secretaria"]),
  async (req, res) => {
    const { id } = req.params;
    const rol = req.user.rol;
    const miSede = req.user.sede_id;

    const sedeWhere = (rol === "controlador" || rol === "secretaria") ? "AND o.sede_id = ?" : "";
    const params = (rol === "controlador" || rol === "secretaria") ? [id, miSede] : [id];

    const [[orden]] = await db.execute(
      `SELECT o.*, s.nombre AS sede_nombre, u.nombre AS tecnico_nombre
       FROM ordenes_servicio o
       LEFT JOIN sedes s ON o.sede_id = s.id
       LEFT JOIN usuarios u ON o.tecnico_id = u.id
       WHERE o.id = ? ${sedeWhere}`,
      params
    );
    if (!orden) return res.status(404).json({ error: "Orden no encontrada." });

    let materiales = [];
    let fotos = [];
    let comentario_tecnico = null;

    if (orden.activacion_id) {
      const [[act]] = await db.execute(
        "SELECT comentario FROM activaciones WHERE id = ?",
        [orden.activacion_id]
      );
      const [mats] = await db.execute(
        `SELECT p.nombre, p.unidad, am.cantidad,
                o.codigo_pon
        FROM activacion_materiales am
        JOIN productos p ON am.producto_id = p.id
        LEFT JOIN onus o ON o.activacion_id = am.activacion_id
                  AND o.producto_id = am.producto_id
                  AND p.categoria = 'onu'
        WHERE am.activacion_id = ?`,
        [orden.activacion_id]
      );
      const [fts] = await db.execute(
        `SELECT ruta FROM fotos_registro
         WHERE tipo = 'activacion' AND registro_id = ?`,
        [orden.activacion_id]
      );
      materiales = mats;
      fotos = fts;
      comentario_tecnico = act?.comentario || null;
    } else if (orden.averia_id) {
      const [[av]] = await db.execute(
        "SELECT comentario FROM averias WHERE id = ?",
        [orden.averia_id]
      );
      const [mats] = await db.execute(
        `SELECT p.nombre, p.unidad, am.cantidad
        FROM averia_materiales am
        JOIN productos p ON am.producto_id = p.id
        WHERE am.averia_id = ?`,
        [orden.averia_id]
      );
      const [fts] = await db.execute(
        `SELECT ruta FROM fotos_registro
         WHERE tipo = 'averia' AND registro_id = ?`,
        [orden.averia_id]
      );
      materiales = mats;
      fotos = fts;
      comentario_tecnico = av?.comentario || null;
    }

    res.json({ ...orden, materiales, fotos, comentario_tecnico });
  }
);

/* ── GET /tecnico/ordenes-recojos ────────────────────────────────────────── */
router.get(
  "/tecnico/ordenes-recojos",
  authMiddleware,
  async (req, res) => {
    const sedeId = req.user.sede_id;
    const [rows] = await db.execute(
      `SELECT id, nro_orden, nro_contrato, servicio, tecnologia,
              sector, via, direccion, referencia,
              abonado, doc_identidad, telefono,
              observacion, fecha_crea, estado_app
       FROM ordenes_servicio
       WHERE sede_id = ? AND estado_app = 'pendiente'
         AND servicio LIKE '%RETIRO DE EQUIPO%'
       ORDER BY fecha_crea DESC, nro_orden ASC`,
      [sedeId]
    );
    res.json(rows);
  }
);

router.get(
  "/tecnico/catalogo-productos",
  authMiddleware,
  async (req, res) => {
    try {
      const [rows] = await db.execute(
        `SELECT id, nombre, categoria, unidad
         FROM productos
         WHERE estado = 1
         ORDER BY categoria, nombre ASC`
      );
      res.json(rows);
    } catch (err) {
      console.error("Error catalogo-productos:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

/* ── GET /tecnico/ordenes/:id/red ────────────────────────────────────────── */
router.get(
  "/tecnico/ordenes/:id/red",
  authMiddleware,
  async (req, res) => {
    const ordenId = req.params.id;
    const sedeId  = req.user.sede_id;
    try {
      const [[orden]] = await db.execute(
        "SELECT id FROM ordenes_servicio WHERE id = ? AND sede_id = ?",
        [ordenId, sedeId]
      );
      if (!orden) return res.status(404).json({ error: "Orden no encontrada." });

      const [[red]] = await db.execute(
        `SELECT ip_local, mascara, gateway, modelo_onu, perfil_onu, notas
         FROM activacion_red WHERE orden_id = ?`,
        [ordenId]
      );
      if (!red) return res.status(404).json({ error: "Sin datos de red." });

      res.json(red);
    } catch (err) {
      console.error("Error GET /tecnico/ordenes/:id/red:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* ── POST /tecnico/ordenes/:id/completar ─────────────────────────────────── */
router.post(
  "/tecnico/ordenes/:id/completar",
  authMiddleware,
  upload.array("fotos", 5),
  async (req, res) => {
    console.log("🚀 ENTRÓ AL HANDLER");
    console.log("📦 RAW BODY COMPLETO:", JSON.stringify(req.body));
    console.log("📁 FILES:", req.files?.length ?? 0, "archivos");
    const ordenId = req.params.id;
    const tecnicoId = req.user.id;
    const sedeId = req.user.sede_id;
    const body = req.body || {};
    console.log("=== DEBUG COMPLETAR ORDEN ===");
    console.log("BODY:", JSON.stringify(body));
    console.log("onu_recogida_codigo_pon:", body.onu_recogida_codigo_pon);

    const [[orden]] = await db.execute(
      "SELECT * FROM ordenes_servicio WHERE id = ? AND estado_app = 'pendiente'",
      [ordenId]
    );
    if (!orden)
      return res.status(404).json({ error: "Orden no encontrada o ya completada." });

    const u = (orden.servicio ?? "").toUpperCase();
    const esCambioOnu = u.includes("CAMBIO DE EQUIPO");
    const esRetiroEquipo = u.includes("RETIRO DE EQUIPO");
    const esAveria = u.includes("AVERIA") || esCambioOnu;

    let items = [];
    try {
      if (body.items) items = typeof body.items === "string" ? JSON.parse(body.items) : body.items;
    } catch (e) { console.error("Error parseando items:", e); }

    const comentario = body.comentario || null;
    const onuId = body.onu_id ? Number(body.onu_id) : null;
    const lat = body.lat ? parseFloat(body.lat) : null;
    const lng = body.lng ? parseFloat(body.lng) : null;
    console.log("📍 lat:", body.lat, "→", lat, "| lng:", body.lng, "→", lng);

    const onuRecogidaPon = body.onu_recogida_codigo_pon || null;
    const onuRecogidaProductoId = body.onu_recogida_producto_id ? Number(body.onu_recogida_producto_id) : null;

    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      let registroId = null;
      let codigo = null;

      if (esAveria) {
        codigo = `AV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        const [ins] = await conn.execute(
          `INSERT INTO averias
             (codigo, nro_orden, nro_contrato, cliente_id, orden_id, tecnico_id,
              cliente, direccion, comentario, onu_id)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [codigo, orden.nro_orden, orden.nro_contrato, orden.cliente_id || null,
          Number(ordenId), tecnicoId, orden.abonado || null, orden.direccion || null, comentario, onuId]
        );
        registroId = ins.insertId;

        for (const item of items) {
          if (!item.producto_id || !item.cantidad) continue;
          await conn.execute(
            "INSERT INTO averia_materiales (averia_id, producto_id, cantidad) VALUES (?,?,?)",
            [registroId, Number(item.producto_id), Number(item.cantidad)]
          );
          await conn.execute(
            `UPDATE asignaciones_tecnicos SET cantidad = cantidad - ?
             WHERE tecnico_id = ? AND producto_id = ?`,
            [Number(item.cantidad), tecnicoId, Number(item.producto_id)]
          );
        }

        if ((esCambioOnu || esRetiroEquipo) && onuRecogidaPon) {
          console.log("========== DEBUG CAMBIO ONU ==========");
          console.log("1. onuRecogidaPon:", onuRecogidaPon);
          console.log("2. onuRecogidaProductoId:", onuRecogidaProductoId);
          console.log("3. tecnicoId:", tecnicoId);
          console.log("4. sedeId:", sedeId);

          const codigoRecojo = `REC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
          console.log("5. codigoRecojo generado:", codigoRecojo);

          const [recojoIns] = await conn.execute(
            `INSERT INTO recojos
              (codigo, tecnico_id, cliente, direccion, tipo_equipo, codigo_pon,
                producto_id, estado, registrado_por)
            VALUES (?, ?, ?, ?, 'ONU', ?, ?, 'recogido', ?)`,
            [codigoRecojo, tecnicoId, orden.abonado || null, orden.direccion || null,
            onuRecogidaPon, onuRecogidaProductoId || null, tecnicoId]
          );

          console.log("6. recojoIns:", JSON.stringify(recojoIns));
          console.log("7. recojoIns.insertId:", recojoIns.insertId);

          const recojoId = recojoIns.insertId;
          console.log("8. recojoId:", recojoId);

          if (!recojoId) {
            console.error("❌ ERROR: recojoId es null o undefined");
            throw new Error("No se pudo crear el registro de recojo");
          }

          console.log("9. Intentando insertar en onus_recicladas...");
          const [result] = await conn.execute(
            `INSERT INTO onus_recicladas
              (recojo_id, tipo_equipo, codigo_pon, producto_id, sede_id, estado, estado_tecnico, onu_id)
            VALUES (?, 'ONU', ?, ?, ?, 'revision', 'en_mano', ?)`,
            [recojoId, onuRecogidaPon, onuRecogidaProductoId, sedeId, onuId]
          );

          console.log("10. Resultado insert onus_recicladas:", result);
          console.log("========== FIN DEBUG ==========");
        }
        if (esCambioOnu && onuId) {
          const [[onuProd]] = await conn.execute(
            "SELECT producto_id FROM onus WHERE id = ?", [onuId]
          );
          if (onuProd) {
            await conn.execute(
              "INSERT INTO averia_materiales (averia_id, producto_id, cantidad) VALUES (?,?,1)",
              [registroId, onuProd.producto_id]
            );
            await conn.execute(
              "UPDATE onus SET averia_id = ?, cliente = ?, tecnico_id = NULL WHERE id = ?",
              [registroId, orden.abonado || null, onuId]
            );
            await conn.execute(
              `INSERT INTO consumo_tecnico
                (tecnico_id, producto_id, cantidad, motivo, descripcion, fecha)
              VALUES (?, ?, 1, 'cambio_onu', ?, NOW())`,
              [tecnicoId, onuProd.producto_id, `Orden #${orden.nro_orden} — ${orden.abonado || ""}`]
            );
          }
        }

        await conn.execute(
          "UPDATE ordenes_servicio SET averia_id = ? WHERE id = ?",
          [registroId, ordenId]
        );

      } else {
        codigo = `ACT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        const [ins] = await conn.execute(
          `INSERT INTO activaciones
            (codigo, nro_orden, nro_contrato, cliente_id, orden_id, tecnico_id,
              cliente, direccion, comentario, onu_id)
          VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [codigo, orden.nro_orden, orden.nro_contrato, orden.cliente_id || null,
          Number(ordenId), tecnicoId, orden.abonado || null, orden.direccion || null, comentario, onuId]
        );
        registroId = ins.insertId;

        // Materiales normales
        for (const item of items) {
          if (!item.producto_id || !item.cantidad) continue;
          await conn.execute(
            "INSERT INTO activacion_materiales (activacion_id, producto_id, cantidad) VALUES (?,?,?)",
            [registroId, Number(item.producto_id), Number(item.cantidad)]
          );
          await conn.execute(
            `UPDATE asignaciones_tecnicos SET cantidad = cantidad - ?
            WHERE tecnico_id = ? AND producto_id = ?`,
            [Number(item.cantidad), tecnicoId, Number(item.producto_id)]
          );
        }

        // ONU
        if (onuId) {
          const [[onuProd]] = await conn.execute(
            "SELECT producto_id FROM onus WHERE id = ?", [onuId]
          );
          if (onuProd) {
            // Validar stock antes de descontar
            const [[asigOnu]] = await conn.execute(
              "SELECT cantidad FROM asignaciones_tecnicos WHERE tecnico_id = ? AND producto_id = ?",
              [tecnicoId, onuProd.producto_id]
            );
            const [[{ consumidoOnu }]] = await conn.execute(
              "SELECT COALESCE(SUM(cantidad), 0) AS consumidoOnu FROM consumo_tecnico WHERE tecnico_id = ? AND producto_id = ?",
              [tecnicoId, onuProd.producto_id]
            );
            const disponibleOnu = parseFloat(asigOnu?.cantidad ?? 0) - parseFloat(consumidoOnu);
            if (disponibleOnu < 1) {
              await conn.rollback();
              return res.status(400).json({
                error: `Sin stock de ONUs disponibles. Disponible: ${disponibleOnu}`
              });
            }

            // Registrar ONU en activacion_materiales
            await conn.execute(
              "INSERT INTO activacion_materiales (activacion_id, producto_id, cantidad) VALUES (?,?,1)",
              [registroId, onuProd.producto_id]
            );
            await conn.execute(
              "UPDATE onus SET activacion_id = ?, cliente = ?, tecnico_id = NULL WHERE id = ?",
              [registroId, orden.abonado || null, onuId]
            );
          
            await conn.execute(
              `INSERT INTO consumo_tecnico
                (tecnico_id, producto_id, cantidad, motivo, descripcion, fecha)
              VALUES (?, ?, 1, 'instalacion', ?, NOW())`,
              [tecnicoId, onuProd.producto_id, `Orden #${orden.nro_orden} — ${orden.abonado || ""}`]
            );
          }
        }

        await conn.execute(
          "UPDATE ordenes_servicio SET activacion_id = ? WHERE id = ?",
          [registroId, ordenId]
        );
      }

      const tipo = esAveria ? "averia" : "activacion";
      await moverYGuardarFotos(conn, {
        tipo, registro_id: registroId, sede_id: sedeId,
        cliente: orden.abonado || null, archivos: req.files || [],
      });

      await conn.execute(
        `UPDATE ordenes_servicio
        SET estado_app = 'completada', tecnico_id = ?, completada_en = NOW(),
            lat = ?, lng = ?
        WHERE id = ?`,
        [tecnicoId, lat, lng, ordenId]
      );

      await conn.commit();
      res.json({ ok: true, codigo });

    } catch (err) {
      await conn.rollback();
      console.error("Error completando orden:", err);
      res.status(500).json({ error: err.message });
    } finally {
      conn.release();
    }
  }
);

/* ── helpers locales ─────────────────────────────────────────────────────── */
function clasificarServicio(s = "") {
  const u = s.toUpperCase();
  if (u.includes("CAMBIO DE EQUIPO")) return { tab: "averia", tipoAveria: "cambio_onu" };
  if (u.includes("AVERIA")) return { tab: "averia", tipoAveria: "comun" };
  return { tab: "activacion", tipoAveria: null };
}

function generarCodigo(prefijo) {
  return `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/* ── POST /tecnico/ordenes/:id/completar-recojo ─────────────────────────── */
router.post(
  "/tecnico/ordenes/:id/completar-recojo",
  authMiddleware,
  upload.array("fotos", 5),
  async (req, res) => {
    const ordenId   = req.params.id;
    const tecnicoId = req.user.id;
    const sedeId    = req.user.sede_id;
    const body      = req.body || {};

    const [[orden]] = await db.execute(
      "SELECT * FROM ordenes_servicio WHERE id = ? AND estado_app = 'pendiente'",
      [ordenId]
    );
    if (!orden)
      return res.status(404).json({ error: "Orden no encontrada o ya completada." });

    let items = [];
    try {
      if (body.items) items = typeof body.items === "string" ? JSON.parse(body.items) : body.items;
    } catch (e) { console.error("Error parseando items:", e); }

    const comentario = body.comentario || null;
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      const codigo = `REC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      // Insertar en averias para registrar el trabajo
      const [ins] = await conn.execute(
        `INSERT INTO averias
           (codigo, nro_orden, nro_contrato, cliente_id, orden_id, tecnico_id,
            cliente, direccion, comentario, onu_id)
         VALUES (?,?,?,?,?,?,?,?,?,NULL)`,
        [codigo, orden.nro_orden, orden.nro_contrato, orden.cliente_id || null,
         Number(ordenId), tecnicoId, orden.abonado || null, orden.direccion || null, comentario]
      );
      const averiaId = ins.insertId;

      // Registrar cada equipo recogido
      for (const item of items) {
        if (!item.producto_id) continue;

        // Insertar en recojos
        const codigoRecojo = `REC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const [recojoIns] = await conn.execute(
          `INSERT INTO recojos
             (codigo, tecnico_id, cliente, direccion, tipo_equipo, codigo_pon,
              producto_id, estado, registrado_por)
           VALUES (?, ?, ?, ?, 'ONU', ?, ?, 'recogido', ?)`,
          [codigoRecojo, tecnicoId, orden.abonado || null, orden.direccion || null,
           item.codigo_pon || null, item.producto_id, tecnicoId]
        );
        const recojoId = recojoIns.insertId;

        // Buscar onu_id si tiene codigo_pon
        let onuId = null;
        if (item.codigo_pon) {
          const [[onuExistente]] = await conn.execute(
            "SELECT id FROM onus WHERE codigo_pon = ?", [item.codigo_pon]
          );
          onuId = onuExistente?.id ?? null;
        }

        // Insertar en onus_recicladas para que aparezca en dashboard del técnico
        await conn.execute(
          `INSERT INTO onus_recicladas
             (recojo_id, tipo_equipo, onu_id, codigo_pon, producto_id,
              sede_id, estado, estado_tecnico)
           VALUES (?, 'ONU', ?, ?, ?, ?, 'revision', 'en_mano')`,
          [recojoId, onuId, item.codigo_pon || null, item.producto_id, sedeId]
        );
      }

      // Fotos
      await moverYGuardarFotos(conn, {
        tipo: "averia", registro_id: averiaId, sede_id: sedeId,
        cliente: orden.abonado || null, archivos: req.files || [],
      });

      // Completar la orden
      await conn.execute(
        `UPDATE ordenes_servicio
         SET estado_app = 'completada', tecnico_id = ?, completada_en = NOW(),
             averia_id = ?
         WHERE id = ?`,
        [tecnicoId, averiaId, ordenId]
      );

      await conn.commit();
      res.json({ ok: true, codigo });
    } catch (err) {
      await conn.rollback();
      console.error("Error completando recojo:", err);
      res.status(500).json({ error: err.message });
    } finally {
      conn.release();
    }
  }
);

module.exports = router;
