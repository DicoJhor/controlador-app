const express = require("express")
const router = express.Router()
const {
  getMiInventario, getMiHistorial,
  registrarSalida
} = require("../controllers/tecnicoController")
const {
  getMisRecojos, confirmarTecnico
} = require("../controllers/recojosController")
const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")
const upload         = require("../middleware/uploadMiddleware")

router.get("/inventario",    verificarToken, verificarRol("tecnico"), getMiInventario)
router.get("/historial",     verificarToken, verificarRol("tecnico"), getMiHistorial)
router.post("/salida",       verificarToken, verificarRol("tecnico"), registrarSalida)
router.get("/recojos",       verificarToken, verificarRol("tecnico"), getMisRecojos)
router.patch("/recojos/:id", verificarToken, verificarRol("tecnico"), upload.single("foto"), confirmarTecnico)

module.exports = router