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
  alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
};

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

      {/* Alerta stock bajo */}
      {stats.stockBajo.length > 0 && (
        <div className="alert alert-danger">
          <Icon d={IC.alert} size={15} color="var(--danger)" />
          <strong>{stats.stockBajo.length} producto(s) con stock bajo mínimo:&nbsp;</strong>
          {stats.stockBajo.map(i => `${i.nombre} (${i.stock}/${i.minimo})`).join(" · ")}
        </div>
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