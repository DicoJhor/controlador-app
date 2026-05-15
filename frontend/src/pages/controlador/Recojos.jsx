import { useState, useEffect, useRef } from "react";
import ordenesService from "../../services/ordenesService";

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
  plus:   "M12 5v14 M5 12h14",
  mapPin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 7a3 3 0 100 6 3 3 0 000-6",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  check:  "M20 6L9 17l-5-5",
  image:  "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 19",
  wifi:   "M5 12.55a11 11 0 0114.08 0 M1.42 9a16 16 0 0121.16 0 M8.53 16.11a6 6 0 016.95 0 M12 20h.01",
  wrench: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  box:    "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  x:      "M18 6L6 18 M6 6l12 12",
  upload:  "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  list:    "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  alert:   "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
  refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0020.49 15",
};

// DESPUÉS (agrega justo ANTES de esa línea)
function labelServicio(s = "") {
  const u = s.toUpperCase();
  if (u.includes("ALTA DE SERVICIO"))     return "Alta servicio";
  if (u.includes("ANTENCION NOC"))        return "Atención NOC";
  if (u.includes("AVERIA"))              return "Avería";
  if (u.includes("BAJA DE SERVICIO"))    return "Baja servicio";
  if (u.includes("CAMBIO DE CONTRASEÑA")) return "Cambio contraseña";
  if (u.includes("CAMBIO DE DOMICILIO")) return "Cambio domicilio";
  if (u.includes("CAMBIO DE EQUIPO"))    return "Cambio ONU";
  if (u.includes("CAMBIO DE PLAN"))      return "Cambio plan";
  if (u.includes("CAMBIO DE TITULAR"))   return "Cambio titular";
  if (u.includes("CORTE A SOLICITUD"))   return "Corte voluntario";
  if (u.includes("CORTE POR DEUDA"))     return "Corte por deuda";
  if (u.includes("INSTALACION DE ANEXO")) return "Instalación anexo";
  if (u.includes("INSTALACION"))         return "Instalación";
  if (u.includes("MIGRACION"))           return "Migración FTTH";
  if (u.includes("RECONEXION"))          return "Reconexión";
  if (u.includes("RETIRO DE EQUIPO"))    return "Retiro equipo";
  if (u.includes("SUPERVICION"))         return "Supervisión";
  if (u.includes("TRASLADO"))            return "Traslado";
  return s;
}

function badgeServicio(s = "") {
  const u = s.toUpperCase();
  if (u.includes("RETIRO DE EQUIPO")) return "badge-purple";   // morado
  if (u.includes("CAMBIO DE EQUIPO")) return "badge-warning";  // amarillo
  if (u.includes("INSTALACION DE ANEXO"))      return "badge-active";   // verde
  if (u.includes("INSTALACION"))      return "badge-active";   // verde
  if (u.includes("AVERIA"))           return "badge-danger";   // rojo
  if (u.includes("RECONEXION"))       return "badge-blue";     // azul
  // Nuevos agregados con sus colores sugeridos
  if (u.includes("ALTA DE SERVICIO")) return "badge-success";   // verde claro
  if (u.includes("BAJA DE SERVICIO")) return "badge-dark";      // gris oscuro
  if (u.includes("ANTENCION NOC"))    return "badge-info";      // celeste
  if (u.includes("CAMBIO DE CONTRASEÑA")) return "badge-cyan";  // cyan
  if (u.includes("CAMBIO DE DOMICILIO")) return "badge-warning"; // amarillo
  if (u.includes("CAMBIO DE PLAN"))   return "badge-info";      // celeste
  if (u.includes("CAMBIO DE TITULAR")) return "badge-warning";  // amarillo
  if (u.includes("CORTE A SOLICITUD")) return "badge-orange";   // naranja
  if (u.includes("CORTE POR DEUDA"))  return "badge-error";     // rojo oscuro
  if (u.includes("TRASLADO"))         return "badge-blue";      // azul
  return "badge-blue";
}

function DetRow({ label, value }) {
  return (
    <div style={{ display:"flex", gap:8, fontSize:13 }}>
      <span style={{ color:"var(--text-muted)", minWidth:90 }}>{label}</span>
      <span style={{ fontWeight:500 }}>{value || "—"}</span>
    </div>
  );
}

export default function CtrlRecojos() {

  // AGREGAR ESTAS LÍNEAS
  const [ordenes,        setOrdenes]        = useState([]);
  const [loadingOrdenes, setLoadingOrdenes] = useState(true);
  const [filtroEstado,   setFiltroEstado]   = useState("pendiente");
  const [searchOrdenes,  setSearchOrdenes]  = useState("");
  const [subiendoExcel,  setSubiendoExcel]  = useState(false);
  const [uploadResult,   setUploadResult]   = useState(null);
  const [duplicados,     setDuplicados]     = useState([]);
  const [ordenDetalle,   setOrdenDetalle]   = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todas");
  const [filtroRed,  setFiltroRed]  = useState("todas");
  const [openDD,     setOpenDD]     = useState(null);
  const fileInputRef = useRef();

  
  // AGREGAR ESTAS LÍNEAS
  const cargarOrdenes = async () => {
    setLoadingOrdenes(true);
    try {
      const data = await ordenesService.getAll(filtroEstado);
      console.log("Órdenes recibidas:", data);
      setOrdenes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando órdenes:", err);
      setOrdenes([]);
    } finally {
      setLoadingOrdenes(false);
    }
  };

  useEffect(() => { cargarOrdenes(); }, [filtroEstado]);

  const handleExcelChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setSubiendoExcel(true);
    setUploadResult(null);
    try {
      const fd = new FormData();
      fd.append("archivo", file);
      const res = await ordenesService.uploadExcel(fd);
      setUploadResult(res.resumen);
      if (res.resumen.duplicadas?.length > 0) setDuplicados(res.resumen.duplicadas);
      await cargarOrdenes();
    } catch (err) {
      alert("Error al procesar el Excel: " + err.message);
    } finally { setSubiendoExcel(false); }
  };

  const confirmarDuplicado = async (index, ordenId, datos) => {
    try {
      await ordenesService.confirmarDuplicado(ordenId, datos);
      const restantes = duplicados.filter((_, i) => i !== index);
      setDuplicados(restantes);
      if (restantes.length === 0) {
        await cargarOrdenes();
      }
    } catch (err) { alert(err.message); }
  };

  const abrirDetalle = async (orden) => {
    setOrdenDetalle({ ...orden, materiales: null, fotos: null });
    setLoadingDetalle(true);
    try {
      const res = await ordenesService.getDetalle(orden.id);
      setOrdenDetalle(res.data ?? res);
    } catch {
      // muestra datos básicos igual
    } finally {
      setLoadingDetalle(false);
    }
  };

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

  return matchRed && matchTipo && matchSearch;
});

  const SERVICIOS_POR_RED = {
    internet: ["Instalación","Avería","Alta servicio","Baja servicio","Atención NOC","Cambio contraseña","Cambio domicilio","Cambio ONU","Cambio plan","Cambio titular","Corte voluntario","Corte por deuda","Reconexión","Retiro equipo","Traslado"],
    cable:    ["Instalación","Avería","Alta servicio","Cambio domicilio","Cambio plan","Cambio titular","Corte voluntario","Corte por deuda","Instalación anexo","Migración FTTH","Reconexión","Retiro equipo","Supervisión","Traslado"],
    todas:    ["Alta servicio","Atención NOC","Avería","Baja servicio","Cambio contraseña","Cambio domicilio","Cambio ONU","Cambio plan","Cambio titular","Corte voluntario","Corte por deuda","Instalación anexo","Instalación","Migración FTTH","Reconexión","Retiro equipo","Supervisión","Traslado"],
  };
  const tiposDisponibles = SERVICIOS_POR_RED[filtroRed] ?? SERVICIOS_POR_RED.todas;

  return (<>
    {/* Modal duplicados */}
    {duplicados.length > 0 && (
      <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
        <div style={{ background:"white", borderRadius:14, maxWidth:520, width:"100%", boxShadow:"0 8px 40px rgba(0,0,0,.2)", overflow:"hidden" }}>
          <div style={{ padding:"16px 20px", background:"#fff3cd", borderBottom:"1px solid #ffc107", display:"flex", alignItems:"center", gap:10 }}>
            <Icon d={IC.alert} size={18} color="#856404" />
            <div style={{ fontWeight:700, fontSize:15, color:"#856404" }}>Órdenes duplicadas — ¿reemplazar?</div>
            <button onClick={() => setDuplicados([])} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer" }}>
              <Icon d={IC.x} size={16} color="#856404" />
            </button>
          </div>
          <div style={{ padding:16, maxHeight:320, overflowY:"auto" }}>
            {duplicados.map((d, i) => (
              <div key={i} style={{ padding:"10px 12px", borderRadius:8, border:"1px solid var(--border)", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13 }}>{d.abonado}</div>
                  <div style={{ fontSize:11, color:"var(--text-muted)", fontFamily:"monospace" }}>{d.nro_contrato}</div>
                  <div style={{ fontSize:11, color:"var(--text-muted)" }}>Orden #{d.nro_orden} · {d.fecha_crea}</div>
                </div>
                {d.protegida ? (
                  <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>
                    ✓ Ya completada — no se puede reemplazar
                  </span>
                ) : (
                  <button className="btn btn-warning btn-sm" onClick={() => confirmarDuplicado(i, d.orden_id, d)}>
                    Reemplazar
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ padding:"12px 20px", borderTop:"1px solid var(--border)", display:"flex", justifyContent:"flex-end" }}>
            <button className="btn btn-outline btn-sm" onClick={() => setDuplicados([])}>Ignorar</button>
          </div>
        </div>
      </div>
    )}
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ── SECCIÓN ÓRDENES DE SERVICIO ── */}
      <div>
        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.sectionTitle}>
              <Icon d={IC.list} size={18} color="var(--primary)" />
              Órdenes de servicio
            </div>
            <div style={styles.sectionSubtitle}>Órdenes asignadas desde el Excel</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <input ref={fileInputRef} type="file" accept=".xls,.xlsx" style={{ display:"none" }} onChange={handleExcelChange} disabled={subiendoExcel} />
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={subiendoExcel}>
              <Icon d={IC.upload} size={15} />
              {subiendoExcel ? "Cargando..." : "Cargar Excel"}
            </button>
          </div>
        </div>

        {uploadResult && (
          <div className="alert alert-success" style={{ marginBottom:12, fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
            <Icon d={IC.check} size={15} color="var(--success)" />
            <span>Excel procesado: <strong>{uploadResult.insertadas} nuevas</strong>
              {uploadResult.actualizadas > 0 && <>, <strong>{uploadResult.actualizadas} actualizadas</strong></>}
              {uploadResult.duplicadas?.length > 0 && <> · <strong style={{ color:"#856404" }}>{uploadResult.duplicadas.length} duplicadas</strong></>}
            </span>
            <button onClick={() => setUploadResult(null)} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer" }}>
              <Icon d={IC.x} size={13} />
            </button>
          </div>
        )}

        <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}
          onClick={() => setOpenDD(null)}>

          {/* DROPDOWN ESTADO */}
          {(() => {
            const opts = [{key:"pendiente",label:"Pendientes"},{key:"completada",label:"Completadas"},{key:"todas",label:"Todas"}];
            const current = opts.find(o => o.key === filtroEstado)?.label ?? "Pendientes";
            return (
              <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
                <button type="button" onClick={() => setOpenDD(openDD==="estado" ? null : "estado")}
                  style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", borderRadius:8, border:"0.5px solid var(--border)", fontSize:13, fontWeight:500, cursor:"pointer", background:"white", color:"var(--text)" }}>
                  <span style={{ color:"var(--text-muted)", fontWeight:400 }}>Estado</span>
                  {current}
                  <Icon d="M6 9l6 6 6-6" size={14} color="var(--text-muted)" />
                </button>
                {openDD==="estado" && (
                  <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:50, background:"white", border:"0.5px solid var(--border)", borderRadius:8, boxShadow:"0 4px 16px rgba(0,0,0,.08)", minWidth:160, overflow:"hidden" }}>
                    {opts.map(o => (
                      <div key={o.key} onClick={() => { setFiltroEstado(o.key); setOpenDD(null); }}
                        style={{ padding:"8px 14px", fontSize:13, cursor:"pointer", fontWeight: filtroEstado===o.key ? 500 : 400, color: filtroEstado===o.key ? "var(--primary)" : "var(--text)", background: filtroEstado===o.key ? "#EEF4FF" : "white" }}>
                        {o.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{ width:1, height:22, background:"var(--border)", flexShrink:0 }} />

          {/* DROPDOWN RED */}
          {(() => {
            const opts = [
              { key:"todas",    label:"Todos",    dot:"#888780" },
              { key:"internet", label:"Internet", dot:"#0ea5e9" },
              { key:"cable",    label:"Cable",    dot:"#f59e0b" },
            ];
            const current = opts.find(o => o.key === filtroRed) ?? opts[0];
            return (
              <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
                <button type="button" onClick={() => setOpenDD(openDD==="red" ? null : "red")}
                  style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", borderRadius:8, border:"0.5px solid var(--border)", fontSize:13, fontWeight:500, cursor:"pointer", background:"white", color:"var(--text)" }}>
                  <span style={{ color:"var(--text-muted)", fontWeight:400 }}>Red</span>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:current.dot, display:"inline-block" }} />
                  {current.label}
                  <Icon d="M6 9l6 6 6-6" size={14} color="var(--text-muted)" />
                </button>
                {openDD==="red" && (
                  <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:50, background:"white", border:"0.5px solid var(--border)", borderRadius:8, boxShadow:"0 4px 16px rgba(0,0,0,.08)", minWidth:160, overflow:"hidden" }}>
                    {opts.map(o => (
                      <div key={o.key} onClick={() => { setFiltroRed(o.key); setFiltroTipo("todas"); setOpenDD(null); }}
                        style={{ padding:"8px 14px", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:8, fontWeight: filtroRed===o.key ? 500 : 400, color: filtroRed===o.key ? "var(--primary)" : "var(--text)", background: filtroRed===o.key ? "#EEF4FF" : "white" }}>
                        <span style={{ width:8, height:8, borderRadius:"50%", background:o.dot, display:"inline-block", flexShrink:0 }} />
                        {o.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{ width:1, height:22, background:"var(--border)", flexShrink:0 }} />

          {/* DROPDOWN TIPO */}
          {(() => {
            const current = filtroTipo === "todas" ? "Todos los tipos" : filtroTipo;
            return (
              <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
                <button type="button" onClick={() => setOpenDD(openDD==="tipo" ? null : "tipo")}
                  style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", borderRadius:8, border:"0.5px solid var(--border)", fontSize:13, fontWeight:500, cursor:"pointer", background:"white", color:"var(--text)" }}>
                  <span style={{ color:"var(--text-muted)", fontWeight:400 }}>Tipo</span>
                  {current}
                  <Icon d="M6 9l6 6 6-6" size={14} color="var(--text-muted)" />
                </button>
                {openDD==="tipo" && (
                  <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:50, background:"white", border:"0.5px solid var(--border)", borderRadius:8, boxShadow:"0 4px 16px rgba(0,0,0,.08)", minWidth:200, maxHeight:280, overflowY:"auto" }}>
                    <div onClick={() => { setFiltroTipo("todas"); setOpenDD(null); }}
                      style={{ padding:"8px 14px", fontSize:13, cursor:"pointer", fontWeight: filtroTipo==="todas" ? 500 : 400, color: filtroTipo==="todas" ? "var(--primary)" : "var(--text)", background: filtroTipo==="todas" ? "#EEF4FF" : "white" }}>
                      Todos los tipos
                    </div>
                    {tiposDisponibles.map(t => (
                      <div key={t} onClick={() => { setFiltroTipo(t); setOpenDD(null); }}
                        style={{ padding:"8px 14px", fontSize:13, cursor:"pointer", fontWeight: filtroTipo===t ? 500 : 400, color: filtroTipo===t ? "var(--primary)" : "var(--text)", background: filtroTipo===t ? "#EEF4FF" : "white" }}>
                        {t}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* BUSCADOR + REFRESH */}
          <div className="search-box" style={{ flex:1, minWidth:180 }}>
            <Icon d={IC.search} size={15} color="var(--text-muted)" />
            <input placeholder="Buscar cliente, contrato u orden..." value={searchOrdenes} onChange={e => setSearchOrdenes(e.target.value)} />
          </div>
          <button type="button" onClick={cargarOrdenes}
            style={{ padding:"7px 10px", borderRadius:8, fontSize:12, border:"0.5px solid var(--border)", background:"white", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
            <Icon d={IC.refresh} size={13} />
          </button>

        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Orden</th><th>Contrato</th><th>Abonado</th><th>Dirección</th><th>Servicio</th><th>Observación</th><th>Fecha</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {loadingOrdenes ? (
                  <tr><td colSpan={8} style={{ textAlign:"center", padding:24, color:"var(--text-muted)" }}>Cargando...</td></tr>
                ) : filteredOrdenes.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign:"center", padding:32, color:"var(--text-muted)" }}>
                    {ordenes.length === 0 ? "No hay órdenes. Cargá el Excel para comenzar." : "Sin resultados."}
                  </td></tr>
                ) : filteredOrdenes.map(o => (
                  <tr key={o.id} onClick={() => abrirDetalle(o)} style={{ cursor: "pointer" }}>
                    <td className="mono text-sm">#{o.nro_orden}</td>
                    <td className="mono text-sm" style={{ color:"var(--primary)", fontWeight:600 }}>{o.nro_contrato}</td>
                    <td className="fw-600">{o.abonado}</td>
                    <td className="text-sm text-muted">{o.direccion}</td>
                    <td><span className={`badge ${badgeServicio(o.servicio)}`}>{labelServicio(o.servicio)}</span></td>
                    <td className="text-sm text-muted" style={{ fontStyle:"italic" }}>{o.observacion || "—"}</td>
                    <td className="text-sm text-muted">{o.fecha_crea || "—"}</td>
                    <td><span className={`badge ${o.estado_app==="completada" ? "badge-active" : "badge-warning"}`}>
                      {o.estado_app==="completada" ? "Completada" : "Pendiente"}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Panel lateral detalle de orden ── */}
      {ordenDetalle && (
        <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", justifyContent:"flex-end" }}>
          <div onClick={() => setOrdenDetalle(null)}
            style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.35)" }} />
          <div style={{
            position:"relative", width:420, maxWidth:"95vw",
            background:"white", height:"100%", overflowY:"auto",
            boxShadow:"-4px 0 32px rgba(0,0,0,.15)",
            display:"flex", flexDirection:"column",
          }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15 }}>Orden #{ordenDetalle.nro_orden}</div>
                <div style={{ fontSize:12, color:"var(--text-muted)", fontFamily:"monospace" }}>{ordenDetalle.nro_contrato}</div>
              </div>
              <button onClick={() => setOrdenDetalle(null)} style={{ background:"none", border:"none", cursor:"pointer" }}>
                <Icon d={IC.x} size={18} />
              </button>
            </div>

            <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <DetRow label="Abonado"    value={ordenDetalle.abonado} />
                <DetRow label="Dirección"  value={ordenDetalle.direccion} />
                <DetRow label="Servicio"   value={ordenDetalle.servicio} />
                <DetRow label="Fecha"      value={ordenDetalle.fecha_crea} />
                <DetRow label="Técnico"    value={ordenDetalle.tecnico_nombre} />
                <DetRow label="Observación"        value={ordenDetalle.observacion} />
                <DetRow label="Comentario técnico" value={ordenDetalle.comentario_tecnico} />
                {console.log("lat/lng:", ordenDetalle.lat, ordenDetalle.lng)}
                {ordenDetalle.lat && ordenDetalle.lng && (
                  <div style={{ display:"flex", gap:8, fontSize:13 }}>
                    <span style={{ color:"var(--text-muted)", minWidth:90 }}>Ubicación</span>
                    <a
                      href={`https://www.google.com/maps?q=${ordenDetalle.lat},${ordenDetalle.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        color: "var(--primary)", fontWeight: 600, textDecoration: "none",
                        fontSize: 13,
                      }}>
                      <Icon d={IC.mapPin} size={13} color="var(--primary)" />
                      {Number(ordenDetalle.lat).toFixed(6)}, {Number(ordenDetalle.lng).toFixed(6)}
                    </a>
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontWeight:600, fontSize:13, marginBottom:8 }}>Materiales usados</div>
                {loadingDetalle ? (
                  <span style={{ fontSize:13, color:"var(--text-muted)" }}>Cargando...</span>
                ) : ordenDetalle.materiales?.length > 0 ? (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {ordenDetalle.materiales.map((m, i) => (
                      <span key={i} style={{
                        background:"#F1F5F9", color:"#475569",
                        fontSize:11, fontWeight:600,
                        padding:"3px 10px", borderRadius:20,
                        border:"1px solid #E2E8F0",
                      }}>
                        {m.nombre}: {m.cantidad} {m.unidad ?? ""}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize:13, color:"var(--text-muted)" }}>Sin materiales registrados</span>
                )}
              </div>

              <div>
                <div style={{ fontWeight:600, fontSize:13, marginBottom:8 }}>Fotos</div>
                {loadingDetalle ? (
                  <span style={{ fontSize:13, color:"var(--text-muted)" }}>Cargando...</span>
                ) : ordenDetalle.fotos?.length > 0 ? (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {ordenDetalle.fotos.map((f, i) => (
                      <a key={i} href={`${BASE_URL}/uploads/${f.ruta}`} target="_blank" rel="noreferrer">
                        <img src={`${BASE_URL}/uploads/${f.ruta}`} alt={`foto-${i}`}
                          style={{ width:90, height:90, objectFit:"cover", borderRadius:8, border:"1px solid var(--border)" }} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize:13, color:"var(--text-muted)" }}>Sin fotos</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </>);

}

const styles = {
  sectionHeader: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between", marginBottom: 16,
  },
  sectionTitle: {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 4,
  },
  sectionSubtitle: { fontSize: 13, color: "var(--text-muted)" },
};