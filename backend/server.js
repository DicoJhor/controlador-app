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
const onuRoutes   = require("./routes/onuRoutes")
const ordenesRoutes   = require("./routes/ordenesServicioRoutes")
const activacionRedRoutes = require("./routes/activacionRedRoutes")
const clientesRoutes      = require("./routes/clientesRoutes")

const path = require('path')

const app = express()

// ── Middlewares ─────────────────────────────────────────

// CORS configurado para frontend (Vite)
// CORS configurado para frontend (Vite)
const allowedOrigins = [
  ...(process.env.FRONTEND_URL?.split(',').map(o => o.trim()) || []),
  "http://localhost:5173",
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
]

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('No permitido por CORS'))
    }
  },
  credentials: true
}))

// Procesar JSON
app.use(express.json())

// ── LOG GLOBAL DE REQUESTS ─────────────────────────────
app.use((req, res, next) => {
  console.log("➡️  REQUEST:", req.method, req.originalUrl)
  next()
})


// ── Rutas API ─────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, 'uploads')))
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
app.use("/api/onus",  onuRoutes)
app.use("/api",       ordenesRoutes)
app.use("/api", activacionRedRoutes)
app.use("/api/clientes", clientesRoutes)



// ── Ruta de prueba ─────────────────────────────────────

app.get('/', (req, res) => {
  res.send('API Controlador funcionando 🚀')
})

// ── Puerto ─────────────────────────────────────────────

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})