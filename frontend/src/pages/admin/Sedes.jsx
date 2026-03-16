import { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import sedesService from "../../services/sedesService";

function Icon({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const IC = {
  plus:     "M12 5v14 M5 12h14",
  search:   "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  edit:     "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:    "M3 6h18 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6 M10 11v6 M14 11v6 M9 6V4h6v2",
  building: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  users:    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z",
  map:      "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 7a3 3 0 100 6 3 3 0 000-6z",
  alert:    "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
};

const emptyForm = { nombre: "", direccion: "" };

export default function AdminSedes() {
  const [sedes,    setSedes]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState("");
  const [modal,    setModal]    = useState(false);
  const [selected, setSelected] = useState(null);
  const [form,     setForm]     = useState(emptyForm);
  const [saving,   setSaving]   = useState(false);

  // ── Cargar sedes ───────────────────────────────────────────
  useEffect(() => {
    sedesService.getAll()
      .then(data => { setSedes(data); setLoading(false); })
      .catch(() => { setError("No se pudieron cargar las sedes"); setLoading(false); });
  }, []);

  const filtered = sedes.filter(s =>
    s.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (s.direccion ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const openCrear = () => {
    setForm(emptyForm);
    setSelected(null);
    setModal("crear");
  };

  const openEditar = (sede) => {
    setForm({ nombre: sede.nombre, direccion: sede.direccion ?? "" });
    setSelected(sede);
    setModal("editar");
  };

  const openEliminar = (sede) => {
    setSelected(sede);
    setModal("eliminar");
  };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      if (modal === "crear") {
        const nueva = await sedesService.create(form);
        setSedes(prev => [...prev, nueva]);
      } else {
        await sedesService.update(selected.id, { ...form, estado: selected.estado });
        setSedes(prev =>
          prev.map(s => s.id === selected.id ? { ...s, ...form } : s)
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
      await sedesService.remove(selected.id);
      setSedes(prev => prev.filter(s => s.id !== selected.id));
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

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando sedes...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Icon d={IC.search} size={16} color="var(--text-muted)" />
          <input
            placeholder="Buscar por nombre o dirección..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={openCrear}>
          <Icon d={IC.plus} size={15} />
          Nueva sede
        </button>
      </div>

      {/* Cards de sedes */}
      <div className="grid-3">
        {filtered.length === 0 ? (
          <div style={{ color: "var(--text-muted)", padding: 32 }}>Sin sedes registradas</div>
        ) : filtered.map(s => (
          <div key={s.id} style={styles.sedeCard}>
            <div style={styles.cardTop}>
              <div style={styles.sedeIconWrap}>
                <Icon d={IC.building} size={20} color="var(--primary)" />
              </div>
              <Badge variant={s.estado === 1 ? "active" : "inactive"}>
                {s.estado === 1 ? "Activa" : "Inactiva"}
              </Badge>
            </div>

            <div style={styles.sedeName}>{s.nombre}</div>

            <div style={styles.sedeDetail}>
              <Icon d={IC.map} size={13} color="var(--text-muted)" />
              <span>{s.direccion ?? "Sin dirección"}</span>
            </div>

            <div style={styles.cardActions}>
              <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openEditar(s)}>
                <Icon d={IC.edit} size={13} />
                Editar
              </button>
              <button className="btn btn-danger-outline btn-sm btn-icon" onClick={() => openEliminar(s)}>
                <Icon d={IC.trash} size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal crear / editar */}
      {(modal === "crear" || modal === "editar") && (
        <Modal
          title={modal === "crear" ? "Nueva Sede" : `Editar — ${selected?.nombre}`}
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleGuardar} disabled={saving}>
                {saving ? "Guardando..." : modal === "crear" ? "Crear sede" : "Guardar cambios"}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Nombre de la sede</label>
            <input className="form-input" placeholder="Ej: Sede Centro" {...field("nombre")} />
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input className="form-input" placeholder="Calle y número" {...field("direccion")} />
          </div>
        </Modal>
      )}

      {/* Modal eliminar */}
      {modal === "eliminar" && (
        <Modal
          title="Eliminar sede"
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
            ¿Eliminás <strong>{selected?.nombre}</strong>? Esta acción no se puede deshacer.
          </div>
        </Modal>
      )}
    </div>
  );
}

const styles = {
  sedeCard: {
    background: "white",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 20,
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sedeIconWrap: {
    width: 40, height: 40,
    background: "var(--primary-light)",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sedeName:  { fontSize: 15, fontWeight: 700 },
  sedeDetail: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12.5,
    color: "var(--text-secondary)",
  },
  cardActions: { display: "flex", gap: 8, marginTop: 6 },
};