const express = require("express")
const router = express.Router()

const {
    crearProducto,
    obtenerProductos,
    actualizarProducto,
    eliminarProducto
} = require("../controllers/productController")

const verificarToken = require("../middleware/authMiddleware")
const verificarRol = require("../middleware/roleMiddleware")

// crear producto (solo admin)
router.post(
    "/",
    verificarToken,
    verificarRol("admin"),
    crearProducto
)

// listar productos
router.get(
    "/",
    verificarToken,
    obtenerProductos
)

// actualizar producto
router.put(
    "/:id",
    verificarToken,
    verificarRol("admin"),
    actualizarProducto
)

// eliminar producto
router.delete(
    "/:id",
    verificarToken,
    verificarRol("admin"),
    eliminarProducto
)

module.exports = router