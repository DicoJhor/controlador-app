const express = require("express")
const router = express.Router()

const {
  crearProducto,
  obtenerProductos,
  actualizarProducto,
  eliminarProducto,
  entradaStockAdmin,
  eliminarEntrada,
  obtenerStockPorSede,
} = require("../controllers/productController")

const {
  obtenerVariantes,
  crearVariante,
  actualizarVariante,
  eliminarVariante,
  entradaStockVariante,
} = require("../controllers/variantesController")

const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")

// ── Productos ──────────────────────────────────────────
router.get("/",               verificarToken, verificarRol("admin", "superadmin", "controlador"), obtenerProductos)
router.get("/stock-sede/:id", verificarToken, verificarRol("admin", "superadmin"), obtenerStockPorSede)
router.post("/",              verificarToken, verificarRol("admin", "superadmin"), crearProducto)
router.post("/entrada",       verificarToken, verificarRol("admin", "superadmin"), entradaStockAdmin)
router.delete("/entrada/:id", verificarToken, verificarRol("superadmin"), eliminarEntrada)
router.put("/:id",            verificarToken, verificarRol("admin", "superadmin"), actualizarProducto)
router.delete("/:id",         verificarToken, verificarRol("superadmin"), eliminarProducto)

// ── Variantes ──────────────────────────────────────────
router.get("/:id/variantes",                  verificarToken, verificarRol("admin", "superadmin"), obtenerVariantes)
router.post("/:id/variantes",                 verificarToken, verificarRol("admin", "superadmin"), crearVariante)
router.put("/variantes/:varianteId",          verificarToken, verificarRol("admin", "superadmin"), actualizarVariante)
router.delete("/variantes/:varianteId",       verificarToken, verificarRol("superadmin"), eliminarVariante)
router.post("/variantes/:varianteId/entrada", verificarToken, verificarRol("admin", "superadmin"), entradaStockVariante)

module.exports = router