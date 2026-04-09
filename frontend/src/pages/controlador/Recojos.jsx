import { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import recojosService from "../../services/recojosService";
import activacionesService from "../../services/activacionesService";
import tecnicoService from "../../services/tecnicoService";
import stockService from "../../services/stockService";
import api from "../../services/api";

const BASE_URL = import.meta.env.VITE_API_URL.replace("/api", "");
const TIPOS_EQUIPO = ["ONU", "Triplexor", "Roseta", "Patchcord", "Otro"];
const SIN_SERIE = ["Roseta", "Patchcord", "Triplexor"];

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
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  check:  "M20 6L9 17l-5-5",
  image:  "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 19",
  wifi:   "M5 12.55a11 11 0 0114.08 0 M1.42 9a16 16 0 0121.16 0 M8.53 16.11a6 6 0 016.95 0 M12 20h.01",
  wrench: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  box:    "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  x:      "M18 6L6 18 M6 6l12 12",
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
          border: "1px solid #E2E8F0",
          whiteSpace: "nowrap",
        }}>
          {m.nombre}: {m.cantidad} {m.unidad ?? ""}
        </span>
      ))}
    </div>
  );
}

// Estado inicial de selección de equipos: cada tipo tiene checked + serie/codigo_pon
const emptyEquiposCheck = () => TIPOS_EQUIPO.reduce((acc, t) => ({
  ...acc,
  [t]: { checked: false, serie: "", codigo_pon: "" }
}), {});

export default function CtrlRecojos() {
  const [tecnicos,      setTecnicos]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  // Recojos
  const [recojos,      setRecojos]      = useState([]);
  const [searchRecojo, setSearchRecojo] = useState("");
  const [recojoModal,  setRecojoModal]  = useState(false);
  const [recojoForm,   setRecojoForm]   = useState({ tecnico_id: "", cliente: "", direccion: "" });
  const [equiposCheck, setEquiposCheck] = useState(emptyEquiposCheck());
  const [equiposDrop,  setEquiposDrop]  = useState(false);
  const [saving,       setSaving]       = useState(false);

  // Activaciones
  const [activaciones,   setActivaciones]   = useState([]);
  const [searchActiv,    setSearchActiv]     = useState("");
  const [filterTecActiv, setFilterTecActiv]  = useState("todos");

  // Averías
  const [averias,       setAverias]       = useState([]);
  const [searchAveria,  setSearchAveria]  = useState("");
  const [filterTecAv,   setFilterTecAv]   = useState("todos");

  useEffect(() => {
    Promise.all([
      recojosService.getAll(),
      activacionesService.getAll(),
      tecnicoService.getAverias(),
      stockService.getStats(),
    ]).then(([dataRecojos, dataActivaciones, dataAverias, dataStats]) => {
      setRecojos(dataRecojos);
      setActivaciones(dataActivaciones);
      setAverias(dataAverias);
      setTecnicos(dataStats.misTecnicos);
      setLoading(false);
    }).catch(() => { setError("No se pudieron cargar los datos"); setLoading(false); });
  }, []);

  // ── Recojos ────────────────────────────────────────────
  const filteredRecojos = recojos.filter(o =>
    (o.cliente ?? "").toLowerCase().includes(searchRecojo.toLowerCase()) ||
    (o.serie ?? "").toLowerCase().includes(searchRecojo.toLowerCase()) ||
    (o.tecnico ?? "").toLowerCase().includes(searchRecojo.toLowerCase()) ||
    (o.tipo_equipo ?? "").toLowerCase().includes(searchRecojo.toLowerCase())
  );

  const equiposSeleccionados = TIPOS_EQUIPO.filter(t => equiposCheck[t].checked);
  const equiposValidos = equiposSeleccionados.length > 0;
  const recojoFormValido = recojoForm.tecnico_id && equiposValidos;

  const handleCrearRecojo = async () => {
    setSaving(true);
    try {
      const nueva = await recojosService.create({
        tecnico_id: Number(recojoForm.tecnico_id),
        cliente:    recojoForm.cliente || null,
        direccion:  recojoForm.direccion || null,
        equipos:    equiposSeleccionados.map(t => ({
          tipo_equipo: t,
          serie:       null,
          codigo_pon:  t === "ONU" ? equiposCheck[t].codigo_pon || null : null,
        })),
      });
      const tecnico = tecnicos.find(t => t.id === Number(recojoForm.tecnico_id));
      const nuevasFilas = nueva.equipos.map(eq => ({
        ...eq, id: eq.id, grupo_orden: nueva.grupo_orden,
        tecnico: tecnico?.nombre ?? "—",
        cliente: recojoForm.cliente, direccion: recojoForm.direccion,
        estado: "pendiente", created_at: new Date().toISOString(),
      }));
      setRecojos(prev => [...nuevasFilas, ...prev]);
      setRecojoModal(false);
      setRecojoForm({ tecnico_id: "", cliente: "", direccion: "" });
      setEquiposCheck(emptyEquiposCheck());
      setEquiposDrop(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarcarRecogido = async (id) => {
    try {
      await api.patchForm(`/recojos/${id}`, new FormData());
      setRecojos(prev => prev.map(o => o.id === id ? { ...o, estado: "recogido" } : o));
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Activaciones ───────────────────────────────────────
  const filteredActivaciones = activaciones.filter(a => {
    const matchSearch  = (a.cliente ?? "").toLowerCase().includes(searchActiv.toLowerCase()) ||
                         (a.tecnico ?? "").toLowerCase().includes(searchActiv.toLowerCase()) ||
                         (a.direccion ?? "").toLowerCase().includes(searchActiv.toLowerCase());
    const matchTecnico = filterTecActiv === "todos" || String(a.tecnico_id) === filterTecActiv;
    return matchSearch && matchTecnico;
  });

  // ── Averías ────────────────────────────────────────────
  const filteredAverias = averias.filter(a => {
    const matchSearch  = (a.tecnico ?? "").toLowerCase().includes(searchAveria.toLowerCase()) ||
                         (a.comentario ?? "").toLowerCase().includes(searchAveria.toLowerCase());
    const matchTecnico = filterTecAv === "todos" || String(a.tecnico_id) === filterTecAv;
    return matchSearch && matchTecnico;
  });

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando datos...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ── SECCIÓN RECOJOS ── */}
      <div>
        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.sectionTitle}>
              <Icon d={IC.box} size={18} color="var(--primary)" />
              Recojos de equipos
            </div>
            <div style={styles.sectionSubtitle}>Órdenes de recojo asignadas a técnicos</div>
          </div>
          <button className="btn btn-primary" onClick={() => setRecojoModal(true)}>
            <Icon d={IC.plus} size={15} />
            Nueva orden
          </button>
        </div>

        <div className="toolbar" style={{ marginBottom: 12 }}>
          <div className="search-box">
            <Icon d={IC.search} size={16} color="var(--text-muted)" />
            <input placeholder="Buscar por cliente, serie, equipo o técnico..."
              value={searchRecojo} onChange={e => setSearchRecojo(e.target.value)} />
          </div>
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Técnico</th><th>Cliente</th><th>Dirección</th>
                  <th>Equipo</th><th>Serie</th><th>Fecha</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filteredRecojos.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                      Sin órdenes de recojo
                    </td>
                  </tr>
                ) : filteredRecojos.map(o => (
                  <tr key={o.id}>
                    <td className="fw-600">{o.tecnico}</td>
                    <td>{o.cliente ?? "—"}</td>
                    <td className="text-sm">{o.direccion ?? "—"}</td>
                    <td><span className="badge badge-blue">{o.tipo_equipo ?? "—"}</span></td>
                    <td><span className="mono">{o.serie ?? "—"}</span></td>
                    <td className="text-sm text-muted">{formatFecha(o.created_at)}</td>
                    <td>
                      <span className={`badge badge-${o.estado === "pendiente" ? "warning" : "active"}`}>
                        {o.estado === "pendiente" ? "Pendiente" : "Recogido"}
                      </span>
                    </td>
                    <td>
                      {o.estado === "pendiente" ? (
                        <button className="btn btn-outline btn-sm" onClick={() => handleMarcarRecogido(o.id)}>
                          <Icon d={IC.check} size={13} />
                          Marcar recogido
                        </button>
                      ) : o.foto ? (
                        <a href={`${BASE_URL}/uploads/${o.foto}`} target="_blank" rel="noreferrer"
                          className="btn btn-outline btn-sm">
                          <Icon d={IC.image} size={13} />
                          Ver foto
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN ACTIVACIONES ── */}
      <div>
        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.sectionTitle}>
              <Icon d={IC.wifi} size={18} color="#16a34a" />
              Activaciones
            </div>
            <div style={styles.sectionSubtitle}>Registros de activaciones subidos por técnicos</div>
          </div>
        </div>

        <div className="toolbar" style={{ marginBottom: 12 }}>
          <div className="search-box">
            <Icon d={IC.search} size={16} color="var(--text-muted)" />
            <input placeholder="Buscar por cliente, dirección o técnico..."
              value={searchActiv} onChange={e => setSearchActiv(e.target.value)} />
          </div>
          <select className="filter-select" value={filterTecActiv} onChange={e => setFilterTecActiv(e.target.value)}>
            <option value="todos">Todos los técnicos</option>
            {tecnicos.map(t => <option key={t.id} value={String(t.id)}>{t.nombre}</option>)}
          </select>
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Técnico</th><th>Cliente</th><th>Dirección</th>
                  <th>Materiales</th><th>Comentario</th><th>Fecha</th><th>Fotos</th>
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
                    <td className="fw-600">{a.tecnico}</td>
                    <td>{a.cliente ?? "—"}</td>
                    <td className="text-sm">{a.direccion ?? "—"}</td>
                    <td><MaterialesBadge materiales={a.materiales} /></td>
                    <td className="text-sm text-muted" style={{ maxWidth: 180 }}>{a.comentario ?? "—"}</td>
                    <td className="text-sm text-muted">{formatFecha(a.fecha)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {a.foto_antes && (
                          <a href={`${BASE_URL}/uploads/${a.foto_antes}`} target="_blank" rel="noreferrer"
                            className="btn btn-outline btn-sm" style={{ fontSize: 11 }}>
                            <Icon d={IC.image} size={12} />
                            Antes
                          </a>
                        )}
                        {a.foto_despues && (
                          <a href={`${BASE_URL}/uploads/${a.foto_despues}`} target="_blank" rel="noreferrer"
                            className="btn btn-outline btn-sm" style={{ fontSize: 11 }}>
                            <Icon d={IC.image} size={12} />
                            Después
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

      {/* ── SECCIÓN AVERÍAS ── */}
      <div>
        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.sectionTitle}>
              <Icon d={IC.wrench} size={18} color="#DC2626" />
              Averías
            </div>
            <div style={styles.sectionSubtitle}>Materiales usados en reparaciones por técnicos</div>
          </div>
        </div>

        <div className="toolbar" style={{ marginBottom: 12 }}>
          <div className="search-box">
            <Icon d={IC.search} size={16} color="var(--text-muted)" />
            <input placeholder="Buscar por técnico o comentario..."
              value={searchAveria} onChange={e => setSearchAveria(e.target.value)} />
          </div>
          <select className="filter-select" value={filterTecAv} onChange={e => setFilterTecAv(e.target.value)}>
            <option value="todos">Todos los técnicos</option>
            {tecnicos.map(t => <option key={t.id} value={String(t.id)}>{t.nombre}</option>)}
          </select>
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Técnico</th><th>Materiales usados</th>
                  <th>Comentario</th><th>Fecha</th><th>Foto</th>
                </tr>
              </thead>
              <tbody>
                {filteredAverias.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                      Sin averías registradas
                    </td>
                  </tr>
                ) : filteredAverias.map(a => (
                  <tr key={a.id}>
                    <td className="fw-600">{a.tecnico}</td>
                    <td><MaterialesBadge materiales={a.materiales} /></td>
                    <td className="text-sm text-muted" style={{ maxWidth: 180 }}>{a.comentario ?? "—"}</td>
                    <td className="text-sm text-muted">{formatFecha(a.fecha)}</td>
                    <td>
                      {a.foto ? (
                        <a href={`${BASE_URL}/uploads/${a.foto}`} target="_blank" rel="noreferrer"
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

      {/* ── Modal nueva orden de recojo ── */}
      {recojoModal && (
        <Modal title="Nueva orden de recojo"
          onClose={() => { setRecojoModal(false); setEquiposCheck(emptyEquiposCheck()); setEquiposDrop(false); }}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setRecojoModal(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCrearRecojo} disabled={saving || !recojoFormValido}>
                {saving ? "Creando..." : "Crear orden"}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Técnico *</label>
            <select className="form-input" value={recojoForm.tecnico_id}
              onChange={e => setRecojoForm(p => ({ ...p, tecnico_id: e.target.value }))}>
              <option value="">Seleccionar técnico</option>
              {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cliente</label>
            <input className="form-input" placeholder="Nombre del cliente"
              value={recojoForm.cliente} onChange={e => setRecojoForm(p => ({ ...p, cliente: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input className="form-input" placeholder="Dirección del recojo"
              value={recojoForm.direccion} onChange={e => setRecojoForm(p => ({ ...p, direccion: e.target.value }))} />
          </div>

          {/* Equipos — dropdown con checkboxes */}
          <div className="form-group" style={{ position: "relative" }}>
            <label className="form-label">Equipos a recoger *</label>

            {/* Trigger del dropdown */}
            <button type="button" className="form-input"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", textAlign: "left", background: "var(--input-bg, #fff)" }}
              onClick={() => setEquiposDrop(p => !p)}>
              <span style={{ color: equiposSeleccionados.length ? "var(--text)" : "var(--text-muted)", fontSize: 14 }}>
                {equiposSeleccionados.length
                  ? equiposSeleccionados.join(", ")
                  : "Seleccionar equipos..."}
              </span>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                style={{ transform: equiposDrop ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s", flexShrink: 0 }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* Panel desplegable */}
            {equiposDrop && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                background: "var(--card-bg, #fff)", border: "1px solid var(--border)",
                borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: 4, marginTop: 2,
              }}>
                {TIPOS_EQUIPO.map(tipo => (
                  <label key={tipo} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 6, cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <input type="checkbox" checked={equiposCheck[tipo].checked}
                      onChange={e => setEquiposCheck(p => ({
                        ...p,
                        [tipo]: { ...p[tipo], checked: e.target.checked, serie: "", codigo_pon: "" }
                      }))}
                      style={{ width: 15, height: 15, accentColor: "var(--primary)", cursor: "pointer" }} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{tipo}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Campos extra para ONU si está seleccionada */}
          {equiposCheck["ONU"]?.checked && (
            <div style={{ background: "var(--hover)", borderRadius: 8, padding: 12, marginTop: -8, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)", marginBottom: 8 }}>ONU</div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>
                  Código PON-SN{" "}
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(opcional)</span>
                </label>
                <input className="form-input" placeholder="Ej: ZTEGC1234567"
                  value={equiposCheck["ONU"].codigo_pon}
                  onChange={e => setEquiposCheck(p => ({ ...p, ONU: { ...p.ONU, codigo_pon: e.target.value } }))} />
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
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