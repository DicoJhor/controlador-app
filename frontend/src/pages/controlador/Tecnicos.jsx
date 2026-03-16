import { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import { EstadoBadge } from "../../components/ui/Badge";
import usuariosService from "../../services/usuariosService";
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
  plus:   "M12 5v14 M5 12h14",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  edit:   "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  eye:    "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z",
  eyeOff: "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94 M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19 M1 1l22 22",
  toggle: "M18 8h1a4 4 0 010 8h-1 M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z M6 1v3 M10 1v3 M14 1v3",
  alert:  "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
};

const emptyForm = { nombre: "", email: "", password: "" };

export default function CtrlTecnicos() {
  const [tecnicos,  setTecnicos]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState("");
  const [modal,     setModal]     = useState(false);
  const [selected,  setSelected]  = useState(null);
  const [form,      setForm]      = useState(emptyForm);
  const [showPass,  setShowPass]  = useState(false);
  const [saving,    setSaving]    = useState(false);

  const cargarTecnicos = () =>
    stockService.getStats().then(data => setTecnicos(data.misTecnicos));

  useEffect(() => {
    cargarTecnicos()
      .then(() => setLoading(false))
      .catch(() => { setError("No se pudieron cargar los técnicos"); setLoading(false); });
  }, []);

  const filtered = tecnicos.filter(t =>
    t.nombre.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  const openAgregar = () => { setForm(emptyForm); setSelected(null); setShowPass(false); setModal("agregar"); };
  const openEditar  = (t) => { setForm({ nombre: t.nombre, email: t.email, password: "" }); setSelected(t); setShowPass(false); setModal("editar"); };
  const openToggle  = (t) => { setSelected(t); setModal("toggle"); };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (modal === "agregar") {
        await usuariosService.create({
          nombre:   form.nombre,
          email:    form.email,
          rol:      "tecnico",
          sede_id:  user.sede_id,
          password: form.password,
        });
      } else {
        await usuariosService.update(selected.id, {
          nombre: form.nombre,
          email:  form.email,
          rol:    "tecnico",
          sede_id: selected.sede_id,
          estado: selected.estado,
        });
      }
      await cargarTecnicos();
      setModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    setSaving(true);
    try {
      await usuariosService.update(selected.id, {
        nombre:  selected.nombre,
        email:   selected.email,
        rol:     "tecnico",
        sede_id: selected.sede_id,
        estado:  selected.estado === 1 ? 0 : 1,
      });
      await cargarTecnicos();
      setModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm(prev => ({ ...prev, [key]: e.target.value })),
  });

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando técnicos...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <Icon d={IC.search} size={16} color="var(--text-muted)" />
          <input placeholder="Buscar técnico..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openAgregar}>
          <Icon d={IC.plus} size={15} />
          Agregar técnico
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Técnico</th>
                <th>Estado</th>
                <th>Ítems asignados</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    Sin técnicos en tu sede
                  </td>
                </tr>
              ) : filtered.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={styles.userCell}>
                      <div style={{
                        ...styles.avatar,
                        background: t.estado === 1 ? "var(--tech-light)" : "#F1F5F9",
                        color:      t.estado === 1 ? "var(--tech)"       : "var(--text-muted)",
                      }}>
                        {t.nombre.charAt(0)}
                      </div>
                      <div>
                        <div className="fw-600">{t.nombre}</div>
                        <div className="text-sm text-muted">{t.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><EstadoBadge estado={t.estado} /></td>
                  <td className="mono fw-600">{t.itemsAsignados}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-outline btn-sm btn-icon" onClick={() => openEditar(t)}>
                        <Icon d={IC.edit} size={13} />
                      </button>
                      <button
                        className={`btn btn-sm btn-icon ${t.estado === 1 ? "btn-danger-outline" : "btn-outline"}`}
                        onClick={() => openToggle(t)}
                      >
                        <Icon d={IC.toggle} size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(modal === "agregar" || modal === "editar") && (
        <Modal
          title={modal === "agregar" ? "Agregar Técnico" : `Editar — ${selected?.nombre}`}
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGuardar} disabled={saving}>
                {saving ? "Guardando..." : modal === "agregar" ? "Agregar" : "Guardar cambios"}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Nombre completo</label>
            <input className="form-input" placeholder="Nombre y apellido" {...field("nombre")} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="tecnico@empresa.com" {...field("email")} />
          </div>
          {modal === "agregar" && (
            <div className="form-group">
              <label className="form-label">Contraseña temporal</label>
              <div style={{ position: "relative" }}>
                <input
                  className="form-input"
                  type={showPass ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  style={{ paddingRight: 42 }}
                  {...field("password")}
                />
                <button type="button" style={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                  <Icon d={showPass ? IC.eyeOff : IC.eye} size={15} color="var(--text-muted)" />
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {modal === "toggle" && (
        <Modal
          title={selected?.estado === 1 ? "Desactivar técnico" : "Activar técnico"}
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
              <button
                className={`btn ${selected?.estado === 1 ? "btn-danger-outline" : "btn-success"}`}
                onClick={handleToggle} disabled={saving}
              >
                {saving ? "Procesando..." : selected?.estado === 1 ? "Desactivar" : "Activar"}
              </button>
            </>
          }
        >
          <div className={`alert ${selected?.estado === 1 ? "alert-warning" : "alert-info"}`} style={{ marginBottom: 0 }}>
            <Icon d={IC.alert} size={15} color={selected?.estado === 1 ? "var(--warning)" : "var(--info)"} />
            {selected?.estado === 1
              ? <>¿Desactivás a <strong>{selected?.nombre}</strong>? No podrá ingresar al sistema.</>
              : <>¿Reactivás a <strong>{selected?.nombre}</strong>? Podrá volver a ingresar al sistema.</>
            }
          </div>
        </Modal>
      )}
    </div>
  );
}

const styles = {
  userCell: { display: "flex", alignItems: "center", gap: 10 },
  avatar: {
    width: 34, height: 34, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  eyeBtn: {
    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", padding: 4,
  },
};