import { useState, useEffect } from "react";
import { MotivoBadge } from "../../components/ui/Badge";
import { formatDate } from "../../utils/formatters";
import stockService from "../../services/stockService";

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
  download:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  comment: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
};

export default function CtrlAuditoria() {
  const [movimientos,   setMovimientos]   = useState([]);
  const [tecnicos,      setTecnicos]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [search,        setSearch]        = useState("");
  const [filterTecnico, setFilterTecnico] = useState("todos");
  const [filterMotivo,  setFilterMotivo]  = useState("todos");

  useEffect(() => {
    Promise.all([
      stockService.getAuditoria(),
      stockService.getStats()
    ])
      .then(([dataMov, dataStats]) => {
        setMovimientos(dataMov);
        setTecnicos(dataStats.misTecnicos);
        setLoading(false);
      })
      .catch(() => { setError("No se pudieron cargar los movimientos"); setLoading(false); });
  }, []);

  const filtered = movimientos.filter(m => {
    const matchSearch  = (m.item ?? "").toLowerCase().includes(search.toLowerCase()) ||
                         (m.tecnico ?? "").toLowerCase().includes(search.toLowerCase());
    const matchTecnico = filterTecnico === "todos" || String(m.tecnico_id) === filterTecnico;
    const matchMotivo  = filterMotivo  === "todos" || m.motivo === filterMotivo;
    return matchSearch && matchTecnico && matchMotivo;
  });

  const resumen = tecnicos.map(t => {
    const movs = movimientos.filter(m => m.tecnico_id === t.id);
    return {
      ...t,
      total:     movs.length,
      instalaciones: movs.filter(m => m.motivo === "instalacion").length,
      averias:   movs.filter(m => m.motivo === "averia").length,
    };
  });

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando auditoría...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      {/* Resumen por técnico */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {resumen.map(r => (
          <div key={r.id} className="card" style={{ padding: "16px 20px" }}>
            <div style={styles.resumenHeader}>
              <div style={styles.avatar}>{r.nombre.charAt(0)}</div>
              <div>
                <div className="fw-600" style={{ fontSize: 13.5 }}>{r.nombre}</div>
                <div className="text-sm text-muted">{r.total} movimiento(s)</div>
              </div>
            </div>
            <div style={styles.resumenStats}>
              <div style={styles.resumenStat}>
                <div style={{ fontWeight: 700, color: "var(--primary)" }}>{r.instalaciones}</div>
                <div className="text-xs text-muted">Instalaciones</div>
              </div>
              <div style={styles.resumenStat}>
                <div style={{ fontWeight: 700, color: "var(--danger)" }}>{r.averias}</div>
                <div className="text-xs text-muted">Averías</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Icon d={IC.search} size={16} color="var(--text-muted)" />
          <input placeholder="Buscar por ítem o técnico..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={filterTecnico} onChange={e => setFilterTecnico(e.target.value)}>
          <option value="todos">Todos los técnicos</option>
          {tecnicos.map(t => <option key={t.id} value={String(t.id)}>{t.nombre}</option>)}
        </select>
        <select className="filter-select" value={filterMotivo} onChange={e => setFilterMotivo(e.target.value)}>
          <option value="todos">Todos los motivos</option>
          <option value="instalacion">Instalación</option>
          <option value="averia">Avería</option>
        </select>
      </div>

      <div style={{ marginBottom: 12, fontSize: 13, color: "var(--text-muted)" }}>
        {filtered.length} registro(s) encontrado(s)
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Técnico</th>
                <th>Ítem</th>
                <th>Cantidad</th>
                <th>Motivo</th>
                <th>Comentario</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    Sin registros
                  </td>
                </tr>
              ) : filtered.map((m, i) => (
                <tr key={i}>
                  <td className="text-sm text-muted" style={{ whiteSpace: "nowrap" }}>{formatDate(m.fecha)}</td>
                  <td>
                    <div style={styles.tecnicoCell}>
                      <div style={styles.avatar}>{(m.tecnico ?? "?").charAt(0)}</div>
                      <span className="fw-600" style={{ fontSize: 13 }}>{m.tecnico ?? "—"}</span>
                    </div>
                  </td>
                  <td className="fw-600">{m.item}</td>
                  <td className="mono">{m.cantidad}</td>
                  <td>
                    {m.motivo
                      ? <MotivoBadge motivo={m.motivo} />
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td>
                    {m.comentario ? (
                      <div style={styles.comentario}>
                        <Icon d={IC.comment} size={12} color="var(--text-muted)" />
                        <span className="text-sm">{m.comentario}</span>
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  resumenHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  resumenStats:  { display: "flex", gap: 16, paddingTop: 12, borderTop: "1px solid var(--border)" },
  resumenStat:   { flex: 1, textAlign: "center" },
  avatar: {
    width: 30, height: 30, borderRadius: "50%",
    background: "var(--ctrl-light)", color: "var(--ctrl)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, flexShrink: 0,
  },
  tecnicoCell: { display: "flex", alignItems: "center", gap: 8 },
  comentario: { display: "flex", alignItems: "flex-start", gap: 5, maxWidth: 200, color: "var(--text-secondary)" },
};