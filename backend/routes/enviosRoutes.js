const express = require("express")
const router = express.Router()

const verificarToken  = require("../middleware/authMiddleware")
const verificarRol    = require("../middleware/roleMiddleware")
const { crearEnvio, obtenerEnvios, editarEnvio } = require("../controllers/enviosController")


router.post("/", verificarToken, verificarRol("admin", "superadmin"), crearEnvio)
router.get("/",  verificarToken, verificarRol("admin", "superadmin"), obtenerEnvios)
router.put("/:id", verificarToken, verificarRol("superadmin"), editarEnvio)


module.exports = router