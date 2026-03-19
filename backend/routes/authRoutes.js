const express = require("express")
const router = express.Router()
const { login } = require("../controllers/authController")
const verificarToken = require("../middleware/authMiddleware")

router.post("/login", login)

router.post("/logout", verificarToken, (req, res) => {
  res.json({ message: "Sesión cerrada correctamente" })
})

module.exports = router