import { useState, useEffect } from "react";
import StatCard from "../../components/ui/StatCard";
import { formatNumber } from "../../utils/formatters";
import tecnicoService from "../../services/tecnicoService";
import recojosService from "../../services/recojosService";
import { db } from "../../db/localDB";

function Icon({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

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
            {item.asignado_unidades} rollo{item.asignado_unidades !== 1 ? "s" : ""}
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
  const [inventario,    setInventario]    = useState([]);
  const [onus,          setOnus]          = useState([]);   // ← NUEVO
  const [recuperados,   setRecuperados]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [loadingRec,    setLoadingRec]    = useState(true);
  const [error,         setError]         = useState(null);
  const [enviando,      setEnviando]      = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        if (navigator.onLine) {
          const data = await tecnicoService.getMiInventario();
          // ── FIX: el backend retorna { inventario, onus } ──────────────
          const items = data.inventario ?? data;
          const onusDisp = data.onus ?? [];
          setInventario(items);
          setOnus(onusDisp);                  // ← NUEVO
          await db.inventario.clear();
          await db.inventario.bulkPut(items);
        } else {
          const data = await db.inventario.toArray();
          setInventario(data);
        }
      } catch {
        const data = await db.inventario.toArray();
        setInventario(data);
        if (data.length === 0) setError("No se pudo cargar el inventario");
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  useEffect(() => {
    if (!navigator.onLine) { setLoadingRec(false); return; }
    recojosService.getMisRecuperados()
      .then(data => setRecuperados(Array.isArray(data) ? data : []))
      .catch(() => setRecuperados([]))
      .finally(() => setLoadingRec(false));
  }, []);

  const handleEnviarASede = async (id) => {
    if (!confirm("¿Enviar este material a la sede para revisión?")) return;
    setEnviando(id);
    try {
      await recojosService.enviarASede(id);
      setRecuperados(prev => prev.filter(r => r.id !== id));
      await db.recuperados.delete(id);
    } catch (err) {
      alert(err.message);
    } finally {
      setEnviando(null);
    }
  };

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando inventario...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  const totalAsignado   = inventario.reduce((a, i) => a + i.asignado_unidades, 0);
  const totalUsado      = inventario.reduce((a, i) => a + (i.es_medible ? 0 : i.usado), 0);
  const totalDisponible = inventario.reduce((a, i) => a + (i.es_medible ? i.asignado_unidades : i.disponible), 0);
  const sinStock        = inventario.filter(i => i.disponible === 0);

  // ── Agrupar ONUs disponibles por producto ──────────────────────────────
  const onusAgrupadas = onus.reduce((acc, o) => {
    const key = o.producto_id;
    if (!acc[key]) acc[key] = { producto_id: key, nombre: o.nombre, codigo: o.codigo_producto, cantidad: 0, pons: [] };
    acc[key].cantidad++;
    acc[key].pons.push(o.codigo_pon);
    return acc;
  }, {});

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
          value={formatNumber(totalDisponible + onus.length)}
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

      {/* ── Inventario asignado ── */}
      <div className="card" style={{ marginBottom: 24 }}>
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

      {/* ── ONUs disponibles ── */}
      {onus.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"
                  size={16} color="#1A56DB" />
                ONUs disponibles
              </div>
              <div className="card-subtitle">
                ONUs con código PON asignado listas para usar
              </div>
            </div>
            <span style={{
              background: "#EFF6FF", color: "#1A56DB",
              padding: "3px 10px", borderRadius: 20,
              fontSize: 12, fontWeight: 700,
            }}>
              {onus.length} disponible{onus.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código producto</th>
                  <th>Nombre</th>
                  <th>Cantidad</th>
                  <th>Códigos PON</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(onusAgrupadas).map(g => (
                  <tr key={g.producto_id}>
                    <td><span className="mono">{g.codigo ?? "—"}</span></td>
                    <td><div className="fw-600">{g.nombre}</div></td>
                    <td>
                      <span className="mono fw-600" style={{ color: "var(--success)" }}>
                        {g.cantidad}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {g.pons.map(pon => (
                          <span key={pon} className="mono" style={{
                            fontSize: 11, background: "var(--bg-subtle, #f1f5f9)",
                            padding: "2px 6px", borderRadius: 4, fontWeight: 600,
                          }}>
                            {pon}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Materiales recuperados ── */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon d="M4 2v6h6 M20 22v-6h-6 M20 11A8 8 0 004.93 7.1 M4 13a8 8 0 0015.07 3.9"
                size={16} color="#7c3aed" />
              Materiales recuperados
            </div>
            <div className="card-subtitle">
              Equipos que recogiste y aún tenés en tu poder — podés usarlos o enviarlos a la sede
            </div>
          </div>
          {recuperados.length > 0 && (
            <span style={{
              background: "#ede9fe", color: "#6d28d9",
              padding: "3px 10px", borderRadius: 20,
              fontSize: 12, fontWeight: 700,
            }}>
              {recuperados.length} en mano
            </span>
          )}
        </div>

        {loadingRec ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Cargando materiales recuperados...
          </div>
        ) : recuperados.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            No tenés materiales recuperados en tu poder
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Producto</th>
                  <th>PON / Serie</th>
                  <th>Cliente origen</th>
                  <th>Recojo</th>
                  <th>Fecha</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {recuperados.map(r => (
                  <tr key={r.id}>
                    <td>
                      <span className="badge badge-purple">{r.tipo_equipo || "—"}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        {r.producto_nombre || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Sin identificar</span>}
                      </span>
                    </td>
                    <td>
                      {r.codigo_pon
                        ? <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{r.codigo_pon}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <span style={{ fontSize: 13 }}>{r.cliente || "—"}</span>
                      {r.direccion && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.direccion}</div>
                      )}
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 12, color: "var(--primary)" }}>
                        {r.recojo_codigo || "—"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {r.created_at ? new Date(r.created_at).toLocaleDateString("es-PE", {
                          day: "2-digit", month: "short", year: "numeric"
                        }) : "—"}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleEnviarASede(r.id)}
                        disabled={enviando === r.id}
                        style={{
                          padding: "5px 12px", borderRadius: 7, fontSize: 12,
                          fontWeight: 600, cursor: "pointer", border: "1px solid #d8b4fe",
                          background: enviando === r.id ? "#f3f4f6" : "#ede9fe",
                          color: "#6d28d9",
                          opacity: enviando === r.id ? 0.6 : 1,
                          display: "flex", alignItems: "center", gap: 5,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Icon
                          d="M4 2v6h6 M20 22v-6h-6 M20 11A8 8 0 004.93 7.1 M4 13a8 8 0 0015.07 3.9"
                          size={12} color="#6d28d9"
                        />
                        {enviando === r.id ? "Enviando..." : "Enviar a sede"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
