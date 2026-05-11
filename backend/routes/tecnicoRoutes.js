const express = require("express")
const router  = express.Router()
const {
  getMiInventario, getMiHistorial,
  registrarSalida, registrarSalidaMultiple,
  getAverias, getAveriasAdmin, getCatalogoOnus,
  getOrdenesPendientes, completarOrden
} = require("../controllers/tecnicoController")
const {
  getMisRecojos, confirmarTecnico
} = require("../controllers/recojosController")
const { getMias, create, buscarCliente } = require("../controllers/activacionesController")
const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")
const upload         = require("../middleware/uploadMiddleware")

router.get("/inventario",       verificarToken, verificarRol("tecnico"), getMiInventario)
router.get("/historial",        verificarToken, verificarRol("tecnico"), getMiHistorial)
router.get("/catalogo-onus",    verificarToken, verificarRol("tecnico"), getCatalogoOnus)
router.post("/salida",          verificarToken, verificarRol("tecnico"), registrarSalida)
router.get("/buscar-cliente", verificarToken, verificarRol("tecnico"), buscarCliente)

router.post("/salida-multiple", verificarToken, verificarRol("tecnico"),
  upload.array("fotos", 5), registrarSalidaMultiple)

router.get("/recojos",          verificarToken, verificarRol("tecnico"), getMisRecojos)
router.patch("/recojos/:id",    verificarToken, verificarRol("tecnico"),
  upload.array("fotos", 5), confirmarTecnico)

router.get("/activaciones",     verificarToken, verificarRol("tecnico"), getMias)
router.post("/activaciones",    verificarToken, verificarRol("tecnico"),
  upload.array("fotos", 5), create)

router.get("/averias",          verificarToken, verificarRol("controlador", "admin", "superadmin"), getAverias)
router.get("/averias/admin",    verificarToken, verificarRol("admin", "superadmin"), getAveriasAdmin)

router.get("/ordenes-pendientes", verificarToken, verificarRol("tecnico"), getOrdenesPendientes)
router.post("/ordenes/:id/completar", verificarToken, verificarRol("tecnico"),
  upload.array("fotos", 5), completarOrden)

// ── NUEVO ──────────────────────────────────────────────────────────────────
router.get("/ordenes/:id/red", verificarToken, verificarRol("tecnico"), async (req, res) => {
  const ordenId = req.params.id;
  const sedeId  = req.user.sede_id;
  try {
    const db = require("../config/db");
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
});
// ── FIN NUEVO ──────────────────────────────────────────────────────────────

module.exports = router