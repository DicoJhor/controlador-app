import { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import tecnicoService from "../../services/tecnicoService";

function Icon({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const IC = {
  wifi:    "M5 12.55a11 11 0 0114.08 0 M1.42 9a16 16 0 0121.16 0 M8.53 16.11a6 6 0 016.95 0 M12 20h.01",
  wrench:  "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  check:   "M20 6L9 17l-5-5",
  package: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12",
  upload:  "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  plus:    "M12 5v14 M5 12h14",
  trash:   "M3 6h18 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
};

const emptyAveriaForm  = { comentario: "", items: [] };
const emptyActivForm   = { cliente: "", direccion: "", comentario: "", items: [] };

function FotoUploader({ label, preview, onChange }) {
  return (
    <div style={styles.fotoBox}>
      {preview ? (
        <div style={{ position: "relative" }}>
          <img src={preview} alt={label}
            style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }} />
          <div style={styles.fotoLabel}>{label}</div>
        </div>
      ) : (
        <label style={styles.fotoPlaceholder}>
          <Icon d={IC.upload} size={22} color="var(--text-muted)" />
          <span style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{label}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }} onChange={onChange} />
        </label>
      )}
      {preview && (
        <label style={styles.cambiarFoto}>
          <Icon d={IC.upload} size={12} color="white" />
          Cambiar
          <input type="file" accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }} onChange={onChange} />
        </label>
      )}
    </div>
  );
}

function ItemSelector({ inventario, items, onChange }) {
  const yaAgregados = items.map(i => String(i.producto_id));

  const agregarItem = () =>
    onChange([...items, { producto_id: "", cantidad: 1 }]);

  const quitarItem = (idx) =>
    onChange(items.filter((_, i) => i !== idx));

  const updateItem = (idx, key, value) =>
    onChange(items.map((item, i) => i === idx ? { ...item, [key]: value } : item));

  return (
    <div>
      {items.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 0" }}>
          Agregá los materiales utilizados.
        </div>
      )}
      {items.map((item, idx) => {
        const prodInfo = inventario.find(i => String(i.producto_id) === String(item.producto_id));
        return (
          <div key={idx} style={styles.itemRow}>
            <div style={{ flex: 2 }}>
              <select className="form-input" value={item.producto_id}
                onChange={e => updateItem(idx, "producto_id", e.target.value)}>
                <option value="">Seleccionar ítem...</option>
                {inventario.map(i => (
                  <option key={i.producto_id} value={i.producto_id}
                    disabled={yaAgregados.includes(String(i.producto_id)) && String(i.producto_id) !== String(item.producto_id) || i.disponible === 0}>
                    {i.nombre} — disp: {i.disponible} {i.unidad}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <input className="form-input" type="number" min="1"
                max={prodInfo?.disponible} placeholder="Cant."
                value={item.cantidad}
                onChange={e => updateItem(idx, "cantidad", Number(e.target.value))} />
            </div>
            <button className="btn btn-danger-outline btn-sm btn-icon"
              onClick={() => quitarItem(idx)} type="button">
              <Icon d={IC.trash} size={13} />
            </button>
          </div>
        );
      })}
      <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }}
        onClick={agregarItem} type="button">
        <Icon d={IC.plus} size={13} />
        Agregar material
      </button>
    </div>
  );
}

export default function TecRegistrarSalida() {
  const [tab, setTab] = useState("averia");

  const [inventario, setInventario] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [success,    setSuccess]    = useState(null);

  // Avería
  const [averiaForm,   setAveriaForm]   = useState(emptyAveriaForm);
  const [fotoAveria,   setFotoAveria]   = useState(null);
  const [prevAveria,   setPrevAveria]   = useState(null);
  const [savingAveria, setSavingAveria] = useState(false);
  const [errorsAveria, setErrorsAveria] = useState({});

  // Activación
  const [activForm,    setActivForm]    = useState(emptyActivForm);
  const [fotoAntes,    setFotoAntes]    = useState(null);
  const [fotoDespues,  setFotoDespues]  = useState(null);
  const [prevAntes,    setPrevAntes]    = useState(null);
  const [prevDespues,  setPrevDespues]  = useState(null);
  const [savingActiv,  setSavingActiv]  = useState(false);
  const [errorsActiv,  setErrorsActiv]  = useState({});

  useEffect(() => {
    tecnicoService.getMiInventario()
      .then(data => { setInventario(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Avería ─────────────────────────────────────────────
  const handleFotoAveria = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFotoAveria(file);
    setPrevAveria(URL.createObjectURL(file));
  };

  const validateAveria = () => {
    const e = {};
    if (averiaForm.items.length === 0) e.items = "Agregá al menos un material";
    else {
      for (const item of averiaForm.items) {
        if (!item.producto_id) { e.items = "Seleccioná un ítem en todos los materiales"; break; }
        if (!item.cantidad || item.cantidad <= 0) { e.items = "Ingresá una cantidad válida"; break; }
      }
    }
    return e;
  };

  const handleRegistrarAveria = async () => {
    const e = validateAveria();
    if (Object.keys(e).length > 0) { setErrorsAveria(e); return; }
    setErrorsAveria({});
    setSavingAveria(true);
    try {
      const fd = new FormData();
      fd.append("motivo",     "averia");
      fd.append("comentario", averiaForm.comentario || "");
      fd.append("items",      JSON.stringify(averiaForm.items));
      if (fotoAveria) fd.append("foto", fotoAveria);

      await tecnicoService.registrarSalidaMultiple(fd);

      setAveriaForm(emptyAveriaForm);
      setFotoAveria(null);
      setPrevAveria(null);
      setSuccess("averia");
      setTimeout(() => setSuccess(null), 4000);

      // Recargar inventario
      const data = await tecnicoService.getMiInventario();
      setInventario(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingAveria(false);
    }
  };

  // ── Activación ─────────────────────────────────────────
  const handleFotoAntes   = (e) => { const f = e.target.files[0]; if (!f) return; setFotoAntes(f);   setPrevAntes(URL.createObjectURL(f)); };
  const handleFotoDespues = (e) => { const f = e.target.files[0]; if (!f) return; setFotoDespues(f); setPrevDespues(URL.createObjectURL(f)); };

  const validateActiv = () => {
    const e = {};
    if (!activForm.cliente.trim())   e.cliente   = "Ingresá el nombre del cliente";
    if (!activForm.direccion.trim()) e.direccion = "Ingresá la dirección";
    return e;
  };

  const handleRegistrarActivacion = async () => {
    const e = validateActiv();
    if (Object.keys(e).length > 0) { setErrorsActiv(e); return; }
    setErrorsActiv({});
    setSavingActiv(true);
    try {
      const fd = new FormData();
      fd.append("cliente",    activForm.cliente);
      fd.append("direccion",  activForm.direccion);
      fd.append("comentario", activForm.comentario || "");
      fd.append("items",      JSON.stringify(activForm.items));
      if (fotoAntes)   fd.append("foto_antes",  fotoAntes);
      if (fotoDespues) fd.append("foto_despues", fotoDespues);

      await tecnicoService.registrarActivacion(fd);

      setActivForm(emptyActivForm);
      setFotoAntes(null);
      setFotoDespues(null);
      setPrevAntes(null);
      setPrevDespues(null);
      setSuccess("activacion");
      setTimeout(() => setSuccess(null), 4000);

      const data = await tecnicoService.getMiInventario();
      setInventario(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingActiv(false);
    }
  };

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando...</div>;

  return (
    <div>
      {success === "averia" && (
        <div className="alert alert-success">
          <Icon d={IC.check} size={15} color="var(--success)" />
          Avería registrada correctamente.
        </div>
      )}
      {success === "activacion" && (
        <div className="alert alert-success">
          <Icon d={IC.check} size={15} color="var(--success)" />
          Activación registrada correctamente.
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "var(--hover)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {[
          { key: "averia",     label: "Registrar avería",    icon: IC.wrench },
          { key: "activacion", label: "Registrar activación", icon: IC.wifi  },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500, transition: "all .15s",
              background: tab === t.key ? "white" : "transparent",
              color: tab === t.key ? "var(--text)" : "var(--text-muted)",
              boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,.1)" : "none",
            }}>
            <Icon d={t.icon} size={14} color={tab === t.key ? "var(--primary)" : "var(--text-muted)"} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Avería ── */}
      {tab === "averia" && (
        <div style={styles.wrap}>
          <div className="card" style={{ maxWidth: 560 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Registrar avería</div>
                <div className="card-subtitle">Registrá los materiales utilizados en la reparación</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Materiales utilizados *</label>
              <ItemSelector
                inventario={inventario}
                items={averiaForm.items}
                onChange={items => setAveriaForm(prev => ({ ...prev, items }))}
              />
              {errorsAveria.items && <div className="form-error" style={{ marginTop: 6 }}>{errorsAveria.items}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Comentario <span>(opcional)</span></label>
              <textarea className="form-input" placeholder="Ej: Puerto WAN dañado, se reemplazó ONU..."
                value={averiaForm.comentario}
                onChange={e => setAveriaForm(prev => ({ ...prev, comentario: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Foto <span>(opcional)</span></label>
              {prevAveria ? (
                <div style={{ position: "relative", borderRadius: 8, overflow: "hidden" }}>
                  <img src={prevAveria} alt="preview"
                    style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8 }} />
                  <label style={styles.cambiarFoto}>
                    <Icon d={IC.upload} size={12} color="white" />
                    Cambiar
                    <input type="file" accept="image/jpeg,image/png,image/webp"
                      style={{ display: "none" }} onChange={handleFotoAveria} />
                  </label>
                </div>
              ) : (
                <label style={{ ...styles.fotoPlaceholder, borderRadius: 8, border: "1px solid var(--border)" }}>
                  <Icon d={IC.upload} size={22} color="var(--text-muted)" />
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>Subir foto</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }} onChange={handleFotoAveria} />
                </label>
              )}
            </div>

            <button className="btn btn-primary btn-lg btn-full"
              onClick={handleRegistrarAveria} disabled={savingAveria}>
              <Icon d={IC.check} size={16} />
              {savingAveria ? "Registrando..." : "Registrar avería"}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab Activación ── */}
      {tab === "activacion" && (
        <div style={styles.wrap}>
          <div className="card" style={{ maxWidth: 560 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Nueva activación</div>
                <div className="card-subtitle">Registrá la activación con materiales y fotos</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Cliente *</label>
              <input className={`form-input ${errorsActiv.cliente ? "error" : ""}`}
                placeholder="Nombre del cliente"
                value={activForm.cliente}
                onChange={e => { setActivForm(prev => ({ ...prev, cliente: e.target.value })); if (errorsActiv.cliente) setErrorsActiv(prev => ({ ...prev, cliente: null })); }} />
              {errorsActiv.cliente && <div className="form-error">{errorsActiv.cliente}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Dirección *</label>
              <input className={`form-input ${errorsActiv.direccion ? "error" : ""}`}
                placeholder="Av. Ejemplo 1234"
                value={activForm.direccion}
                onChange={e => { setActivForm(prev => ({ ...prev, direccion: e.target.value })); if (errorsActiv.direccion) setErrorsActiv(prev => ({ ...prev, direccion: null })); }} />
              {errorsActiv.direccion && <div className="form-error">{errorsActiv.direccion}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Materiales utilizados <span>(opcional)</span></label>
              <ItemSelector
                inventario={inventario}
                items={activForm.items}
                onChange={items => setActivForm(prev => ({ ...prev, items }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Comentario <span>(opcional)</span></label>
              <textarea className="form-input" placeholder="Observaciones, detalles del trabajo..."
                value={activForm.comentario}
                onChange={e => setActivForm(prev => ({ ...prev, comentario: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Fotos</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FotoUploader label="Foto antes"   preview={prevAntes}   onChange={handleFotoAntes} />
                <FotoUploader label="Foto después" preview={prevDespues} onChange={handleFotoDespues} />
              </div>
            </div>

            <button className="btn btn-primary btn-lg btn-full"
              onClick={handleRegistrarActivacion} disabled={savingActiv}>
              <Icon d={IC.check} size={16} />
              {savingActiv ? "Registrando..." : "Registrar activación"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap:     { display: "flex", justifyContent: "center" },
  itemRow:  { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  fotoBox:  { position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" },
  fotoPlaceholder: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 140, cursor: "pointer", background: "var(--hover)", width: "100%" },
  fotoLabel: { position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.5)", color: "white", fontSize: 11, fontWeight: 600, padding: "4px 8px", textAlign: "center" },
  cambiarFoto: { position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,.5)", color: "white", fontSize: 11, padding: "3px 8px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 },
};