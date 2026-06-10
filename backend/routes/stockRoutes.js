const express = require("express")
const router = express.Router()
const {
  verStock, entradaStock, salidaStock,
  salidaStockMultiple, statsControlador, auditoriaControlador,
  asignarCompleto, salidaDirecta,
  inventarioTecnico, actividadHoyTecnico,
  getAsignaciones
} = require("../controllers/stockController")
const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")

router.get("/",                  verificarToken, verificarRol("controlador", "admin"), verStock)
router.post("/entrada",          verificarToken, verificarRol("controlador", "admin"), entradaStock)
router.post("/salida",           verificarToken, verificarRol("controlador", "admin"), salidaStock)
router.post("/salida-multiple",  verificarToken, verificarRol("controlador", "admin"), salidaStockMultiple)
router.post("/salida-directa",   verificarToken, verificarRol("controlador", "admin"), salidaDirecta)
router.get("/stats",             verificarToken, verificarRol("controlador"), statsControlador)
router.get("/auditoria",         verificarToken, verificarRol("controlador"), auditoriaControlador)
router.post("/asignar-completo", verificarToken, verificarRol("controlador", "admin"), asignarCompleto)
router.get("/tecnico/:id/inventario",     verificarToken, verificarRol("controlador"), inventarioTecnico)
router.get("/tecnico/:id/actividad-hoy",  verificarToken, verificarRol("controlador"), actividadHoyTecnico)
router.get("/asignaciones",               verificarToken, verificarRol("controlador"), getAsignaciones)

module.exports = router