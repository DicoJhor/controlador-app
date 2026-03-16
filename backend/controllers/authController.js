const db = require("../config/db")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body

        const [results] = await db.query(
            "SELECT * FROM usuarios WHERE email = ?", [email]
        )

        if (results.length === 0) {
            return res.status(401).json({ message: "Usuario no encontrado" })
        }

        const user = results[0]

        const validPassword = await bcrypt.compare(password, user.password)

        if (!validPassword) {
            return res.status(401).json({ message: "Contraseña incorrecta" })
        }

        const token = jwt.sign(
            { id: user.id, rol: user.rol, sede_id: user.sede_id ?? null }, // ✅ agregado sede_id
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        )

        res.json({
            token,
            usuario: {
                id: user.id,
                nombre: user.nombre,
                rol: user.rol,
                sede_id: user.sede_id ?? null  // ✅ también al frontend
            }
        })

    } catch (err) {
        console.error("Error en login:", err)
        res.status(500).json({ message: "Error del servidor", error: err.message })
    }
}