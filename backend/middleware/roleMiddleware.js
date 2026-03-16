const verificarRol = (...rolesPermitidos) => {
    return (req, res, next) => {
        const userRol = req.user.rol
        if (!rolesPermitidos.includes(userRol)) {
            return res.status(403).json({ message: "Acceso denegado" })
        }
        next()
    }
}

module.exports = verificarRol  // ✅ asegurate que sea exactamente esto, sin llaves