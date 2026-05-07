import { useState, useEffect } from "react";
import { MotivoBadge } from "../../components/ui/Badge";
import { formatDate } from "../../utils/formatters";
import tecnicoService from "../../services/tecnicoService";
import { db } from "../../db/localDB";

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

// Formatea cantidad: si es medible muestra decimales, si no entero
function formatCantidad(cantidad, esMedible) {
  const n = parseFloat(cantidad);
  if (isNaN(n)) return "—";
  return esMedible ? n.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : String(Math.round(n));
}

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
    <div style={{ maxWidth: 800, margin: "0 auto" }}>

      {/* ── Resumen ── */}
      <div style={hs.statsRow}>
        {[
          { label: "Total movimientos", value: resumen.total,      color: "var(--primary)", bg: "var(--primary-light)" },
          { label: "Instalaciones",     value: resumen.nuevaConex, color: "#1E40AF",        bg: "#DBEAFE" },
          { label: "Averías",           value: resumen.averias,    color: "var(--danger)",  bg: "var(--danger-light)" },
        ].map((s, i) => (
          <div key={i} style={hs.statCard}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: -1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div style={hs.toolbar}>
        <div className="search-box" style={{ flex: 1 }}>
          <Icon d={IC.search} size={16} color="var(--text-muted)" />
          <input
            placeholder="Buscar por ítem..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: 15 }}
          />
        </div>
        <select
          className="filter-select"
          value={filterMotivo}
          onChange={e => setFilterMotivo(e.target.value)}
          style={{ fontSize: 15, minWidth: 140 }}
        >
          <option value="todos">Todos</option>
          <option value="instalacion">Instalación</option>
          <option value="averia">Avería</option>
        </select>
      </div>

      {/* ── Lista (cards en mobile) ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          <Icon d={IC.empty} size={36} color="var(--text-muted)" />
          <p style={{ marginTop: 12 }}>
            {search || filterMotivo !== "todos"
              ? "Sin resultados con los filtros aplicados."
              : "Todavía no registraste ninguna salida."}
          </p>
        </div>
      ) : (
        <>
          {/* Tabla para pantallas grandes */}
          <div className="card" style={{ display: "none" }} id="historial-table-wrap">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th><th>Ítem</th><th>Cantidad</th><th>Motivo</th><th>Comentario</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => (
                    <tr key={m.id}>
                      <td style={{ whiteSpace: "nowrap", fontSize: 13, color: "var(--text-muted)" }}>
                        {formatDate(m.fecha)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{m.item}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.unidad}</div>
                      </td>
                      <td style={{ fontFamily: "monospace", fontWeight: 600 }}>
                        {formatCantidad(m.cantidad, m.es_medible)} {m.unidad}
                      </td>
                      <td><MotivoBadge motivo={m.motivo} /></td>
                      <td>
                        {m.comentario
                          ? <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{m.comentario}</span>
                          : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards para mobile */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(m => (
              <div key={m.id} style={hs.mCard}>
                <div style={hs.mCardTop}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{m.item}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {formatDate(m.fecha)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 16 }}>
                      {formatCantidad(m.cantidad, m.es_medible)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.unidad}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <MotivoBadge motivo={m.motivo} />
                  {m.comentario && (
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.comentario}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const hs = {
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    background: "white",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "14px 16px",
    boxShadow: "0 1px 3px rgba(0,0,0,.05)",
  },
  toolbar: {
    display: "flex",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  mCard: {
    background: "white",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "14px 16px",
    boxShadow: "0 1px 3px rgba(0,0,0,.05)",
  },
  mCardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
};