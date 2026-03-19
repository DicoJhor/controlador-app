import { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { formatNumber } from "../../utils/formatters";
import { MOTIVOS_ENTRADA, MOTIVOS_SALIDA } from "../../utils/constants";
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
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  entry:  "M5 12h14 M12 5l7 7-7 7",
  exit:   "M19 12H5 M12 19l-7-7 7-7",
  alert:  "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
  check:  "M20 6L9 17l-5-5",
  plus:   "M12 5v14 M5 12h14",
  trash:  "M3 6h18 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
  ruler:  "M2 12h20 M12 2v20",
};

const emptyEntrada = { producto_id: "", cantidad: "", motivo: "", comentario: "" };
const emptySalida  = { tecnico_id: "", motivo: "", comentario: "", items: [] };
const emptyItem    = { producto_id: "", cantidad: "", metros: "" };

function StockBar({ stock, minimo }) {
  if (!minimo) return <span className="mono">{formatNumber(stock)}</span>;
  const max   = minimo * 3;
  const pct   = Math.min(100, Math.round((stock / max) * 100));
  const low   = stock <= minimo;
  const warn  = stock <= minimo * 1.5;
  const color = low ? "var(--danger)" : warn ? "var(--warning)" : "var(--success)";
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, color }}>{formatNumber(stock)}</div>
      <div className="progress-bar" style={{ width: 72, marginTop: 4 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function CtrlInventario() {
  const [stock,    setStock]    = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState("");
  const [modal,    setModal]    = useState(false);
  const [entrada,  setEntrada]  = useState(emptyEntrada);
  const [salida,   setSalida]   = useState(emptySalida);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState(null);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = () =>
    Promise.all([stockService.getStock(), stockService.getStats()])
      .then(([dataStock, dataStats]) => {
        setStock(dataStock);
        setTecnicos(dataStats.misTecnicos);
        setLoading(false);
      })
      .catch(() => { setError("No se pudo cargar el inventario"); setLoading(false); });

  const filtered = stock.filter(i =>
    i.producto.toLowerCase().includes(search.toLowerCase()) ||
    (i.codigo ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const lowCount = stock.filter(i => i.stock_minimo > 0 && i.cantidad <= i.stock_minimo).length;

  // ── Entrada ────────────────────────────────────────────────
  const handleEntrada = async () => {
    setSaving(true);
    try {
      await stockService.registrarEntrada({
        producto_id: Number(entrada.producto_id),
        cantidad:    Number(entrada.cantidad),
        motivo:      entrada.motivo,
        comentario:  entrada.comentario || null,
      });
      const data = await stockService.getStock();
      setStock(data);
      setModal(false);
      setEntrada(emptyEntrada);
      setSuccess("entrada");
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Salida múltiple ────────────────────────────────────────
  const agregarItem = () =>
    setSalida(prev => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));

  const removeItem = (idx) =>
    setSalida(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  const updateItem = (idx, key, value) =>
    setSalida(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === idx ? { ...item, [key]: value } : item)
    }));

  const salidaValida = salida.tecnico_id && salida.motivo &&
    salida.items.length > 0 &&
    salida.items.every(i => {
      if (!i.producto_id || !i.cantidad || Number(i.cantidad) <= 0) return false;
      const prod = stock.find(s => String(s.producto_id) === String(i.producto_id));
      if (prod?.es_medible && (!i.metros || Number(i.metros) <= 0)) return false;
      return true;
    });

  const handleSalida = async () => {
    setSaving(true);
    try {
      await stockService.registrarSalidaMultiple({
        tecnico_id: Number(salida.tecnico_id),
        motivo:     salida.motivo,
        comentario: salida.comentario || null,
        items:      salida.items.map(i => ({
          producto_id: Number(i.producto_id),
          cantidad:    Number(i.cantidad),
          metros:      i.metros !== "" ? Number(i.metros) : undefined,
        }))
      });
      const data = await stockService.getStock();
      setStock(data);
      setModal(false);
      setSalida(emptySalida);
      setSuccess("salida");
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const fieldE = (key) => ({
    value: entrada[key],
    onChange: (e) => setEntrada(prev => ({ ...prev, [key]: e.target.value }))
  });

  const productosYaAgregados = salida.items.map(i => String(i.producto_id));

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando inventario...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      {success && (
        <div className={`alert ${success === "entrada" ? "alert-success" : "alert-info"}`}>
          <Icon d={IC.check} size={15} color={success === "entrada" ? "var(--success)" : "var(--info)"} />
          {success === "entrada" ? "Entrada registrada correctamente." : "Salida registrada correctamente."}
        </div>
      )}

      {lowCount > 0 && (
        <div className="alert alert-warning">
          <Icon d={IC.alert} size={15} color="var(--warning)" />
          <strong>{lowCount} ítem(s) con stock bajo mínimo en tu sede.</strong>
        </div>
      )}

      <div className="toolbar">
        <div className="search-box">
          <Icon d={IC.search} size={16} color="var(--text-muted)" />
          <input placeholder="Buscar ítem..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-outline" onClick={() => { setEntrada(emptyEntrada); setModal("entrada"); }}>
          <Icon d={IC.entry} size={15} />
          Registrar entrada
        </button>
        <button className="btn btn-primary" onClick={() => { setSalida(emptySalida); setModal("salida"); }}>
          <Icon d={IC.exit} size={15} />
          Asignar a técnico
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th><th>Ítem</th><th>Categoría</th>
                <th>Stock sede</th><th>Metros disp.</th><th>Mínimo</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    Sin productos en esta sede
                  </td>
                </tr>
              ) : filtered.map(item => {
                const low  = item.stock_minimo > 0 && item.cantidad <= item.stock_minimo;
                const warn = item.stock_minimo > 0 && item.cantidad <= item.stock_minimo * 1.5;
                return (
                  <tr key={item.id}>
                    <td><span className="mono">{item.codigo ?? "—"}</span></td>
                    <td>
                      <div className="fw-600">{item.producto}</div>
                      {item.unidad && <div className="text-sm text-muted">{item.unidad}</div>}
                    </td>
                    <td>
                      {item.categoria
                        ? <Badge variant="blue">{item.categoria}</Badge>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td><StockBar stock={item.cantidad} minimo={item.stock_minimo} /></td>
                    <td>
                      {item.es_medible && item.metros_disponibles !== null ? (
                        <div>
                          <span className="mono fw-600" style={{ color: "var(--info)" }}>
                            {formatNumber(item.metros_disponibles)}m
                          </span>
                          <div className="text-sm text-muted">{item.metros_por_unidad}m/rollo</div>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="mono text-muted">{item.stock_minimo}</td>
                    <td>
                      {low  ? <Badge variant="danger">⚠ Bajo stock</Badge>
                            : warn ? <Badge variant="warning">Atención</Badge>
                            : <Badge variant="active">OK</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal entrada */}
      {modal === "entrada" && (
        <Modal
          title="Registrar Entrada"
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-success" onClick={handleEntrada}
                disabled={saving || !entrada.producto_id || !entrada.cantidad || !entrada.motivo}>
                <Icon d={IC.check} size={15} />
                {saving ? "Registrando..." : "Confirmar entrada"}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Ítem</label>
            <select className="form-input" {...fieldE("producto_id")}>
              <option value="">Seleccionar ítem...</option>
              {stock.map(i => (
                <option key={i.producto_id} value={i.producto_id}>
                  {i.producto} — stock actual: {i.cantidad}
                  {i.es_medible ? ` (${i.metros_disponibles ?? 0}m disponibles)` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cantidad (rollos/unidades)</label>
              <input className="form-input" type="number" min="1" placeholder="0" {...fieldE("cantidad")} />
            </div>
            <div className="form-group">
              <label className="form-label">Motivo</label>
              <select className="form-input" {...fieldE("motivo")}>
                <option value="">Seleccionar...</option>
                <option value={MOTIVOS_ENTRADA.COMPRA}>Compra</option>
                <option value={MOTIVOS_ENTRADA.REPOSICION}>Reposición</option>
                <option value={MOTIVOS_ENTRADA.TRANSFERENCIA}>Transferencia</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Comentario <span>(opcional)</span></label>
            <textarea className="form-input" placeholder="Notas adicionales..." {...fieldE("comentario")} />
          </div>
        </Modal>
      )}

      {/* Modal salida múltiple */}
      {modal === "salida" && (
        <Modal
          title="Asignar materiales a técnico"
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSalida} disabled={saving || !salidaValida}>
                <Icon d={IC.check} size={15} />
                {saving ? "Registrando..." : `Confirmar (${salida.items.length} ítem${salida.items.length !== 1 ? "s" : ""})`}
              </button>
            </>
          }
        >
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Técnico</label>
              <select className="form-input"
                value={salida.tecnico_id}
                onChange={e => setSalida(prev => ({ ...prev, tecnico_id: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Motivo</label>
              <select className="form-input"
                value={salida.motivo}
                onChange={e => setSalida(prev => ({ ...prev, motivo: e.target.value }))}>
                <option value="">Seleccionar...</option>
                <option value={MOTIVOS_SALIDA.NUEVA_CONEXION}>Nueva conexión</option>
                <option value={MOTIVOS_SALIDA.AVERIA}>Avería</option>
                <option value={MOTIVOS_SALIDA.MANTENIMIENTO}>Mantenimiento</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ítems a asignar</label>

            {salida.items.length === 0 && (
              <div style={{ padding: "12px 0", color: "var(--text-muted)", fontSize: 13 }}>
                Agregá al menos un ítem.
              </div>
            )}

            {salida.items.map((item, idx) => {
              const productoInfo = stock.find(s => String(s.producto_id) === String(item.producto_id));
              const esMedible = !!productoInfo?.es_medible;
              return (
                <div key={idx} style={styles.itemRow}>
                  <div style={{ flex: 2 }}>
                    <select className="form-input" value={item.producto_id}
                      onChange={e => updateItem(idx, "producto_id", e.target.value)}>
                      <option value="">Seleccionar ítem...</option>
                      {stock.map(s => (
                        <option
                          key={s.producto_id}
                          value={s.producto_id}
                          disabled={productosYaAgregados.includes(String(s.producto_id)) && String(s.producto_id) !== String(item.producto_id)}
                        >
                          {s.producto} — disp: {s.cantidad}
                          {s.es_medible ? ` (${s.metros_disponibles ?? 0}m)` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cantidad en rollos/unidades */}
                  <div style={{ flex: 1 }}>
                    <input className="form-input" type="number" min="1"
                      max={productoInfo?.cantidad}
                      placeholder="Cant."
                      value={item.cantidad}
                      onChange={e => updateItem(idx, "cantidad", e.target.value)}
                    />
                  </div>

                  {/* Metros — solo si es medible */}
                  {esMedible && (
                    <div style={{ flex: 1 }}>
                      <input className="form-input" type="number" min="1"
                        max={productoInfo?.metros_disponibles ?? undefined}
                        placeholder="Metros"
                        value={item.metros}
                        onChange={e => updateItem(idx, "metros", e.target.value)}
                        style={{ borderColor: "var(--info)" }}
                        title={`Máx: ${productoInfo?.metros_disponibles ?? "?"}m disponibles`}
                      />
                    </div>
                  )}

                  <button className="btn btn-danger-outline btn-sm btn-icon"
                    onClick={() => removeItem(idx)} type="button">
                    <Icon d={IC.trash} size={13} />
                  </button>
                </div>
              );
            })}

            {/* Leyenda metros */}
            {salida.items.some(i => {
              const p = stock.find(s => String(s.producto_id) === String(i.producto_id));
              return !!p?.es_medible;
            }) && (
              <div style={{ fontSize: 12, color: "var(--info)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Icon d={IC.ruler} size={12} color="var(--info)" />
                Los campos azules indican metros a descontar del rollo.
              </div>
            )}

            <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }}
              onClick={agregarItem} type="button">
              <Icon d={IC.plus} size={14} />
              Agregar ítem
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Comentario <span>(opcional)</span></label>
            <textarea className="form-input" placeholder="Dirección, detalle del trabajo..."
              value={salida.comentario}
              onChange={e => setSalida(prev => ({ ...prev, comentario: e.target.value }))}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

const styles = {
  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
};