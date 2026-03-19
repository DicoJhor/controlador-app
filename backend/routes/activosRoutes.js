const express = require("express")
const router  = express.Router()
const { getAll, getBySede, create, update, remove } = require("../controllers/activosController")
const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")

const soloSuperAdminOAdmin = verificarRol("superadmin", "admin")

router.get("/",           verificarToken, soloSuperAdminOAdmin, getAll)
router.get("/sede/:id",   verificarToken, soloSuperAdminOAdmin, getBySede)
router.post("/",          verificarToken, soloSuperAdminOAdmin, create)
router.put("/:id",        verificarToken, soloSuperAdminOAdmin, update)
router.delete("/:id",     verificarToken, verificarRol("superadmin"), remove)

module.exports = router