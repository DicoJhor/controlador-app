const express = require("express")
const router = express.Router()

const {
  crearProducto,
  obtenerProductos,
  actualizarProducto,
  eliminarProducto,
  entradaStockAdmin,
  obtenerStockPorSede,
} = require("../controllers/productController")

const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")

router.get("/",               verificarToken, verificarRol("admin", "superadmin"), obtenerProductos)
router.get("/stock-sede/:id", verificarToken, verificarRol("admin", "superadmin"), obtenerStockPorSede)
router.post("/",              verificarToken, verificarRol("admin", "superadmin"), crearProducto)
router.post("/entrada",       verificarToken, verificarRol("admin", "superadmin"), entradaStockAdmin)
router.put("/:id",            verificarToken, verificarRol("admin", "superadmin"), actualizarProducto)
router.delete("/:id",         verificarToken, verificarRol("superadmin"), eliminarProducto)

module.exports = router