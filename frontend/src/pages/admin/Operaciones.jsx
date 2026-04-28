import { useState, useEffect, useRef } from "react";
import ordenesService from "../../services/ordenesService";
import recojosService from "../../services/recojosService";
import sedesService   from "../../services/sedesService";

const BASE_URL = import.meta.env.VITE_API_URL.replace("/api", "");

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
  image:   "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 19",
  box:     "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  list:    "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  x:       "M18 6L6 18 M6 6l12 12",
  refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0020.49 15",
  check:   "M20 6L9 17l-5-5",
};

function labelServicio(s = "") {
  const u = s.toUpperCase();
  if (u.includes("CAMBIO DE EQUIPO")) return "Cambio ONU";
  if (u.includes("INSTALACION"))      return "Instalación";
  if (u.includes("AVERIA"))           return "Avería";
  if (u.includes("RECONEXION"))       return "Reconexión";
  return s;
}
function badgeServicio(s = "") {
  const u = s.toUpperCase();
  if (u.includes("CAMBIO DE EQUIPO")) return "badge-warning";
  if (u.includes("INSTALACION"))      return "badge-active";
  if (u.includes("AVERIA"))           return "badge-danger";
  return "badge-blue";
}

function DetRow({ label, value, mono = false }) {
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 13 }}>
      <span style={{ color: "var(--text-muted)", minWidth: 96 }}>{label}</span>
      <span style={{ fontWeight: 500, fontFamily: mono ? "monospace" : "inherit" }}>{value || "—"}</span>
    </div>
  );
}

export default function AdminOperaciones() {
  const [sedes,          setSedes]          = useState([]);
  const [sedeFilter,     setSedeFilter]     = useState("");
  const [ordenes,        setOrdenes]        = useState([]);
  const [loadingOrdenes, setLoadingOrdenes] = useState(true);
  const [filtroEstado,   setFiltroEstado]   = useState("todas");
  const [searchOrdenes,  setSearchOrdenes]  = useState("");
  const [ordenDetalle,   setOrdenDetalle]   = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [recojos,        setRecojos]        = useState([]);
  const [loadingRecojos, setLoadingRecojos] = useState(true);
  const [searchRecojo,   setSearchRecojo]   = useState("");
  const [error,          setError]          = useState(null);

  useEffect(() => {
    sedesService.getAll()
      .then(data => setSedes(Array.isArray(data) ? data : []))
      .catch(() => setError("No se pudieron cargar las sedes"));
  }, []);

  const cargarOrdenes = async () => {
    setLoadingOrdenes(true);
    try {
      const data = await ordenesService.getAll(filtroEstado, sedeFilter);
      setOrdenes(Array.isArray(data) ? data : []);
    } catch { setOrdenes([]); }
    finally { setLoadingOrdenes(false); }
  };

  const cargarRecojos = async () => {
    setLoadingRecojos(true);
    try {
      const data = await recojosService.getAllAdmin(sedeFilter || "todas");
      setRecojos(Array.isArray(data) ? data : []);
    } catch { setRecojos([]); }
    finally { setLoadingRecojos(false); }
  };

  useEffect(() => { cargarOrdenes(); cargarRecojos(); }, [filtroEstado, sedeFilter]);

  const abrirDetalle = async (orden) => {
    setOrdenDetalle({ ...orden, materiales: null, fotos: null });
    setLoadingDetalle(true);
    try {
      const res = await ordenesService.getDetalle(orden.id);
      setOrdenDetalle(res.data ?? res);
    } catch { /* muestra datos básicos igual */ }
    finally { setLoadingDetalle(false); }
  };

  const filteredOrdenes = ordenes.filter(o =>
    !searchOrdenes ||
    (o.abonado      ?? "").toLowerCase().includes(searchOrdenes.toLowerCase()) ||
    (o.nro_contrato ?? "").toLowerCase().includes(searchOrdenes.toLowerCase()) ||
    (o.sede_nombre  ?? "").toLowerCase().includes(searchOrdenes.toLowerCase()) ||
    String(o.nro_orden).includes(searchOrdenes)
  );

  const filteredRecojos = recojos.filter(o =>
    !searchRecojo ||
    (o.cliente    ?? "").toLowerCase().includes(searchRecojo.toLowerCase()) ||
    (o.tecnico    ?? "").toLowerCase().includes(searchRecojo.toLowerCase()) ||
    (o.sede_nombre ?? "").toLowerCase().includes(searchRecojo.toLowerCase())
  );

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <>
      {/* ── Panel lateral detalle orden ── */}
      {ordenDetalle && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={() => setOrdenDetalle(null)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.35)" }} />
          <div style={{
            position: "relative", width: 440, maxWidth: "95vw",
            background: "white", height: "100%", overflowY: "auto",
            boxShadow: "-4px 0 32px rgba(0,0,0,.15)",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Orden #{ordenDetalle.nro_orden}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>{ordenDetalle.nro_contrato}</div>
              </div>
              <button onClick={() => setOrdenDetalle(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <Icon d={IC.x} size={18} />
              </button>
            </div>

            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6, background: "var(--hover, #f8f9fa)" }}>
              <DetRow label="Abonado"    value={ordenDetalle.abonado} />
              <DetRow label="Dirección"  value={ordenDetalle.direccion} />
              <DetRow label="Sede"       value={ordenDetalle.sede_nombre} />
              <DetRow label="Servicio"   value={labelServicio(ordenDetalle.servicio ?? "")} />
              <DetRow label="Tecnología" value={ordenDetalle.tecnologia} />
              <DetRow label="Fecha"      value={ordenDetalle.fecha_crea} />
              <DetRow label="Técnico"    value={ordenDetalle.tecnico_nombre} />
              <DetRow label="Contrato"   value={ordenDetalle.nro_contrato} mono />
            </div>

            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Materiales usados</div>
                {loadingDetalle ? (
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Cargando...</span>
                ) : ordenDetalle.materiales?.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ordenDetalle.materiales.map((m, i) => (
                      <span key={i} style={{
                        background: "#F1F5F9", color: "#475569", fontSize: 11, fontWeight: 600,
                        padding: "3px 10px", borderRadius: 20, border: "1px solid #E2E8F0",
                      }}>
                        {m.nombre}: {m.cantidad} {m.unidad ?? ""}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Sin materiales registrados</span>
                )}
              </div>

              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Fotos</div>
                {loadingDetalle ? (
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Cargando...</span>
                ) : ordenDetalle.fotos?.length > 0 ? (
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

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

        {/* ── Filtros globales ── */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={sedeFilter}
            onChange={e => setSedeFilter(e.target.value)}
            style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "1.5px solid var(--border)", background: "white", cursor: "pointer" }}>
            <option value="">Todas las sedes</option>
            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>

        {/* ── ÓRDENES DE SERVICIO ── */}
        <div>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionTitle}>
                <Icon d={IC.list} size={18} color="var(--primary)" />
                Órdenes de servicio
              </div>
              <div style={styles.sectionSubtitle}>Resumen de todas las órdenes por sede</div>
            </div>
            <button onClick={cargarOrdenes} style={{ padding: "5px 10px", borderRadius: 20, fontSize: 12, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Icon d={IC.refresh} size={12} />
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            {[{ key: "todas", label: "Todas" }, { key: "pendiente", label: "Pendientes" }, { key: "completada", label: "Completadas" }].map(f => (
              <button key={f.key} type="button" onClick={() => setFiltroEstado(f.key)}
                style={{
                  padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: "1.5px solid", cursor: "pointer",
                  borderColor: filtroEstado === f.key ? "var(--primary)" : "var(--border)",
                  background:  filtroEstado === f.key ? "var(--primary)" : "white",
                  color:       filtroEstado === f.key ? "white" : "var(--text-muted)",
                }}>
                {f.label}
              </button>
            ))}
            <div className="search-box" style={{ marginLeft: "auto" }}>
              <Icon d={IC.search} size={15} color="var(--text-muted)" />
              <input placeholder="Buscar abonado, contrato, sede..." value={searchOrdenes} onChange={e => setSearchOrdenes(e.target.value)} />
            </div>
          </div>

          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Orden</th><th>Contrato</th><th>Abonado</th><th>Sede</th><th>Servicio</th><th>Técnico</th><th>Fecha</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {loadingOrdenes ? (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Cargando...</td></tr>
                  ) : filteredOrdenes.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Sin órdenes.</td></tr>
                  ) : filteredOrdenes.map(o => (
                    <tr key={o.id} onClick={() => abrirDetalle(o)} style={{ cursor: "pointer" }}>
                      <td className="mono text-sm">#{o.nro_orden}</td>
                      <td className="mono text-sm" style={{ color: "var(--primary)", fontWeight: 600 }}>{o.nro_contrato}</td>
                      <td className="fw-600">{o.abonado}</td>
                      <td className="text-sm">{o.sede_nombre ?? "—"}</td>
                      <td><span className={`badge ${badgeServicio(o.servicio ?? "")}`}>{labelServicio(o.servicio ?? "")}</span></td>
                      <td className="text-sm">{o.tecnico_nombre ?? "—"}</td>
                      <td className="text-sm text-muted">{o.fecha_crea || "—"}</td>
                      <td><span className={`badge ${o.estado_app === "completada" ? "badge-active" : "badge-warning"}`}>
                        {o.estado_app === "completada" ? "Completada" : "Pendiente"}
                      </span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── RECOJOS ── */}
        <div>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionTitle}>
                <Icon d={IC.box} size={18} color="var(--primary)" />
                Recojos de equipos
              </div>
              <div style={styles.sectionSubtitle}>Equipos pendientes de recojo por técnico</div>
            </div>
            <button onClick={cargarRecojos} style={{ padding: "5px 10px", borderRadius: 20, fontSize: 12, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Icon d={IC.refresh} size={12} />
            </button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div className="search-box">
              <Icon d={IC.search} size={15} color="var(--text-muted)" />
              <input placeholder="Buscar por cliente, técnico o sede..." value={searchRecojo} onChange={e => setSearchRecojo(e.target.value)} />
            </div>
          </div>

          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Sede</th><th>Técnico</th><th>Cliente</th><th>Equipo</th><th>Código PON</th><th>Fecha</th><th>Estado</th><th>Foto</th></tr>
                </thead>
                <tbody>
                  {loadingRecojos ? (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Cargando...</td></tr>
                  ) : filteredRecojos.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Sin recojos registrados.</td></tr>
                  ) : filteredRecojos.map(o => (
                    <tr key={o.id}>
                      <td className="text-sm">{o.sede_nombre ?? "—"}</td>
                      <td className="fw-600">{o.tecnico}</td>
                      <td>{o.cliente ?? "—"}</td>
                      <td><span className="badge badge-blue">{o.tipo_equipo ?? "—"}</span></td>
                      <td><span className="mono text-sm">{o.codigo_pon ?? "—"}</span></td>
                      <td className="text-sm text-muted">{formatFecha(o.created_at)}</td>
                      <td><span className={`badge badge-${o.estado === "pendiente" ? "warning" : "active"}`}>
                        {o.estado === "pendiente" ? "Pendiente" : "Recogido"}
                      </span></td>
                      <td>
                        {o.foto
                          ? <a href={`${BASE_URL}/uploads/${o.foto}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><Icon d={IC.image} size={13} /> Ver foto</a>
                          : <span className="text-muted text-sm">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

const styles = {
  sectionHeader: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between", marginBottom: 12,
  },
  sectionTitle: {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 4,
  },
  sectionSubtitle: { fontSize: 13, color: "var(--text-muted)" },
};