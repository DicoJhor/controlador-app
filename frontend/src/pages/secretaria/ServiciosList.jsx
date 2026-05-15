import { useState, useEffect, useRef } from "react";
import ordenesService from "../../services/ordenesService";
import { useAuth } from "../../hooks/useAuth";

const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/api$/, "");

function formatFecha(fecha) {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function Icon({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const IC = {
  search:  "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  x:       "M18 6L6 18 M6 6l12 12",
  copy:    "M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2 M8 4a2 2 0 012-2h4a2 2 0 012 2v0a2 2 0 01-2 2h-4a2 2 0 01-2-2z",
  check:   "M20 6L9 17l-5-5",
  refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0020.49 15",
  list:    "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  image:   "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 19",
  clipboard: "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2 M9 2h6a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V3a1 1 0 011-1z",
};

function labelServicio(s = "") {
  const u = s.toUpperCase();
  if (u.includes("ALTA DE SERVICIO"))      return "Alta servicio";
  if (u.includes("ANTENCION NOC"))         return "Atención NOC";
  if (u.includes("AVERIA"))               return "Avería";
  if (u.includes("BAJA DE SERVICIO"))     return "Baja servicio";
  if (u.includes("CAMBIO DE CONTRASEÑA")) return "Cambio contraseña";
  if (u.includes("CAMBIO DE DOMICILIO"))  return "Cambio domicilio";
  if (u.includes("CAMBIO DE EQUIPO"))     return "Cambio ONU";
  if (u.includes("CAMBIO DE PLAN"))       return "Cambio plan";
  if (u.includes("CAMBIO DE TITULAR"))    return "Cambio titular";
  if (u.includes("CORTE A SOLICITUD"))    return "Corte voluntario";
  if (u.includes("CORTE POR DEUDA"))      return "Corte por deuda";
  if (u.includes("INSTALACION DE ANEXO")) return "Instalación anexo";
  if (u.includes("INSTALACION"))          return "Instalación";
  if (u.includes("MIGRACION"))            return "Migración FTTH";
  if (u.includes("RECONEXION"))           return "Reconexión";
  if (u.includes("RETIRO DE EQUIPO"))     return "Retiro equipo";
  if (u.includes("SUPERVICION"))          return "Supervisión";
  if (u.includes("TRASLADO"))             return "Traslado";
  return s;
}

function badgeServicio(s = "") {
  const u = s.toUpperCase();
  if (u.includes("RETIRO DE EQUIPO"))     return "badge-purple";
  if (u.includes("CAMBIO DE EQUIPO"))     return "badge-warning";
  if (u.includes("INSTALACION DE ANEXO")) return "badge-active";
  if (u.includes("INSTALACION"))          return "badge-active";
  if (u.includes("AVERIA"))              return "badge-danger";
  if (u.includes("RECONEXION"))          return "badge-blue";
  if (u.includes("ALTA DE SERVICIO"))    return "badge-success";
  if (u.includes("BAJA DE SERVICIO"))    return "badge-dark";
  if (u.includes("ANTENCION NOC"))       return "badge-info";
  if (u.includes("CAMBIO DE CONTRASEÑA")) return "badge-cyan";
  if (u.includes("CAMBIO DE DOMICILIO")) return "badge-warning";
  if (u.includes("CAMBIO DE PLAN"))      return "badge-info";
  if (u.includes("CAMBIO DE TITULAR"))   return "badge-warning";
  if (u.includes("CORTE A SOLICITUD"))   return "badge-orange";
  if (u.includes("CORTE POR DEUDA"))     return "badge-error";
  if (u.includes("TRASLADO"))            return "badge-blue";
  return "badge-blue";
}

function formatMateriales(materiales = []) {
  if (!materiales.length) return "Sin materiales";
  return materiales
    .map(m => `${m.nombre}${m.codigo_pon ? ` (${m.codigo_pon})` : ""}: ${m.cantidad} ${m.unidad ?? ""}`.trim())
    .join(" // ");
}

function DetRow({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 13 }}>
      <span style={{ color: "var(--text-muted)", minWidth: 90 }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );
}

export default function ServiciosList() {
  const [ordenes,        setOrdenes]        = useState([]);
  const [loadingOrdenes, setLoadingOrdenes] = useState(true);
  const [filtroEstado,   setFiltroEstado]   = useState("pendiente");
  const [searchOrdenes,  setSearchOrdenes]  = useState("");
  const [filtroTipo,     setFiltroTipo]     = useState("todas");
  const [filtroRed,      setFiltroRed]      = useState("todas");
  const [openDD,         setOpenDD]         = useState(null);
  const [ordenDetalle,   setOrdenDetalle]   = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [copiadoMat,     setCopiadoMat]     = useState(false);
  const [copiadoTodo,    setCopiadoTodo]    = useState(false);
  const [filtroFecha, setFiltroFecha] = useState({ desde: "", hasta: "" });

  const { user } = useAuth();

  const cargarOrdenes = async () => {
    setLoadingOrdenes(true);
    try {
      const data = await ordenesService.getAll(filtroEstado, user?.sede_id);
      setOrdenes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando órdenes:", err);
      setOrdenes([]);
    } finally {
      setLoadingOrdenes(false);
    }
  };

  useEffect(() => { cargarOrdenes(); }, [filtroEstado]);

  const abrirDetalle = async (orden) => {
    setOrdenDetalle({ ...orden, materiales: null, fotos: null });
    setLoadingDetalle(true);
    setCopiadoMat(false);
    setCopiadoTodo(false);
    try {
      const res = await ordenesService.getDetalle(orden.id);
      setOrdenDetalle(res.data ?? res);
    } catch {
      // muestra datos básicos igual
    } finally {
      setLoadingDetalle(false);
    }
  };

  const cerrarDetalle = () => setOrdenDetalle(null);

  const copiarMateriales = () => {
    const texto = formatMateriales(ordenDetalle?.materiales ?? []);
    navigator.clipboard.writeText(texto).catch(() => {});
    setCopiadoMat(true);
    setTimeout(() => setCopiadoMat(false), 2000);
  };

  const copiarTodo = () => {
    if (!ordenDetalle) return;
    const mats = formatMateriales(ordenDetalle.materiales ?? []);
    const texto = [
      `Orden #${ordenDetalle.nro_orden} | ${ordenDetalle.nro_contrato}`,
      `Abonado: ${ordenDetalle.abonado || "—"}`,
      `Dirección: ${ordenDetalle.direccion || "—"}`,
      `Servicio: ${labelServicio(ordenDetalle.servicio || "")}`,
      `Técnico: ${ordenDetalle.tecnico_nombre || "—"}`,
      `Fecha: ${ordenDetalle.fecha_crea || "—"}`,
      `Observación: ${ordenDetalle.observacion || "—"}`,
      `Comentario técnico: ${ordenDetalle.comentario_tecnico || "—"}`,
      `Materiales: ${mats}`,
    ].join("\n");
    navigator.clipboard.writeText(texto).catch(() => {});
    setCopiadoTodo(true);
    setTimeout(() => setCopiadoTodo(false), 2000);
  };

  // Filtros
  const SERVICIOS_POR_RED = {
    internet: ["Instalación","Avería","Alta servicio","Baja servicio","Atención NOC","Cambio contraseña","Cambio domicilio","Cambio ONU","Cambio plan","Cambio titular","Corte voluntario","Corte por deuda","Reconexión","Retiro equipo","Traslado"],
    cable:    ["Instalación","Avería","Alta servicio","Cambio domicilio","Cambio plan","Cambio titular","Corte voluntario","Corte por deuda","Instalación anexo","Migración FTTH","Reconexión","Retiro equipo","Supervisión","Traslado"],
    todas:    ["Alta servicio","Atención NOC","Avería","Baja servicio","Cambio contraseña","Cambio domicilio","Cambio ONU","Cambio plan","Cambio titular","Corte voluntario","Corte por deuda","Instalación anexo","Instalación","Migración FTTH","Reconexión","Retiro equipo","Supervisión","Traslado"],
  };
  const tiposDisponibles = SERVICIOS_POR_RED[filtroRed] ?? SERVICIOS_POR_RED.todas;

  const filteredOrdenes = ordenes.filter(o => {
    const serv = (o.servicio ?? "").toUpperCase();
    const matchRed =
      filtroRed === "todas" ||
      (filtroRed === "internet" && serv.includes("(I)")) ||
      (filtroRed === "cable"    && serv.includes("(C)"));
    const matchTipo =
      filtroTipo === "todas" ||
      labelServicio(o.servicio ?? "") === filtroTipo;
    const matchSearch =
      !searchOrdenes ||
      (o.abonado ?? "").toLowerCase().includes(searchOrdenes.toLowerCase()) ||
      (o.nro_contrato ?? "").toLowerCase().includes(searchOrdenes.toLowerCase()) ||
      String(o.nro_orden).includes(searchOrdenes);
    const fechaOrden = o.fecha_crea ? new Date(o.fecha_crea) : null;
    const matchDesde = !filtroFecha.desde || (fechaOrden && fechaOrden >= new Date(filtroFecha.desde));
    const matchHasta = !filtroFecha.hasta || (fechaOrden && fechaOrden <= new Date(filtroFecha.hasta + "T23:59:59"));
    return matchRed && matchTipo && matchSearch && matchDesde && matchHasta;
  });

  // Dropdown helper
  const Dropdown = ({ id, label, value, options, onChange }) => (
    <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
      <button type="button"
        onClick={() => setOpenDD(openDD === id ? null : id)}
        style={styles.ddBtn}>
        <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{label}</span>
        {value}
        <Icon d="M6 9l6 6 6-6" size={14} color="var(--text-muted)" />
      </button>
      {openDD === id && (
        <div style={styles.ddMenu}>
          {options.map(o => (
            <div key={o.key}
              onClick={() => { onChange(o.key); setOpenDD(null); }}
              style={{
                ...styles.ddItem,
                fontWeight: value === o.label ? 500 : 400,
                color: value === o.label ? "var(--primary)" : "var(--text)",
                background: value === o.label ? "#EEF4FF" : "white",
              }}>
              {o.dot && <span style={{ width: 8, height: 8, borderRadius: "50%", background: o.dot, display: "inline-block", marginRight: 6 }} />}
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const estadoOpts = [
    { key: "pendiente",  label: "Pendientes" },
    { key: "completada", label: "Completadas" },
    { key: "todas",      label: "Todas" },
  ];
  const redOpts = [
    { key: "todas",    label: "Todos",    dot: "#888780" },
    { key: "internet", label: "Internet", dot: "#0ea5e9" },
    { key: "cable",    label: "Cable",    dot: "#f59e0b" },
  ];
  const tipoOpts = [
    { key: "todas", label: "Todos los tipos" },
    ...tiposDisponibles.map(t => ({ key: t, label: t })),
  ];

  const currentEstado = estadoOpts.find(o => o.key === filtroEstado)?.label ?? "Pendientes";
  const currentRed    = redOpts.find(o => o.key === filtroRed) ?? redOpts[0];
  const currentTipo   = filtroTipo === "todas" ? "Todos los tipos" : filtroTipo;

  const imprimirOrden = (orden) => {
    const mats = orden.materiales ?? [];
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Orden #${orden.nro_orden}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 16px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
    .empresa { font-size: 13px; font-weight: bold; }
    .titulo { font-size: 14px; font-weight: bold; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
    .subtitulo { font-size: 11px; text-align: center; color: #555; margin-top: 2px; }
    .seccion { border: 1px solid #000; margin-bottom: 8px; }
    .seccion-title { background: #000; color: #fff; font-weight: bold; font-size: 10px; padding: 3px 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; }
    .campo { padding: 5px 8px; border-bottom: 1px solid #ddd; }
    .campo:nth-child(odd) { border-right: 1px solid #ddd; }
    .campo label { font-size: 9px; color: #555; display: block; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; }
    .campo span { font-size: 11px; font-weight: 600; }
    .span2 { grid-column: span 2; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #333; color: #fff; font-size: 9px; text-transform: uppercase; padding: 4px 6px; text-align: left; letter-spacing: 0.5px; }
    td { padding: 4px 6px; border-bottom: 1px solid #eee; font-size: 11px; }
    tr:nth-child(even) td { background: #f9f9f9; }
    .sin-mat { padding: 10px 8px; color: #888; font-style: italic; }
    .footer { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid #000; margin-top: 8px; }
    .firma { padding: 32px 12px 8px; border-right: 1px solid #000; }
    .firma:last-child { border-right: none; }
    .firma-label { font-size: 9px; color: #555; text-transform: uppercase; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
    .badge { display: inline-block; background: #f0f4ff; border: 1px solid #c7d7f9; padding: 1px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; color: #1e40af; }
    @media print { body { padding: 8px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="empresa">Cable &amp; Internet</div>
      <div style="font-size:10px;color:#555">Orden de Servicio Técnico</div>
    </div>
    <div style="text-align:center">
      <div class="titulo">Orden de Servicio Técnico</div>
      <div class="subtitulo">Estado: ${orden.estado_app === "completada" ? "COMPLETADA" : "PENDIENTE"}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:20px;font-weight:900;letter-spacing:-1px">#${orden.nro_orden}</div>
      <div style="font-size:10px;color:#555">${orden.fecha_crea || "—"}</div>
    </div>
  </div>

  <div class="seccion">
    <div class="seccion-title">Información del Contrato</div>
    <div class="grid2">
      <div class="campo"><label>N° Contrato</label><span>${orden.nro_contrato || "—"}</span></div>
      <div class="campo"><label>Servicio</label><span class="badge">${labelServicio(orden.servicio || "")}</span></div>
      <div class="campo"><label>Abonado</label><span>${orden.abonado || "—"}</span></div>
      <div class="campo"><label>Técnico asignado</label><span>${orden.tecnico_nombre || "—"}</span></div>
      <div class="campo"><label>Vendedor</label><span>${orden.vendedor_nombre || "—"}</span></div>
      <div class="campo span2"><label>Dirección</label><span>${orden.direccion || "—"}</span></div>
      <div class="campo span2"><label>Observación</label><span>${orden.observacion || "—"}</span></div>
      <div class="campo span2"><label>Comentario del técnico</label><span>${orden.comentario_tecnico || "—"}</span></div>
    </div>
  </div>

  <div class="seccion">
    <div class="seccion-title">Liquidación de Materiales</div>
    ${mats.length === 0
      ? `<div class="sin-mat">Sin materiales registrados en esta orden</div>`
      : `<table>
          <thead><tr><th>Material</th><th>Código PON</th><th style="text-align:center">Cantidad</th><th>Unidad</th></tr></thead>
          <tbody>${mats.map(m => `
            <tr>
              <td>${m.nombre}</td>
              <td style="font-family:monospace;font-size:10px">${m.codigo_pon || "—"}</td>
              <td style="text-align:center;font-weight:700">${m.cantidad}</td>
              <td>${m.unidad || "—"}</td>
            </tr>`).join("")}
          </tbody>
        </table>`
    }
  </div>

  <div class="footer">
    <div class="firma"><div>${orden.abonado || ""}</div><div class="firma-label">Firma del Cliente</div></div>
    <div class="firma"><div></div><div class="firma-label">Jefe de Grupo</div></div>
    <div class="firma"><div>${orden.tecnico_nombre || ""}</div><div class="firma-label">Técnico</div></div>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=800,height=900");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}
        onClick={() => setOpenDD(null)}>

        {/* Encabezado */}
        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.sectionTitle}>
              <Icon d={IC.list} size={18} color="var(--primary)" />
              Órdenes de servicio
            </div>
            <div style={styles.sectionSubtitle}>Vista de secretaria — solo lectura</div>
          </div>
          <button type="button" onClick={cargarOrdenes} style={styles.refreshBtn}>
            <Icon d={IC.refresh} size={14} />
            Actualizar
          </button>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
          onClick={e => e.stopPropagation()}>

          <Dropdown
            id="estado"
            label="Estado "
            value={currentEstado}
            options={estadoOpts}
            onChange={v => setFiltroEstado(v)}
          />

          <div style={styles.divider} />

          {/* Red (con dot de color) */}
          <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <button type="button"
              onClick={() => setOpenDD(openDD === "red" ? null : "red")}
              style={styles.ddBtn}>
              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>Red </span>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: currentRed.dot, display: "inline-block" }} />
              {currentRed.label}
              <Icon d="M6 9l6 6 6-6" size={14} color="var(--text-muted)" />
            </button>
            {openDD === "red" && (
              <div style={styles.ddMenu}>
                {redOpts.map(o => (
                  <div key={o.key}
                    onClick={() => { setFiltroRed(o.key); setFiltroTipo("todas"); setOpenDD(null); }}
                    style={{
                      ...styles.ddItem,
                      display: "flex", alignItems: "center", gap: 8,
                      fontWeight: filtroRed === o.key ? 500 : 400,
                      color: filtroRed === o.key ? "var(--primary)" : "var(--text)",
                      background: filtroRed === o.key ? "#EEF4FF" : "white",
                    }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: o.dot, flexShrink: 0 }} />
                    {o.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.divider} />

          <Dropdown
            id="tipo"
            label="Tipo "
            value={currentTipo}
            options={tipoOpts}
            onChange={v => setFiltroTipo(v)}
          />

          <div className="search-box" style={{ flex: 1, minWidth: 180 }}>
            <Icon d={IC.search} size={15} color="var(--text-muted)" />
            <input
              placeholder="Buscar cliente, contrato u orden..."
              value={searchOrdenes}
              onChange={e => setSearchOrdenes(e.target.value)}
            />
          </div>

          <div style={styles.divider} />

          {/* Filtro por fecha */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Desde</span>
            <input
              type="date"
              value={filtroFecha.desde}
              onChange={e => setFiltroFecha(prev => ({ ...prev, desde: e.target.value }))}
              style={styles.dateInput}
            />
            <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Hasta</span>
            <input
              type="date"
              value={filtroFecha.hasta}
              onChange={e => setFiltroFecha(prev => ({ ...prev, hasta: e.target.value }))}
              style={styles.dateInput}
            />
            {(filtroFecha.desde || filtroFecha.hasta) && (
              <button
                onClick={() => setFiltroFecha({ desde: "", hasta: "" })}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px 4px" }}
                title="Limpiar fechas"
              >
                <Icon d={IC.x} size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Contrato</th>
                  <th>Abonado</th>
                  <th>Dirección</th>
                  <th>Servicio</th>
                  <th>Observación</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {loadingOrdenes ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Cargando...</td></tr>
                ) : filteredOrdenes.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    {ordenes.length === 0 ? "No hay órdenes." : "Sin resultados."}
                  </td></tr>
                ) : filteredOrdenes.map(o => (
                  <tr key={o.id} onClick={() => abrirDetalle(o)} style={{ cursor: "pointer" }}>
                    <td className="mono text-sm">#{o.nro_orden}</td>
                    <td className="mono text-sm" style={{ color: "var(--primary)", fontWeight: 600 }}>{o.nro_contrato}</td>
                    <td className="fw-600">{o.abonado}</td>
                    <td className="text-sm text-muted">{o.direccion}</td>
                    <td><span className={`badge ${badgeServicio(o.servicio)}`}>{labelServicio(o.servicio)}</span></td>
                    <td className="text-sm text-muted" style={{ fontStyle: "italic" }}>{o.observacion || "—"}</td>
                    <td className="text-sm text-muted">{o.fecha_crea || "—"}</td>
                    <td>
                      <span className={`badge ${o.estado_app === "completada" ? "badge-active" : "badge-warning"}`}>
                        {o.estado_app === "completada" ? "Completada" : "Pendiente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Panel lateral detalle */}
      {ordenDetalle && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={cerrarDetalle}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.35)" }} />
          <div style={styles.panel}>

            {/* Header panel */}
            <div style={styles.panelHead}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Orden #{ordenDetalle.nro_orden}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>{ordenDetalle.nro_contrato}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => imprimirOrden(ordenDetalle)}
                  style={{ ...styles.refreshBtn, fontSize: 12, padding: "6px 10px" }}
                  title="Imprimir orden"
                >
                  <Icon d="M6 9V2h12v7 M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2 M6 14h12v8H6z" size={14} />
                  Imprimir
                </button>
                <button onClick={cerrarDetalle} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <Icon d={IC.x} size={18} />
                </button>
              </div>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Info */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <DetRow label="Abonado"    value={ordenDetalle.abonado} />
                <DetRow label="Dirección"  value={ordenDetalle.direccion} />
                <DetRow label="Servicio"   value={labelServicio(ordenDetalle.servicio || "")} />
                <DetRow label="Técnico"    value={ordenDetalle.tecnico_nombre} />
                <DetRow label="Vendedor"   value={ordenDetalle.vendedor_nombre} />
                <DetRow label="Fecha"      value={ordenDetalle.fecha_crea} />
                <DetRow label="Observación" value={ordenDetalle.observacion} />
                <DetRow label="Comentario técnico" value={ordenDetalle.comentario_tecnico} />
              </div>

              {/* Materiales */}
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Materiales usados</div>
                {loadingDetalle ? (
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Cargando...</span>
                ) : (ordenDetalle.materiales?.length > 0) ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ordenDetalle.materiales.map((m, i) => (
                      <span key={i} style={styles.matChip}>
                        {m.nombre}{m.codigo_pon ? ` · ${m.codigo_pon}` : ""}: {m.cantidad} {m.unidad ?? ""}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Sin materiales registrados</span>
                )}
              </div>

              {/* Preview + botones copiar */}
              {!loadingDetalle && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Copiar</div>

                  {/* Preview materiales */}
                  <div style={styles.preview}>
                    {formatMateriales(ordenDetalle.materiales ?? [])}
                  </div>

                  <button onClick={copiarMateriales} style={{ ...styles.copyBtn, ...(copiadoMat ? styles.copyBtnOk : {}) }}>
                    <Icon d={copiadoMat ? IC.check : IC.copy} size={14} color={copiadoMat ? "var(--success)" : "currentColor"} />
                    {copiadoMat ? "¡Copiado!" : "Copiar materiales"}
                  </button>

                  <button onClick={copiarTodo} style={{ ...styles.copyBtn, ...(copiadoTodo ? styles.copyBtnOk : {}) }}>
                    <Icon d={copiadoTodo ? IC.check : IC.clipboard} size={14} color={copiadoTodo ? "var(--success)" : "currentColor"} />
                    {copiadoTodo ? "¡Copiado!" : "Copiar toda la info"}
                  </button>
                </div>
              )}

              {/* Fotos */}
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Fotos</div>
                {loadingDetalle ? (
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Cargando...</span>
                ) : (ordenDetalle.fotos?.length > 0) ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {ordenDetalle.fotos.map((f, i) => (
                      <a key={i} href={`${BASE_URL}/uploads/${f.ruta}`} target="_blank" rel="noreferrer">
                        <img src={`${BASE_URL}/uploads/${f.ruta}`} alt={`foto-${i}`}
                          style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Sin fotos</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  sectionHeader: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 4,
  },
  sectionSubtitle: { fontSize: 13, color: "var(--text-muted)" },
  refreshBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "7px 12px", borderRadius: 8, fontSize: 13,
    border: "0.5px solid var(--border)", background: "white",
    cursor: "pointer", color: "var(--text)",
  },
  divider: { width: 1, height: 22, background: "var(--border)", flexShrink: 0 },
  ddBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "7px 12px", borderRadius: 8,
    border: "0.5px solid var(--border)", fontSize: 13,
    fontWeight: 500, cursor: "pointer",
    background: "white", color: "var(--text)",
  },
  ddMenu: {
    position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
    background: "white", border: "0.5px solid var(--border)",
    borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.08)",
    minWidth: 180, maxHeight: 280, overflowY: "auto",
  },
  ddItem: { padding: "8px 14px", fontSize: 13, cursor: "pointer" },
  panel: {
    position: "relative", width: 420, maxWidth: "95vw",
    background: "white", height: "100%", overflowY: "auto",
    boxShadow: "-4px 0 32px rgba(0,0,0,.15)",
    display: "flex", flexDirection: "column",
  },
  panelHead: {
    padding: "16px 20px", borderBottom: "1px solid var(--border)",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  matChip: {
    background: "#F1F5F9", color: "#475569",
    fontSize: 11, fontWeight: 600,
    padding: "3px 10px", borderRadius: 20,
    border: "1px solid #E2E8F0",
  },
  preview: {
    background: "#F8FAFC", border: "1px solid #E2E8F0",
    borderRadius: 8, padding: "8px 12px",
    fontSize: 12, fontFamily: "monospace",
    color: "#64748B", wordBreak: "break-all", lineHeight: 1.6,
  },
  copyBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    fontSize: 13, padding: "9px 14px", borderRadius: 8,
    border: "0.5px solid var(--border)",
    background: "white", color: "var(--text)",
    cursor: "pointer", width: "100%", transition: "background 0.1s",
  },
  copyBtnOk: {
    background: "#F0FDF4", color: "var(--success)",
    border: "0.5px solid #86EFAC",
  },
  dateInput: {
    padding: "6px 10px", borderRadius: 8, fontSize: 12,
    border: "0.5px solid var(--border)", background: "white",
    color: "var(--text)", cursor: "pointer",
  },
};