const express = require("express")
const router = express.Router()

const { crearEnvio, obtenerEnvios } = require("../controllers/enviosController")

const verificarToken  = require("../middleware/authMiddleware")
const verificarRol    = require("../middleware/roleMiddleware")

// Crear envío (solo admin)
router.post(
  "/",
  verificarToken,
  verificarRol("admin"),
  crearEnvio
)

// Listar envíos (solo admin)
router.get(
  "/",
  verificarToken,
  verificarRol("admin"),
  obtenerEnvios
)

module.exports = router