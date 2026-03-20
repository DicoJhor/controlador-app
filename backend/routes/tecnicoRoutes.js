const express = require("express")
const router  = express.Router()
const {
  getMiInventario, getMiHistorial,
  registrarSalida, registrarSalidaMultiple,
  getAverias,
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
router.post("/salida",          verificarToken, verificarRol("tecnico"), registrarSalida)
router.post("/salida-multiple", verificarToken, verificarRol("tecnico"),
  upload.single("foto"), registrarSalidaMultiple)
router.get("/recojos",          verificarToken, verificarRol("tecnico"), getMisRecojos)
router.patch("/recojos/:id",    verificarToken, verificarRol("tecnico"),
  upload.single("foto"), confirmarTecnico)
router.get("/activaciones",     verificarToken, verificarRol("tecnico"), getMias)
router.post("/activaciones",    verificarToken, verificarRol("tecnico"),
  upload.fields([
    { name: "foto_antes",   maxCount: 1 },
    { name: "foto_despues", maxCount: 1 },
  ]), create)
router.get("/averias",          verificarToken, verificarRol("controlador", "admin", "superadmin"), getAverias)

module.exports = router