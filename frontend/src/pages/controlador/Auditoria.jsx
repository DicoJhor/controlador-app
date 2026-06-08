import { useState, useEffect } from "react";
import { formatDate } from "../../utils/formatters";
import stockService from "../../services/stockService";

// ── Icons ──────────────────────────────────────────────────────────────────
function Icon({ d, size = 16, color = "currentColor", strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const IC = {
  chevron:    "M6 9l6 6 6-6",
  box:        "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  check:      "M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  wrench:     "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  zap:        "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  package:    "M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
  wifi:       "M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01",
  clock:      "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 6v6l4 2",
  user:       "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  empty:      "M9 17H7A5 5 0 017 7h2 M15 7h2a5 5 0 010 10h-2 M8 12h8",
  onu:        "M2 20h20M4 20V10l8-8 8 8v10M9 20v-5h6v5",
};

// ── Badge tipo orden ───────────────────────────────────────────────────────
function TipoBadge({ tipo }) {
  const cfg = {
    activacion: { label: "Activación", bg: "var(--success-light, #d1fae5)", color: "var(--success, #059669)", icon: IC.zap },
    averia:     { label: "Avería",     bg: "var(--danger-light, #fee2e2)",  color: "var(--danger, #dc2626)",  icon: IC.wrench },
    otro:       { label: "Otro",       bg: "var(--border)",                 color: "var(--text-muted)",       icon: IC.check },
  }[tipo] ?? { label: tipo, bg: "var(--border)", color: "var(--text-muted)", icon: IC.check };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, padding: "2px 8px",
      borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.04em",
    }}>
      <Icon d={cfg.icon} size={11} color={cfg.color} />
      {cfg.label}
    </span>
  );
}

// ── Tarjeta de orden completada ────────────────────────────────────────────
function OrdenCard({ orden }) {
  return (
    <div style={S.ordenCard}>
      <div style={S.ordenHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <TipoBadge tipo={orden.tipo} />
          <span style={{ fontWeight: 700, fontSize: 13 }}>#{orden.nro_orden}</span>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{orden.abonado}</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          {orden.completada_en ? new Date(orden.completada_en).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : "—"}
        </span>
      </div>

      {orden.direccion && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, marginBottom: 6 }}>
          📍 {orden.direccion}
        </div>
      )}

      {orden.materiales?.length > 0 && (
        <div style={S.materialesWrap}>
          {orden.materiales.map((m, i) => (
            <span key={i} style={S.materialChip}>
              <Icon d={IC.package} size={11} color="var(--text-muted)" />
              {m.nombre} × {m.cantidad} {m.unidad ?? ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tarjeta expandible de técnico ──────────────────────────────────────────
function TecnicoCard({ tecnico }) {
  const [expanded,   setExpanded]   = useState(false);
  const [inventario, setInventario] = useState(null);
  const [actividad,  setActividad]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState("actividad");

  useEffect(() => {
    const cargar = async () => {
      try {
        const [inv, act] = await Promise.all([
          stockService.getTecnicoInventario(tecnico.id),
          stockService.getTecnicoActividadHoy(tecnico.id),
        ]);
        setInventario(inv);
        setActividad(act);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [tecnico.id]);

  const toggle = () => setExpanded(v => !v);

  const totalOrdenes = actividad?.length ?? null;
  const totalItems = inventario
    ? inventario.items.reduce((s, i) => s + Number(i.disponible), 0)
    : null;
  const totalOnus    = inventario?.onus?.length ?? null;

  return (
    <div style={{ ...S.tecCard, ...(expanded ? S.tecCardOpen : {}) }}>
      {/* Header siempre visible */}
      <button style={S.tecHeader} onClick={toggle}>
        <div style={S.tecAvatar}>{tecnico.nombre.charAt(0)}</div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{tecnico.nombre}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            {tecnico.email ?? ""}
          </div>
        </div>

        {/* Stats rápidos */}
        <div style={S.quickStats}>
          <div style={S.quickStat}>
            <Icon d={IC.check} size={13} color="var(--success, #059669)" />
            <span style={{ color: "var(--success, #059669)", fontWeight: 700 }}>
              {totalOrdenes ?? "—"}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>hoy</span>
          </div>
          <div style={S.quickStat}>
            <Icon d={IC.box} size={13} color="var(--primary, #2563eb)" />
            <span style={{ color: "var(--primary, #2563eb)", fontWeight: 700 }}>
              {totalItems ?? "—"}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>items</span>
          </div>
          {(totalOnus === null || totalOnus > 0) && (
            <div style={S.quickStat}>
              <Icon d={IC.onu} size={13} color="var(--ctrl, #7c3aed)" />
              <span style={{ color: "var(--ctrl, #7c3aed)", fontWeight: 700 }}>
                {totalOnus ?? "—"}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>ONUs</span>
            </div>
          )}
        </div>

        <div style={{ ...S.chevron, ...(expanded ? S.chevronOpen : {}) }}>
          <Icon d={IC.chevron} size={18} color="var(--text-muted)" />
        </div>
      </button>

      {/* Contenido expandido */}
      {expanded && (
        <div style={S.tecBody}>
          {loading ? (
            <div style={S.loadingRow}>
              <span style={S.spinner} />
              Cargando datos del técnico...
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div style={S.tabs}>
                <button
                  style={{ ...S.tabBtn, ...(tab === "actividad" ? S.tabBtnActive : {}) }}
                  onClick={() => setTab("actividad")}
                >
                  <Icon d={IC.check} size={13} color={tab === "actividad" ? "var(--primary)" : "var(--text-muted)"} />
                  Actividad de hoy ({actividad?.length ?? 0})
                </button>
                <button
                  style={{ ...S.tabBtn, ...(tab === "inventario" ? S.tabBtnActive : {}) }}
                  onClick={() => setTab("inventario")}
                >
                  <Icon d={IC.box} size={13} color={tab === "inventario" ? "var(--primary)" : "var(--text-muted)"} />
                  Inventario actual
                </button>
              </div>

              {/* Tab: Actividad */}
              {tab === "actividad" && (
                <div style={S.tabContent}>
                  {actividad?.length === 0 ? (
                    <div style={S.empty}>
                      <Icon d={IC.clock} size={28} color="var(--text-muted)" />
                      <span>Sin órdenes completadas hoy</span>
                    </div>
                  ) : (
                    actividad.map((o, i) => <OrdenCard key={i} orden={o} />)
                  )}
                </div>
              )}

              {/* Tab: Inventario */}
              {tab === "inventario" && (
                <div style={S.tabContent}>
                  {/* Items normales */}
                  {inventario?.items?.length > 0 ? (
                    <table style={S.invTable}>
                      <thead>
                        <tr>
                          <th style={S.th}>Producto</th>
                          <th style={{ ...S.th, textAlign: "right" }}>Disponible</th>
                          <th style={{ ...S.th, color: "var(--text-muted)" }}>Unidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventario.items.map((item, i) => (
                          <tr key={i} style={i % 2 === 0 ? {} : { background: "var(--surface-alt, rgba(0,0,0,.02))" }}>
                            <td style={S.td}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <Icon d={IC.package} size={13} color="var(--text-muted)" />
                                <span style={{ fontWeight: 600, fontSize: 13 }}>{item.nombre}</span>
                              </div>
                            </td>
                            <td style={{ ...S.td, textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums",
                              color: item.disponible === 0 ? "var(--danger)" : "var(--success)" }}>
                              {item.disponible}
                              {item.es_medible && item.metros_por_unidad && (
                                <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>m</span>
                              )}
                            </td>
                            <td style={{ ...S.td, color: "var(--text-muted)", fontSize: 12 }}>
                              {item.unidad ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={S.empty}>
                      <Icon d={IC.box} size={28} color="var(--text-muted)" />
                      <span>Sin material asignado</span>
                    </div>
                  )}

                  {/* ONUs asignadas */}
                  {inventario?.onus?.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={S.sectionLabel}>
                        <Icon d={IC.onu} size={13} color="var(--ctrl, #7c3aed)" />
                        ONUs asignadas ({inventario.onus.length})
                      </div>
                      <div style={S.onuGrid}>
                        {inventario.onus.map((onu, i) => (
                          <div key={i} style={S.onuChip}>
                            <Icon d={IC.wifi} size={12} color="var(--ctrl, #7c3aed)" />
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>
                                {onu.codigo_pon}
                              </div>
                              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{onu.modelo}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function CtrlAuditoria() {
  const [tecnicos, setTecnicos] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    stockService.getStats()
      .then(data => { setTecnicos(data.misTecnicos); setLoading(false); })
      .catch(() => { setError("No se pudieron cargar los técnicos"); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando técnicos...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {tecnicos.length === 0 ? (
        <div style={{ ...S.empty, padding: 48 }}>
          <Icon d={IC.user} size={36} color="var(--text-muted)" />
          <span>No hay técnicos registrados en esta sede</span>
        </div>
      ) : (
        tecnicos.map(t => <TecnicoCard key={t.id} tecnico={t} />)
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const S = {
  tecCard: {
    background: "var(--card-bg, #fff)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    overflow: "hidden",
    transition: "box-shadow .15s",
  },
  tecCardOpen: {
    boxShadow: "0 4px 16px rgba(0,0,0,.07)",
  },
  tecHeader: {
    width: "100%", display: "flex", alignItems: "center", gap: 12,
    padding: "14px 18px", background: "none", border: "none",
    cursor: "pointer", textAlign: "left",
  },
  tecAvatar: {
    width: 38, height: 38, borderRadius: "50%",
    background: "var(--ctrl-light, #ede9fe)", color: "var(--ctrl, #7c3aed)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 15, fontWeight: 800, flexShrink: 0,
  },
  quickStats: {
    display: "flex", gap: 16, marginRight: 8,
  },
  quickStat: {
    display: "flex", alignItems: "center", gap: 4,
    fontSize: 13,
  },
  chevron: {
    transition: "transform .2s",
    flexShrink: 0,
  },
  chevronOpen: {
    transform: "rotate(180deg)",
  },
  tecBody: {
    borderTop: "1px solid var(--border)",
    padding: "0 18px 16px",
  },
  tabs: {
    display: "flex", gap: 4, padding: "12px 0 8px",
    borderBottom: "1px solid var(--border)",
    marginBottom: 12,
  },
  tabBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "5px 12px", borderRadius: 6,
    border: "none", background: "none",
    cursor: "pointer", fontSize: 12, fontWeight: 600,
    color: "var(--text-muted)",
    transition: "background .15s, color .15s",
  },
  tabBtnActive: {
    background: "var(--primary-light, #eff6ff)",
    color: "var(--primary, #2563eb)",
  },
  tabContent: {
    minHeight: 60,
  },
  loadingRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "20px 0", color: "var(--text-muted)", fontSize: 13,
  },
  spinner: {
    display: "inline-block", width: 16, height: 16,
    border: "2px solid var(--border)",
    borderTopColor: "var(--primary, #2563eb)",
    borderRadius: "50%",
    animation: "spin .7s linear infinite",
  },
  empty: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 8, padding: "28px 0",
    color: "var(--text-muted)", fontSize: 13,
  },
  // Orden card
  ordenCard: {
    background: "var(--surface-alt, #f9fafb)",
    border: "1px solid var(--border)",
    borderRadius: 8, padding: "10px 14px",
    marginBottom: 8,
  },
  ordenHeader: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: 8, flexWrap: "wrap",
  },
  materialesWrap: {
    display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8,
  },
  materialChip: {
    display: "inline-flex", alignItems: "center", gap: 4,
    background: "var(--card-bg, #fff)",
    border: "1px solid var(--border)",
    borderRadius: 6, padding: "2px 8px",
    fontSize: 11, color: "var(--text-secondary)",
  },
  // Inventario table
  invTable: {
    width: "100%", borderCollapse: "collapse", fontSize: 13,
  },
  th: {
    padding: "6px 10px", textAlign: "left",
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.05em", color: "var(--text-muted)",
    borderBottom: "1px solid var(--border)",
  },
  td: {
    padding: "7px 10px",
    borderBottom: "1px solid var(--border)",
  },
  sectionLabel: {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 12, fontWeight: 700, color: "var(--ctrl, #7c3aed)",
    textTransform: "uppercase", letterSpacing: "0.05em",
    marginBottom: 8,
  },
  onuGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 6,
  },
  onuChip: {
    display: "flex", alignItems: "center", gap: 8,
    background: "var(--ctrl-light, #ede9fe)",
    border: "1px solid var(--ctrl-border, #ddd6fe)",
    borderRadius: 8, padding: "6px 10px",
  },
};