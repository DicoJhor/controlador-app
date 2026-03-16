const express = require("express")
const router = express.Router()
const { getAll, create, update, remove } = require("../controllers/sedesController")
const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")

router.get("/",       verificarToken, verificarRol("admin"), getAll)
router.post("/",      verificarToken, verificarRol("admin"), create)
router.put("/:id",    verificarToken, verificarRol("admin"), update)
router.delete("/:id", verificarToken, verificarRol("admin"), remove)

module.exports = router