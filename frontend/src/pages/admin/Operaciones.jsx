import { useState, useEffect } from "react";
import activacionesService from "../../services/activacionesService";
import tecnicoService from "../../services/tecnicoService";
import recojosService from "../../services/recojosService";
import sedesService from "../../services/sedesService";

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
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  image:  "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 19",
  wifi:   "M5 12.55a11 11 0 0114.08 0 M1.42 9a16 16 0 0121.16 0 M8.53 16.11a6 6 0 016.95 0 M12 20h.01",
  wrench: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  box:    "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  check:  "M20 6L9 17l-5-5",
};

function MaterialesBadge({ materiales }) {
  if (!materiales || materiales.length === 0)
    return <span className="text-muted text-sm">—</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {materiales.map((m, i) => (
        <span key={i} style={{
          background: "#F1F5F9", color: "#475569",
          fontSize: 11, fontWeight: 600,
          padding: "2px 8px", borderRadius: 20,
          border: "1px solid #E2E8F0", whiteSpace: "nowrap",
        }}>
          {m.nombre}: {m.cantidad} {m.unidad ?? ""}
        </span>
      ))}
    </div>
  );
}

export default function AdminOperaciones() {
  const [sedes,        setSedes]        = useState([]);
  const [sedeFilter,   setSedeFilter]   = useState("todas");
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  // Datos
  const [recojos,      setRecojos]      = useState([]);
  const [activaciones, setActivaciones] = useState([]);
  const [averias,      setAverias]      = useState([]);

  // Búsquedas
  const [searchRecojo, setSearchRecojo] = useState("");
  const [searchActiv,  setSearchActiv]  = useState("");
  const [searchAveria, setSearchAveria] = useState("");

  useEffect(() => {
    Promise.all([
      sedesService.getAll(),
    ]).then(([dataSedes]) => {
      setSedes(dataSedes);
    }).catch(() => setError("No se pudieron cargar las sedes"));
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      recojosService.getAllAdmin(sedeFilter),
      activacionesService.getAllAdmin(sedeFilter),
      tecnicoService.getAveriasAdmin(sedeFilter),
    ]).then(([dataRecojos, dataActivaciones, dataAverias]) => {
      setRecojos(dataRecojos);
      setActivaciones(dataActivaciones);
      setAverias(dataAverias);
      setLoading(false);
    }).catch(() => { setError("No se pudieron cargar los datos"); setLoading(false); });
  }, [sedeFilter]);

  // Filtros locales de búsqueda
  const filteredRecojos = recojos.filter(o =>
    (o.cliente ?? "").toLowerCase().includes(searchRecojo.toLowerCase()) ||
    (o.tecnico ?? "").toLowerCase().includes(searchRecojo.toLowerCase()) ||
    (o.sede_nombre ?? "").toLowerCase().includes(searchRecojo.toLowerCase())
  );

  const filteredActivaciones = activaciones.filter(a =>
    (a.cliente ?? "").toLowerCase().includes(searchActiv.toLowerCase()) ||
    (a.tecnico ?? "").toLowerCase().includes(searchActiv.toLowerCase()) ||
    (a.sede_nombre ?? "").toLowerCase().includes(searchActiv.toLowerCase())
  );

  const filteredAverias = averias.filter(a =>
    (a.tecnico ?? "").toLowerCase().includes(searchAveria.toLowerCase()) ||
    (a.comentario ?? "").toLowerCase().includes(searchAveria.toLowerCase()) ||
    (a.sede_nombre ?? "").toLowerCase().includes(searchAveria.toLowerCase())
  );

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* Filtro global de sede */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
          Ver sede:
        </div>
        <select className="filter-select" value={sedeFilter}
          onChange={e => setSedeFilter(e.target.value)}>
          <option value="todas">Todas las sedes</option>
          {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando operaciones...</div>
      ) : (
        <>
          {/* ── RECOJOS ── */}
          <div>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitle}>
                <Icon d={IC.box} size={18} color="var(--primary)" />
                Recojos de equipos
              </div>
            </div>
            <div className="toolbar" style={{ marginBottom: 12 }}>
              <div className="search-box">
                <Icon d={IC.search} size={16} color="var(--text-muted)" />
                <input placeholder="Buscar por cliente, técnico o sede..."
                  value={searchRecojo} onChange={e => setSearchRecojo(e.target.value)} />
              </div>
            </div>
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Sede</th><th>Técnico</th><th>Cliente</th>
                      <th>Equipo</th><th>Serie</th><th>Fecha</th><th>Estado</th><th>Foto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecojos.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                          Sin recojos registrados
                        </td>
                      </tr>
                    ) : filteredRecojos.map(o => (
                      <tr key={o.id}>
                        <td className="text-sm">{o.sede_nombre ?? "—"}</td>
                        <td className="fw-600">{o.tecnico}</td>
                        <td>{o.cliente ?? "—"}</td>
                        <td><span className="badge badge-blue">{o.tipo_equipo ?? "—"}</span></td>
                        <td><span className="mono">{o.serie ?? "—"}</span></td>
                        <td className="text-sm text-muted">{formatFecha(o.created_at)}</td>
                        <td>
                          <span className={`badge badge-${o.estado === "pendiente" ? "warning" : "active"}`}>
                            {o.estado === "pendiente" ? "Pendiente" : "Recogido"}
                          </span>
                        </td>
                        <td>
                          {o.foto ? (
                            <a href={`${BASE_URL}/uploads/${o.foto}`} target="_blank" rel="noreferrer"
                              className="btn btn-outline btn-sm">
                              <Icon d={IC.image} size={13} />
                              Ver foto
                            </a>
                          ) : <span className="text-muted text-sm">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── ACTIVACIONES ── */}
          <div>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitle}>
                <Icon d={IC.wifi} size={18} color="#16a34a" />
                Activaciones
              </div>
            </div>
            <div className="toolbar" style={{ marginBottom: 12 }}>
              <div className="search-box">
                <Icon d={IC.search} size={16} color="var(--text-muted)" />
                <input placeholder="Buscar por cliente, técnico o sede..."
                  value={searchActiv} onChange={e => setSearchActiv(e.target.value)} />
              </div>
            </div>
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Sede</th><th>Técnico</th><th>Cliente</th><th>Dirección</th>
                      <th>Materiales</th><th>Fecha</th><th>Fotos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivaciones.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                          Sin activaciones registradas
                        </td>
                      </tr>
                    ) : filteredActivaciones.map(a => (
                      <tr key={a.id}>
                        <td className="text-sm">{a.sede_nombre ?? "—"}</td>
                        <td className="fw-600">{a.tecnico}</td>
                        <td>{a.cliente ?? "—"}</td>
                        <td className="text-sm">{a.direccion ?? "—"}</td>
                        <td><MaterialesBadge materiales={a.materiales} /></td>
                        <td className="text-sm text-muted">{formatFecha(a.fecha)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            {a.foto_antes && (
                              <a href={`${BASE_URL}/uploads/${a.foto_antes}`} target="_blank" rel="noreferrer"
                                className="btn btn-outline btn-sm" style={{ fontSize: 11 }}>
                                <Icon d={IC.image} size={12} /> Antes
                              </a>
                            )}
                            {a.foto_despues && (
                              <a href={`${BASE_URL}/uploads/${a.foto_despues}`} target="_blank" rel="noreferrer"
                                className="btn btn-outline btn-sm" style={{ fontSize: 11 }}>
                                <Icon d={IC.image} size={12} /> Después
                              </a>
                            )}
                            {!a.foto_antes && !a.foto_despues && (
                              <span className="text-muted text-sm">Sin fotos</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── AVERÍAS ── */}
          <div>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitle}>
                <Icon d={IC.wrench} size={18} color="#DC2626" />
                Averías
              </div>
            </div>
            <div className="toolbar" style={{ marginBottom: 12 }}>
              <div className="search-box">
                <Icon d={IC.search} size={16} color="var(--text-muted)" />
                <input placeholder="Buscar por técnico, sede o comentario..."
                  value={searchAveria} onChange={e => setSearchAveria(e.target.value)} />
              </div>
            </div>
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Sede</th><th>Técnico</th><th>Materiales usados</th>
                      <th>Comentario</th><th>Fecha</th><th>Foto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAverias.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                          Sin averías registradas
                        </td>
                      </tr>
                    ) : filteredAverias.map(a => (
                      <tr key={a.id}>
                        <td className="text-sm">{a.sede_nombre ?? "—"}</td>
                        <td className="fw-600">{a.tecnico}</td>
                        <td><MaterialesBadge materiales={a.materiales} /></td>
                        <td className="text-sm text-muted" style={{ maxWidth: 180 }}>{a.comentario ?? "—"}</td>
                        <td className="text-sm text-muted">{formatFecha(a.fecha)}</td>
                        <td>
                          {a.foto ? (
                            <a href={`${BASE_URL}/uploads/${a.foto}`} target="_blank" rel="noreferrer"
                              className="btn btn-outline btn-sm">
                              <Icon d={IC.image} size={13} /> Ver foto
                            </a>
                          ) : <span className="text-muted text-sm">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  sectionHeader: { marginBottom: 12 },
  sectionTitle: {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 16, fontWeight: 700, color: "var(--text)",
  },
};