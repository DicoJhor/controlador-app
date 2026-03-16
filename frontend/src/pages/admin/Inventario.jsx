import { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { formatNumber } from "../../utils/formatters";
import productosService from "../../services/productosService";

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
  alert:    "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
};

const CATEGORIAS = ["cables", "equipos", "accesorios", "herramientas", "otros"];

const emptyForm = {
  codigo: "", nombre: "", descripcion: "", categoria: "",
  unidad: "", stock_total: "", stock_minimo: ""
};

function StockBar({ stock, minimo }) {
  if (!minimo) return <span className="mono">{formatNumber(stock)}</span>;
  const max  = minimo * 3;
  const pct  = Math.min(100, Math.round((stock / max) * 100));
  const low  = stock <= minimo;
  const warn = stock <= minimo * 1.5;
  const color = low ? "var(--danger)" : warn ? "var(--warning)" : "var(--success)";
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 15, color }}>{formatNumber(stock)}</div>
      <div className="progress-bar" style={{ width: 80, marginTop: 4 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function AdminInventario() {
  const [productos,  setProductos]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [search,     setSearch]     = useState("");
  const [filterCat,  setFilterCat]  = useState("todas");
  const [modal,      setModal]      = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [form,       setForm]       = useState(emptyForm);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    productosService.getAll()
      .then(data => { setProductos(data); setLoading(false); })
      .catch(() => { setError("No se pudieron cargar los productos"); setLoading(false); });
  }, []);

  const filtered = productos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
                        (p.codigo ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat    = filterCat === "todas" || p.categoria === filterCat;
    return matchSearch && matchCat;
  });

  const lowStockCount = productos.filter(p => p.stock_minimo > 0 && p.stock_total <= p.stock_minimo).length;

  const openCrear = () => {
    setForm(emptyForm);
    setSelected(null);
    setModal("crear");
  };

  const openEditar = (p) => {
    setForm({
      codigo:       p.codigo ?? "",
      nombre:       p.nombre,
      descripcion:  p.descripcion ?? "",
      categoria:    p.categoria ?? "",
      unidad:       p.unidad ?? "",
      stock_total:  String(p.stock_total),
      stock_minimo: String(p.stock_minimo),
    });
    setSelected(p);
    setModal("editar");
  };

  const openEliminar = (p) => {
    setSelected(p);
    setModal("eliminar");
  };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const payload = {
        codigo:       form.codigo || null,
        nombre:       form.nombre,
        descripcion:  form.descripcion || null,
        categoria:    form.categoria || null,
        unidad:       form.unidad || null,
        stock_total:  Number(form.stock_total) || 0,
        stock_minimo: Number(form.stock_minimo) || 0,
      };

      if (modal === "crear") {
        const nuevo = await productosService.create(payload);
        setProductos(prev => [...prev, nuevo]);
      } else {
        await productosService.update(selected.id, { ...payload, estado: selected.estado });
        setProductos(prev =>
          prev.map(p => p.id === selected.id ? { ...p, ...payload } : p)
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
      await productosService.remove(selected.id);
      setProductos(prev => prev.filter(p => p.id !== selected.id));
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

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando productos...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      {/* Alerta stock bajo */}
      {lowStockCount > 0 && (
        <div className="alert alert-danger">
          <Icon d={IC.alert} size={15} color="var(--danger)" />
          <strong>{lowStockCount} producto(s) con stock bajo mínimo.</strong>
          &nbsp;Revisá la columna "Stock".
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

      {/* Tabla */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Unidad</th>
                <th>Stock</th>
                <th>Mínimo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    Sin productos registrados
                  </td>
                </tr>
              ) : filtered.map(p => {
                const low  = p.stock_minimo > 0 && p.stock_total <= p.stock_minimo;
                const warn = p.stock_minimo > 0 && p.stock_total <= p.stock_minimo * 1.5;
                return (
                  <tr key={p.id}>
                    <td><span className="mono">{p.codigo ?? "—"}</span></td>
                    <td>
                      <div className="fw-600">{p.nombre}</div>
                      {p.descripcion && <div className="text-sm text-muted">{p.descripcion}</div>}
                    </td>
                    <td>
                      {p.categoria
                        ? <Badge variant="blue">{p.categoria}</Badge>
                        : <span className="text-muted">—</span>
                      }
                    </td>
                    <td className="text-sm">{p.unidad ?? "—"}</td>
                    <td><StockBar stock={p.stock_total} minimo={p.stock_minimo} /></td>
                    <td className="mono text-muted">{p.stock_minimo}</td>
                    <td>
                      {low
                        ? <Badge variant="danger">⚠ Bajo stock</Badge>
                        : warn
                          ? <Badge variant="warning">Atención</Badge>
                          : <Badge variant="active">OK</Badge>
                      }
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-outline btn-sm btn-icon" onClick={() => openEditar(p)}>
                          <Icon d={IC.edit} size={13} />
                        </button>
                        <button className="btn btn-danger-outline btn-sm btn-icon" onClick={() => openEliminar(p)}>
                          <Icon d={IC.trash} size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear / editar */}
      {(modal === "crear" || modal === "editar") && (
        <Modal
          title={modal === "crear" ? "Nuevo Producto" : `Editar — ${selected?.nombre}`}
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGuardar} disabled={saving}>
                {saving ? "Guardando..." : modal === "crear" ? "Crear producto" : "Guardar cambios"}
              </button>
            </>
          }
        >
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Código</label>
              <input className="form-input" placeholder="Ej: CBL-UTP-001" {...field("codigo")} />
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
            <label className="form-label">Nombre del producto</label>
            <input className="form-input" placeholder="Ej: Cable UTP Cat6" {...field("nombre")} />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input className="form-input" placeholder="Descripción opcional" {...field("descripcion")} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Unidad</label>
              <input className="form-input" placeholder="metros, unidad, caja..." {...field("unidad")} />
            </div>
            <div className="form-group">
              <label className="form-label">Stock mínimo</label>
              <input className="form-input" type="number" min="0" placeholder="0" {...field("stock_minimo")} />
            </div>
          </div>
          {modal === "crear" && (
            <div className="form-group">
              <label className="form-label">Stock inicial</label>
              <input className="form-input" type="number" min="0" placeholder="0" {...field("stock_total")} />
            </div>
          )}
        </Modal>
      )}

      {/* Modal eliminar */}
      {modal === "eliminar" && (
        <Modal
          title="Eliminar producto"
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
    </div>
  );
}