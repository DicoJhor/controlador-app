const express = require("express")
const router = express.Router()
const { login } = require("../controllers/authController")
const verificarToken = require("../middleware/authMiddleware")
const rateLimit = require("express-rate-limit")

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
})

router.post("/login", loginLimiter, login)

router.post("/logout", verificarToken, (req, res) => {
  res.json({ message: "Sesión cerrada correctamente" })
})

module.exports = router