import { useState, useEffect } from "react";
import StatCard from "../../components/ui/StatCard";
import { Badge, MotivoBadge } from "../../components/ui/Badge";
import { formatDate, formatNumber } from "../../utils/formatters";
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
  alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
};

export default function CtrlDashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    stockService.getStats()
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => { setError("No se pudieron cargar las estadísticas"); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando dashboard...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <div className="stats-grid-3">
        <StatCard
          label="Técnicos en mi sede"
          value={stats.tecnicos}
          icon="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75"
          iconColor="#0891B2"
          iconBg="#ECFEFF"
          change="Técnicos activos"
          changeType="up"
        />
        <StatCard
          label="Ítems en sede"
          value={formatNumber(stats.itemsEnSede)}
          icon="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"
          iconColor="#059669"
          iconBg="#ECFDF5"
          change={stats.stockBajo.length > 0 ? `${stats.stockBajo.length} ítem(s) bajo mínimo` : "Stock OK"}
          changeType={stats.stockBajo.length > 0 ? "down" : "up"}
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

      {stats.stockBajo.length > 0 && (
        <div className="alert alert-warning">
          <Icon d={IC.alert} size={15} color="var(--warning)" />
          <strong>Stock bajo en tu sede:&nbsp;</strong>
          {stats.stockBajo.map(i => `${i.nombre} (${i.stock}/${i.minimo})`).join(" · ")}
        </div>
      )}

      <div className="grid-2">
        {/* Mis técnicos */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Mis técnicos</div>
              <div className="card-subtitle">Activos en tu sede</div>
            </div>
          </div>
          {stats.misTecnicos.length === 0 ? (
            <div style={{ padding: 24, color: "var(--text-muted)" }}>Sin técnicos asignados</div>
          ) : stats.misTecnicos.map(t => (
            <div key={t.id} style={styles.tecnicoRow}>
              <div style={styles.tecnicoLeft}>
                <div style={{
                  ...styles.avatar,
                  background: t.estado === 1 ? "var(--tech-light)" : "#F1F5F9",
                  color:      t.estado === 1 ? "var(--tech)"       : "var(--text-muted)",
                }}>
                  {t.nombre.charAt(0)}
                </div>
                <div>
                  <div className="fw-600" style={{ fontSize: 13.5 }}>{t.nombre}</div>
                  <div className="text-sm text-muted">{t.email}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <Badge variant={t.estado === 1 ? "active" : "inactive"}>
                  {t.estado === 1 ? "Activo" : "Inactivo"}
                </Badge>
                <div className="text-sm text-muted" style={{ marginTop: 3 }}>
                  {formatNumber(t.itemsAsignados)} ítems
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Últimas salidas */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Últimas salidas</div>
              <div className="card-subtitle">Registradas por vos</div>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ítem</th>
                  <th>Cant.</th>
                  <th>Técnico</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {stats.ultimasSalidas.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>
                      Sin salidas registradas
                    </td>
                  </tr>
                ) : stats.ultimasSalidas.map((m, i) => (
                  <tr key={i}>
                    <td className="fw-600" style={{ fontSize: 13 }}>{m.item}</td>
                    <td className="mono">{m.cantidad}</td>
                    <td className="text-sm">{m.tecnico}</td>
                    <td className="text-sm text-muted">{formatDate(m.fecha)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  tecnicoRow: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 0", borderBottom: "1px solid var(--border)",
  },
  tecnicoLeft: { display: "flex", alignItems: "center", gap: 10 },
  avatar: {
    width: 34, height: 34, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
};