require("dotenv").config()
const db = require("./config/db")

async function syncOnus() {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const [rows] = await conn.query(`
      SELECT ss.sede_id, ss.producto_id, ss.cantidad,
             COUNT(o.id) as onus_registradas
      FROM stock_sede ss
      JOIN productos p ON p.id = ss.producto_id
      LEFT JOIN onus o ON o.sede_id = ss.sede_id AND o.producto_id = ss.producto_id
      WHERE p.categoria = 'onu' AND ss.cantidad > 0
      GROUP BY ss.sede_id, ss.producto_id, ss.cantidad
      HAVING COUNT(o.id) < ss.cantidad
    `)

    let total = 0
    for (const row of rows) {
      const faltantes = row.cantidad - row.onus_registradas
      for (let i = 0; i < faltantes; i++) {
        await conn.query(
          "INSERT INTO onus (producto_id, sede_id, codigo_pon) VALUES (?, ?, NULL)",
          [row.producto_id, row.sede_id]
        )
        total++
      }
      console.log(`✅ sede ${row.sede_id} / producto ${row.producto_id}: +${faltantes} ONUs`)
    }

    await conn.commit()
    console.log(`\n✔ Listo — ${total} ONUs creadas`)
  } catch (err) {
    await conn.rollback()
    console.error("❌ Error:", err.message)
  } finally {
    conn.release()
    process.exit()
  }
}

syncOnus()