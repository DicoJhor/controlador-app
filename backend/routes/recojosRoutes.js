const express = require("express")
const router = express.Router()
const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")
const upload         = require("../middleware/uploadMiddleware")
const { getAll, create, getAllAdmin,
  getMisRecojos, confirmarTecnico,
  getEquiposReciclados, revisarOnu, eliminarEntrada } = require("../controllers/recojosController")

// ── Rutas estáticas primero ──────────────────────────────────────────────
router.get("/admin",                  verificarToken, verificarRol("admin", "superadmin"), getAllAdmin)
router.get("/mis-recojos",            verificarToken, verificarRol("tecnico"), getMisRecojos)
router.get("/equipos-reciclados",     verificarToken, verificarRol("controlador", "admin"), getEquiposReciclados)
router.patch("/equipos-reciclados/:id", verificarToken, verificarRol("controlador", "admin"), revisarOnu)
router.delete(
  "/entradas/:id",
  verificarToken,
  verificarRol("superadmin"),
  eliminarEntrada
)

// ── Rutas dinámicas después ──────────────────────────────────────────────
router.get("/",                       verificarToken, verificarRol("controlador", "admin"), getAll)
router.post("/",                      verificarToken, verificarRol("controlador", "admin"), create)
router.patch("/:id/tecnico",          verificarToken, verificarRol("tecnico"), upload.array("fotos", 5), confirmarTecnico)

module.exports = router