const express = require("express")
const router = express.Router()
const { getMovimientos } = require("../controllers/auditoriaController")
const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")

router.get("/", verificarToken, verificarRol("admin", "superadmin"), getMovimientos)

module.exports = router