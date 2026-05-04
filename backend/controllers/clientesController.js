const db = require('../config/db')
const ExcelJS = require('exceljs')
const PDFDocument = require('pdfkit')

// ── GET /api/clientes ─────────────────────────────────────────────────────────
const getClientes = async (req, res) => {
  try {
    const { search = '', sede_id = '' } = req.query
    const rol    = req.user.rol
    const miSede = req.user.sede_id

    const where  = ['1=1']
    const params = []

    // controlador SIEMPRE ve solo su sede — no se puede override
    if (rol === 'controlador') {
      where.push('c.sede_id = ?')
      params.push(miSede)
    } else if (sede_id) {
      where.push('c.sede_id = ?')
      params.push(sede_id)
    }

    if (search) {
      where.push('(c.nombre LIKE ? OR c.doc_identidad LIKE ? OR o.nro_contrato LIKE ?)')
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    const [rows] = await db.execute(`
      SELECT
        c.id,
        c.nombre,
        c.doc_identidad,
        c.telefono,
        c.sede_id,
        s.nombre                                                                 AS sede_nombre,
        COUNT(DISTINCT o.nro_contrato)                                           AS total_contratos,
        COUNT(DISTINCT CASE WHEN o.servicio LIKE '%INSTALACION%' THEN o.id END) AS total_instalaciones,
        COUNT(DISTINCT CASE WHEN o.servicio LIKE '%AVERIA%'      THEN o.id END) AS total_averias,
        COUNT(DISTINCT CASE WHEN o.servicio LIKE '%CAMBIO%'      THEN o.id END) AS total_cambios_onu,
        MAX(ar.ip_local)                                                         AS ip_local
      FROM clientes c
      LEFT JOIN sedes            s  ON s.id         = c.sede_id
      LEFT JOIN ordenes_servicio o  ON o.cliente_id = c.id
      LEFT JOIN activacion_red   ar ON ar.orden_id  = o.id
      WHERE ${where.join(' AND ')}
      GROUP BY c.id, c.nombre, c.doc_identidad, c.telefono, c.sede_id, s.nombre
      ORDER BY c.nombre ASC
    `, params)

    res.json(rows)
  } catch (err) {
    console.error('Error GET /api/clientes:', err)
    res.status(500).json({ message: 'Error al obtener clientes' })
  }
}

// ── GET /api/clientes/:id ─────────────────────────────────────────────────────
const getClienteDetalle = async (req, res) => {
  try {
    const { id } = req.params
    const rol    = req.user.rol
    const miSede = req.user.sede_id

    // controlador SIEMPRE ve solo clientes de su sede
    const sedeWhere = rol === 'controlador' ? 'AND c.sede_id = ?' : ''
    const params    = rol === 'controlador' ? [id, miSede] : [id]

    const [[cliente]] = await db.execute(`
      SELECT c.*, s.nombre AS sede_nombre
      FROM clientes c
      LEFT JOIN sedes s ON s.id = c.sede_id
      WHERE c.id = ? ${sedeWhere}
    `, params)

    if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' })

    const [contratos] = await db.execute(`
      SELECT
        o.nro_contrato,
        MAX(o.direccion)    AS direccion,
        MAX(o.sector)       AS sector,
        MAX(o.via)          AS via,
        MAX(o.referencia)   AS referencia,
        MAX(o.tecnologia)   AS tecnologia,
        MAX(o.estado_orden) AS estado_contrato,
        MAX(ar.ip_local)    AS ip_local,
        MAX(ar.mascara)     AS mascara,
        MAX(ar.gateway)     AS gateway,
        MAX(ar.modelo_onu)  AS modelo_onu,
        MAX(ar.perfil_onu)  AS perfil_onu,
        COUNT(o.id)         AS total_ordenes
      FROM ordenes_servicio o
      LEFT JOIN activacion_red ar ON ar.orden_id = o.id
      WHERE o.cliente_id = ?
      GROUP BY o.nro_contrato
      ORDER BY o.nro_contrato
    `, [id])

    for (const contrato of contratos) {
      const [ordenes] = await db.execute(`
        SELECT
          o.id, o.nro_orden, o.servicio, o.estado_app,
          o.fecha_crea, o.observacion, o.completada_en,
          ar.ip_local, ar.mascara, ar.gateway, ar.modelo_onu, ar.perfil_onu
        FROM ordenes_servicio o
        LEFT JOIN activacion_red ar ON ar.orden_id = o.id
        WHERE o.cliente_id = ? AND o.nro_contrato = ?
        ORDER BY o.fecha_crea DESC
      `, [id, contrato.nro_contrato])
      contrato.ordenes = ordenes
    }

    res.json({ ...cliente, contratos })
  } catch (err) {
    console.error('Error GET /api/clientes/:id:', err)
    res.status(500).json({ message: 'Error al obtener detalle del cliente' })
  }
}

// ── PUT /api/clientes/:id ─────────────────────────────────────────────────────
const updateCliente = async (req, res) => {
  try {
    const { id } = req.params
    const rol    = req.user.rol
    const miSede = req.user.sede_id
    const { nombre, doc_identidad, telefono, sede_id } = req.body

    // controlador solo puede editar clientes de su sede
    const sedeWhere = rol === 'controlador' ? 'AND sede_id = ?' : ''
    const checkParams = rol === 'controlador' ? [id, miSede] : [id]

    const [[existe]] = await db.execute(
      `SELECT id FROM clientes WHERE id = ? ${sedeWhere}`,
      checkParams
    )
    if (!existe) return res.status(404).json({ message: 'Cliente no encontrado o sin acceso' })

    // controlador no puede cambiar la sede del cliente
    const nuevaSede = rol === 'controlador' ? miSede : (sede_id || null)

    await db.execute(
      `UPDATE clientes SET nombre=?, doc_identidad=?, telefono=?, sede_id=? WHERE id=?`,
      [nombre, doc_identidad, telefono || null, nuevaSede, id]
    )
    const [[updated]] = await db.execute('SELECT * FROM clientes WHERE id=?', [id])
    res.json(updated)
  } catch (err) {
    console.error('Error PUT /api/clientes/:id:', err)
    res.status(500).json({ message: 'Error al actualizar cliente' })
  }
}

// ── Helper: filas para exportar (respeta sede estrictamente) ──────────────────
const getRowsExport = async (rol, miSede, sede_id, search, cliente_id) => {
  if (cliente_id) {
    // controlador solo puede exportar clientes de su sede
    const sedeWhere = rol === 'controlador' ? 'AND c.sede_id = ?' : ''
    const params    = rol === 'controlador' ? [cliente_id, miSede] : [cliente_id]

    const [rows] = await db.execute(`
      SELECT
        c.nombre, c.doc_identidad, c.telefono,
        s.nombre        AS sede_nombre,
        o.nro_contrato, o.servicio,   o.direccion,
        o.sector,       o.fecha_crea, o.estado_app,
        o.observacion,  ar.ip_local
      FROM ordenes_servicio o
      JOIN  clientes c            ON c.id        = o.cliente_id
      LEFT JOIN sedes s           ON s.id         = c.sede_id
      LEFT JOIN activacion_red ar ON ar.orden_id  = o.id
      WHERE o.cliente_id = ? ${sedeWhere}
      ORDER BY o.nro_contrato, o.fecha_crea DESC
    `, params)
    return rows
  }

  const where  = ['1=1']
  const params = []

  // controlador SIEMPRE filtrado por su sede — sin excepción
  if (rol === 'controlador') {
    where.push('c.sede_id = ?')
    params.push(miSede)
  } else if (sede_id) {
    where.push('c.sede_id = ?')
    params.push(sede_id)
  }

  if (search) {
    where.push('(c.nombre LIKE ? OR c.doc_identidad LIKE ?)')
    params.push(`%${search}%`, `%${search}%`)
  }

  const [rows] = await db.execute(`
    SELECT
      c.nombre, c.doc_identidad, c.telefono,
      s.nombre        AS sede_nombre,
      o.nro_contrato, o.servicio,   o.direccion,
      o.sector,       o.fecha_crea, o.estado_app,
      o.observacion,  ar.ip_local
    FROM clientes c
    LEFT JOIN sedes s              ON s.id         = c.sede_id
    LEFT JOIN ordenes_servicio o   ON o.cliente_id = c.id
    LEFT JOIN activacion_red ar    ON ar.orden_id  = o.id
    WHERE ${where.join(' AND ')}
    ORDER BY c.nombre, o.nro_contrato, o.fecha_crea DESC
  `, params)
  return rows
}

// ── GET /api/clientes/exportar/excel ─────────────────────────────────────────
const exportarExcel = async (req, res) => {
  try {
    const { search = '', sede_id = '', cliente_id = '' } = req.query
    const rows = await getRowsExport(req.user.rol, req.user.sede_id, sede_id, search, cliente_id)

    const workbook  = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Clientes')

    worksheet.columns = [
      { header: 'Nombre',      key: 'nombre',        width: 30 },
      { header: 'DNI',         key: 'doc_identidad', width: 15 },
      { header: 'Teléfono',    key: 'telefono',      width: 15 },
      { header: 'Sede',        key: 'sede_nombre',   width: 20 },
      { header: 'Contrato',    key: 'nro_contrato',  width: 18 },
      { header: 'Servicio',    key: 'servicio',      width: 20 },
      { header: 'Dirección',   key: 'direccion',     width: 35 },
      { header: 'Sector',      key: 'sector',        width: 20 },
      { header: 'Fecha',       key: 'fecha_crea',    width: 15 },
      { header: 'Estado',      key: 'estado_app',    width: 12 },
      { header: 'Observación', key: 'observacion',   width: 30 },
      { header: 'IP',          key: 'ip_local',      width: 16 },
    ]

    worksheet.getRow(1).font      = { bold: true }
    worksheet.getRow(1).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
    worksheet.getRow(1).alignment = { vertical: 'middle' }

    rows.forEach(r => worksheet.addRow(r))

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=clientes.xlsx')
    await workbook.xlsx.write(res)
    res.end()
  } catch (err) {
    console.error('Error exportar Excel:', err)
    res.status(500).json({ message: 'Error al exportar Excel' })
  }
}

// ── GET /api/clientes/exportar/pdf ────────────────────────────────────────────
const exportarPDF = async (req, res) => {
  try {
    const { search = '', sede_id = '', cliente_id = '' } = req.query
    const rows = await getRowsExport(req.user.rol, req.user.sede_id, sede_id, search, cliente_id)

    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_operaciones.pdf')
    doc.pipe(res)

    const C = {
      black:   '#0f172a',
      dark:    '#1e293b',
      muted:   '#64748b',
      light:   '#94a3b8',
      border:  '#cbd5e1',
      bg:      '#f8fafc',
      white:   '#ffffff',
      green:   '#15803d',
      red:     '#b91c1c',
      yellow:  '#92400e',
      blue:    '#1d4ed8',
      purple:  '#6d28d9',
      primary: '#1e3a5f',
    }

    const PW = doc.page.width - 100
    const L  = 50

    const line = (y, color = C.border, w = 1) => {
      doc.moveTo(L, y).lineTo(L + PW, y).strokeColor(color).lineWidth(w).stroke()
    }

    const sectionTitle = (title) => {
      doc.y += 14
      doc.fontSize(9).fillColor(C.primary).font('Helvetica-Bold')
        .text(title.toUpperCase(), L, doc.y, { characterSpacing: 1.5 })
      doc.y += 4
      line(doc.y, C.primary, 0.75)
      doc.y += 10
    }

    const tableHeader = (cols) => {
      const y = doc.y
      doc.rect(L, y, PW, 16).fill(C.primary)
      doc.fontSize(7.5).fillColor(C.white).font('Helvetica-Bold')
      let x = L + 6
      cols.forEach(({ label, w }) => {
        doc.text(label, x, y + 4, { width: w, lineBreak: false })
        x += w
      })
      doc.y = y + 16
    }

    const tableRow = (cols, i) => {
      const y  = doc.y
      const rh = 15
      if (i % 2 === 0) doc.rect(L, y, PW, rh).fill(C.bg)
      doc.moveTo(L, y + rh).lineTo(L + PW, y + rh).strokeColor(C.border).lineWidth(0.3).stroke()
      let x = L + 6
      cols.forEach(({ val, w, color, bold }) => {
        doc.fontSize(8)
          .fillColor(color || C.dark)
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .text(String(val ?? '—'), x, y + 4, { width: w, lineBreak: false, ellipsis: true })
        x += w
      })
      doc.y = y + rh
    }

    const progressBar = (x, y, w, pct, color) => {
      doc.roundedRect(x, y, w, 5, 2).fill('#e2e8f0')
      if (pct > 0) doc.roundedRect(x, y, Math.max(w * (pct / 100), 3), 5, 2).fill(color)
    }

    // ── MÉTRICAS ──────────────────────────────────────────────────────────
    const total       = rows.length
    const completadas = rows.filter(r => r.estado_app === 'completada').length
    const pendientes  = total - completadas
    const pct         = total > 0 ? Math.round((completadas / total) * 100) : 0

    const tipoMap = {}
    rows.forEach(r => {
      const u = (r.servicio || '').toUpperCase()
      let t = 'Otros'
      if (u.includes('INSTALACION'))     t = 'Instalaciones'
      else if (u.includes('AVERIA'))     t = 'Averías'
      else if (u.includes('CAMBIO'))     t = 'Cambios ONU'
      else if (u.includes('RECONEXION')) t = 'Reconexiones'
      else if (u.includes('RECOJO'))     t = 'Recojos'
      if (!tipoMap[t]) tipoMap[t] = { total: 0, comp: 0 }
      tipoMap[t].total++
      if (r.estado_app === 'completada') tipoMap[t].comp++
    })

    const sectorMap = {}
    rows.forEach(r => {
      const s = r.sector || 'Sin sector'
      if (!sectorMap[s]) sectorMap[s] = { total: 0, comp: 0 }
      sectorMap[s].total++
      if (r.estado_app === 'completada') sectorMap[s].comp++
    })

    const clienteMap = {}
    rows.forEach(r => {
      const k = r.doc_identidad || r.nombre
      if (!clienteMap[k]) clienteMap[k] = {
        nombre: r.nombre, dni: r.doc_identidad,
        contrato: r.nro_contrato,
        ordenes: 0, comp: 0, ultimaFecha: ''
      }
      clienteMap[k].ordenes++
      if (r.estado_app === 'completada') clienteMap[k].comp++
      if ((r.fecha_crea || '') > clienteMap[k].ultimaFecha) clienteMap[k].ultimaFecha = r.fecha_crea
    })

    const fechaMap = {}
    rows.forEach(r => {
      const f = r.fecha_crea || 'Sin fecha'
      if (!fechaMap[f]) fechaMap[f] = 0
      fechaMap[f]++
    })
    const diasActivos    = Object.keys(fechaMap).length
    const promDiario     = diasActivos > 0 ? (total / diasActivos).toFixed(1) : '0'
    const clientesUnicos = Object.keys(clienteMap).length
    const sede           = rows[0]?.sede_nombre || 'Todas las sedes'
    const fecha          = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })

    // ════════════════════════════════════════════════════════════════════
    // PÁGINA 1 — RESUMEN EJECUTIVO
    // ════════════════════════════════════════════════════════════════════
    doc.fontSize(8).fillColor(C.muted).font('Helvetica')
      .text('REPORTE DE OPERACIONES', L, 50, { characterSpacing: 2, lineBreak: false })
    doc.fontSize(18).fillColor(C.primary).font('Helvetica-Bold')
      .text(sede, L, 62)
    doc.fontSize(9).fillColor(C.muted).font('Helvetica')
      .text(`Emitido el ${fecha}`, L, doc.y)
    line(doc.y + 6, C.primary, 1.5)
    doc.y += 18

    // ── KPIs en tabla compacta ────────────────────────────────────────────
    sectionTitle('Indicadores del Período')

    const kpis = [
      { label: 'Órdenes totales',    val: total,          note: 'en el período'              },
      { label: 'Completadas',        val: completadas,    note: `${pct}% de efectividad`,    color: C.green  },
      { label: 'Pendientes',         val: pendientes,     note: 'por atender',               color: pendientes > 0 ? C.red : C.green },
      { label: 'Clientes atendidos', val: clientesUnicos, note: 'clientes únicos'            },
      { label: 'Promedio diario',    val: promDiario,     note: `en ${diasActivos} días`     },
    ]

    const kpiW = PW / kpis.length
    const ky   = doc.y
    kpis.forEach(({ label, val, note, color }, i) => {
      const x = L + i * kpiW
      doc.fontSize(22).fillColor(color || C.primary).font('Helvetica-Bold')
        .text(String(val), x, ky, { width: kpiW, lineBreak: false })
      doc.fontSize(8).fillColor(C.dark).font('Helvetica-Bold')
        .text(label, x, ky + 26, { width: kpiW, lineBreak: false })
      doc.fontSize(7.5).fillColor(C.muted).font('Helvetica')
        .text(note, x, ky + 37, { width: kpiW, lineBreak: false })
    })
    doc.y = ky + 52

    // Barra de efectividad
    doc.fontSize(8).fillColor(C.muted).font('Helvetica')
      .text(`Efectividad operacional: ${pct}%  `, L, doc.y, { lineBreak: false, continued: true })
    doc.fillColor(pct >= 80 ? C.green : pct >= 50 ? C.yellow : C.red).font('Helvetica-Bold')
      .text(pct >= 80 ? 'ÓPTIMO' : pct >= 50 ? 'EN PROCESO' : 'CRÍTICO', { lineBreak: false })
    doc.y += 10
    progressBar(L, doc.y, PW, pct, pct >= 80 ? C.green : pct >= 50 ? C.yellow : C.red)
    doc.y += 14

    // ── Desglose por tipo de servicio ─────────────────────────────────────
    sectionTitle('Distribución por Tipo de Servicio')

    const tipoColor = {
      'Instalaciones': C.green,
      'Averías':       C.red,
      'Cambios ONU':   C.yellow,
      'Reconexiones':  C.blue,
      'Recojos':       C.purple,
      'Otros':         C.muted,
    }

    const barMaxW    = PW - 280
    const tipoEntries = Object.entries(tipoMap).sort((a, b) => b[1].total - a[1].total)

    doc.fontSize(7.5).fillColor(C.muted).font('Helvetica-Bold')
    doc.text('SERVICIO',    L + 6,   doc.y, { width: 110, lineBreak: false })
    doc.text('TOTAL',       L + 120, doc.y, { width: 40,  lineBreak: false })
    doc.text('COMPLET.',    L + 162, doc.y, { width: 50,  lineBreak: false })
    doc.text('PENDIENT.',   L + 214, doc.y, { width: 50,  lineBreak: false })
    doc.text('EFECTIVIDAD', L + 266, doc.y, { width: barMaxW + 30, lineBreak: false })
    doc.y += 12
    line(doc.y, C.border, 0.5)
    doc.y += 4

    tipoEntries.forEach(([tipo, d], i) => {
      const y     = doc.y
      const color = tipoColor[tipo] || C.muted
      const pctT  = d.total > 0 ? Math.round((d.comp / d.total) * 100) : 0
      if (i % 2 === 0) doc.rect(L, y, PW, 18).fill(C.bg)
      doc.rect(L + 6, y + 6, 6, 6).fill(color)
      doc.fontSize(8.5).fillColor(C.dark).font('Helvetica-Bold')
        .text(tipo,          L + 16,  y + 5, { width: 100, lineBreak: false })
      doc.font('Helvetica')
        .text(String(d.total),        L + 120, y + 5, { width: 40, lineBreak: false })
      doc.fillColor(C.green).font('Helvetica-Bold')
        .text(String(d.comp),         L + 162, y + 5, { width: 50, lineBreak: false })
      doc.fillColor(d.total - d.comp > 0 ? C.red : C.muted).font('Helvetica')
        .text(String(d.total - d.comp), L + 214, y + 5, { width: 50, lineBreak: false })
      progressBar(L + 266, y + 7, barMaxW, pctT, color)
      doc.fontSize(7.5).fillColor(C.muted)
        .text(`${pctT}%`, L + 266 + barMaxW + 4, y + 5, { lineBreak: false })
      doc.moveTo(L, y + 18).lineTo(L + PW, y + 18).strokeColor(C.border).lineWidth(0.3).stroke()
      doc.y = y + 18
    })

    // ── Actividad por sector ──────────────────────────────────────────────
    sectionTitle('Actividad por Sector')

    const sectorEntries = Object.entries(sectorMap).sort((a, b) => b[1].total - a[1].total)
    const maxSec        = sectorEntries[0]?.[1].total || 1
    const secBarW       = PW - 200

    doc.fontSize(7.5).fillColor(C.muted).font('Helvetica-Bold')
    doc.text('SECTOR',   L + 6,   doc.y, { width: 80, lineBreak: false })
    doc.text('ÓRDENES',  L + 90,  doc.y, { width: 50, lineBreak: false })
    doc.text('COMPLET.', L + 140, doc.y, { width: 50, lineBreak: false })
    doc.text('VOLUMEN',  L + 192, doc.y, { width: secBarW + 30, lineBreak: false })
    doc.y += 12
    line(doc.y, C.border, 0.5)
    doc.y += 4

    sectorEntries.forEach(([sector, d], i) => {
      const y    = doc.y
      const barW = secBarW * (d.total / maxSec)
      const pctS = d.total > 0 ? Math.round((d.comp / d.total) * 100) : 0
      if (i % 2 === 0) doc.rect(L, y, PW, 18).fill(C.bg)
      doc.fontSize(8.5).fillColor(C.dark).font('Helvetica')
        .text(sector,          L + 6,   y + 5, { width: 80, lineBreak: false, ellipsis: true })
      doc.font('Helvetica-Bold')
        .text(String(d.total), L + 90,  y + 5, { width: 50, lineBreak: false })
      doc.fillColor(C.green).font('Helvetica')
        .text(`${d.comp} (${pctS}%)`, L + 140, y + 5, { width: 50, lineBreak: false })
      doc.roundedRect(L + 192, y + 7, secBarW, 5, 2).fill('#e2e8f0')
      doc.roundedRect(L + 192, y + 7, Math.max(barW, 3), 5, 2).fill(C.primary)
      doc.moveTo(L, y + 18).lineTo(L + PW, y + 18).strokeColor(C.border).lineWidth(0.3).stroke()
      doc.y = y + 18
    })

    // ════════════════════════════════════════════════════════════════════
    // PÁGINA 2 — DETALLE POR CLIENTE
    // ════════════════════════════════════════════════════════════════════
    doc.addPage()

    doc.fontSize(8).fillColor(C.muted).font('Helvetica')
      .text('REPORTE DE OPERACIONES', L, 50, { characterSpacing: 2, lineBreak: false })
    doc.fontSize(14).fillColor(C.primary).font('Helvetica-Bold')
      .text('Detalle por Cliente', L, 62)
    line(76, C.primary, 1.5)
    doc.y = 86

    const cols = [
      { label: 'CLIENTE',          w: 160 },
      { label: 'DNI',              w: 70  },
      { label: 'CONTRATO',         w: 80  },
      { label: 'ÓRDENES',          w: 50  },
      { label: 'COMPLET.',         w: 55  },
      { label: 'EFECTIV.',         w: 45  },
      { label: 'ÚLTIMA ACTIVIDAD', w: PW - 160 - 70 - 80 - 50 - 55 - 45 },
    ]

    tableHeader(cols)

    Object.values(clienteMap)
      .sort((a, b) => b.ordenes - a.ordenes)
      .forEach((c, i) => {
        if (doc.y > 760) {
          doc.addPage()
          tableHeader(cols)
        }
        const pctC = c.ordenes > 0 ? Math.round((c.comp / c.ordenes) * 100) : 0
        tableRow([
          { val: c.nombre,       w: cols[0].w, bold: true },
          { val: c.dni,          w: cols[1].w, color: C.muted },
          { val: c.contrato || '—', w: cols[2].w, color: C.muted },
          { val: c.ordenes,      w: cols[3].w, bold: true },
          { val: c.comp,         w: cols[4].w, color: c.comp > 0 ? C.green : C.muted },
          { val: `${pctC}%`,     w: cols[5].w, color: pctC >= 80 ? C.green : pctC >= 50 ? C.yellow : C.red },
          { val: c.ultimaFecha,  w: cols[6].w, color: C.muted },
        ], i)
      })

    // ── PIE DE PÁGINA ─────────────────────────────────────────────────────
    const pages = doc.bufferedPageRange()
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i)
      line(doc.page.height - 36, C.border, 0.5)
      doc.fontSize(7.5).fillColor(C.light).font('Helvetica')
        .text(
          `${sede}  ·  ${fecha}  ·  Página ${i + 1} de ${pages.count}`,
          L, doc.page.height - 28,
          { width: PW, align: 'center', lineBreak: false }
        )
    }

    doc.end()
  } catch (err) {
    console.error('Error exportar PDF:', err)
    res.status(500).json({ message: 'Error al exportar PDF' })
  }
}

module.exports = { getClientes, getClienteDetalle, updateCliente, exportarExcel, exportarPDF }