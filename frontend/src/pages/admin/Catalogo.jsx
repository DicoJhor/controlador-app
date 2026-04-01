import React, { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import productosService from "../../services/productosService";
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
  remove:  "M18 6L6 18 M6 6l12 12",
  chevron: "M6 9l6 6 6-6",
  tag:     "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01",
  ruler:   "M2 12h20 M12 2v20",
};

const CATEGORIAS = ["cables", "equipos", "accesorios", "herramientas", "otros", "ropa", "infraestructura"];
const TALLAS     = ["XS", "S", "M", "L", "XL", "XXL"];
const GENEROS    = ["masculino", "femenino", "unisex"];

const emptyForm = {
  codigo: "", nombre: "", descripcion: "", categoria: "",
  unidad: "", es_medible: false, metros_por_unidad: "",
  tiene_variantes: false,
};

const emptyVarianteForm = {
  talla: "S", genero: "masculino", codigo: "",
  stock_total: "0", stock_minimo: "0",
};

const emptyVarianteInline = {
  talla: "S", genero: "masculino", codigo: "",
  stock_total: "0", stock_minimo: "0",
};

function VarianteBadge({ talla, genero }) {
  const generoLabel = { masculino: "M", femenino: "F", unisex: "U" };
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {genero && (
        <span style={{
          background: genero === "masculino" ? "#EFF6FF" : genero === "femenino" ? "#FDF2F8" : "#F0FDF4",
          color: genero === "masculino" ? "#1D4ED8" : genero === "femenino" ? "#9D174D" : "#166534",
          fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 6,
        }}>
          {generoLabel[genero] ?? genero}
        </span>
      )}
      {talla && (
        <span style={{
          background: "#F8FAFC", color: "#475569",
          fontSize: 11, fontWeight: 700, padding: "1px 6px",
          borderRadius: 6, border: "1px solid #E2E8F0",
        }}>
          {talla}
        </span>
      )}
    </div>
  );
}

export default function AdminCatalogo() {
  const { isSuperadmin } = useAuth();

  const [catalogo,       setCatalogo]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [search,         setSearch]         = useState("");
  const [filterCat,      setFilterCat]      = useState("todas");
  const [modal,          setModal]          = useState(false);
  const [selected,       setSelected]       = useState(null);
  const [form,           setForm]           = useState(emptyForm);
  const [saving,         setSaving]         = useState(false);
  const [success,        setSuccess]        = useState(null);

  // ── Variantes ──────────────────────────────────────────
  const [variantesMap,      setVariantesMap]      = useState({});
  const [expandedProduct,   setExpandedProduct]   = useState(null);
  const [loadingVariantes,  setLoadingVariantes]  = useState({});
  const [varianteModal,     setVarianteModal]     = useState(false);
  const [varianteSelected,  setVarianteSelected]  = useState(null);
  const [varianteForm,      setVarianteForm]      = useState(emptyVarianteForm);
  const [varianteProductoId, setVarianteProductoId] = useState(null);

  // ── Variantes inline (al crear producto) ──────────────
  const [variantesInline,     setVariantesInline]     = useState([]);
  const [varianteInlineForm,  setVarianteInlineForm]  = useState(emptyVarianteInline);
  const [varianteInlineError, setVarianteInlineError] = useState("");

  useEffect(() => {
    cargarCatalogo();
  }, []);

  const cargarCatalogo = () => {
    setLoading(true);
    productosService.getAll()
      .then(data => { setCatalogo(data); setLoading(false); })
      .catch(() => { setError("No se pudo cargar el catálogo"); setLoading(false); });
  };

  const filtered = catalogo.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
                        (p.codigo ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat    = filterCat === "todas" || p.categoria === filterCat;
    return matchSearch && matchCat;
  });

  // ── Variantes helpers ──────────────────────────────────
  const toggleVariantes = async (productoId) => {
    if (expandedProduct === productoId) { setExpandedProduct(null); return; }
    setExpandedProduct(productoId);
    if (!variantesMap[productoId]) {
      setLoadingVariantes(prev => ({ ...prev, [productoId]: true }));
      try {
        const data = await productosService.getVariantes(productoId);
        setVariantesMap(prev => ({ ...prev, [productoId]: data }));
      } catch {
        alert("No se pudieron cargar las variantes");
      } finally {
        setLoadingVariantes(prev => ({ ...prev, [productoId]: false }));
      }
    }
  };

  const openCrearVariante = (productoId) => {
    setVarianteProductoId(productoId);
    setVarianteSelected(null);
    setVarianteForm(emptyVarianteForm);
    setVarianteModal("crear");
  };

  const openEditarVariante = (variante, productoId) => {
    setVarianteProductoId(productoId);
    setVarianteSelected(variante);
    setVarianteForm({
      talla:        variante.talla ?? "",
      genero:       variante.genero ?? "",
      codigo:       variante.codigo ?? "",
      stock_total:  String(variante.stock_total ?? 0),
      stock_minimo: String(variante.stock_minimo ?? 0),
    });
    setVarianteModal("editar");
  };

  const openEliminarVariante = (variante, productoId) => {
    setVarianteProductoId(productoId);
    setVarianteSelected(variante);
    setVarianteModal("eliminar");
  };

  const handleGuardarVariante = async () => {
    setSaving(true);
    try {
      const payload = {
        talla:        varianteForm.talla || null,
        genero:       varianteForm.genero || null,
        codigo:       varianteForm.codigo || null,
        stock_total:  Number(varianteForm.stock_total) || 0,
        stock_minimo: Number(varianteForm.stock_minimo) || 0,
      };
      if (varianteModal === "crear") {
        const nueva = await productosService.crearVariante(varianteProductoId, payload);
        setVariantesMap(prev => ({
          ...prev,
          [varianteProductoId]: [...(prev[varianteProductoId] ?? []), nueva],
        }));
        setCatalogo(prev => prev.map(p =>
          p.id === varianteProductoId ? { ...p, tiene_variantes: 1 } : p
        ));
      } else {
        const updated = await productosService.actualizarVariante(varianteSelected.id, payload);
        setVariantesMap(prev => ({
          ...prev,
          [varianteProductoId]: prev[varianteProductoId].map(v =>
            v.id === varianteSelected.id ? updated : v
          ),
        }));
      }
      setVarianteModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarVariante = async () => {
    setSaving(true);
    try {
      await productosService.eliminarVariante(varianteSelected.id);
      const restantes = (variantesMap[varianteProductoId] ?? [])
        .filter(v => v.id !== varianteSelected.id);
      setVariantesMap(prev => ({ ...prev, [varianteProductoId]: restantes }));
      if (restantes.length === 0) {
        setCatalogo(prev => prev.map(p =>
          p.id === varianteProductoId ? { ...p, tiene_variantes: 0 } : p
        ));
      }
      setVarianteModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const varianteField = (key) => ({
    value: varianteForm[key],
    onChange: (e) => setVarianteForm(prev => ({ ...prev, [key]: e.target.value })),
  });

  // ── Variantes inline ───────────────────────────────────
  const agregarVarianteInline = () => {
    setVarianteInlineError("");
    const { talla, genero } = varianteInlineForm;
    const duplicada = variantesInline.find(v => v.talla === talla && v.genero === genero);
    if (duplicada) {
      setVarianteInlineError(`Ya agregaste ${genero} — ${talla}.`);
      return;
    }
    setVariantesInline(prev => [...prev, { ...varianteInlineForm, _key: Date.now() }]);
    setVarianteInlineForm(emptyVarianteInline);
  };

  const quitarVarianteInline = (key) =>
    setVariantesInline(prev => prev.filter(v => v._key !== key));

  const inlineField = (key) => ({
    value: varianteInlineForm[key],
    onChange: (e) => setVarianteInlineForm(prev => ({ ...prev, [key]: e.target.value })),
  });

  // ── CRUD producto ──────────────────────────────────────
  const openCrear = () => {
    setForm(emptyForm);
    setSelected(null);
    setVariantesInline([]);
    setVarianteInlineForm(emptyVarianteInline);
    setVarianteInlineError("");
    setModal("crear");
  };

  const openEditar = (p) => {
    setForm({
      codigo:           p.codigo ?? "",
      nombre:           p.nombre,
      descripcion:      p.descripcion ?? "",
      categoria:        p.categoria ?? "",
      unidad:           p.unidad ?? "",
      es_medible:       !!p.es_medible,
      metros_por_unidad: p.metros_por_unidad ?? "",
      tiene_variantes:  !!p.tiene_variantes,
    });
    setSelected(p);
    setModal("editar");
  };

  const openEliminar = (p) => { setSelected(p); setModal("eliminar"); };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const payload = {
        codigo:            form.codigo || null,
        nombre:            form.nombre,
        descripcion:       form.descripcion || null,
        categoria:         form.categoria || null,
        unidad:            form.unidad || null,
        es_medible:        form.es_medible ? 1 : 0,
        metros_por_unidad: form.es_medible ? (Number(form.metros_por_unidad) || null) : null,
        tiene_variantes:   form.tiene_variantes ? 1 : 0,
        // stock siempre 0 desde catálogo — cada sede maneja el suyo
        stock_total:       0,
        stock_minimo:      0,
        metros_disponibles: 0,
        estado:            1,
      };

      if (modal === "crear") {
        const nuevo = await productosService.create(payload);

        if (form.tiene_variantes && variantesInline.length > 0) {
          const creadas = [];
          for (const v of variantesInline) {
            const nueva = await productosService.crearVariante(nuevo.id, {
              talla:        v.talla,
              genero:       v.genero,
              codigo:       v.codigo || null,
              stock_total:  0,
              stock_minimo: 0,
            });
            creadas.push(nueva);
          }
          setVariantesMap(prev => ({ ...prev, [nuevo.id]: creadas }));
          setExpandedProduct(nuevo.id);
        } else if (form.tiene_variantes) {
          setVariantesMap(prev => ({ ...prev, [nuevo.id]: [] }));
          setExpandedProduct(nuevo.id);
        }

        setCatalogo(prev => [...prev, nuevo]);
        setModal(false);
        setSuccess("creado");
        setTimeout(() => setSuccess(null), 3500);

        setTimeout(() => {
          document.getElementById(`catalogo-row-${nuevo.id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);

      } else {
        await productosService.update(selected.id, { ...payload, estado: selected.estado });
        setCatalogo(prev => prev.map(p =>
          p.id === selected.id ? { ...p, ...payload } : p
        ));
        setModal(false);
        setSuccess("editado");
        setTimeout(() => setSuccess(null), 3500);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    setSaving(true);
    try {
      await productosService.remove(selected.id);
      setCatalogo(prev => prev.filter(p => p.id !== selected.id));
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

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando catálogo...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      {success === "creado" && (
        <div className="alert alert-success">
          <Icon d={IC.plus} size={15} color="var(--success)" />
          Producto creado en el catálogo global.
        </div>
      )}
      {success === "editado" && (
        <div className="alert alert-success">
          <Icon d={IC.edit} size={15} color="var(--success)" />
          Producto actualizado correctamente.
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Icon d={IC.search} size={16} color="var(--text-muted)" />
          <input
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="todas">Todas las categorías</option>
          {CATEGORIAS.map(c => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={openCrear}>
          <Icon d={IC.plus} size={15} />
          Nuevo producto
        </button>
      </div>

      {/* Tabla catálogo */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Unidad</th>
                <th>Medible</th>
                <th>Variantes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    Sin productos en el catálogo
                  </td>
                </tr>
              ) : filtered.map(p => {
                const isExpanded = expandedProduct === p.id;
                const variantes  = variantesMap[p.id] ?? [];
                return (
                  <React.Fragment key={p.id}>
                    <tr id={`catalogo-row-${p.id}`}
                      style={{ background: isExpanded ? "var(--hover)" : "transparent" }}>
                      <td><span className="mono">{p.codigo ?? "—"}</span></td>
                      <td>
                        <div className="fw-600">{p.nombre}</div>
                        {p.descripcion && <div className="text-sm text-muted">{p.descripcion}</div>}
                      </td>
                      <td>
                        {p.categoria
                          ? <Badge variant="blue">{p.categoria}</Badge>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-sm">{p.unidad ?? "—"}</td>
                      <td>
                        {p.es_medible ? (
                          <div>
                            <Badge variant="active">Sí</Badge>
                            <div className="text-sm text-muted" style={{ marginTop: 2 }}>
                              {p.metros_por_unidad}m/rollo
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted">No</span>
                        )}
                      </td>
                      <td>
                        {p.tiene_variantes ? (
                          <button className="btn btn-outline btn-sm"
                            onClick={() => toggleVariantes(p.id)}
                            style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Icon d={IC.tag} size={12} />
                            {variantesMap[p.id]
                              ? `${variantesMap[p.id].length} variante(s)`
                              : "Ver variantes"}
                            <span style={{
                              display: "inline-block", transition: "transform .2s",
                              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)"
                            }}>
                              <Icon d={IC.chevron} size={12} />
                            </span>
                          </button>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-outline btn-sm btn-icon" onClick={() => openEditar(p)}>
                            <Icon d={IC.edit} size={13} />
                          </button>
                          {isSuperadmin && (
                            <button className="btn btn-danger-outline btn-sm btn-icon" onClick={() => openEliminar(p)}>
                              <Icon d={IC.trash} size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Panel variantes expandido */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0, background: "#F8FAFC" }}>
                          <div style={{ padding: "12px 20px 16px", borderTop: "1px solid var(--border)" }}>
                            {loadingVariantes[p.id] ? (
                              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Cargando variantes...</div>
                            ) : (
                              <>
                                {variantes.length > 0 && (
                                  <table style={{ width: "100%", marginBottom: 12, fontSize: 13 }}>
                                    <thead>
                                      <tr>
                                        <th style={thStyle}>Variante</th>
                                        <th style={thStyle}>Código</th>
                                        <th style={thStyle}></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {variantes.map(v => (
                                        <tr key={v.id} style={{ background: "white" }}>
                                          <td style={{ padding: "8px 12px" }}>
                                            <VarianteBadge talla={v.talla} genero={v.genero} />
                                          </td>
                                          <td style={{ padding: "8px 12px" }}>
                                            <span className="mono">{v.codigo ?? "—"}</span>
                                          </td>
                                          <td style={{ padding: "8px 12px" }}>
                                            <div style={{ display: "flex", gap: 6 }}>
                                              <button className="btn btn-outline btn-sm btn-icon"
                                                onClick={() => openEditarVariante(v, p.id)}>
                                                <Icon d={IC.edit} size={12} />
                                              </button>
                                              {isSuperadmin && (
                                                <button className="btn btn-danger-outline btn-sm btn-icon"
                                                  onClick={() => openEliminarVariante(v, p.id)}>
                                                  <Icon d={IC.trash} size={12} />
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                                <button className="btn btn-outline btn-sm"
                                  onClick={() => openCrearVariante(p.id)}
                                  style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <Icon d={IC.plus} size={13} />
                                  Agregar variante
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Crear / Editar producto ── */}
      {(modal === "crear" || modal === "editar") && (
        <Modal
          title={modal === "crear" ? "Nuevo producto al catálogo" : `Editar — ${selected?.nombre}`}
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGuardar} disabled={saving || !form.nombre}>
                {saving ? "Guardando..." : modal === "crear" ? "Crear producto" : "Guardar cambios"}
              </button>
            </>
          }
        >
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Código</label>
              <input className="form-input" placeholder="Ej: INF-CB-006" {...field("codigo")} />
            </div>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select className="form-input" {...field("categoria")}>
                <option value="">Seleccionar...</option>
                {CATEGORIAS.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nombre del producto *</label>
            <input className="form-input" placeholder="Ej: Rollo Fibra Drop 1 Hilo" {...field("nombre")} />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input className="form-input" placeholder="Descripción opcional" {...field("descripcion")} />
          </div>

          <div className="form-group">
            <label className="form-label">Unidad</label>
            <input className="form-input" placeholder="rollo, unidad, caja, par..." {...field("unidad")} />
          </div>

          {/* ¿Es medible? */}
          {!form.tiene_variantes && (
            <div className="form-group" style={{ marginTop: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                <input type="checkbox" checked={!!form.es_medible}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    es_medible: e.target.checked,
                    metros_por_unidad: "",
                  }))} />
                Este producto se mide en metros (cable, fibra, rollo…)
              </label>
            </div>
          )}

          {form.es_medible && !form.tiene_variantes && (
            <div className="form-group">
              <label className="form-label">Metros por unidad / rollo</label>
              <input className="form-input" type="number" min="1"
                placeholder="Ej: 1000" {...field("metros_por_unidad")} />
            </div>
          )}

          {/* ── Variantes ── */}
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox" checked={!!form.tiene_variantes}
                onChange={e => {
                  setForm(prev => ({
                    ...prev,
                    tiene_variantes: e.target.checked,
                    es_medible: false,
                    metros_por_unidad: "",
                  }));
                  if (!e.target.checked) {
                    setVariantesInline([]);
                    setVarianteInlineError("");
                  }
                }} />
              Este producto tiene variantes (talla / género)
            </label>

            {form.tiene_variantes && modal === "crear" && (
              <div style={{ marginTop: 12 }}>
                <div style={{
                  background: "var(--hover)", borderRadius: 8,
                  border: "1px solid var(--border)", padding: "12px 14px", marginBottom: 10
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Nueva variante
                  </div>
                  <div className="form-row" style={{ marginBottom: 8 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Género</label>
                      <select className="form-input" {...inlineField("genero")}>
                        {GENEROS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Talla</label>
                      <select className="form-input" {...inlineField("talla")}>
                        {TALLAS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="form-label">Código de variante</label>
                    <input className="form-input" placeholder="Ej: PLO-M-S" {...inlineField("codigo")} />
                  </div>
                  {varianteInlineError && (
                    <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 8 }}>
                      {varianteInlineError}
                    </div>
                  )}
                  <button type="button" className="btn btn-outline btn-sm"
                    onClick={agregarVarianteInline}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon d={IC.plus} size={13} />
                    Agregar variante
                  </button>
                </div>

                {variantesInline.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                      Variantes a crear ({variantesInline.length})
                    </div>
                    {variantesInline.map(v => (
                      <div key={v._key} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "7px 10px", borderRadius: 7,
                        background: "white", border: "1px solid var(--border)"
                      }}>
                        <VarianteBadge talla={v.talla} genero={v.genero} />
                        {v.codigo && <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{v.codigo}</span>}
                        <button type="button" className="btn btn-danger-outline btn-sm btn-icon"
                          style={{ marginLeft: "auto" }}
                          onClick={() => quitarVarianteInline(v._key)}>
                          <Icon d={IC.remove} size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>
                    Todavía no agregaste variantes. Podés hacerlo ahora o después desde la tabla.
                  </div>
                )}
              </div>
            )}

            {form.tiene_variantes && modal === "editar" && (
              <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--hover)", borderRadius: 8, fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon d={IC.tag} size={13} color="var(--text-muted)" />
                Para editar variantes expandí el producto en la tabla.
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Modal Eliminar producto ── */}
      {modal === "eliminar" && (
        <Modal title="Eliminar producto" onClose={() => setModal(false)}
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
            ¿Eliminás <strong>{selected?.nombre}</strong> del catálogo global? Esta acción eliminará el producto de todas las sedes y no se puede deshacer.
          </div>
        </Modal>
      )}

      {/* ── Modal Crear / Editar variante ── */}
      {(varianteModal === "crear" || varianteModal === "editar") && (
        <Modal
          title={varianteModal === "crear" ? "Nueva variante" : "Editar variante"}
          onClose={() => setVarianteModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setVarianteModal(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGuardarVariante} disabled={saving}>
                {saving ? "Guardando..." : varianteModal === "crear" ? "Agregar" : "Guardar cambios"}
              </button>
            </>
          }
        >
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Género</label>
              <select className="form-input" {...varianteField("genero")}>
                {GENEROS.map(g => (
                  <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Talla</label>
              <select className="form-input" {...varianteField("talla")}>
                {TALLAS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Código de variante</label>
            <input className="form-input" placeholder="Ej: PLO-M-S" {...varianteField("codigo")} />
          </div>
        </Modal>
      )}

      {/* ── Modal Eliminar variante ── */}
      {varianteModal === "eliminar" && (
        <Modal title="Eliminar variante" onClose={() => setVarianteModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setVarianteModal(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-danger-outline" onClick={handleEliminarVariante} disabled={saving}>
                {saving ? "Eliminando..." : "Eliminar"}
              </button>
            </>
          }
        >
          <div className="alert alert-danger" style={{ marginBottom: 0 }}>
            <Icon d={IC.alert} size={15} color="var(--danger)" />
            ¿Eliminás la variante <strong>{varianteSelected?.genero} — {varianteSelected?.talla}</strong>? Esta acción no se puede deshacer.
          </div>
        </Modal>
      )}
    </div>
  );
}

const thStyle = {
  padding: "7px 12px",
  background: "#F1F5F9",
  color: "#475569",
  fontWeight: 600,
  fontSize: 12,
  textAlign: "left",
  borderBottom: "1px solid var(--border)",
};