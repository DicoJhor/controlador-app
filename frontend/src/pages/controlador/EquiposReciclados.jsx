import { useState, useEffect } from "react";
import recojosService from "../../services/recojosService";

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
  check:  "M20 6L9 17l-5-5",
  x:      "M18 6L6 18 M6 6l12 12",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
};

const ESTADO_CONFIG = {
  revision:  { label: "En revisión", color: "#d97706", bg: "#fef3c7" },
  aprobada:  { label: "Aprobado",    color: "#16a34a", bg: "#dcfce7" },
  malograda: { label: "Malogrado",   color: "#dc2626", bg: "#fee2e2" },
};

const FILTROS = [
  { key: "todos",     label: "Todos"       },
  { key: "revision",  label: "En revisión" },
  { key: "aprobada",  label: "Aprobados"   },
  { key: "malograda", label: "Malogrados"  },
];

export default function CtrlEquiposReciclados() {
  const [equipos,  setEquipos]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [filtro,   setFiltro]   = useState("todos");
  const [search,   setSearch]   = useState("");
  const [saving,   setSaving]   = useState(null);

  useEffect(() => {
    recojosService.getEquiposReciclados()
      .then(data => { setEquipos(data); setLoading(false); })
      .catch(() => { setError("No se pudieron cargar los equipos reciclados"); setLoading(false); });
  }, []);

  const handleRevisar = async (id, estado) => {
    setSaving(id);
    try {
      await recojosService.revisarEquipo(id, { estado });
      setEquipos(prev => prev.map(e => e.id === id ? { ...e, estado } : e));
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(null);
    }
  };

  const filtrados = equipos.filter(e => {
    const matchFiltro = filtro === "todos" || e.estado === filtro;
    const matchSearch = !search ||
      (e.producto    ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (e.tipo_equipo ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (e.codigo_pon  ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (e.cliente     ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (e.tecnico     ?? "").toLowerCase().includes(search.toLowerCase());
    return matchFiltro && matchSearch;
  });

  const countPorEstado = (e) => equipos.filter(eq => eq.estado === e).length;

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando equipos reciclados...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Equipos Reciclados</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          Equipos recuperados por técnicos. Decidí si vuelven al inventario o se desechan.
        </p>
      </div>

      {/* Contadores */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "En revisión", count: countPorEstado("revision"),  color: "#d97706", bg: "#fef3c7" },
          { label: "Aprobados",   count: countPorEstado("aprobada"),  color: "#16a34a", bg: "#dcfce7" },
          { label: "Malogrados",  count: countPorEstado("malograda"), color: "#dc2626", bg: "#fee2e2" },
        ].map(c => (
          <div key={c.label} style={{
            background: c.bg, borderRadius: 10, padding: "10px 16px",
            display: "flex", flexDirection: "column", gap: 2, minWidth: 110,
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.count}</span>
            <span style={{ fontSize: 12, color: c.color, fontWeight: 500 }}>{c.label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="search-box">
          <Icon d={IC.search} size={16} color="var(--text-muted)" />
          <input
            placeholder="Buscar por producto, tipo, cliente, técnico..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 4, background: "var(--hover)", borderRadius: 10, padding: 4 }}>
          {FILTROS.map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              style={{
                padding: "5px 12px", borderRadius: 7, border: "none",
                cursor: "pointer", fontSize: 12, fontWeight: 500,
                background: filtro === f.key ? "white" : "transparent",
                color: filtro === f.key ? "var(--text)" : "var(--text-muted)",
                boxShadow: filtro === f.key ? "0 1px 3px rgba(0,0,0,.1)" : "none",
                transition: "all .15s",
              }}>
              {f.label}
              {f.key !== "todos" && (
                <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700 }}>
                  ({countPorEstado(f.key)})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Producto</th>
                <th>PON-SN</th>
                <th>Cliente</th>
                <th>Técnico</th>
                <th>Orden</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    {search || filtro !== "todos"
                      ? "Sin resultados para ese filtro"
                      : "No hay equipos reciclados registrados"}
                  </td>
                </tr>
              ) : filtrados.map(eq => {
                const est      = ESTADO_CONFIG[eq.estado] ?? ESTADO_CONFIG.revision;
                const isSaving = saving === eq.id;
                const enRevision = eq.estado === "revision";

                return (
                  <tr key={eq.id}>
                    {/* Tipo */}
                    <td>
                      <span className="badge badge-blue">{eq.tipo_equipo ?? "—"}</span>
                    </td>

                    {/* Producto del catálogo */}
                    <td>
                      {eq.producto
                        ? <span style={{ fontSize: 13, fontWeight: 500 }}>{eq.producto}</span>
                        : <span style={{ fontSize: 12, color: "var(--warning)", fontStyle: "italic" }}>Sin identificar</span>}
                    </td>

                    {/* PON-SN (solo ONUs) */}
                    <td>
                      {eq.tipo_equipo === "ONU"
                        ? eq.codigo_pon
                          ? <span className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{eq.codigo_pon}</span>
                          : <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>Sin código</span>
                        : <span className="text-muted">—</span>}
                    </td>

                    {/* Cliente */}
                    <td>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{eq.cliente ?? "—"}</span>
                    </td>

                    {/* Técnico */}
                    <td>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{eq.tecnico ?? "—"}</span>
                    </td>

                    {/* Código recojo */}
                    <td>
                      {eq.recojo_codigo
                        ? <span className="mono" style={{ fontSize: 12, color: "var(--primary)" }}>{eq.recojo_codigo}</span>
                        : <span className="text-muted">—</span>}
                    </td>

                    {/* Fecha */}
                    <td>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatFecha(eq.created_at)}</span>
                    </td>

                    {/* Estado */}
                    <td>
                      <span style={{
                        background: est.bg, color: est.color,
                        padding: "2px 10px", borderRadius: 20,
                        fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                      }}>
                        {est.label}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td>
                      {enRevision ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            disabled={isSaving}
                            onClick={() => handleRevisar(eq.id, "aprobada")}
                            style={{
                              background: "#dcfce7", color: "#16a34a",
                              border: "1px solid #bbf7d0", fontSize: 12,
                              padding: "4px 10px", borderRadius: 7,
                              cursor: "pointer", fontWeight: 600,
                              opacity: isSaving ? 0.6 : 1,
                              display: "flex", alignItems: "center", gap: 4,
                            }}
                          >
                            <Icon d={IC.check} size={12} color="#16a34a" />
                            {isSaving ? "..." : "Aprobar"}
                          </button>
                          <button
                            disabled={isSaving}
                            onClick={() => handleRevisar(eq.id, "malograda")}
                            style={{
                              background: "#fee2e2", color: "#dc2626",
                              border: "1px solid #fecaca", fontSize: 12,
                              padding: "4px 10px", borderRadius: 7,
                              cursor: "pointer", fontWeight: 600,
                              opacity: isSaving ? 0.6 : 1,
                              display: "flex", alignItems: "center", gap: 4,
                            }}
                          >
                            <Icon d={IC.x} size={12} color="#dc2626" />
                            {isSaving ? "..." : "Malogrado"}
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                          Ya revisado
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}