const express = require("express")
const router = express.Router()
const { getStats } = require("../controllers/dashboardController")
const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")

router.get("/stats", verificarToken, verificarRol("admin", "superadmin"), getStats)

module.exports = router