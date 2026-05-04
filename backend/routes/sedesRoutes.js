const express = require("express")
const router = express.Router()
const { getAll, create, update, remove } = require("../controllers/sedesController")
const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")

const soloSuperadmin = (req, res, next) => {
  if (req.user.rol !== "superadmin") {
    return res.status(403).json({ message: "Solo el superadmin puede realizar esta acción" })
  }
  next()
}

router.get("/",       verificarToken, verificarRol("admin", "superadmin", "controlador"), getAll)
router.post("/",      verificarToken, verificarRol("admin", "superadmin"), create)
router.put("/:id",    verificarToken, verificarRol("admin", "superadmin"), update)
router.delete("/:id", verificarToken, verificarRol("admin", "superadmin"), soloSuperadmin, remove)

module.exports = router