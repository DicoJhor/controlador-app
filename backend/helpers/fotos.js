const path = require("path")
const fs   = require("fs")

const sanitize = (str) =>
  (str ?? "sin_cliente")
    .toLowerCase().trim()
    .replace(/[^a-z0-9áéíóúñü\s-]/gi, "")
    .replace(/\s+/g, "_")
    .substring(0, 50)

async function moverYGuardarFotos(conn, { tipo, registro_id, sede_id, cliente, archivos = [] }) {
  if (archivos.length === 0) return
  const fecha         = new Date().toISOString().slice(0, 10)
  const carpetaNombre = `${fecha}-${tipo}`
  const clienteDir    = sanitize(cliente)
  const destDir = path.join(
    __dirname, "..", "uploads",
    `sede-${sede_id}`, clienteDir, carpetaNombre
  )
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of archivos) {
    const ext      = path.extname(file.originalname)
    const filename = `${tipo}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${ext}`
    const destPath = path.join(destDir, filename)
    fs.renameSync(file.path, destPath)
    const ruta = `sede-${sede_id}/${clienteDir}/${carpetaNombre}/${filename}`
    await conn.query(
      "INSERT INTO fotos_registro (tipo, registro_id, ruta) VALUES (?, ?, ?)",
      [tipo, registro_id, ruta]
    )
  }
}

module.exports = { moverYGuardarFotos }