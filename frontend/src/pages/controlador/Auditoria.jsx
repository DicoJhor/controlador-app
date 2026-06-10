import { useState, useEffect } from "react";
import { formatDate } from "../../utils/formatters";
import stockService from "../../services/stockService";
import { useAuth } from "../../hooks/useAuth";

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
  chevron:  "M6 9l6 6 6-6",
  box:      "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  check:    "M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  wrench:   "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  zap:      "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  package:  "M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
  wifi:     "M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01",
  clock:    "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 6v6l4 2",
  user:     "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  empty:    "M9 17H7A5 5 0 017 7h2 M15 7h2a5 5 0 010 10h-2 M8 12h8",
  onu:      "M2 20h20M4 20V10l8-8 8 8v10M9 20v-5h6v5",
  send:     "M22 2L11 13 M22 2L15 22l-4-9-9-4 22-7z",
  list:     "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  filter:   "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  calendar: "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18",
  truck:    "M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
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
// ── Helpers de fecha ───────────────────────────────────────────────────────
const hoy      = () => new Date().toISOString().split("T")[0];
const hace7dias = () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split("T")[0]; };
const fmtFecha = (str) => {
  if (!str) return "—";
  const [y, m, d] = str.split("T")[0].split("-");
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtHora  = (str) => !str ? "" : new Date(str).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

// ── Badge estado envío ─────────────────────────────────────────────────────
function EstadoEnvioBadge({ estado }) {
  const cfg = {
    pendiente: { label: "En tránsito", bg: "#fef3c7", color: "#d97706" },
    recibido:  { label: "Recibido",    bg: "#d1fae5", color: "#059669" },
    cancelado: { label: "Cancelado",   bg: "#fee2e2", color: "#dc2626" },
  }[estado] ?? { label: estado, bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>
      {cfg.label}
    </span>
  );
}

// ── Panel Asignaciones ─────────────────────────────────────────────────────
function PanelAsignaciones({ tecnicos }) {
  const [asignaciones, setAsignaciones] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filtroTec,    setFiltroTec]    = useState("");
  const [filtroDesde,  setFiltroDesde]  = useState(hace7dias());
  const [filtroHasta,  setFiltroHasta]  = useState(hoy());
  const [expandido,    setExpandido]    = useState(null);

  useEffect(() => { cargar(); }, [filtroTec, filtroDesde, filtroHasta]);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await stockService.getAsignaciones({
        tecnico_id: filtroTec  || undefined,
        desde:      filtroDesde || undefined,
        hasta:      filtroHasta || undefined,
      });
      setAsignaciones(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={S.filtrosBar}>
        <div style={S.filtroGroup}>
          <Icon d={IC.user} size={14} color="var(--text-muted)" />
          <select style={S.filtroSelect} value={filtroTec} onChange={e => setFiltroTec(e.target.value)}>
            <option value="">Todos los técnicos</option>
            {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
        <div style={S.filtroGroup}>
          <Icon d={IC.calendar} size={14} color="var(--text-muted)" />
          <input type="date" style={S.filtroInput} value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} />
        </div>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>hasta</span>
        <input type="date" style={S.filtroInput} value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} />
        <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
          {!loading && `${asignaciones.length} registro${asignaciones.length !== 1 ? "s" : ""}`}
        </div>
      </div>

      {loading ? (
        <div style={S.loadingRow}><span style={S.spinner} />Cargando asignaciones...</div>
      ) : asignaciones.length === 0 ? (
        <div style={S.empty}>
          <Icon d={IC.list} size={32} color="var(--text-muted)" />
          <span>Sin asignaciones en el período seleccionado</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {asignaciones.map((asig, idx) => {
            const abierto = expandido === idx;
            return (
              <div key={idx} style={{ ...S.tecCard, ...(abierto ? S.tecCardOpen : {}) }}>
                <button style={S.tecHeader} onClick={() => setExpandido(abierto ? null : idx)}>
                  <div style={{ minWidth: 90, flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{fmtFecha(asig.fecha)}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmtHora(asig.fecha)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                    <div style={{ ...S.tecAvatar, width: 30, height: 30, fontSize: 12 }}>
                      {asig.tecnico_nombre?.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{asig.tecnico_nombre ?? "—"}</div>
                      {asig.comentario && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {asig.comentario}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={S.countPill}>
                      <Icon d={IC.package} size={11} color="var(--primary, #2563eb)" />
                      {asig.items?.length ?? 0} ítem{(asig.items?.length ?? 0) !== 1 ? "s" : ""}
                    </span>
                    {asig.onus?.length > 0 && (
                      <span style={{ ...S.countPill, background: "#ede9fe", color: "#7c3aed" }}>
                        <Icon d={IC.onu} size={11} color="#7c3aed" />
                        {asig.onus.length} ONU{asig.onus.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div style={{ transition: "transform .2s", transform: abierto ? "rotate(180deg)" : "none" }}>
                    <Icon d={IC.chevron} size={16} color="var(--text-muted)" />
                  </div>
                </button>

                {abierto && (
                  <div style={{ padding: "0 18px 14px", borderTop: "1px solid var(--border)" }}>
                    {asig.items?.length > 0 && (
                      <table style={{ ...S.invTable, marginTop: 12 }}>
                        <thead>
                          <tr>
                            <th style={S.th}>Producto</th>
                            <th style={{ ...S.th, textAlign: "right" }}>Cantidad</th>
                            <th style={S.th}>Unidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {asig.items.map((item, i) => (
                            <tr key={i} style={i % 2 === 0 ? {} : { background: "rgba(0,0,0,.02)" }}>
                              <td style={S.td}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <Icon d={IC.package} size={12} color="var(--text-muted)" />
                                  <span style={{ fontWeight: 600, fontSize: 13 }}>{item.nombre}</span>
                                  {item.codigo && <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{item.codigo}</span>}
                                </div>
                              </td>
                              <td style={{ ...S.td, textAlign: "right", fontWeight: 700 }}>{item.cantidad}</td>
                              <td style={{ ...S.td, color: "var(--text-muted)", fontSize: 12 }}>{item.unidad ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {asig.onus?.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={S.sectionLabel}>
                          <Icon d={IC.onu} size={13} color="#7c3aed" />
                          ONUs asignadas ({asig.onus.length})
                        </div>
                        <div style={S.onuGrid}>
                          {asig.onus.map((onu, i) => (
                            <div key={i} style={S.onuChip}>
                              <Icon d={IC.wifi} size={12} color="#7c3aed" />
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{onu.codigo_pon ?? `ONU #${onu.id}`}</div>
                                {onu.modelo && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{onu.modelo}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Panel Envíos ───────────────────────────────────────────────────────────
function PanelEnvios({ sedeId }) {
  const [envios,       setEnvios]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [sedes,        setSedes]        = useState([]);
  const [filtroSede,   setFiltroSede]   = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDesde,  setFiltroDesde]  = useState(hace7dias());
  const [filtroHasta,  setFiltroHasta]  = useState(hoy());
  const [expandido,    setExpandido]    = useState(null);

  useEffect(() => {
    import("../../services/sedesService").then(m =>
      m.default.getAll().then(all => setSedes(all.filter(s => s.id !== sedeId))).catch(() => {})
    );
  }, []);

  useEffect(() => { cargar(); }, [filtroSede, filtroEstado, filtroDesde, filtroHasta]);

  const cargar = async () => {
    setLoading(true);
    try {
      const { default: enviosService } = await import("../../services/enviosService");
      const data = await enviosService.getAll({
        sede_destino_id: filtroSede   || undefined,
        estado:          filtroEstado || undefined,
        desde:           filtroDesde  || undefined,
        hasta:           filtroHasta  || undefined,
      });
      console.log("envios:", data); // 👈 agrega aquí
      setEnvios(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const enTransito = envios.filter(e => e.estado === "pendiente").length;
  const recibidos  = envios.filter(e => e.estado === "recibido").length;

  return (
    <div>
      {!loading && envios.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          {[
            { label: "En tránsito", valor: enTransito, color: "#d97706", icon: IC.truck },
            { label: "Recibidos",   valor: recibidos,  color: "#059669", icon: IC.check },
            { label: "Total",       valor: envios.length, color: "var(--primary, #2563eb)", icon: IC.send },
          ].map(k => (
            <div key={k.label} style={{ display: "flex", alignItems: "center", gap: 12,
              padding: "12px 18px", background: "var(--card-bg, #fff)",
              border: "1px solid var(--border)", borderRadius: 10, flex: "1 1 130px" }}>
              <Icon d={k.icon} size={18} color={k.color} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.valor}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...S.filtrosBar, flexWrap: "wrap" }}>
        <div style={S.filtroGroup}>
          <Icon d={IC.send} size={14} color="var(--text-muted)" />
          <select style={S.filtroSelect} value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
            <option value="">Todas las sedes</option>
            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div style={S.filtroGroup}>
          <Icon d={IC.filter} size={14} color="var(--text-muted)" />
          <select style={S.filtroSelect} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pendiente">En tránsito</option>
            <option value="recibido">Recibido</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div style={S.filtroGroup}>
          <Icon d={IC.calendar} size={14} color="var(--text-muted)" />
          <input type="date" style={S.filtroInput} value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} />
        </div>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>hasta</span>
        <input type="date" style={S.filtroInput} value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} />
        <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
          {!loading && `${envios.length} envío${envios.length !== 1 ? "s" : ""}`}
        </div>
      </div>

      {loading ? (
        <div style={S.loadingRow}><span style={S.spinner} />Cargando envíos...</div>
      ) : envios.length === 0 ? (
        <div style={S.empty}>
          <Icon d={IC.truck} size={32} color="var(--text-muted)" />
          <span>Sin envíos en el período seleccionado</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(() => {
            let ultimaFecha = null;
            return envios.map((envio, idx) => {
              const fechaDia = envio.fecha_envio?.split("T")[0] ?? "";
              const esFechaNueva = fechaDia !== ultimaFecha;
              ultimaFecha = fechaDia;
              const [y, m, d] = fechaDia.split("-");
              const labelFecha = fechaDia
                ? new Date(Number(y), Number(m) - 1, Number(d))
                    .toLocaleDateString("es-PE", { weekday: "long", day: "2-digit", month: "long" })
                : "";
              const abierto = expandido === idx;
              return (
                <div key={envio.id ?? idx}>
                  {esFechaNueva && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10,
                      margin: idx === 0 ? "0 0 10px" : "16px 0 10px",
                    }}>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                        textTransform: "capitalize", letterSpacing: "0.04em",
                        padding: "2px 10px", background: "var(--hover, #f1f5f9)",
                        borderRadius: 20, border: "1px solid var(--border)",
                      }}>
                        {labelFecha}
                      </span>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>
                  )}
                  <div style={{ ...S.tecCard, ...(abierto ? S.tecCardOpen : {}) }}>
                <button style={S.tecHeader} onClick={() => setExpandido(abierto ? null : idx)}>
                  <div style={{ minWidth: 110, flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{fmtFecha(envio.fecha_envio)}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{envio.guia ?? "—"}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                    <div style={{ ...S.tecAvatar, width: 30, height: 30, fontSize: 12, background: "#e0f2fe", color: "#0369a1" }}>
                      {envio.sede_destino_nombre?.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{envio.sede_destino_nombre ?? envio.sede_nombre ?? "—"}</div>
                      {envio.comentario && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {envio.comentario}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <EstadoEnvioBadge estado={envio.estado ?? "pendiente"} />
                    <span style={S.countPill}>
                      <Icon d={IC.package} size={11} color="var(--primary, #2563eb)" />
                      {envio.productos?.length ?? 0} ítem{(envio.productos?.length ?? 0) !== 1 ? "s" : ""}
                    </span>
                    {envio.onus?.length > 0 && (
                      <span style={{ ...S.countPill, background: "#ede9fe", color: "#7c3aed" }}>
                        <Icon d={IC.onu} size={11} color="#7c3aed" />
                        {envio.onus.length} ONU{envio.onus.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div style={{ transition: "transform .2s", transform: abierto ? "rotate(180deg)" : "none" }}>
                    <Icon d={IC.chevron} size={16} color="var(--text-muted)" />
                  </div>
                </button>

                {abierto && (
                  <div style={{ padding: "0 18px 14px", borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", gap: 24, padding: "10px 0", borderBottom: "1px solid var(--border)", marginBottom: 10, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Guía</div>
                        <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 600 }}>{envio.guia ?? "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Fecha envío</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtFecha(envio.fecha_envio)}</div>
                      </div>
                      {envio.fecha_recepcion && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Recibido</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#059669" }}>{fmtFecha(envio.fecha_recepcion)}</div>
                        </div>
                      )}
                      {envio.comentario && (
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Comentario</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>{envio.comentario}</div>
                        </div>
                      )}
                    </div>
                    {envio.productos?.length > 0 && (
                      <table style={S.invTable}>
                        <thead>
                          <tr>
                            <th style={S.th}>Producto</th>
                            <th style={{ ...S.th, textAlign: "right" }}>Cantidad</th>
                            <th style={S.th}>Unidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {envio.productos.map((p, i) => (
                            <tr key={i} style={i % 2 === 0 ? {} : { background: "rgba(0,0,0,.02)" }}>
                              <td style={S.td}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <Icon d={IC.package} size={12} color="var(--text-muted)" />
                                  <span style={{ fontWeight: 600, fontSize: 13 }}>{p.nombre}</span>
                                  {p.codigo && <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{p.codigo}</span>}
                                </div>
                              </td>
                              <td style={{ ...S.td, textAlign: "right", fontWeight: 700 }}>{p.cantidad}</td>
                              <td style={{ ...S.td, color: "var(--text-muted)", fontSize: 12 }}>{p.unidad ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {envio.onus?.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={S.sectionLabel}>
                          <Icon d={IC.onu} size={13} color="#7c3aed" />
                          ONUs enviadas ({envio.onus.length})
                        </div>
                        <div style={S.onuGrid}>
                          {envio.onus.map((onu, i) => (
                            <div key={i} style={S.onuChip}>
                              <Icon d={IC.wifi} size={12} color="#7c3aed" />
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{onu.codigo_pon ?? `ONU #${onu.id}`}</div>
                                {onu.modelo && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{onu.modelo}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        });
      })()}
        </div>
      )}
    </div>
  );
}

export default function CtrlAuditoria() {
  const { user }  = useAuth();
  const sedeId    = user?.sede_id;
  const [tecnicos,    setTecnicos]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [puedoEnviar, setPuedoEnviar] = useState(false);
  const [tab,         setTab]         = useState("tecnicos");

  useEffect(() => {
    Promise.all([
      stockService.getStats(),
      sedeId
        ? import("../../services/sedesService").then(m =>
            m.default.getAll().then(all => {
              const miSede = all.find(s => s.id === sedeId);
              setPuedoEnviar(miSede?.puede_enviar === 1 || sedeId === 2);
            }).catch(() => {})
          )
        : Promise.resolve(),
    ])
      .then(([data]) => { setTecnicos(data.misTecnicos); setLoading(false); })
      .catch(() => { setError("No se pudieron cargar los datos"); setLoading(false); });
  }, [sedeId]);

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  const tabs = [
    { key: "tecnicos",     label: "Técnicos",     icon: IC.user },
    { key: "asignaciones", label: "Asignaciones", icon: IC.list },
    ...(puedoEnviar ? [{ key: "envios", label: "Envíos", icon: IC.send }] : []),
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--hover, #f1f5f9)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500, transition: "all .15s",
              background: tab === t.key ? "white" : "transparent",
              color: tab === t.key ? "var(--text)" : "var(--text-muted)",
              boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,.1)" : "none",
            }}>
            <Icon d={t.icon} size={14} color={tab === t.key ? "var(--primary, #2563eb)" : "var(--text-muted)"} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "tecnicos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tecnicos.length === 0 ? (
            <div style={{ ...S.empty, padding: 48 }}>
              <Icon d={IC.user} size={36} color="var(--text-muted)" />
              <span>No hay técnicos registrados en esta sede</span>
            </div>
          ) : tecnicos.map(t => <TecnicoCard key={t.id} tecnico={t} />)}
        </div>
      )}
      {tab === "asignaciones" && <PanelAsignaciones tecnicos={tecnicos} />}
      {tab === "envios" && puedoEnviar && <PanelEnvios sedeId={sedeId} />}
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
  filtrosBar: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", background: "var(--hover, #f8fafc)",
    borderRadius: 10, border: "1px solid var(--border)",
    marginBottom: 14,
  },
  filtroGroup: {
    display: "flex", alignItems: "center", gap: 6,
  },
  filtroSelect: {
    padding: "5px 10px", borderRadius: 7, fontSize: 13,
    border: "1px solid var(--border)", background: "white",
    color: "var(--text)", cursor: "pointer", outline: "none",
  },
  filtroInput: {
    padding: "5px 10px", borderRadius: 7, fontSize: 13,
    border: "1px solid var(--border)", background: "white",
    color: "var(--text)", outline: "none",
  },
  countPill: {
    display: "inline-flex", alignItems: "center", gap: 4,
    background: "#eff6ff", color: "var(--primary, #2563eb)",
    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
  },
};