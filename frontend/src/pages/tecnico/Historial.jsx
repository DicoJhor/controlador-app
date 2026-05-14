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
  const [expandedId, setExpandedId] = useState(null);
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")

  useEffect(() => {
    const cargarHistorial = async () => {
      try {
        if (navigator.onLine) {
          // ONLINE: obtener del servidor y guardar caché
          const data = await tecnicoService.getMiHistorial();
          const datos = Array.isArray(data) ? data : [];
          setHistorial(datos);
          await db.historial.clear();
          await db.historial.bulkPut(datos.map(d => ({ ...d, materiales: JSON.stringify(d.materiales ?? []) })));
        } else {
          // OFFLINE: cargar desde caché local
          const data = await db.historial.toArray();
          setHistorial(data);
        }
      } catch (error) {
        // Error de red: usar caché como fallback
        const data = await db.historial.toArray();
        setHistorial(data);
        if (data.length === 0) {
          setError("No se pudo cargar el historial");
        }
      } finally {
        setLoading(false);
      }
    };
    
    cargarHistorial();
  }, []);

  const filtered = historial.filter(m => {
    const matchSearch =
    (m.cliente  ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (m.codigo   ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (m.nro_orden ?? "").toLowerCase().includes(search.toLowerCase())
  const matchMotivo = filterMotivo === "todos" || m.tipo === filterMotivo
  const fechaRegistro = new Date(m.fecha)
  const matchDesde = !fechaDesde || fechaRegistro >= new Date(fechaDesde)
  const matchHasta = !fechaHasta || fechaRegistro <= new Date(fechaHasta + "T23:59:59")
  return matchSearch && matchMotivo && matchDesde && matchHasta
})

  const resumen = {
    total:      historial.length,
    nuevaConex: historial.filter(m => m.tipo === "activacion").length,
    averias:    historial.filter(m => m.tipo === "averia").length,
  }

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
          <option value="activacion">Instalaciones / Cambios</option>
          <option value="averia">Averías / Retiros</option>
        </select>
        <input
          type="date"
          className="filter-select"
          value={fechaDesde}
          onChange={e => setFechaDesde(e.target.value)}
          style={{ fontSize: 14 }}
        />
        <input
          type="date"
          className="filter-select"
          value={fechaHasta}
          onChange={e => setFechaHasta(e.target.value)}
          style={{ fontSize: 14 }}
        />
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
                    <tr key={`${m.tipo}-${m.id}`}>
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
            {filtered.map(m => {
              const key = `${m.tipo}-${m.id}`;
              const isOpen = expandedId === key;
              return (
                <div
                  key={key}
                  style={{ ...hs.mCard, cursor: "pointer" }}
                  onClick={() => setExpandedId(isOpen ? null : key)}
                >
                  {/* Cabecera — igual que antes */}
                  <div style={hs.mCardTop}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{m.cliente || "—"}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{m.direccion}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{formatDate(m.fecha)}</div>
                    </div>
                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: "var(--primary)" }}>{m.codigo}</div>
                      {m.nro_orden && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Orden #{m.nro_orden}</div>}
                      <Icon
                        d={isOpen ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}
                        size={14} color="var(--text-muted)"
                      />
                    </div>
                  </div>

                  {/* Badge de tipo */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                      background: m.tipo === "activacion" ? "#d1fae5" : "#fee2e2",
                      color:      m.tipo === "activacion" ? "#065f46" : "#991b1b",
                      border:     `1px solid ${m.tipo === "activacion" ? "#6ee7b7" : "#fca5a5"}`,
                    }}>
                      {m.tipo === "activacion"
                        ? (m.servicio?.toUpperCase().includes("CAMBIO") ? "Cambio ONU" : "Instalación")
                        : (m.servicio?.toUpperCase().includes("RETIRO") ? "Retiro" : "Avería")}
                    </span>
                  </div>

                  {/* Panel desplegable */}
                  {isOpen && (
                    <div style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}>
                      {/* Datos del cliente */}
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Cliente
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        {[
                          { label: "Nombre",    value: m.cliente },
                          { label: "Teléfono",  value: m.telefono },
                          { label: "Dirección", value: m.direccion },
                          { label: "Servicio",  value: m.servicio },
                        ].map(({ label, value }) => value ? (
                          <div key={label}>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{label}</div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
                          </div>
                        ) : null)}
                      </div>

                      {/* Materiales usados */}
                      {m.materiales?.length > 0 && (
                        <>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>
                            Materiales
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {m.materiales.map((mat, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                <span>{mat.nombre}</span>
                                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)" }}>
                                  {formatCantidad(mat.cantidad, mat.es_medible)} {mat.unidad}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Comentario */}
                      {m.comentario && (
                        <div style={{
                          marginTop: 4,
                          background: "var(--bg-subtle, #f8fafc)",
                          borderRadius: 8,
                          padding: "8px 12px",
                          fontSize: 13,
                          color: "var(--text-secondary)",
                          borderLeft: "3px solid var(--primary)",
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", marginBottom: 2 }}>COMENTARIO</div>
                          {m.comentario}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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