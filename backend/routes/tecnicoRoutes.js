const express = require("express")
const router  = express.Router()
const {
  getMiInventario, getMiHistorial,
  registrarSalida, registrarSalidaMultiple,
  getAverias, getAveriasAdmin, getCatalogoOnus
} = require("../controllers/tecnicoController")
const {
  getMisRecojos, confirmarTecnico
} = require("../controllers/recojosController")
const { getMias, create } = require("../controllers/activacionesController")
const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")
const upload         = require("../middleware/uploadMiddleware")

router.get("/inventario",       verificarToken, verificarRol("tecnico"), getMiInventario)
router.get("/historial",        verificarToken, verificarRol("tecnico"), getMiHistorial)
router.get("/catalogo-onus",    verificarToken, verificarRol("tecnico"), getCatalogoOnus)
router.post("/salida",          verificarToken, verificarRol("tecnico"), registrarSalida)

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

module.exports = router