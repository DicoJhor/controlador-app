const multer = require("multer")
const path   = require("path")
const fs     = require("fs")

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tmpDir = path.join(__dirname, "..", "uploads", "tmp")
    fs.mkdirSync(tmpDir, { recursive: true })
    cb(null, tmpDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${ext}`)
  }
})

const fileFilter = (req, file, cb) => {
  ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Solo se permiten imágenes JPG, PNG o WEBP"))
}

module.exports = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } })