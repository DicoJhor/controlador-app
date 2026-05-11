const express = require("express");
const router  = express.Router();
const db      = require("../config/db");
const { authMiddleware, requireRol } = require("../middleware/authMiddleware");

/* ── GET /superadmin/activaciones-red ──────────────────────────────────────
   Trae todas las órdenes de INSTALACION con o sin datos de red cargados.
   Solo superadmin del NOC. No filtra por sede (ve todo).
─────────────────────────────────────────────────────────────────────────── */
router.get(
  "/superadmin/activaciones-red",
  authMiddleware,
  requireRol(["superadmin"]),
  async (req, res) => {
    const { estado, sede_id } = req.query;

    let whereExtra = "";
    if (sede_id)             whereExtra += ` AND o.sede_id = ${parseInt(sede_id)}`;
    if (estado === "sin_ip") whereExtra += " AND ar.id IS NULL";
    if (estado === "con_ip") whereExtra += " AND ar.id IS NOT NULL";

    const [rows] = await db.execute(
      `SELECT
        o.id,
        o.nro_orden,
        o.nro_contrato,
        o.abonado,
        o.direccion,
        o.servicio,
        o.tecnologia,
        o.fecha_crea,
        o.estado_app,
        s.nombre        AS sede_nombre,
        ar.id           AS red_id,
        ar.ip_local,
        ar.mascara,
        ar.gateway,
        ar.modelo_onu,
        ar.perfil_onu,
        ar.notas,
        u.nombre        AS cargado_por_nombre
      FROM ordenes_servicio o
      LEFT JOIN sedes s           ON o.sede_id = s.id
      LEFT JOIN activacion_red ar ON ar.orden_id = o.id
      LEFT JOIN usuarios u        ON ar.cargado_por = u.id
      WHERE (o.servicio LIKE '%INSTALACION(I)%' OR o.servicio LIKE '%CAMBIO DE EQUIPO(I)%')
      ${whereExtra}
      ORDER BY o.created_at DESC`
    );
    res.json(rows);
  }
);

/* ── POST /superadmin/activaciones-red/:ordenId ─────────────────────────────
   Crea o actualiza los datos de red para una orden.
─────────────────────────────────────────────────────────────────────────── */
router.post(
  "/superadmin/activaciones-red/:ordenId",
  authMiddleware,
  requireRol(["superadmin"]),
  async (req, res) => {
    const { ordenId } = req.params;
    const { ip_local, mascara, gateway, modelo_onu, perfil_onu, notas } = req.body;

    if (!ip_local || !mascara || !gateway)
      return res.status(400).json({ error: "IP, máscara y gateway son obligatorios." });

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip_local) || !ipRegex.test(mascara) || !ipRegex.test(gateway))
      return res.status(400).json({ error: "Formato de IP inválido." });

    const [[orden]] = await db.execute(
      "SELECT id, servicio FROM ordenes_servicio WHERE id = ?",
      [ordenId]
    );
    if (!orden) return res.status(404).json({ error: "Orden no encontrada." });
    const s = orden.servicio.toUpperCase();
    if (!s.includes("INSTALACION(I)") && !s.includes("CAMBIO DE EQUIPO(I)"))
      return res.status(400).json({ error: "Solo se pueden cargar datos de red en órdenes de instalación o cambio de equipo de internet." });

    await db.execute(
      `INSERT INTO activacion_red
         (orden_id, ip_local, mascara, gateway, modelo_onu, perfil_onu, notas, cargado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         ip_local    = VALUES(ip_local),
         mascara     = VALUES(mascara),
         gateway     = VALUES(gateway),
         modelo_onu  = VALUES(modelo_onu),
         perfil_onu  = VALUES(perfil_onu),
         notas       = VALUES(notas),
         cargado_por = VALUES(cargado_por),
         updated_at  = CURRENT_TIMESTAMP`,
      [
        ordenId,
        ip_local.trim(),
        mascara.trim(),
        gateway.trim(),
        modelo_onu?.trim() || null,
        perfil_onu?.trim() || null,
        notas?.trim()      || null,
        req.user.id,
      ]
    );

    const [[updated]] = await db.execute(
      `SELECT ar.*, u.nombre AS cargado_por_nombre
       FROM activacion_red ar
       LEFT JOIN usuarios u ON ar.cargado_por = u.id
       WHERE ar.orden_id = ?`,
      [ordenId]
    );
    res.json({ ok: true, data: updated });
  }
);

/* ── GET /tecnico/ordenes/:id/red ────────────────────────────────────────────
   El técnico consulta los datos de red de su orden antes de configurar la ONU.
─────────────────────────────────────────────────────────────────────────── */
router.get(
  "/tecnico/ordenes/:id/red",
  authMiddleware,
  async (req, res) => {
    const { id } = req.params;

    const [[red]] = await db.execute(
      `SELECT ar.ip_local, ar.mascara, ar.gateway, ar.modelo_onu, ar.perfil_onu, ar.notas
       FROM activacion_red ar
       WHERE ar.orden_id = ?`,
      [id]
    );

    if (!red)
      return res.status(404).json({ error: "Aún no se han cargado datos de red para esta orden." });
    res.json(red);
  }
);

module.exports = router;