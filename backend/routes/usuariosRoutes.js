const express = require("express")
const router = express.Router()
const { getAll, create, update, remove } = require("../controllers/usuariosController")
const verificarToken = require("../middleware/authMiddleware")
const verificarRol   = require("../middleware/roleMiddleware")

const validarRolCreacion = (req, res, next) => {
  const rolSolicitado = req.body.rol
  const rolCreador    = req.user.rol
  if ((rolSolicitado === "superadmin" || rolSolicitado === "admin") && rolCreador !== "superadmin") {
    return res.status(403).json({ message: "Solo el superadmin puede crear cuentas admin o superadmin" })
  }
  next()
}

const soloSuperadmin = (req, res, next) => {
  if (req.user.rol !== "superadmin") {
    return res.status(403).json({ message: "Solo el superadmin puede realizar esta acción" })
  }
  next()
}

router.get("/",       verificarToken, verificarRol("admin", "superadmin", "controlador"), getAll)
router.post("/",      verificarToken, verificarRol("admin", "superadmin", "controlador"), validarRolCreacion, create)
router.put("/:id",    verificarToken, verificarRol("admin", "superadmin", "controlador"), update)
router.delete("/:id", verificarToken, verificarRol("admin", "superadmin"), soloSuperadmin, remove)

module.exports = router