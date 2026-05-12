const jwt = require("jsonwebtoken")

const verificarToken = (req, res, next) => {
    const authHeader = req.headers["authorization"]
    if (!authHeader) return res.status(403).json({ message: "Token requerido" })

    const token = authHeader.split(" ")[1]
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log("❌ Error JWT:", err.message)
            return res.status(401).json({ message: err.message })
        }
        console.log("✅ Token válido, usuario:", user)
        req.user = user
        next()
    })
}

const requireRol = (roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "No autenticado" })

    console.log("ROL RECIBIDO:", req.user.rol)       // ← agrega esto
    console.log("ROLES PERMITIDOS:", roles) 

    if (!roles.includes(req.user.rol?.toLowerCase())) {
        return res.status(403).json({ message: "No tienes permisos para esto" })
    }
    next()
}

verificarToken.requireRol = requireRol
module.exports = verificarToken
module.exports.authMiddleware = verificarToken
module.exports.requireRol = requireRol