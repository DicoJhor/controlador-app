const jwt = require("jsonwebtoken")

const verificarToken = (req, res, next) => {

    const authHeader = req.headers["authorization"]

    if (!authHeader) {
        return res.status(403).json({ message: "Token requerido" })
    }

    const token = authHeader.split(" ")[1]

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {

        if (err) {
            console.log("❌ Error JWT:", err.message) // 👈 ver en consola del servidor
            return res.status(401).json({ message: err.message }) // 👈 ver en Postman
        }

        console.log("✅ Token válido, usuario:", user) // 👈 ver qué contiene el token
        req.user = user
        next()

    })
}

module.exports = verificarToken