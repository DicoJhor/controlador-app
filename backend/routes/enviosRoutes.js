const express = require("express")
const router = express.Router()

const { crearEnvio, obtenerEnvios } = require("../controllers/enviosController")

const verificarToken  = require("../middleware/authMiddleware")
const verificarRol    = require("../middleware/roleMiddleware")

router.post("/", verificarToken, verificarRol("admin", "superadmin"), crearEnvio)
router.get("/",  verificarToken, verificarRol("admin", "superadmin"), obtenerEnvios)

module.exports = router