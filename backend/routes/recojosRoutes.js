const express = require("express")
const router = express.Router()
const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")
const upload         = require("../middleware/uploadMiddleware")
const { getAll, create, confirmar, getAllAdmin } = require("../controllers/recojosController")

router.get("/",        verificarToken, verificarRol("controlador", "admin"), getAll)
router.post("/",       verificarToken, verificarRol("controlador", "admin"), create)
router.patch("/:id",   verificarToken, verificarRol("controlador", "admin"), upload.single("foto"), confirmar)
router.get("/admin",   verificarToken, verificarRol("admin", "superadmin"), getAllAdmin)

module.exports = router