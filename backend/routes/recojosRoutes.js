const express = require("express")
const router = express.Router()
const { getAll, create, confirmar } = require("../controllers/recojosController")
const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")
const upload         = require("../middleware/uploadMiddleware")

router.get("/",        verificarToken, verificarRol("controlador", "admin"), getAll)
router.post("/",       verificarToken, verificarRol("controlador", "admin"), create)
router.patch("/:id",   verificarToken, verificarRol("controlador", "admin"), upload.single("foto"), confirmar)

module.exports = router