const multer = require("multer")
const path   = require("path")
const fs     = require("fs")

const sanitize = (str) =>
  (str ?? "sin_cliente")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9áéíóúñü\s-]/gi, "")
    .replace(/\s+/g, "_")
    .substring(0, 50)

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tipo    = req.baseUrl.includes("activacion") ? "activaciones" : "recojos"
    const cliente = sanitize(req.body.cliente)
    const carpeta = path.join("uploads", tipo, cliente)
    fs.mkdirSync(carpeta, { recursive: true })
    cb(null, carpeta)
  },
  filename: (req, file, cb) => {
    const ext    = path.extname(file.originalname)
    const tipo   = req.baseUrl.includes("activacion") ? "activ" : "recojo"
    const nombre = `${tipo}_${Date.now()}${ext}`
    cb(null, nombre)
  }
})

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"]
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Solo se permiten imágenes JPG, PNG o WEBP"))
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
})

module.exports = upload