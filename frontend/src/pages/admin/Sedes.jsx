import { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import sedesService from "../../services/sedesService";
import activosService from "../../services/activosService";
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
  plus:     "M12 5v14 M5 12h14",
  search:   "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  edit:     "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:    "M3 6h18 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6 M10 11v6 M14 11v6 M9 6V4h6v2",
  building: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  map:      "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 7a3 3 0 100 6 3 3 0 000-6z",
  alert:    "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
  chevron:  "M6 9l6 6 6-6",
  monitor:  "M2 3h20v14H2z M8 21h8 M12 17v4",
  box:      "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  move:     "M5 9l-3 3 3 3 M9 5l3-3 3 3 M15 19l-3 3-3-3 M19 9l3 3-3 3 M2 12h20 M12 2v20",
};

const ESTADO_CONFIG = {
  operativo:     { label: "Operativo",     color: "#16a34a", bg: "#dcfce7" },
  dañado:        { label: "Dañado",        color: "#dc2626", bg: "#fee2e2" },
  en_reparacion: { label: "En reparación", color: "#d97706", bg: "#fef3c7" },
  de_baja:       { label: "De baja",       color: "#6b7280", bg: "#f3f4f6" },
};

const emptyForm       = { nombre: "", direccion: "" };
const emptyActivoForm = { nombre: "", descripcion: "", nro_serie: "", estado: "operativo", area: "NOC" };
const emptyMoverForm  = { sede_id: "", area: "NOC" };

export default function AdminSedes() {
  const [sedes,       setSedes]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [search,      setSearch]      = useState("");
  const [modal,       setModal]       = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [form,        setForm]        = useState(emptyForm);
  const [saving,      setSaving]      = useState(false);

  // Activos
  const [sedeActiva,    setSedeActiva]    = useState(null); // id de sede expandida
  const [areaActiva,    setAreaActiva]    = useState("NOC");
  const [activos,       setActivos]       = useState({});   // { [sede_id]: [...] }
  const [loadingActivos, setLoadingActivos] = useState({});
  const [activoModal,   setActivoModal]   = useState(false);
  const [activoSelected, setActivoSelected] = useState(null);
  const [activoForm,    setActivoForm]    = useState(emptyActivoForm);
  const [moverForm,     setMoverForm]     = useState(emptyMoverForm);

  const { isSuperadmin } = useAuth();

  useEffect(() => {
    sedesService.getAll()
      .then(data => { setSedes(data); setLoading(false); })
      .catch(() => { setError("No se pudieron cargar las sedes"); setLoading(false); });
  }, []);

  const filtered = sedes.filter(s =>
    s.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (s.direccion ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Sedes CRUD ─────────────────────────────────────────────
  const openCrear = () => { setForm(emptyForm); setSelected(null); setModal("crear"); };
  const openEditar = (sede) => {
    setForm({ nombre: sede.nombre, direccion: sede.direccion ?? "" });
    setSelected(sede);
    setModal("editar");
  };
  const openEliminar = (sede) => { setSelected(sede); setModal("eliminar"); };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      if (modal === "crear") {
        const nueva = await sedesService.create(form);
        setSedes(prev => [...prev, nueva]);
      } else {
        await sedesService.update(selected.id, { ...form, estado: selected.estado });
        setSedes(prev => prev.map(s => s.id === selected.id ? { ...s, ...form } : s));
      }
      setModal(false);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleEliminar = async () => {
    setSaving(true);
    try {
      await sedesService.remove(selected.id);
      setSedes(prev => prev.filter(s => s.id !== selected.id));
      setModal(false);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm(prev => ({ ...prev, [key]: e.target.value })),
  });

  // ── Activos ────────────────────────────────────────────────
  const toggleSede = async (sedeId) => {
    if (sedeActiva === sedeId) { setSedeActiva(null); return; }
    setSedeActiva(sedeId);
    setAreaActiva("NOC");
    if (!activos[sedeId]) {
      setLoadingActivos(prev => ({ ...prev, [sedeId]: true }));
      try {
        const data = await activosService.getBySede(sedeId);
        setActivos(prev => ({ ...prev, [sedeId]: data }));
      } catch { alert("No se pudieron cargar los activos"); }
      finally { setLoadingActivos(prev => ({ ...prev, [sedeId]: false })); }
    }
  };

  const activosDeSede = (sedeId, area) =>
    (activos[sedeId] ?? []).filter(a => a.area === area);

  const openCrearActivo = (sedeId, area) => {
    setActivoForm({ ...emptyActivoForm, area, sede_id: sedeId });
    setActivoSelected(null);
    setActivoModal("crear");
  };

  const openEditarActivo = (activo) => {
    setActivoForm({
      nombre:      activo.nombre,
      descripcion: activo.descripcion ?? "",
      nro_serie:   activo.nro_serie ?? "",
      estado:      activo.estado,
      area:        activo.area,
      sede_id:     activo.sede_id,
    });
    setMoverForm({ sede_id: activo.sede_id, area: activo.area });
    setActivoSelected(activo);
    setActivoModal("editar");
  };

  const openEliminarActivo = (activo) => {
    setActivoSelected(activo);
    setActivoModal("eliminar");
  };

  const handleGuardarActivo = async () => {
    setSaving(true);
    try {
      if (activoModal === "crear") {
        const nuevo = await activosService.create({
          sede_id:     activoForm.sede_id,
          area:        activoForm.area,
          nombre:      activoForm.nombre,
          descripcion: activoForm.descripcion || null,
          nro_serie:   activoForm.nro_serie || null,
          estado:      activoForm.estado,
        });
        setActivos(prev => ({
          ...prev,
          [activoForm.sede_id]: [...(prev[activoForm.sede_id] ?? []), nuevo],
        }));
      } else {
        // Si superadmin cambió sede o área, incluirlos
        const payload = {
          nombre:      activoForm.nombre,
          descripcion: activoForm.descripcion || null,
          nro_serie:   activoForm.nro_serie || null,
          estado:      activoForm.estado,
          ...(isSuperadmin ? { sede_id: moverForm.sede_id, area: moverForm.area } : {}),
        };
        const actualizado = await activosService.update(activoSelected.id, payload);
        const sedeOrigen  = activoSelected.sede_id;
        const sedeDestino = isSuperadmin ? moverForm.sede_id : sedeOrigen;

        // Si cambió de sede, remover de la sede origen y agregar a destino
        if (String(sedeOrigen) !== String(sedeDestino)) {
          setActivos(prev => ({
            ...prev,
            [sedeOrigen]:  (prev[sedeOrigen] ?? []).filter(a => a.id !== activoSelected.id),
            [sedeDestino]: [...(prev[sedeDestino] ?? []), actualizado],
          }));
        } else {
          setActivos(prev => ({
            ...prev,
            [sedeOrigen]: (prev[sedeOrigen] ?? []).map(a =>
              a.id === activoSelected.id ? actualizado : a
            ),
          }));
        }
      }
      setActivoModal(false);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleEliminarActivo = async () => {
    setSaving(true);
    try {
      await activosService.remove(activoSelected.id);
      setActivos(prev => ({
        ...prev,
        [activoSelected.sede_id]: (prev[activoSelected.sede_id] ?? []).filter(a => a.id !== activoSelected.id),
      }));
      setActivoModal(false);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const activoField = (key) => ({
    value: activoForm[key],
    onChange: (e) => setActivoForm(prev => ({ ...prev, [key]: e.target.value })),
  });

  const moverField = (key) => ({
    value: moverForm[key],
    onChange: (e) => setMoverForm(prev => ({ ...prev, [key]: e.target.value })),
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

      {/* Lista de sedes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ color: "var(--text-muted)", padding: 32 }}>Sin sedes registradas</div>
        ) : filtered.map(s => (
          <div key={s.id} style={styles.sedeCard}>

            {/* Cabecera de la sede */}
            <div style={styles.sedeHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={styles.sedeIconWrap}>
                  <Icon d={IC.building} size={20} color="var(--primary)" />
                </div>
                <div>
                  <div style={styles.sedeName}>{s.nombre}</div>
                  <div style={styles.sedeDetail}>
                    <Icon d={IC.map} size={12} color="var(--text-muted)" />
                    <span>{s.direccion ?? "Sin dirección"}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Badge variant={s.estado === 1 ? "active" : "inactive"}>
                  {s.estado === 1 ? "Activa" : "Inactiva"}
                </Badge>
                <button className="btn btn-outline btn-sm" onClick={() => openEditar(s)}>
                  <Icon d={IC.edit} size={13} /> Editar
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => toggleSede(s.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Icon d={IC.box} size={13} />
                  Activos
                  <span style={{
                    display: "inline-block",
                    transition: "transform .2s",
                    transform: sedeActiva === s.id ? "rotate(180deg)" : "rotate(0deg)",
                  }}>
                    <Icon d={IC.chevron} size={13} />
                  </span>
                </button>
                {isSuperadmin && (
                  <button className="btn btn-danger-outline btn-sm btn-icon" onClick={() => openEliminar(s)}>
                    <Icon d={IC.trash} size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Panel de activos expandible */}
            {sedeActiva === s.id && (
              <div style={styles.activosPanel}>

                {/* Tabs NOC / ADMINISTRACIÓN */}
                <div style={styles.tabs}>
                  {["NOC", "ADMINISTRACION"].map(area => (
                    <button
                      key={area}
                      onClick={() => setAreaActiva(area)}
                      style={{
                        ...styles.tab,
                        ...(areaActiva === area ? styles.tabActive : {}),
                      }}
                    >
                      {area === "NOC" ? "NOC" : "Administración"}
                      <span style={styles.tabCount}>
                        {activosDeSede(s.id, area).length}
                      </span>
                    </button>
                  ))}
                  <div style={{ flex: 1 }} />
                  <button className="btn btn-primary btn-sm" onClick={() => openCrearActivo(s.id, areaActiva)}>
                    <Icon d={IC.plus} size={13} />
                    Agregar activo
                  </button>
                </div>

                {/* Tabla de activos */}
                {loadingActivos[s.id] ? (
                  <div style={{ padding: 20, color: "var(--text-muted)", fontSize: 13 }}>Cargando activos...</div>
                ) : activosDeSede(s.id, areaActiva).length === 0 ? (
                  <div style={{ padding: 20, color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
                    Sin activos registrados en {areaActiva === "NOC" ? "NOC" : "Administración"}
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Descripción</th>
                          <th>N° Serie</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activosDeSede(s.id, areaActiva).map(a => {
                          const est = ESTADO_CONFIG[a.estado] ?? ESTADO_CONFIG.operativo;
                          return (
                            <tr key={a.id}>
                              <td className="fw-600">{a.nombre}</td>
                              <td className="text-sm text-muted">{a.descripcion ?? "—"}</td>
                              <td className="text-sm mono">{a.nro_serie ?? "—"}</td>
                              <td>
                                <span style={{
                                  background: est.bg, color: est.color,
                                  padding: "2px 10px", borderRadius: 20,
                                  fontSize: 11, fontWeight: 600,
                                }}>
                                  {est.label}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button className="btn btn-outline btn-sm btn-icon" onClick={() => openEditarActivo(a)}>
                                    <Icon d={IC.edit} size={13} />
                                  </button>
                                  {isSuperadmin && (
                                    <button className="btn btn-danger-outline btn-sm btn-icon" onClick={() => openEliminarActivo(a)}>
                                      <Icon d={IC.trash} size={13} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal crear / editar sede */}
      {(modal === "crear" || modal === "editar") && (
        <Modal
          title={modal === "crear" ? "Nueva Sede" : `Editar — ${selected?.nombre}`}
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
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

      {/* Modal eliminar sede */}
      {modal === "eliminar" && (
        <Modal
          title="Eliminar sede"
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
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

      {/* Modal crear / editar activo */}
      {(activoModal === "crear" || activoModal === "editar") && (
        <Modal
          title={activoModal === "crear" ? "Nuevo Activo" : `Editar — ${activoSelected?.nombre}`}
          onClose={() => setActivoModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setActivoModal(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGuardarActivo} disabled={saving}>
                {saving ? "Guardando..." : activoModal === "crear" ? "Agregar activo" : "Guardar cambios"}
              </button>
            </>
          }
        >
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nombre del activo</label>
              <input className="form-input" placeholder="Ej: Laptop HP ProBook" {...activoField("nombre")} />
            </div>
            <div className="form-group">
              <label className="form-label">N° de serie</label>
              <input className="form-input" placeholder="Ej: SN-2024-001" {...activoField("nro_serie")} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input className="form-input" placeholder="Ej: Core i5, 8GB RAM" {...activoField("descripcion")} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-input" {...activoField("estado")}>
                <option value="operativo">Operativo</option>
                <option value="dañado">Dañado</option>
                <option value="en_reparacion">En reparación</option>
                <option value="de_baja">De baja</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Área</label>
              <select className="form-input" {...activoField("area")} disabled={activoModal === "editar" && !isSuperadmin}>
                <option value="NOC">NOC</option>
                <option value="ADMINISTRACION">Administración</option>
              </select>
            </div>
          </div>

          {/* Sección mover — solo superadmin en modo editar */}
          {activoModal === "editar" && isSuperadmin && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon d={IC.move} size={13} color="var(--text-muted)" />
                MOVER ACTIVO
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Sede destino</label>
                  <select className="form-input" {...moverField("sede_id")}>
                    {sedes.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Área destino</label>
                  <select className="form-input" {...moverField("area")}>
                    <option value="NOC">NOC</option>
                    <option value="ADMINISTRACION">Administración</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Modal eliminar activo */}
      {activoModal === "eliminar" && (
        <Modal
          title="Eliminar activo"
          onClose={() => setActivoModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setActivoModal(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-danger-outline" onClick={handleEliminarActivo} disabled={saving}>
                {saving ? "Eliminando..." : "Eliminar"}
              </button>
            </>
          }
        >
          <div className="alert alert-danger" style={{ marginBottom: 0 }}>
            <Icon d={IC.alert} size={15} color="var(--danger)" />
            ¿Eliminás <strong>{activoSelected?.nombre}</strong>? Esta acción no se puede deshacer.
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
    boxShadow: "var(--shadow-sm)",
    overflow: "hidden",
  },
  sedeHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    flexWrap: "wrap",
    gap: 12,
  },
  sedeIconWrap: {
    width: 40, height: 40,
    background: "var(--primary-light)",
    borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  sedeName:   { fontSize: 15, fontWeight: 700 },
  sedeDetail: { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-secondary)" },
  activosPanel: {
    borderTop: "1px solid var(--border)",
    background: "var(--hover, #f9fafb)",
  },
  tabs: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "12px 20px",
    borderBottom: "1px solid var(--border)",
    background: "white",
  },
  tab: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "6px 14px", borderRadius: 8, border: "none",
    background: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 500, color: "var(--text-muted)",
    transition: "all .15s",
  },
  tabActive: {
    background: "var(--primary)",
    color: "white",
  },
  tabCount: {
    fontSize: 11, fontWeight: 700,
    background: "rgba(0,0,0,.1)",
    padding: "1px 6px", borderRadius: 10,
  },
};