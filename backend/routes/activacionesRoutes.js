const express    = require("express")
const router     = express.Router()
const { getAll, getMias, create } = require("../controllers/activacionesController")
const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")
const upload         = require("../middleware/uploadMiddleware")

// Controlador ve todas las de su sede
router.get("/",      verificarToken, verificarRol("controlador", "admin", "superadmin"), getAll)

// Técnico ve solo las suyas
router.get("/mias",  verificarToken, verificarRol("tecnico"), getMias)

// Técnico crea una activación con fotos
router.post("/",     verificarToken, verificarRol("tecnico"),
  upload.fields([
    { name: "foto_antes",   maxCount: 1 },
    { name: "foto_despues", maxCount: 1 },
  ]),
  create
)

module.exports = router