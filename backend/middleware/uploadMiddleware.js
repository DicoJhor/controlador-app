const multer = require("multer")
const path   = require("path")
const fs     = require("fs")

const sanitize = (str) =>
  (str ?? "sin_cliente")
    .toLowerCase().trim()
    .replace(/[^a-z0-9áéíóúñü\s-]/gi, "")
    .replace(/\s+/g, "_")
    .substring(0, 50)

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let tipo = "otros"
    if (req.baseUrl.includes("activacion"))           tipo = "activaciones"
    else if (req.baseUrl.includes("recojo"))          tipo = "recojos"
    else if (req.baseUrl.includes("tecnico"))         tipo = "averias"

    const cliente = sanitize(req.body.cliente)
    const carpeta = path.join(__dirname, "..", "uploads", tipo, cliente)
    fs.mkdirSync(carpeta, { recursive: true })
    cb(null, carpeta)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    let prefijo = "foto"
    if (req.baseUrl.includes("activacion"))   prefijo = "activ"
    else if (req.baseUrl.includes("recojo"))  prefijo = "recojo"
    else if (req.baseUrl.includes("tecnico")) prefijo = "av"
    cb(null, `${prefijo}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${ext}`)
  }
})

const fileFilter = (req, file, cb) => {
  ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Solo se permiten imágenes JPG, PNG o WEBP"))
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
})

module.exports = upload