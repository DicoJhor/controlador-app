import { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import { RoleBadge, EstadoBadge } from "../../components/ui/Badge";
import { ROLES } from "../../utils/constants";
import usuariosService from "../../services/usuariosService";
import sedesService from "../../services/sedesService";
import { useAuth } from "../../hooks/useAuth";

function Icon({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const IC = {
  plus:    "M12 5v14 M5 12h14",
  search:  "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  edit:    "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:   "M3 6h18 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6 M10 11v6 M14 11v6 M9 6V4h6v2",
  alert:   "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
  eye:     "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z",
  eyeOff:  "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94 M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19 M1 1l22 22",
};

const emptyForm = { nombre: "", email: "", rol: "", sede_id: "", password: "" };

export default function AdminUsuarios() {
  const [usuarios,  setUsuarios]  = useState([]);
  const [sedes,     setSedes]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState("");
  const [filterRol, setFilterRol] = useState("todos");
  const [modal,     setModal]     = useState(false);
  const [selected,  setSelected]  = useState(null);
  const [form,      setForm]      = useState(emptyForm);
  const [showPass,  setShowPass]  = useState(false);
  const [saving,    setSaving]    = useState(false);

  const { isAdmin, isSuperadmin } = useAuth();

  useEffect(() => {
    Promise.all([usuariosService.getAll(), sedesService.getAll()])
      .then(([dataUsuarios, dataSedes]) => {
        setUsuarios(dataUsuarios);
        setSedes(dataSedes);
        setLoading(false);
      })
      .catch(() => {
        setError("No se pudieron cargar los datos");
        setLoading(false);
      });
  }, []);

  const filtered = usuarios.filter(u => {
    const matchSearch = u.nombre.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase());
    const matchRol    = filterRol === "todos" || u.rol === filterRol;
    return matchSearch && matchRol;
  });

  const openCrear = () => {
    setForm(emptyForm);
    setSelected(null);
    setShowPass(false);
    setModal("crear");
  };

  const openEditar = (u) => {
    setForm({ nombre: u.nombre, email: u.email, rol: u.rol, sede_id: u.sede_id ?? "", password: "" });
    setSelected(u);
    setShowPass(false);
    setModal("editar");
  };

  const openEliminar = (u) => {
    setSelected(u);
    setModal("eliminar");
  };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      if (modal === "crear") {
        const nuevo = await usuariosService.create({
          nombre:   form.nombre,
          email:    form.email,
          rol:      form.rol,
          sede_id:  form.sede_id || null,
          password: form.password,
        });
        setUsuarios(prev => [...prev, nuevo]);
      } else {
        await usuariosService.update(selected.id, {
          nombre:  form.nombre,
          email:   form.email,
          rol:     form.rol,
          sede_id: form.sede_id || null,
          estado:  selected.estado,
        });
        setUsuarios(prev =>
          prev.map(u => u.id === selected.id
            ? { ...u, nombre: form.nombre, email: form.email, rol: form.rol, sede_id: form.sede_id || null }
            : u
          )
        );
      }
      setModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    setSaving(true);
    try {
      await usuariosService.remove(selected.id);
      setUsuarios(prev => prev.filter(u => u.id !== selected.id));
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

  const needsSede = form.rol === ROLES.CONTROLADOR || form.rol === ROLES.TECNICO || form.rol === ROLES.SECRETARIA;

  const getNombreSede = (sede_id) => {
    const sede = sedes.find(s => s.id === sede_id);
    return sede ? sede.nombre : null;
  };

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando usuarios...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Icon d={IC.search} size={16} color="var(--text-muted)" />
          <input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={filterRol} onChange={e => setFilterRol(e.target.value)}>
          <option value="todos">Todos los roles</option>
          {isSuperadmin && <option value={ROLES.SUPERADMIN}>Super Admin</option>}
          {isSuperadmin && <option value={ROLES.ADMIN}>Admin</option>}
          {!isSuperadmin && <option value={ROLES.ADMIN}>Admin</option>}
          <option value={ROLES.CONTROLADOR}>Controlador</option>
          <option value={ROLES.TECNICO}>Técnico</option>
          <option value={ROLES.SECRETARIA}>Secretaria</option>
        </select>
        <button className="btn btn-primary" onClick={openCrear}>
          <Icon d={IC.plus} size={15} />
          Nuevo usuario
        </button>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Sede</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    Sin resultados
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={styles.userCell}>
                      <div style={styles.avatar}>{u.nombre.charAt(0)}</div>
                      <div>
                        <div className="fw-600">{u.nombre}</div>
                        <div className="text-sm text-muted">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><RoleBadge role={u.rol} /></td>
                  <td className="text-sm">
                    {u.sede_id
                      ? getNombreSede(u.sede_id)
                      : <span className="text-muted">— Global —</span>
                    }
                  </td>
                  <td><EstadoBadge estado={u.estado} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-outline btn-sm btn-icon" onClick={() => openEditar(u)}>
                        <Icon d={IC.edit} size={13} />
                      </button>
                      {isSuperadmin && (
                        <button className="btn btn-danger-outline btn-sm btn-icon" onClick={() => openEliminar(u)}>
                          <Icon d={IC.trash} size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear / editar */}
      {(modal === "crear" || modal === "editar") && (
        <Modal
          title={modal === "crear" ? "Nuevo Usuario" : `Editar — ${selected?.nombre}`}
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleGuardar} disabled={saving}>
                {saving ? "Guardando..." : modal === "crear" ? "Crear usuario" : "Guardar cambios"}
              </button>
            </>
          }
        >
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input className="form-input" placeholder="Nombre y apellido" {...field("nombre")} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="email@empresa.com" {...field("email")} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Rol</label>
              <select className="form-input" {...field("rol")}>
                <option value="">Seleccionar...</option>
                {isSuperadmin && <option value={ROLES.SUPERADMIN}>Super Admin</option>}
                {isSuperadmin && <option value={ROLES.ADMIN}>Admin</option>}
                <option value={ROLES.CONTROLADOR}>Controlador</option>
                <option value={ROLES.TECNICO}>Técnico</option>
                <option value={ROLES.SECRETARIA}>Secretaria</option>
              </select>
            </div>
            {needsSede && (
              <div className="form-group">
                <label className="form-label">Sede</label>
                <select className="form-input" {...field("sede_id")}>
                  <option value="">Seleccionar...</option>
                  {sedes.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {modal === "crear" && (
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
              <div className="form-hint">El usuario deberá cambiarla en su primer ingreso.</div>
            </div>
          )}
        </Modal>
      )}

      {/* Modal eliminar — solo superadmin llega aquí */}
      {modal === "eliminar" && (
        <Modal
          title="Eliminar usuario"
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>
                Cancelar
              </button>
              <button className="btn btn-danger-outline" onClick={handleEliminar} disabled={saving}>
                {saving ? "Eliminando..." : "Eliminar"}
              </button>
            </>
          }
        >
          <div className="alert alert-danger" style={{ marginBottom: 0 }}>
            <Icon d={IC.alert} size={15} color="var(--danger)" />
            ¿Eliminás a <strong>{selected?.nombre}</strong>? Esta acción no se puede deshacer.
          </div>
        </Modal>
      )}
    </div>
  );
}

const styles = {
  userCell: { display: "flex", alignItems: "center", gap: 10 },
  avatar: {
    width: 32, height: 32, borderRadius: "50%",
    background: "var(--primary-light)", color: "var(--primary)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  eyeBtn: {
    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", padding: 4,
  },
};