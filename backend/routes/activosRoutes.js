const express = require("express")
const router  = express.Router()
const { getAll, getBySede, create, update, remove } = require("../controllers/activosController")
const { enviarAlmacenAActivos } = require("../controllers/activosDesdeAlmacenController") // ← AGREGAR
const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")

router.get("/",          verificarToken, verificarRol("superadmin", "admin"), getAll)
router.get("/sede/:id",  verificarToken, verificarRol("superadmin", "admin", "controlador"), getBySede)
router.post("/",         verificarToken, verificarRol("superadmin", "admin", "controlador"), create)
router.post("/desde-almacen", verificarToken, verificarRol("superadmin", "admin"), enviarAlmacenAActivos) // ← AGREGAR
router.put("/:id",       verificarToken, verificarRol("superadmin", "admin", "controlador"), update)
router.delete("/:id",    verificarToken, verificarRol("superadmin"), remove)

module.exports = router