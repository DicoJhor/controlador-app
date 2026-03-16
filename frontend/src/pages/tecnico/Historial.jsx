import { useState, useEffect } from "react";
import { MotivoBadge } from "../../components/ui/Badge";
import { formatDate, formatNumber } from "../../utils/formatters";
import { MOTIVOS_SALIDA } from "../../utils/constants";
import tecnicoService from "../../services/tecnicoService";

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
  comment: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  empty:   "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2",
};

export default function TecHistorial() {
  const [historial,    setHistorial]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [filterMotivo, setFilterMotivo] = useState("todos");

  useEffect(() => {
    tecnicoService.getMiHistorial()
      .then(data => { setHistorial(data); setLoading(false); })
      .catch(() => { setError("No se pudo cargar el historial"); setLoading(false); });
  }, []);

  const filtered = historial.filter(m => {
    const matchSearch = (m.item ?? "").toLowerCase().includes(search.toLowerCase());
    const matchMotivo = filterMotivo === "todos" || m.motivo === filterMotivo;
    return matchSearch && matchMotivo;
  });

  const resumen = {
    total:      historial.length,
    nuevaConex: historial.filter(m => m.motivo === "instalacion").length,
    averias:    historial.filter(m => m.motivo === "averia").length,
  };

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando historial...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {[
          { label: "Total movimientos", value: resumen.total,      color: "var(--primary)", bg: "var(--primary-light)" },
          { label: "Instalaciones",     value: resumen.nuevaConex, color: "#1E40AF",         bg: "#DBEAFE" },
          { label: "Averías",           value: resumen.averias,    color: "var(--danger)",   bg: "var(--danger-light)" },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</span>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -1, color: s.color }}>{s.value}</div>
              <div className="text-sm text-muted">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Icon d={IC.search} size={16} color="var(--text-muted)" />
          <input placeholder="Buscar por ítem..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={filterMotivo} onChange={e => setFilterMotivo(e.target.value)}>
          <option value="todos">Todos los motivos</option>
          <option value="instalacion">Instalación</option>
          <option value="averia">Avería</option>
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Ítem</th><th>Cantidad</th><th>Motivo</th><th>Comentario</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <Icon d={IC.empty} size={36} color="var(--text-muted)" />
                      <p>{search || filterMotivo !== "todos" ? "Sin resultados con los filtros aplicados." : "Todavía no registraste ninguna salida."}</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(m => (
                <tr key={m.id}>
                  <td className="text-sm text-muted" style={{ whiteSpace: "nowrap" }}>{formatDate(m.fecha)}</td>
                  <td>
                    <div className="fw-600">{m.item}</div>
                    <div className="text-sm text-muted">{m.unidad}</div>
                  </td>
                  <td className="mono fw-600">{formatNumber(m.cantidad)}</td>
                  <td><MotivoBadge motivo={m.motivo} /></td>
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
  comentario: { display: "flex", alignItems: "flex-start", gap: 5, maxWidth: 220, color: "var(--text-secondary)" },
};