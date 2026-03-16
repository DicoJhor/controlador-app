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
  comment: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
};

const motivoOpts = [
  { value: "instalacion", label: "Instalación",    desc: "Instalación en cliente nuevo",   icon: IC.wifi,   color: "#1A56DB", bg: "#EFF6FF" },
  { value: "averia",      label: "Avería",          desc: "Reemplazo por falla de equipo",  icon: IC.wrench, color: "#DC2626", bg: "#FEF2F2" },
];

const emptyForm = { producto_id: "", cantidad: "", motivo: "", comentario: "" };

export default function TecRegistrarSalida() {
  const [inventario, setInventario] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [form,       setForm]       = useState(emptyForm);
  const [modal,      setModal]      = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [errors,     setErrors]     = useState({});

  useEffect(() => {
    tecnicoService.getMiInventario()
      .then(data => { setInventario(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const itemSeleccionado = inventario.find(i => String(i.producto_id) === String(form.producto_id));

  const validate = () => {
    const e = {};
    if (!form.producto_id) e.producto_id = "Seleccioná un ítem";
    if (!form.cantidad)    e.cantidad    = "Ingresá una cantidad";
    else if (Number(form.cantidad) <= 0) e.cantidad = "La cantidad debe ser mayor a 0";
    else if (itemSeleccionado && Number(form.cantidad) > itemSeleccionado.disponible)
      e.cantidad = `Máximo disponible: ${itemSeleccionado.disponible}`;
    if (!form.motivo) e.motivo = "Seleccioná un motivo";
    return e;
  };

  const handleOpenConfirm = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setModal(true);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await tecnicoService.registrarSalida({
        producto_id: Number(form.producto_id),
        cantidad:    Number(form.cantidad),
        motivo:      form.motivo,
        comentario:  form.comentario || null,
      });
      // Recargar inventario actualizado
      const data = await tecnicoService.getMiInventario();
      setInventario(data);
      setModal(false);
      setForm(emptyForm);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }));
      if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
    },
  });

  const motivoSeleccionado = motivoOpts.find(m => m.value === form.motivo);

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando...</div>;

  return (
    <div>
      {success && (
        <div className="alert alert-success">
          <Icon d={IC.check} size={15} color="var(--success)" />
          Salida registrada correctamente. Tu controlador puede verla en auditoría.
        </div>
      )}

      <div style={styles.wrap}>
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Nueva salida de material</div>
              <div className="card-subtitle">Registrá el uso de los materiales asignados</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ítem a registrar</label>
            <select className={`form-input ${errors.producto_id ? "error" : ""}`} {...field("producto_id")}>
              <option value="">Seleccionar ítem...</option>
              {inventario.map(i => (
                <option key={i.producto_id} value={i.producto_id} disabled={i.disponible === 0}>
                  {i.nombre} — disponible: {i.disponible} {i.unidad}{i.disponible === 0 ? " (sin stock)" : ""}
                </option>
              ))}
            </select>
            {errors.producto_id && <div className="form-error">{errors.producto_id}</div>}
            {itemSeleccionado && (
              <div style={styles.itemInfo}>
                <span className="mono" style={{ color: "var(--text-muted)", fontSize: 12 }}>{itemSeleccionado.codigo}</span>
                <span style={{ color: "var(--success)", fontSize: 12, fontWeight: 600 }}>
                  {itemSeleccionado.disponible} {itemSeleccionado.unidad} disponibles
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Cantidad utilizada</label>
            <input
              className={`form-input ${errors.cantidad ? "error" : ""}`}
              type="number" min="1"
              max={itemSeleccionado?.disponible}
              placeholder="0"
              {...field("cantidad")}
            />
            {errors.cantidad && <div className="form-error">{errors.cantidad}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Motivo</label>
            <div style={styles.motivoGrid}>
              {motivoOpts.map(opt => {
                const selected = form.motivo === opt.value;
                return (
                  <button key={opt.value} type="button"
                    onClick={() => { setForm(prev => ({ ...prev, motivo: opt.value })); if (errors.motivo) setErrors(prev => ({ ...prev, motivo: null })); }}
                    style={{ ...styles.motivoBtn, borderColor: selected ? opt.color : "var(--border)", background: selected ? opt.bg : "white" }}
                  >
                    <div style={{ ...styles.motivoIcon, background: opt.bg }}>
                      <Icon d={opt.icon} size={16} color={opt.color} />
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: selected ? opt.color : "var(--text)" }}>{opt.label}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.motivo && <div className="form-error" style={{ marginTop: 6 }}>{errors.motivo}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Comentario <span>(opcional)</span></label>
            <textarea className="form-input"
              placeholder={form.motivo === "instalacion" ? "Ej: Cliente Av. Corrientes 1234..." : "Ej: Puerto WAN dañado..."}
              {...field("comentario")}
            />
          </div>

          <button className="btn btn-primary btn-lg btn-full" onClick={handleOpenConfirm}>
            <Icon d={IC.check} size={16} />
            Registrar salida
          </button>
        </div>
      </div>

      {modal && (
        <Modal
          title="Confirmar salida"
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleConfirm} disabled={saving}>
                <Icon d={IC.check} size={14} />
                {saving ? "Registrando..." : "Confirmar"}
              </button>
            </>
          }
        >
          <div style={styles.resumen}>
            <div style={styles.resumenRow}>
              <span className="text-muted text-sm">Ítem</span>
              <span className="fw-600">{itemSeleccionado?.nombre}</span>
            </div>
            <div style={styles.resumenRow}>
              <span className="text-muted text-sm">Cantidad</span>
              <span className="mono fw-600">{form.cantidad} {itemSeleccionado?.unidad}</span>
            </div>
            <div style={styles.resumenRow}>
              <span className="text-muted text-sm">Motivo</span>
              <span className="fw-600" style={{ color: motivoSeleccionado?.color }}>{motivoSeleccionado?.label}</span>
            </div>
            {form.comentario && (
              <div style={styles.resumenRow}>
                <span className="text-muted text-sm">Comentario</span>
                <span className="text-sm" style={{ maxWidth: 220, textAlign: "right" }}>{form.comentario}</span>
              </div>
            )}
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 16 }}>
            Esta acción quedará registrada y será visible para tu controlador. No se puede deshacer.
          </p>
        </Modal>
      )}
    </div>
  );
}

const styles = {
  wrap: { display: "flex", justifyContent: "center" },
  itemInfo: { display: "flex", justifyContent: "space-between", marginTop: 6, padding: "6px 10px", background: "var(--surface2)", borderRadius: 6, border: "1px solid var(--border)" },
  motivoGrid: { display: "flex", flexDirection: "column", gap: 8 },
  motivoBtn: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "2px solid", borderRadius: 10, cursor: "pointer", background: "white", fontFamily: "inherit", transition: "all .15s", width: "100%", textAlign: "left" },
  motivoIcon: { width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  resumen: { background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "4px 16px" },
  resumenRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" },
};