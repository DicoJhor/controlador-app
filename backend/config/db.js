const mysql = require('mysql2')

const pool = mysql.createPool({   // ✅ mysql.createPool, no createPool
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
})

pool.getConnection((err, conn) => {
  if (err) console.error('Error conectando a MySQL:', err)
  else {
    console.log('MySQL conectado 🔥')
    conn.release()
  }
})

module.exports = pool.promise()