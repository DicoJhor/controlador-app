const db = require("../config/db")

exports.getMovimientos = async (req, res) => {
  try {
    const [rows] = await db.query(`
      -- Entradas de stock (admin/controlador)
      SELECT
        e.id,
        e.fecha,
        'entrada' as tipo,
        p.nombre as item,
        e.cantidad,
        s.nombre as sede,
        u.nombre as usuario,
        u.rol,
        CASE WHEN e.guia IS NOT NULL THEN CONCAT('Guía: ', e.guia) ELSE NULL END as motivo,
        e.comentario
      FROM entradas_stock e
      JOIN productos p ON e.producto_id = p.id
      LEFT JOIN usuarios u ON e.registrado_por = u.id
      LEFT JOIN sedes s ON s.id = e.sede_id

      UNION ALL

      -- Salidas a técnico
      SELECT
        et.id,
        et.fecha,
        'salida' as tipo,
        p.nombre as item,
        et.cantidad,
        s.nombre as sede,
        u.nombre as usuario,
        u.rol,
        NULL as motivo,
        NULL as comentario
      FROM entregas_tecnicos et
      JOIN productos p ON et.producto_id = p.id
      LEFT JOIN usuarios u ON et.tecnico_id = u.id
      LEFT JOIN sedes s ON s.id = u.sede_id

      UNION ALL

      -- Consumo técnico
      SELECT
        ct.id,
        ct.fecha,
        'consumo' as tipo,
        p.nombre as item,
        ct.cantidad,
        s.nombre as sede,
        u.nombre as usuario,
        u.rol,
        ct.motivo,
        ct.descripcion as comentario
      FROM consumo_tecnico ct
      JOIN productos p ON ct.producto_id = p.id
      LEFT JOIN usuarios u ON ct.tecnico_id = u.id
      LEFT JOIN sedes s ON s.id = u.sede_id

      UNION ALL

      -- Envíos: SALIDA agrupada por envio+producto desde sede origen
      SELECT
        MIN(ed.id) as id,
        e.fecha_envio as fecha,
        'envio' as tipo,
        CONCAT(
          p.nombre,
          ' → ', se_dest.nombre,
          CASE
            WHEN COUNT(pv.id) > 0
            THEN CONCAT(
              ' · ',
              GROUP_CONCAT(
                CONCAT(
                  CASE pv.genero
                    WHEN 'masculino' THEN 'M'
                    WHEN 'femenino'  THEN 'F'
                    ELSE 'U'
                  END,
                  '-', pv.talla, ': ', ed.cantidad
                )
                ORDER BY pv.genero, pv.talla
                SEPARATOR ', '
              )
            )
            ELSE ''
          END
        ) as item,
        SUM(ed.cantidad) as cantidad,
        se_orig.nombre as sede,
        u.nombre as usuario,
        u.rol,
        CONCAT('Guía: ', e.guia) as motivo,
        e.comentario
      FROM envio_detalles ed
      JOIN envios e ON e.id = ed.envio_id
      JOIN productos p ON p.id = ed.producto_id
      LEFT JOIN producto_variantes pv ON pv.id = ed.variante_id
      JOIN sedes se_dest ON se_dest.id = e.sede_id
      LEFT JOIN sedes se_orig ON se_orig.id = e.sede_origen_id
      LEFT JOIN usuarios u ON u.id = e.usuario_id
      GROUP BY e.id, p.id, se_dest.id, se_orig.id, u.id, e.fecha_envio, e.guia, e.comentario

      UNION ALL

      -- Envíos: RECEPCIÓN en sede destino
      SELECT
        MIN(ed.id) as id,
        e.fecha_envio as fecha,
        'recepcion' as tipo,
        CONCAT(
          p.nombre,
          ' ← ', se_orig.nombre,
          CASE
            WHEN COUNT(pv.id) > 0
            THEN CONCAT(
              ' · ',
              GROUP_CONCAT(
                CONCAT(
                  CASE pv.genero
                    WHEN 'masculino' THEN 'M'
                    WHEN 'femenino'  THEN 'F'
                    ELSE 'U'
                  END,
                  '-', pv.talla, ': ', ed.cantidad
                )
                ORDER BY pv.genero, pv.talla
                SEPARATOR ', '
              )
            )
            ELSE ''
          END
        ) as item,
        SUM(ed.cantidad) as cantidad,
        se_dest.nombre as sede,
        u.nombre as usuario,
        u.rol,
        CONCAT('Recibido de: ', se_orig.nombre, ' · Guía: ', e.guia) as motivo,
        e.comentario
      FROM envio_detalles ed
      JOIN envios e ON e.id = ed.envio_id
      JOIN productos p ON p.id = ed.producto_id
      LEFT JOIN producto_variantes pv ON pv.id = ed.variante_id
      JOIN sedes se_dest ON se_dest.id = e.sede_id
      LEFT JOIN sedes se_orig ON se_orig.id = e.sede_origen_id
      LEFT JOIN usuarios u ON u.id = e.usuario_id
      GROUP BY e.id, p.id, se_dest.id, se_orig.id, u.id, e.fecha_envio, e.guia, e.comentario

      ORDER BY fecha DESC
    `)

    res.json(rows)
  } catch (err) {
    console.error("❌ Error getMovimientos:", err.message)
    res.status(500).json({ message: "Error al obtener movimientos", error: err.message })
  }
}