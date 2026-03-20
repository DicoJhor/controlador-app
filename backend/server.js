require('dotenv').config()
require('./config/db')

const express = require('express')
const cors = require('cors')

const authRoutes = require("./routes/authRoutes")
const productRoutes = require("./routes/productRoutes")
const stockRoutes = require("./routes/stockRoutes")
const usuariosRoutes = require("./routes/usuariosRoutes")
const sedesRoutes = require("./routes/sedesRoutes")
const dashboardRoutes = require("./routes/dashboardRoutes")
const auditoriaRoutes = require("./routes/auditoriaRoutes")
const recojosRoutes = require("./routes/recojosRoutes")
const tecnicoRoutes = require("./routes/tecnicoRoutes")
const enviosRoutes = require("./routes/enviosRoutes")
const activosRouter = require("./routes/activosRoutes")
const activacionesRouter = require("./routes/activacionesRoutes")

const app = express()

// ── Middlewares ─────────────────────────────────────────

// CORS configurado para frontend (Vite)
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5173"
  ],
  credentials: true
}))

// Procesar JSON
app.use(express.json())

// ── Rutas API ─────────────────────────────────────────
app.use("/uploads", express.static("uploads"))
app.use("/api/auth", authRoutes)
app.use("/api/productos", productRoutes)
app.use("/api/stock", stockRoutes)
app.use("/api/usuarios", usuariosRoutes)
app.use("/api/sedes", sedesRoutes)
app.use("/api/dashboard", dashboardRoutes)
app.use("/api/auditoria", auditoriaRoutes)
app.use("/api/recojos", recojosRoutes)
app.use("/api/tecnico", tecnicoRoutes)
app.use("/api/envios", enviosRoutes)
app.use("/api/activos", activosRouter)
app.use("/api/activaciones", activacionesRouter)



// ── Ruta de prueba ─────────────────────────────────────

app.get('/', (req, res) => {
  res.send('API Controlador funcionando 🚀')
})

// ── Puerto ─────────────────────────────────────────────

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})