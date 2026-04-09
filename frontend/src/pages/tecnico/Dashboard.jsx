import { useState, useEffect } from "react";
import StatCard from "../../components/ui/StatCard";
import { formatNumber } from "../../utils/formatters";
import tecnicoService from "../../services/tecnicoService";

function StockRow({ item }) {
  const esRollo = item.es_medible && item.metros_por_unidad;
  const pct   = item.asignado > 0 ? Math.round((item.usado / item.asignado) * 100) : 0;
  const color = pct >= 100 ? "var(--danger)" : pct >= 75 ? "var(--warning)" : "var(--primary)";
  return (
    <tr>
      <td><span className="mono">{item.codigo ?? "—"}</span></td>
      <td>
        <div className="fw-600">{item.nombre}</div>
        {esRollo ? (
          <div className="text-sm text-muted">
            {item.asignado_unidades} rollo{item.asignado_unidades !==1 ? "s" : ""}
            &nbsp;·&nbsp;{item.metros_por_unidad} m/rollo
          </div>
        ) : (
          <div className="text-sm text-muted">{item.unidad}</div>
        )}
      </td>
      <td className="mono">
        {formatNumber(item.asignado)}
        {esRollo && <span className="text-sm text-muted"> m</span>}
        </td>
      <td className="mono" style={{ color: "var(--warning)", fontWeight: 600 }}>
        {formatNumber(item.usado)}
        {esRollo && <span className="text-sm text-muted"> m</span>}
      </td>
      <td className="mono fw-600" style={{ color: item.disponible === 0 ? "var(--danger)" : "var(--success)" }}>
        {formatNumber(item.disponible)}
        {esRollo && <span className="text-sm text-muted"> m</span>}
      </td>
      <td style={{ width: 140 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="progress-bar" style={{ flex: 1 }}>
            <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
          </div>
          <span className="text-sm text-muted" style={{ minWidth: 32, textAlign: "right" }}>{pct}%</span>
        </div>
      </td>
    </tr>
  );
}

export default function TecDashboard() {
  const [inventario, setInventario] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    tecnicoService.getMiInventario()
      .then(data => { setInventario(data); setLoading(false); })
      .catch(() => { setError("No se pudo cargar el inventario"); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando inventario...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  const totalAsignado   = inventario.reduce((a, i) => a + i.asignado_unidades, 0);
  const totalUsado      = inventario.reduce((a, i) => a + (i.es_medible ? 0 : i.usado), 0);
  const totalDisponible = inventario.reduce((a, i) => a + (i.es_medible ? i.asignado_unidades : i.disponible), 0);
  const sinStock        = inventario.filter(i => i.disponible === 0);

  return (
    <div>
      <div className="stats-grid-3">
        <StatCard
          label="Ítems asignados"
          value={formatNumber(totalAsignado)}
          icon="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12"
          iconColor="#059669" iconBg="#ECFDF5"
        />
        <StatCard
          label="Ítems utilizados"
          value={formatNumber(totalUsado)}
          icon="M19 12H5 M12 19l-7-7 7-7"
          iconColor="#D97706" iconBg="#FFFBEB"
          change={totalAsignado > 0 ? `${Math.round((totalUsado / totalAsignado) * 100)}% del total asignado` : ""}
          changeType="neutral"
        />
        <StatCard
          label="Disponibles"
          value={formatNumber(totalDisponible)}
          icon="M20 6L9 17l-5-5"
          iconColor="#1A56DB" iconBg="#EFF6FF"
          change={sinStock.length > 0 ? `${sinStock.length} ítem(s) sin stock` : "Todo disponible"}
          changeType={sinStock.length > 0 ? "down" : "up"}
        />
      </div>

      {sinStock.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 24 }}>
          <strong>Sin stock disponible:&nbsp;</strong>
          {sinStock.map(i => i.nombre).join(", ")}. Contactá a tu controlador.
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Mi inventario asignado</div>
            <div className="card-subtitle">Materiales asignados por tu controlador</div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th><th>Ítem</th><th>Asignado</th>
                <th>Usado</th><th>Disponible</th><th>Uso</th>
              </tr>
            </thead>
            <tbody>
              {inventario.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    Sin ítems asignados aún
                  </td>
                </tr>
              ) : inventario.map(item => <StockRow key={item.id} item={item} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}