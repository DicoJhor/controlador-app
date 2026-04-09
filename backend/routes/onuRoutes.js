const express = require("express")
const router  = express.Router()
const {
  crearOnu,
  getBySedeProducto,
  actualizarCodigo,
  getDisponiblesSede,
  asignarTecnico,
  getMisOnus,
} = require("../controllers/onuController")
const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")

router.post(
  "/",
  verificarToken,
  verificarRol("controlador", "admin"),
  crearOnu
)

router.get(
  "/sede/:sede_id/producto/:producto_id",
  verificarToken,
  verificarRol("controlador", "admin"),
  getBySedeProducto
)

router.patch(
  "/:id/codigo",
  verificarToken,
  verificarRol("controlador", "admin"),
  actualizarCodigo
)

router.get(
  "/disponibles/:producto_id",
  verificarToken,
  verificarRol("controlador", "admin"),
  getDisponiblesSede
)

router.post(
  "/asignar-tecnico",
  verificarToken,
  verificarRol("controlador", "admin"),
  asignarTecnico
)

// ONUs asignadas al técnico autenticado
router.get(
  "/mis-onus",
  verificarToken,
  verificarRol("tecnico"),
  getMisOnus
)

module.exports = router