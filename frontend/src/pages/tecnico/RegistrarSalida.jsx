import { useState, useEffect } from "react";
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
  wifi:   "M5 12.55a11 11 0 0114.08 0 M1.42 9a16 16 0 0121.16 0 M8.53 16.11a6 6 0 016.95 0 M12 20h.01",
  wrench: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  check:  "M20 6L9 17l-5-5",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  plus:   "M12 5v14 M5 12h14",
  trash:  "M3 6h18 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
  x:      "M18 6L6 18 M6 6l12 12",
  camera: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8",
};

// ── Componente fotos múltiples ─────────────────────────────────────────────
function MultiPhotoUploader({ fotos, onChange, maxFotos = 5 }) {
  const handleAdd = (e) => {
    const files   = Array.from(e.target.files);
    const libres  = maxFotos - fotos.length;
    const nuevas  = files.slice(0, libres).map(f => ({
      file:    f,
      preview: URL.createObjectURL(f),
    }));
    onChange([...fotos, ...nuevas]);
    e.target.value = "";
  };

  const handleRemove = (idx) => {
    onChange(fotos.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div style={mps.grid}>
        {fotos.map((f, idx) => (
          <div key={idx} style={mps.thumb}>
            <img src={f.preview} alt="" style={mps.img} />
            <button
              type="button"
              style={mps.removeBtn}
              onClick={() => handleRemove(idx)}
            >
              <Icon d={IC.x} size={11} color="white" />
            </button>
          </div>
        ))}

        {fotos.length < maxFotos && (
          <label style={mps.addBtn}>
            <Icon d={IC.camera} size={22} color="var(--text-muted)" />
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              {fotos.length === 0 ? "Agregar foto" : "Más"}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              style={{ display: "none" }}
              onChange={handleAdd}
            />
          </label>
        )}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
        {fotos.length}/{maxFotos} fotos
      </div>
    </div>
  );
}

const mps = {
  grid:      { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 },
  thumb:     { position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: "1", background: "var(--hover)" },
  img:       { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  removeBtn: { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,.6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 },
  addBtn:    { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", aspectRatio: "1", borderRadius: 8, border: "1.5px dashed var(--border)", cursor: "pointer", background: "var(--hover)", minHeight: 80 },
};

// ── Selector de materiales ─────────────────────────────────────────────────
function ItemSelector({ inventario, items, onChange }) {
  const yaAgregados = items.map(i => String(i.producto_id));

  const agregarItem = () => onChange([...items, { producto_id: "", cantidad: "" }]);
  const quitarItem  = (idx) => onChange(items.filter((_, i) => i !== idx));
  const updateItem  = (idx, key, value) =>
    onChange(items.map((item, i) => i === idx ? { ...item, [key]: value } : item));

  return (
    <div>
      {items.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "6px 0 10px" }}>
          Agregá los materiales utilizados.
        </div>
      )}
      {items.map((item, idx) => {
        const prodInfo = inventario.find(i => String(i.producto_id) === String(item.producto_id));
        const isMedible = prodInfo?.es_medible;
        return (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
            <div style={{ flex: 2 }}>
              <select
                className="form-input"
                value={item.producto_id}
                onChange={e => updateItem(idx, "producto_id", e.target.value)}
                style={{ fontSize: 14 }}
              >
                <option value="">Seleccionar ítem...</option>
                {inventario.map(i => (
                  <option
                    key={i.producto_id}
                    value={i.producto_id}
                    disabled={
                      (yaAgregados.includes(String(i.producto_id)) &&
                        String(i.producto_id) !== String(item.producto_id)) ||
                      i.disponible <= 0
                    }
                  >
                    {i.nombre} — disp: {i.disponible} {i.es_medible ? "m" : i.unidad}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <input
                className="form-input"
                type="number"
                min="0.01"
                step={isMedible ? "0.01" : "1"}
                placeholder={isMedible ? "Ej: 2.5" : "Cant."}
                value={item.cantidad}
                max={prodInfo?.disponible}
                onChange={e => updateItem(idx, "cantidad", e.target.value)}
                style={{ fontSize: 14 }}
              />
              {prodInfo && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {isMedible ? "metros" : prodInfo.unidad} · máx {prodInfo.disponible}
                </div>
              )}
            </div>
            <button
              className="btn btn-danger-outline btn-sm btn-icon"
              onClick={() => quitarItem(idx)}
              type="button"
              style={{ marginTop: 2, minWidth: 36, minHeight: 36 }}
            >
              <Icon d={IC.trash} size={13} />
            </button>
          </div>
        );
      })}
      <button
        className="btn btn-outline btn-sm"
        style={{ marginTop: 4 }}
        onClick={agregarItem}
        type="button"
      >
        <Icon d={IC.plus} size={13} />
        Agregar material
      </button>
    </div>
  );
}

// ── Formularios vacíos ─────────────────────────────────────────────────────
const emptyAveriaForm = { comentario: "", items: [] };
const emptyActivForm  = { cliente: "", direccion: "", comentario: "", items: [] };

// ── Componente principal ───────────────────────────────────────────────────
export default function TecRegistrarSalida() {
  const [tab, setTab] = useState("averia");

  const [inventario, setInventario] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [success,    setSuccess]    = useState(null);

  // Avería
  const [averiaForm,   setAveriaForm]   = useState(emptyAveriaForm);
  const [fotosAveria,  setFotosAveria]  = useState([]);
  const [savingAveria, setSavingAveria] = useState(false);
  const [errorsAveria, setErrorsAveria] = useState({});

  // Activación
  const [activForm,   setActivForm]   = useState(emptyActivForm);
  const [fotosActiv,  setFotosActiv]  = useState([]);
  const [savingActiv, setSavingActiv] = useState(false);
  const [errorsActiv, setErrorsActiv] = useState({});

  useEffect(() => {
    tecnicoService.getMiInventario()
      .then(data => { setInventario(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Validación avería ──────────────────────────────────────────────────
  const validateAveria = () => {
    const e = {};
    if (averiaForm.items.length === 0) {
      e.items = "Agregá al menos un material";
    } else {
      for (const item of averiaForm.items) {
        if (!item.producto_id)                   { e.items = "Seleccioná un ítem en todos los materiales"; break; }
        if (!item.cantidad || item.cantidad <= 0) { e.items = "Ingresá una cantidad válida"; break; }
      }
    }
    return e;
  };

  // ── Submit avería ──────────────────────────────────────────────────────
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
      fotosAveria.forEach(f => fd.append("fotos", f.file));

      const res = await tecnicoService.registrarSalidaMultiple(fd);

      setAveriaForm(emptyAveriaForm);
      setFotosAveria([]);
      setSuccess(`averia:${res?.codigo || ""}`);
      setTimeout(() => setSuccess(null), 5000);

      const data = await tecnicoService.getMiInventario();
      setInventario(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingAveria(false);
    }
  };

  // ── Validación activación ──────────────────────────────────────────────
  const validateActiv = () => {
    const e = {};
    if (!activForm.cliente.trim())   e.cliente   = "Ingresá el nombre del cliente";
    if (!activForm.direccion.trim()) e.direccion = "Ingresá la dirección";
    return e;
  };

  // ── Submit activación ──────────────────────────────────────────────────
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
      fotosActiv.forEach(f => fd.append("fotos", f.file));

      const res = await tecnicoService.registrarActivacion(fd);

      setActivForm(emptyActivForm);
      setFotosActiv([]);
      setSuccess(`activacion:${res?.codigo || ""}`);
      setTimeout(() => setSuccess(null), 5000);

      const data = await tecnicoService.getMiInventario();
      setInventario(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingActiv(false);
    }
  };

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando...</div>;

  const successTipo   = success?.split(":")?.[0];
  const successCodigo = success?.split(":")?.[1];

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>

      {/* ── Banner de éxito ── */}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <Icon d={IC.check} size={16} color="var(--success)" />
          <div>
            <strong>{successTipo === "averia" ? "Avería" : "Activación"} registrada correctamente</strong>
            {successCodigo && (
              <div style={{ fontSize: 13, marginTop: 2 }}>
                Código: <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{successCodigo}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={ts.tabBar}>
        {[
          { key: "averia",     label: "Avería",     icon: IC.wrench },
          { key: "activacion", label: "Activación",  icon: IC.wifi  },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              ...ts.tabBtn,
              background: tab === t.key ? "white" : "transparent",
              color:      tab === t.key ? "var(--text)" : "var(--text-muted)",
              boxShadow:  tab === t.key ? "0 1px 3px rgba(0,0,0,.12)" : "none",
              flex: 1,
            }}
          >
            <Icon d={t.icon} size={16} color={tab === t.key ? "var(--primary)" : "var(--text-muted)"} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ Tab Avería ══════════ */}
      {tab === "averia" && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Registrar avería</div>
              <div className="card-subtitle">Materiales utilizados en la reparación</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Materiales utilizados *</label>
            <ItemSelector
              inventario={inventario}
              items={averiaForm.items}
              onChange={items => setAveriaForm(p => ({ ...p, items }))}
            />
            {errorsAveria.items && (
              <div className="form-error" style={{ marginTop: 6 }}>{errorsAveria.items}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Comentario <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(opcional)</span></label>
            <textarea
              className="form-input"
              placeholder="Ej: Puerto WAN dañado, se reemplazó ONU..."
              rows={3}
              value={averiaForm.comentario}
              onChange={e => setAveriaForm(p => ({ ...p, comentario: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fotos <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(hasta 5)</span></label>
            <MultiPhotoUploader fotos={fotosAveria} onChange={setFotosAveria} />
          </div>

          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={handleRegistrarAveria}
            disabled={savingAveria}
            style={{ marginTop: 8, minHeight: 48 }}
          >
            <Icon d={IC.check} size={16} />
            {savingAveria ? "Registrando..." : "Registrar avería"}
          </button>
        </div>
      )}

      {/* ══════════ Tab Activación ══════════ */}
      {tab === "activacion" && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Nueva activación</div>
              <div className="card-subtitle">Registrá cliente, materiales y fotos</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Cliente *</label>
            <input
              className={`form-input ${errorsActiv.cliente ? "error" : ""}`}
              placeholder="Nombre del cliente"
              value={activForm.cliente}
              onChange={e => {
                setActivForm(p => ({ ...p, cliente: e.target.value }));
                if (errorsActiv.cliente) setErrorsActiv(p => ({ ...p, cliente: null }));
              }}
              style={{ fontSize: 16 }}
            />
            {errorsActiv.cliente && <div className="form-error">{errorsActiv.cliente}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Dirección *</label>
            <input
              className={`form-input ${errorsActiv.direccion ? "error" : ""}`}
              placeholder="Av. Ejemplo 1234"
              value={activForm.direccion}
              onChange={e => {
                setActivForm(p => ({ ...p, direccion: e.target.value }));
                if (errorsActiv.direccion) setErrorsActiv(p => ({ ...p, direccion: null }));
              }}
              style={{ fontSize: 16 }}
            />
            {errorsActiv.direccion && <div className="form-error">{errorsActiv.direccion}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Materiales <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(opcional)</span></label>
            <ItemSelector
              inventario={inventario}
              items={activForm.items}
              onChange={items => setActivForm(p => ({ ...p, items }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Comentario <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(opcional)</span></label>
            <textarea
              className="form-input"
              placeholder="Observaciones del trabajo..."
              rows={3}
              value={activForm.comentario}
              onChange={e => setActivForm(p => ({ ...p, comentario: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fotos <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(hasta 5)</span></label>
            <MultiPhotoUploader fotos={fotosActiv} onChange={setFotosActiv} />
          </div>

          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={handleRegistrarActivacion}
            disabled={savingActiv}
            style={{ marginTop: 8, minHeight: 48 }}
          >
            <Icon d={IC.check} size={16} />
            {savingActiv ? "Registrando..." : "Registrar activación"}
          </button>
        </div>
      )}
    </div>
  );
}

const ts = {
  tabBar: {
    display: "flex", gap: 4, background: "var(--hover)",
    borderRadius: 12, padding: 4,
  },
  tabBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 6, padding: "10px 12px", borderRadius: 9,
    border: "none", cursor: "pointer", fontSize: 14,
    fontWeight: 500, transition: "all .15s",
  },
};