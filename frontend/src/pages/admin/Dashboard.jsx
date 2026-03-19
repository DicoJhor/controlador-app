import { useState, useEffect } from "react";
import StatCard from "../../components/ui/StatCard";
import { Badge } from "../../components/ui/Badge";
import { formatDate, formatNumber } from "../../utils/formatters";
import dashboardService from "../../services/dashboardService";

function Icon({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const IC = {
  alert:   "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
  chevron: "M6 9l6 6 6-6",
};

function StockBajoPanel({ items }) {
  const [expandido, setExpandido] = useState(false);
  const criticos = items.filter(i => i.stock === 0);
  const bajos    = items.filter(i => i.stock > 0);

  const porSede = items.reduce((acc, item) => {
    const key = item.sede ?? "Sin sede";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div style={{
      background: "#FFF5F5",
      border: "1px solid #FED7D7",
      borderLeft: "4px solid var(--danger)",
      borderRadius: 10,
      marginBottom: 24,
      overflow: "hidden",
    }}>
      {/* Cabecera */}
      <div
        onClick={() => setExpandido(e => !e)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "#FED7D7", display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon d={IC.alert} size={16} color="var(--danger)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#C53030" }}>
              {items.length} producto(s) con stock bajo mínimo en {Object.keys(porSede).length} sede(s)
            </div>
            <div style={{ fontSize: 12, color: "#E53E3E", marginTop: 2 }}>
              {criticos.length > 0 && (
                <span style={{ fontWeight: 600 }}>⚠ {criticos.length} sin stock ·&nbsp;</span>
              )}
              {bajos.length} por debajo del mínimo — clic para ver detalle
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {criticos.length > 0 && (
            <span style={{
              background: "var(--danger)", color: "white",
              fontSize: 11, fontWeight: 700,
              padding: "2px 10px", borderRadius: 20,
            }}>
              {criticos.length} SIN STOCK
            </span>
          )}
          <span style={{
            background: "#FED7D7", color: "#C53030",
            fontSize: 11, fontWeight: 700,
            padding: "2px 10px", borderRadius: 20,
          }}>
            {bajos.length} BAJO MÍNIMO
          </span>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
            stroke="#C53030" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: "transform .2s", transform: expandido ? "rotate(180deg)" : "rotate(0deg)" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Detalle expandible agrupado por sede */}
      {expandido && (
        <div style={{ borderTop: "1px solid #FED7D7" }}>
          {Object.entries(porSede).map(([sede, productos]) => {
            const criticosSede = productos.filter(i => i.stock === 0);
            return (
              <div key={sede} style={{ borderBottom: "1px solid #FED7D7" }}>
                {/* Header sede */}
                <div style={{
                  padding: "8px 20px", background: "#FFF0F0",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                    stroke="#C53030" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#C53030", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {sede}
                  </span>
                  <span style={{ fontSize: 11, color: "#E53E3E" }}>
                    — {productos.length} producto(s)
                  </span>
                  {criticosSede.length > 0 && (
                    <span style={{
                      background: "var(--danger)", color: "white",
                      fontSize: 10, fontWeight: 700,
                      padding: "1px 6px", borderRadius: 10, marginLeft: 4,
                    }}>
                      {criticosSede.length} sin stock
                    </span>
                  )}
                </div>

                {/* Productos de esta sede */}
                <div style={{ padding: "10px 20px 12px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {productos.map((item, i) => {
                    const sinStock = item.stock === 0;
                    const pct      = sinStock ? 0 : Math.round((item.stock / item.minimo) * 100);
                    return (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        background: "white",
                        border: `1px solid ${sinStock ? "#FEB2B2" : "#FED7D7"}`,
                        borderRadius: 8, padding: "6px 12px", fontSize: 13,
                      }}>
                        <span style={{ fontWeight: 600 }}>{item.nombre}</span>
                        {sinStock ? (
                          <span style={{
                            background: "var(--danger)", color: "white",
                            fontSize: 10, fontWeight: 700,
                            padding: "1px 6px", borderRadius: 10,
                          }}>
                            0 / {item.minimo} mín.
                          </span>
                        ) : (
                          <>
                            <span style={{ color: "#E53E3E", fontWeight: 600 }}>{item.stock}</span>
                            <span style={{ color: "#A0AEC0", fontSize: 11 }}>/ {item.minimo} mín. ({pct}%)</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    dashboardService.getStats()
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => { setError("No se pudieron cargar las estadísticas"); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando dashboard...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Sedes activas"
          value={stats.sedes}
          icon="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          iconColor="#1A56DB"
          iconBg="#EFF6FF"
          change="Sedes operativas"
          changeType="neutral"
        />
        <StatCard
          label="Total usuarios"
          value={stats.usuarios}
          icon="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75"
          iconColor="#7C3AED"
          iconBg="#F5F3FF"
          change="Usuarios activos"
          changeType="up"
        />
        <StatCard
          label="Ítems en stock"
          value={formatNumber(stats.stockTotal)}
          icon="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"
          iconColor="#059669"
          iconBg="#ECFDF5"
          change="Stock total global"
          changeType="up"
        />
        <StatCard
          label="Movimientos hoy"
          value={stats.movimientosHoy}
          icon="M22 12h-4l-3 9L9 3l-3 9H2"
          iconColor="#D97706"
          iconBg="#FFFBEB"
          change="Entradas y salidas"
          changeType="neutral"
        />
      </div>

      {/* Panel stock bajo */}
      {stats.stockBajo?.length > 0 && (
        <StockBajoPanel items={stats.stockBajo} />
      )}

      <div className="grid-2">
        {/* Últimos movimientos */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Últimos movimientos</div>
              <div className="card-subtitle">Global — todas las sedes</div>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Ítem</th>
                  <th>Cant.</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {stats.movimientos.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>
                      Sin movimientos registrados
                    </td>
                  </tr>
                ) : stats.movimientos.map((m, i) => (
                  <tr key={i}>
                    <td className="text-sm text-muted">{formatDate(m.fecha)}</td>
                    <td>
                      <Badge variant={m.tipo === "entrada" ? "entrada" : "salida"}>
                        {m.tipo}
                      </Badge>
                    </td>
                    <td className="fw-600">{m.item}</td>
                    <td className="mono">{m.cantidad}</td>
                    <td className="text-sm">{m.usuario ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Estado por sede */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Estado por sede</div>
          </div>
          {stats.sedesEstado.length === 0 ? (
            <div style={{ padding: 24, color: "var(--text-muted)" }}>Sin sedes registradas</div>
          ) : stats.sedesEstado.map(s => (
            <div key={s.id} style={styles.sedeRow}>
              <div>
                <div className="fw-600" style={{ fontSize: 14 }}>{s.nombre}</div>
                <div className="text-sm text-muted">{s.tecnicos} técnico(s)</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{formatNumber(s.items)} ítems</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  sedeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 0",
    borderBottom: "1px solid var(--border)",
  },
};