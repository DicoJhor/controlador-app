import React, { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { formatNumber } from "../../utils/formatters";
import { MOTIVOS_ENTRADA, MOTIVOS_SALIDA } from "../../utils/constants";
import stockService from "../../services/stockService";
import activosService from "../../services/activosService";
import productosService from "../../services/productosService";
import onuService from "../../services/onuService";
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
  search:  "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  entry:   "M5 12h14 M12 5l7 7-7 7",
  exit:    "M19 12H5 M12 19l-7-7 7-7",
  alert:   "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
  check:   "M20 6L9 17l-5-5",
  plus:    "M12 5v14 M5 12h14",
  trash:   "M3 6h18 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
  edit:    "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  box:     "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  package: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12",
  remove:  "M18 6L6 18 M6 6l12 12",
  tag:     "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01",
  chevron: "M6 9l6 6 6-6",
};

const ESTADO_CONFIG = {
  operativo:     { label: "Operativo",     color: "#16a34a", bg: "#dcfce7" },
  dañado:        { label: "Dañado",        color: "#dc2626", bg: "#fee2e2" },
  en_reparacion: { label: "En reparación", color: "#d97706", bg: "#fef3c7" },
  de_baja:       { label: "De baja",       color: "#6b7280", bg: "#f3f4f6" },
};

// ── Constantes del formulario de producto ─────────────────────────────────────
const CATEGORIAS = ["cables", "equipos", "accesorios", "herramientas", "otros", "ropa"];
const TALLAS     = ["XS", "S", "M", "L", "XL", "XXL"];
const GENEROS    = ["masculino", "femenino", "unisex"];

const emptyProductoForm = {
  codigo: "", nombre: "", descripcion: "", categoria: "",
  unidad: "", stock_total: "", stock_minimo: "",
  es_medible: false, metros_por_unidad: "",
  tiene_variantes: false,
};

const emptyVarianteInline = {
  talla: "S", genero: "masculino", stock_total: "", stock_minimo: "", codigo: ""
};

// ── Estado inicial entrada y salida ───────────────────────────────────────────
const emptyEntrada       = { motivo: "", comentario: "", items: [] };
const emptySalida        = { tecnico_id: "", motivo: "", comentario: "", items: [] };
const emptySalidaDirecta = { comentario: "", items: [] };
const emptyItem    = { producto_id: "", cantidad: "", metros: "" };
const emptyActivoForm = { nombre: "", descripcion: "", nro_serie: "", estado: "operativo", area: "NOC" };

// ── Componentes auxiliares ────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
export default function CtrlInventario() {
  const { user } = useAuth();
  const sedeId = user?.sede_id;

  // ── Tabs ───────────────────────────────────────────────
  const [tab, setTab] = useState("stock");

  // ── Stock ──────────────────────────────────────────────
  const [stock,    setStock]    = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState("");
  const [modal,    setModal]    = useState(false);
  const [entrada,  setEntrada]  = useState(emptyEntrada);
  const [entradaSearch,  setEntradaSearch]  = useState("");
  const [salida,   setSalida]   = useState(emptySalida);
  const [onusDisponibles, setOnusDisponibles] = useState({}); // { producto_id: [{ id, codigo_pon }] }
  const [onusSeleccionadas, setOnusSeleccionadas] = useState({}); // { producto_id: [onu_id, ...] }
  const [onuSearch, setOnuSearch] = useState({}); // { producto_id: "texto buscador" }
  const [saving,              setSaving]              = useState(false);
  const [success,             setSuccess]             = useState(null);
  const [salidaDirecta,           setSalidaDirecta]           = useState(emptySalidaDirecta);
  const [salidaDirectaSearch,     setSalidaDirectaSearch]      = useState("");
  const [onusDisponiblesSD,       setOnusDisponiblesSD]        = useState({});
  const [onusSeleccionadasSD,     setOnusSeleccionadasSD]      = useState({});
  const [onuSearchSD,             setOnuSearchSD]              = useState({});

  const [onuModal,      setOnuModal]      = useState(false)
  const [onuModalItem,  setOnuModalItem]  = useState(null)
  const [onusLista,     setOnusLista]     = useState([])
  const [onuEditando,   setOnuEditando]   = useState(null)
  const [onuCodigo,     setOnuCodigo]     = useState("")
  const [savingOnu,     setSavingOnu]     = useState(false)
  const [loadingOnus,   setLoadingOnus]   = useState(false)

  // ── Crear producto ─────────────────────────────────────
  const [productoForm,        setProductoForm]        = useState(emptyProductoForm);
  const [variantesInline,     setVariantesInline]     = useState([]);
  const [varianteInlineForm,  setVarianteInlineForm]  = useState(emptyVarianteInline);
  const [varianteInlineError, setVarianteInlineError] = useState("");

  // ── Activos ────────────────────────────────────────────
  const [activos,        setActivos]        = useState([]);
  const [productosGlobales, setProductosGlobales] = useState([]);
  const [loadingActivos, setLoadingActivos] = useState(false);
  const [areaActiva,     setAreaActiva]     = useState("NOC");
  const [activoModal,    setActivoModal]    = useState(false);
  const [activoSelected, setActivoSelected] = useState(null);
  const [activoForm,     setActivoForm]     = useState(emptyActivoForm);

  const [busquedaItem, setBusquedaItem] = useState("");

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = () =>
    Promise.all([stockService.getStock(), stockService.getStats()])
      .then(([dataStock, dataStats]) => {
        setStock(dataStock);
        setTecnicos(dataStats.misTecnicos);
        setLoading(false);
      })
      .catch(() => { setError("No se pudo cargar el inventario"); setLoading(false); });

  useEffect(() => {
    if (tab === "activos" && activos.length === 0 && sedeId) {
      setLoadingActivos(true);
      activosService.getBySede(sedeId)
        .then(data => setActivos(data))
        .catch(() => alert("No se pudieron cargar los activos"))
        .finally(() => setLoadingActivos(false));
    }
  }, [tab, sedeId]);

  const filtered         = stock.filter(i =>
    i.producto.toLowerCase().includes(search.toLowerCase()) ||
    (i.codigo ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const activosFiltrados = activos.filter(a => a.area === areaActiva);
  const lowCount         = stock.filter(i => i.stock_minimo > 0 && i.cantidad <= i.stock_minimo).length;

  // ── Activos CRUD ───────────────────────────────────────
  const openCrearActivo = () => {
    setActivoForm({ ...emptyActivoForm, area: areaActiva });
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
    });
    setActivoSelected(activo);
    setActivoModal("editar");
  };

  const handleGuardarActivo = async () => {
    setSaving(true);
    try {
      if (activoModal === "crear") {
        const nuevo = await activosService.create({
          sede_id:     sedeId,
          area:        activoForm.area,
          nombre:      activoForm.nombre,
          descripcion: activoForm.descripcion || null,
          nro_serie:   activoForm.nro_serie || null,
          estado:      activoForm.estado,
        });
        setActivos(prev => [...prev, nuevo]);
      } else {
        const actualizado = await activosService.update(activoSelected.id, {
          nombre:      activoForm.nombre,
          descripcion: activoForm.descripcion || null,
          nro_serie:   activoForm.nro_serie || null,
          estado:      activoForm.estado,
        });
        setActivos(prev => prev.map(a =>
          a.id === activoSelected.id ? actualizado : a
        ));
      }
      setActivoModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const activoField = (key) => ({
    value:    activoForm[key],
    onChange: (e) => setActivoForm(prev => ({ ...prev, [key]: e.target.value })),
  });

  // ── Crear producto helpers ─────────────────────────────
  const openCrearProducto = () => {
    setProductoForm(emptyProductoForm);
    setVariantesInline([]);
    setVarianteInlineForm(emptyVarianteInline);
    setVarianteInlineError("");
    setModal("crearProducto");
  };

  const productoField = (key) => ({
    value:    productoForm[key],
    onChange: (e) => setProductoForm(prev => ({ ...prev, [key]: e.target.value })),
  });

  const inlineField = (key) => ({
    value:    varianteInlineForm[key],
    onChange: (e) => setVarianteInlineForm(prev => ({ ...prev, [key]: e.target.value })),
  });

  const agregarVarianteInline = () => {
    setVarianteInlineError("");
    const { talla, genero, stock_total, stock_minimo, codigo } = varianteInlineForm;
    const duplicada = variantesInline.find(v => v.talla === talla && v.genero === genero);
    if (duplicada) {
      setVarianteInlineError(`Ya agregaste ${genero} — ${talla}.`);
      return;
    }
    setVariantesInline(prev => [...prev, {
      talla, genero,
      stock_total:  Number(stock_total) || 0,
      stock_minimo: Number(stock_minimo) || 0,
      codigo:       codigo || null,
      _key: Date.now(),
    }]);
    setVarianteInlineForm(emptyVarianteInline);
  };

  const quitarVarianteInline = (key) =>
    setVariantesInline(prev => prev.filter(v => v._key !== key));

  const handleCrearProducto = async () => {
    setSaving(true);
    try {
      const payload = {
        codigo:            productoForm.codigo || null,
        nombre:            productoForm.nombre,
        descripcion:       productoForm.descripcion || null,
        categoria:         productoForm.categoria || null,
        unidad:            productoForm.unidad || null,
        stock_total:       Number(productoForm.stock_total) || 0,
        stock_minimo:      Number(productoForm.stock_minimo) || 0,
        es_medible:        productoForm.es_medible ? 1 : 0,
        metros_por_unidad: productoForm.es_medible ? (Number(productoForm.metros_por_unidad) || null) : null,
        tiene_variantes:   productoForm.tiene_variantes ? 1 : 0,
        sede_id:           sedeId,   // ← le dice al backend en qué sede registrar el stock inicial
      };

      const nuevo = await productosService.create(payload);

      // Si tiene variantes, crearlas todas
      if (productoForm.tiene_variantes && variantesInline.length > 0) {
        for (const v of variantesInline) {
          await productosService.crearVariante(nuevo.id, {
            talla:        v.talla,
            genero:       v.genero,
            stock_total:  v.stock_total,
            stock_minimo: v.stock_minimo,
            codigo:       v.codigo,
          });
        }
      }

      // Refrescar el stock de esta sede para mostrar el nuevo producto
      const dataStock = await stockService.getStock();
      setStock(dataStock);

      setModal(false);
      setSuccess("producto");
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Entrada ────────────────────────────────────────────
  const handleEntrada = async () => {
    setSaving(true);
    try {
      for (const item of entrada.items) {
        // Registrar entrada de stock normal
        await stockService.registrarEntrada({
          producto_id: Number(item.producto_id),
          cantidad:    Number(item.cantidad),
          motivo:      entrada.motivo,
          comentario:  entrada.comentario || null,
        });

        // Si es ONU → crear registros en tabla onus
        if (item.es_onu) {
          const cantidad = Number(item.cantidad);
          for (let i = 0; i < cantidad; i++) {
            const cod = item.codigos_pon[i]?.trim() || null;
            await onuService.crearOnu({
              producto_id: Number(item.producto_id),
              sede_id:     sedeId,
              codigo_pon:  cod,   // null si lo dejaron vacío
            });
          }
        }
      }

      const data = await stockService.getStock();
      setStock(data);
      setModal(false);
      setEntrada(emptyEntrada);
      setEntradaSearch("");
      setSuccess("entrada");
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Salida múltiple ────────────────────────────────────
  const agregarItem = () =>
    setSalida(prev => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));

  const removeItem = (idx) =>
    setSalida(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  const updateItem = async (idx, key, value) => {
    setSalida(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === idx ? { ...item, [key]: value } : item)
    }));


    // Si cambió el producto y es ONU → cargar ONUs disponibles
    if (key === "producto_id" && value) {
      const prod = stock.find(s => String(s.producto_id) === String(value));
      if (prod?.categoria === "onu") {
        try {
          const data = await onuService.getDisponibles(value);
          setOnusDisponibles(prev => ({ ...prev, [value]: data }));
          setOnusSeleccionadas(prev => ({ ...prev, [value]: [] }));
        } catch (e) {
          console.error("Error cargando ONUs disponibles", e);
        }
      }
    }
  };

  const salidaValida = salida.tecnico_id &&
    salida.items.length > 0 &&
    salida.items.every(i => {
      if (!i.producto_id) return false;
      const prod = stock.find(s => String(s.producto_id) === String(i.producto_id));
      if (prod?.categoria === "onu") {
        return (onusSeleccionadas[i.producto_id] ?? []).length > 0;
      }
      if (!i.cantidad || Number(i.cantidad) <= 0) return false;
      return true;
    });

  const handleSalida = async () => {
    setSaving(true);
    try {
      const todasLasOnus = Object.values(onusSeleccionadas).flat();

      const itemsNormales = salida.items
        .filter(i => {
          const prod = stock.find(s => String(s.producto_id) === String(i.producto_id));
          return prod?.categoria !== "onu";
        })
        .map(i => {
          const prod = stock.find(s => String(s.producto_id) === String(i.producto_id));
          const metros = prod?.es_medible && prod?.metros_por_unidad
            ? Number(i.cantidad) * prod.metros_por_unidad
            : undefined;
          return {
            producto_id: Number(i.producto_id),
            cantidad:    Number(i.cantidad),
            metros,
          };
        });
      await stockService.asignarCompleto({
        tecnico_id: Number(salida.tecnico_id),
        comentario: salida.comentario || null,
        items:      itemsNormales,
        onu_ids:    todasLasOnus,
      });

      const data = await stockService.getStock();
      setStock(data);
      setModal(false);
      setBusquedaItem("");
      setSalida(emptySalida);
      setOnusSeleccionadas({});
      setSuccess("salida");
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSalidaDirecta = async () => {
    setSaving(true);
    try {
      const todasLasOnusSD = Object.values(onusSeleccionadasSD).flat();

      const itemsNormalesSD = salidaDirecta.items
        .filter(i => {
          const prod = stock.find(s => String(s.producto_id) === String(i.producto_id));
          return prod?.categoria !== "onu";
        })
        .map(i => ({
          producto_id: Number(i.producto_id),
          cantidad:    Number(i.cantidad),
        }));

      await stockService.salidaDirecta({
        comentario: salidaDirecta.comentario,
        items:      itemsNormalesSD,
        onu_ids:    todasLasOnusSD,
      });
      const data = await stockService.getStock();
      setStock(data);
      setModal(false);
      setSalidaDirecta(emptySalidaDirecta);
      setSalidaDirectaSearch("");
      setOnusSeleccionadasSD({});
      setOnusDisponiblesSD({});
      setSuccess("salidaDirecta");
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const productosYaAgregados = salida.items.map(i => String(i.producto_id));

  const openOnuModal = async (item) => {
  setOnuModalItem(item)
    setOnuModal(true)
    setOnuEditando(null)
    setOnuCodigo("")
    setLoadingOnus(true)
    try {
      // DESPUÉS
      const data = await onuService.getBySedeProducto(sedeId, item.producto_id, true)
      console.log("onus:", JSON.stringify(data))
      setOnusLista(data)
    } catch {
      alert("No se pudieron cargar las ONUs")
    } finally {
      setLoadingOnus(false)
    }
  }

  const handleGuardarCodigo = async () => {
    if (!onuCodigo.trim()) return
    setSavingOnu(true)
    try {
      await onuService.actualizarCodigo(onuEditando.id, onuCodigo.trim())
      setOnusLista(prev => prev.map(o =>
        o.id === onuEditando.id ? { ...o, codigo_pon: onuCodigo.trim() } : o
      ))
      setOnuEditando(null)
      setOnuCodigo("")
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingOnu(false)
    }
  }

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando inventario...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Alertas de éxito */}
      {success === "entrada" && (
        <div className="alert alert-success">
          <Icon d={IC.check} size={15} color="var(--success)" />
          Entrada registrada correctamente.
        </div>
      )}
      {success === "salida" && (
        <div className="alert alert-info">
          <Icon d={IC.check} size={15} color="var(--info)" />
          Salida registrada correctamente.
        </div>
      )}
      {success === "producto" && (
        <div className="alert alert-success">
          <Icon d={IC.check} size={15} color="var(--success)" />
          Producto creado y agregado al inventario de tu sede.
        </div>
      )}
      {success === "salidaDirecta" && (
        <div className="alert alert-warning">
          <Icon d={IC.check} size={15} color="var(--warning)" />
          Salida directa registrada correctamente.
        </div>
      )}

      {lowCount > 0 && tab === "stock" && (
        <div className="alert alert-warning">
          <Icon d={IC.alert} size={15} color="var(--warning)" />
          <strong>{lowCount} ítem(s) con stock bajo mínimo en tu sede.</strong>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--hover)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {[
          { key: "stock",   label: "Stock",   icon: IC.package },
          { key: "activos", label: "Activos", icon: IC.box     },
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

      {/* ── Vista Stock ── */}
      {tab === "stock" && (
        <>
          <div className="toolbar">
            <div className="search-box">
              <Icon d={IC.search} size={16} color="var(--text-muted)" />
              <input placeholder="Buscar ítem..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-outline" onClick={async () => {
              setEntrada(emptyEntrada);
              setEntradaSearch("");
              const data = await productosService.getAll();
              setProductosGlobales(data);
              setModal ("entrada");
            }}>
              <Icon d={IC.entry} size={15} />
              Registrar entrada
            </button>
            <button className="btn btn-outline" onClick={openCrearProducto}>
              <Icon d={IC.plus} size={15} />
              Nuevo producto
            </button>
            <button className="btn btn-outline" onClick={() => {
              setSalidaDirecta(emptySalidaDirecta);
              setSalidaDirectaSearch("");
              setModal("salidaDirecta");
            }}>
              <Icon d={IC.exit} size={15} />
              Salida directa
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
                                {formatNumber(
                                  item.metros_disponibles ?? item.cantidad * (item.metros_por_unidad ?? 0)
                                  )}m
                              </span>
                              <div className="text-sm text-muted">{item.metros_por_unidad}m/rollo</div>
                            </div>
                          ) : <span className="text-muted">—</span>}
                        </td>
                        <td className="mono text-muted">{item.stock_minimo}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {low  ? <Badge variant="danger">⚠ Bajo stock</Badge>
                                  : warn ? <Badge variant="warning">Atención</Badge>
                                  : <Badge variant="active">OK</Badge>}
                            {item.categoria === "onu" && (
                              <button className="btn btn-outline btn-sm"
                                onClick={() => openOnuModal(item)}
                                style={{ fontSize: 11, padding: "2px 8px" }}>
                                <Icon d={IC.tag} size={11} />
                                ONUs
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
          </div>
        </>
      )}

      {/* ── Vista Activos ── */}
      {tab === "activos" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
            {["NOC", "ADMINISTRACION"].map(area => (
              <button key={area} onClick={() => setAreaActiva(area)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 500, transition: "all .15s",
                  background: areaActiva === area ? "var(--primary)" : "var(--hover)",
                  color: areaActiva === area ? "white" : "var(--text-muted)",
                }}>
                {area === "NOC" ? "NOC" : "Administración"}
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  background: "rgba(0,0,0,.1)",
                  padding: "1px 6px", borderRadius: 10,
                }}>
                  {activos.filter(a => a.area === area).length}
                </span>
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button className="btn btn-primary btn-sm" onClick={openCrearActivo}>
              <Icon d={IC.plus} size={13} />
              Agregar activo
            </button>
          </div>

          <div className="card">
            {loadingActivos ? (
              <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando activos...</div>
            ) : activosFiltrados.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
                Sin activos registrados en {areaActiva === "NOC" ? "NOC" : "Administración"}
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th><th>Descripción</th><th>N° Serie</th><th>Estado</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activosFiltrados.map(a => {
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
                            <button className="btn btn-outline btn-sm btn-icon"
                              onClick={() => openEditarActivo(a)}>
                              <Icon d={IC.edit} size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════
          Modal: Nuevo Producto
      ════════════════════════════════════════════════════════ */}
      {modal === "crearProducto" && (
        <Modal
          title="Nuevo Producto"
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => { setModal(false); setBusquedaItem(""); }} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCrearProducto}
                disabled={saving || !productoForm.nombre}>
                {saving ? "Creando..." : "Crear producto"}
              </button>
            </>
          }
        >
          {/* Código y Categoría */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Código</label>
              <input className="form-input" placeholder="Ej: CBL-UTP-001" {...productoField("codigo")} />
            </div>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select className="form-input" {...productoField("categoria")}>
                <option value="">Seleccionar...</option>
                {CATEGORIAS.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Nombre */}
          <div className="form-group">
            <label className="form-label">Nombre del producto *</label>
            <input className="form-input" placeholder="Ej: Cable UTP Cat6" {...productoField("nombre")} />
          </div>

          {/* Descripción */}
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input className="form-input" placeholder="Descripción opcional" {...productoField("descripcion")} />
          </div>

          {/* Unidad y stock mínimo */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Unidad</label>
              <input className="form-input" placeholder="metros, unidad, caja..." {...productoField("unidad")} />
            </div>
            {!productoForm.tiene_variantes && (
              <div className="form-group">
                <label className="form-label">Stock mínimo</label>
                <input className="form-input" type="number" min="0" placeholder="0" {...productoField("stock_minimo")} />
              </div>
            )}
          </div>

          {/* Stock inicial — solo si no tiene variantes */}
          {!productoForm.tiene_variantes && (
            <div className="form-group">
              <label className="form-label">Stock inicial en tu sede</label>
              <input className="form-input" type="number" min="0" placeholder="0" {...productoField("stock_total")} />
            </div>
          )}

          {/* ¿Es medible? */}
          {!productoForm.tiene_variantes && (
            <div className="form-group" style={{ marginTop: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                <input type="checkbox" checked={!!productoForm.es_medible}
                  onChange={e => setProductoForm(prev => ({
                    ...prev,
                    es_medible: e.target.checked,
                    metros_por_unidad: "",
                  }))} />
                Este producto se mide en metros (cable, fibra, rollo…)
              </label>
            </div>
          )}

          {productoForm.es_medible && !productoForm.tiene_variantes && (
            <div className="form-group">
              <label className="form-label">Metros por unidad/rollo</label>
              <input className="form-input" type="number" min="1" placeholder="Ej: 1000" {...productoField("metros_por_unidad")} />
            </div>
          )}

          {/* ── Sección variantes ── */}
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox" checked={!!productoForm.tiene_variantes}
                onChange={e => {
                  setProductoForm(prev => ({
                    ...prev,
                    tiene_variantes: e.target.checked,
                    es_medible: false,
                    stock_total: "",
                    stock_minimo: "",
                  }));
                  if (!e.target.checked) {
                    setVariantesInline([]);
                    setVarianteInlineError("");
                  }
                }} />
              Este producto tiene variantes (talla / género)
            </label>

            {productoForm.tiene_variantes && (
              <div style={{ marginTop: 12 }}>

                {/* Formulario de variante nueva */}
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
                  <div className="form-row" style={{ marginBottom: 8 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Stock inicial</label>
                      <input className="form-input" type="number" min="0" placeholder="0" {...inlineField("stock_total")} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Stock mínimo</label>
                      <input className="form-input" type="number" min="0" placeholder="0" {...inlineField("stock_minimo")} />
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

                {/* Lista variantes acumuladas */}
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
                        <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
                          Stock: <strong>{v.stock_total}</strong>
                          {v.stock_minimo > 0 && ` / Mín: ${v.stock_minimo}`}
                        </span>
                        <button type="button" className="btn btn-danger-outline btn-sm btn-icon"
                          onClick={() => quitarVarianteInline(v._key)}>
                          <Icon d={IC.remove} size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>
                    Todavía no agregaste variantes. Podés hacerlo ahora o después.
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal entrada */}
      {modal === "entrada" && (() => {
        const yaAgregados = entrada.items.map(i => i.producto_id);
        const filtrados   = productosGlobales.filter(p =>
          (p.nombre.toLowerCase().includes(entradaSearch.toLowerCase()) ||
          (p.codigo ?? "").toLowerCase().includes(entradaSearch.toLowerCase())) &&
          !yaAgregados.includes(p.id)
        );
        const entradaValida = entrada.motivo && entrada.items.length > 0 &&
          entrada.items.every(i => Number(i.cantidad) > 0);

        const agregarProductoEntrada = (p) => {
          setEntrada(prev => ({
            ...prev,
            items: [...prev.items, {
              producto_id:       p.id,
              nombre:            p.nombre,
              codigo:            p.codigo,
              cantidad:          "",
              es_medible:        !!p.es_medible,
              metros_por_unidad: p.metros_por_unidad,
              es_onu:            p.categoria === "onu",   // ← nuevo
              codigos_pon:       [],                       // ← nuevo
              mostrar_ponsn:     false,                    // ← nuevo
            }]
          }));
          setEntradaSearch("");
        };
        const quitarItemEntrada = (producto_id) =>
          setEntrada(prev => ({ ...prev, items: prev.items.filter(i => i.producto_id !== producto_id) }));

        const updateCantidadEntrada = (producto_id, value) =>
          setEntrada(prev => ({
            ...prev,
            items: prev.items.map(i => {
              if (i.producto_id !== producto_id) return i;
              // Si es ONU, ajusta el array codigos_pon al nuevo tamaño
              if (i.es_onu) {
                const n = Math.max(0, parseInt(value) || 0);
                const actual = i.codigos_pon ?? [];
                const nuevos = Array.from({ length: n }, (_, idx) => actual[idx] ?? "");
                return { ...i, cantidad: value, codigos_pon: nuevos };
              }
              return { ...i, cantidad: value };
            })
          }));
        const togglePonSn = (producto_id) =>
          setEntrada(prev => ({
            ...prev,
            items: prev.items.map(i =>
              i.producto_id === producto_id
                ? { ...i, mostrar_ponsn: !i.mostrar_ponsn }
                : i
            )
          }));
        
        const updateCodigoPon = (producto_id, idx, value) =>
          setEntrada(prev => ({
            ...prev,
            items: prev.items.map(i => {
              if (i.producto_id !== producto_id) return i;
              const nuevos = [...i.codigos_pon];
              nuevos[idx] = value;
              return { ...i, codigos_pon: nuevos };
            })
          }));

              return (
                <Modal title="Registrar Entrada de Stock" onClose={() => setModal(false)}
                  footer={
                    <>
                      <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
                      <button className="btn btn-success" onClick={handleEntrada} disabled={saving || !entradaValida}>
                        <Icon d={IC.check} size={15} />
                        {saving ? "Registrando..." : `Confirmar (${entrada.items.length} producto${entrada.items.length !== 1 ? "s" : ""})`}
                      </button>
                    </>
                  }
                >
                  {/* Motivo y comentario */}
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Motivo *</label>
                      <select className="form-input" value={entrada.motivo}
                        onChange={e => setEntrada(prev => ({ ...prev, motivo: e.target.value }))}>
                        <option value="">Seleccionar...</option>
                        <option value={MOTIVOS_ENTRADA.COMPRA}>Compra</option>
                        <option value={MOTIVOS_ENTRADA.REPOSICION}>Reposición</option>
                        <option value={MOTIVOS_ENTRADA.TRANSFERENCIA}>Transferencia</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Comentario <span>(opcional)</span></label>
                      <input className="form-input" placeholder="Notas adicionales..."
                        value={entrada.comentario}
                        onChange={e => setEntrada(prev => ({ ...prev, comentario: e.target.value }))} />
                      </div>
                    </div>

                    {/* Buscador */}
                    <div className="form-group">
                      <label className="form-label">Buscar producto</label>
                      <div className="search-box">
                        <Icon d={IC.search} size={16} color="var(--text-muted)" />
                        <input
                          placeholder="Nombre o código..."
                          value={entradaSearch}
                          onChange={e => setEntradaSearch(e.target.value)}
                          autoFocus
                        />
                      </div>

                      {/* Resultados del buscador */}
                      {entradaSearch.length > 0 && (
                        <div style={{
                          border: "1px solid var(--border)", borderRadius: 8,
                          marginTop: 4, maxHeight: 200, overflowY: "auto",
                          background: "white", boxShadow: "0 4px 12px rgba(0,0,0,.08)"
                        }}>
                          {filtrados.length === 0 ? (
                            <div style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: 13 }}>
                              Sin resultados
                            </div>
                          ) : filtrados.map(p => {
                            const enSede = stock.find(s => s.producto_id === p.id);
                            return (
                              <div key={p.id}
                                onClick={() => agregarProductoEntrada(p)}
                                style={{
                                  padding: "9px 14px", cursor: "pointer", fontSize: 13,
                                  borderBottom: "1px solid var(--border)",
                                  display: "flex", justifyContent: "space-between", alignItems: "center",
                                  transition: "background .1s",
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                                onMouseLeave={e => e.currentTarget.style.background = "white"}
                              >
                                <div>
                                  <span style={{ fontWeight: 600 }}>{p.nombre}</span>
                                  {p.codigo && <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>{p.codigo}</span>}
                                  {p.categoria && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>· {p.categoria}</span>}
                                </div>
                                <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", marginLeft: 12 }}>
                                  En sede: <strong>{enSede ? enSede.cantidad : 0}</strong>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Lista de productos agregados */}
                    {entrada.items.length > 0 && (
                      <div className="form-group">
                      <label className="form-label">Productos a ingresar ({entrada.items.length})</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {entrada.items.map(item => (
                          <div key={item.producto_id} style={{
                            borderRadius: 8, background: "var(--hover)",
                            border: "1px solid var(--border)", overflow: "hidden",
                            marginBottom: 2,
                          }}>
                            {/* Fila principal */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.nombre}</div>
                                {item.codigo && (
                                  <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                    {item.codigo}
                                  </div>
                                )}
                              </div>

                              <input
                                className="form-input"
                                type="number" min="1"
                                placeholder="Cantidad"
                                value={item.cantidad}
                                onChange={e => updateCantidadEntrada(item.producto_id, e.target.value)}
                                style={{ width: 100, textAlign: "center" }}
                              />

                              {item.es_medible && item.cantidad && (
                                <span style={{ fontSize: 12, color: "var(--info)", whiteSpace: "nowrap" }}>
                                  = {(Number(item.cantidad) * (item.metros_por_unidad ?? 0)).toLocaleString()}m
                                </span>
                              )}

                              {/* Botón PON-SN solo si es ONU y tiene cantidad */}
                              {item.es_onu && Number(item.cantidad) > 0 && (
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  onClick={() => togglePonSn(item.producto_id)}
                                  style={{
                                    fontSize: 11, padding: "3px 8px", whiteSpace: "nowrap",
                                    borderColor: item.codigos_pon.filter(c => c.trim()).length > 0
                                      ? "var(--success)" : "var(--border)",
                                    color: item.codigos_pon.filter(c => c.trim()).length > 0
                                      ? "var(--success)" : "var(--text-muted)",
                                  }}
                                >
                                  PON-SN ({item.codigos_pon.filter(c => c.trim()).length}/{item.cantidad})
                                </button>
                              )}

                              <button className="btn btn-danger-outline btn-sm btn-icon"
                                onClick={() => quitarItemEntrada(item.producto_id)} type="button">
                                <Icon d={IC.remove} size={12} />
                              </button>
                            </div>

                            {/* Sub-panel PON-SN */}
                            {item.es_onu && item.mostrar_ponsn && Number(item.cantidad) > 0 && (
                              <div style={{
                                borderTop: "1px solid var(--border)",
                                padding: "10px 12px",
                                background: "white",
                              }}>
                                <div style={{
                                  fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                                  textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
                                }}>
                                  Códigos PON-SN — opcional, podés completarlos después
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {item.codigos_pon.map((cod, idx) => (
                                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <span style={{
                                        fontSize: 11, color: "var(--text-muted)", width: 24,
                                        textAlign: "right", flexShrink: 0,
                                      }}>
                                        #{idx + 1}
                                      </span>
                                      <input
                                        className="form-input"
                                        placeholder="Ej: ZTEG12345678  (opcional)"
                                        value={cod}
                                        onChange={e => updateCodigoPon(item.producto_id, idx, e.target.value)}
                                        style={{
                                          fontSize: 12, padding: "5px 10px",
                                          fontFamily: "monospace",
                                          borderColor: cod.trim() ? "var(--success)" : "var(--border)",
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, fontStyle: "italic" }}>
                                  Los campos vacíos quedarán como ONUs sin código registrado.
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entrada.items.length === 0 && (
                    <div style={{ padding: "12px 0", color: "var(--text-muted)", fontSize: 13, fontStyle: "italic" }}>
                      Buscá y seleccioná los productos que querés ingresar.
                    </div>
                  )}
                </Modal>
              );
            })()}

      {/* Modal salida múltiple */}
      {modal === "salida" && (
        <Modal title="Asignar materiales a técnico" onClose={() => setModal(false)}
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
              <select className="form-input" value={salida.tecnico_id}
                onChange={e => setSalida(prev => ({ ...prev, tecnico_id: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ítems a asignar</label>

            {/* Buscador */}
            <div className="search-box" style={{ marginBottom: 8 }}>
              <Icon d={IC.search} size={16} color="var(--text-muted)" />
              <input
                placeholder="Buscar ítem por nombre o código..."
                value={busquedaItem}
                onChange={e => setBusquedaItem(e.target.value)}
              />
            </div>

            {/* Resultados del buscador */}
            {busquedaItem.length > 0 && (
              <div style={{
                border: "1px solid var(--border)", borderRadius: 8,
                marginBottom: 8, maxHeight: 200, overflowY: "auto",
                background: "white", boxShadow: "0 4px 12px rgba(0,0,0,.08)"
              }}>
                {stock
                  .filter(s =>
                    (s.producto.toLowerCase().includes(busquedaItem.toLowerCase()) ||
                    (s.codigo ?? "").toLowerCase().includes(busquedaItem.toLowerCase())) &&
                    !productosYaAgregados.includes(String(s.producto_id))
                  )
                  .map(s => (
                    <div key={s.producto_id}
                      onClick={() => {
                        setSalida(prev => ({ ...prev, items: [...prev.items, { ...emptyItem, producto_id: String(s.producto_id) }] }));
                        if (s.categoria === "onu") {
                          onuService.getDisponibles(s.producto_id).then(data => {
                            setOnusDisponibles(prev => ({ ...prev, [s.producto_id]: data }));
                            setOnusSeleccionadas(prev => ({ ...prev, [s.producto_id]: [] }));
                          }).catch(() => {});
                        }
                        setBusquedaItem("");
                      }}
                      style={{
                        padding: "9px 14px", cursor: "pointer", fontSize: 13,
                        borderBottom: "1px solid var(--border)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "white"}
                    >
                      <div>
                        <span style={{ fontWeight: 600 }}>{s.producto}</span>
                        {s.codigo && <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>{s.codigo}</span>}
                        {s.categoria && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>· {s.categoria}</span>}
                      </div>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", marginLeft: 12 }}>
                        disp: <strong>{s.cantidad}</strong>
                      </span>
                    </div>
                  ))
                }
                {stock.filter(s =>
                  (s.producto.toLowerCase().includes(busquedaItem.toLowerCase()) ||
                  (s.codigo ?? "").toLowerCase().includes(busquedaItem.toLowerCase())) &&
                  !productosYaAgregados.includes(String(s.producto_id))
                ).length === 0 && (
                  <div style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: 13 }}>
                    Sin resultados
                  </div>
                )}
              </div>
            )}

            {/* Lista de ítems agregados */}
            {salida.items.length === 0 && busquedaItem.length === 0 && (
              <div style={{ padding: "12px 0", color: "var(--text-muted)", fontSize: 13 }}>
                Buscá y seleccioná los ítems a asignar.
              </div>
            )}

            {salida.items.map((item, idx) => {
              const productoInfo  = stock.find(s => String(s.producto_id) === String(item.producto_id));
              const esMedible     = !!productoInfo?.es_medible;
              const esOnu         = productoInfo?.categoria === "onu";
              const disponibles   = onusDisponibles[item.producto_id] ?? [];
              const seleccionadas = onusSeleccionadas[item.producto_id] ?? [];

              return (
                <div key={idx} style={{ marginBottom: 8 }}>
                  <div style={styles.itemRow}>
                    <div style={{ flex: 2, fontSize: 13, fontWeight: 600 }}>
                      {productoInfo?.producto ?? "—"}
                      {productoInfo?.codigo && <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>{productoInfo.codigo}</span>}
                    </div>

                    {!esOnu && (
                      <div style={{ flex: 1 }}>
                        <input className="form-input" type="number" min="1"
                          max={productoInfo?.cantidad}
                          placeholder="Cant."
                          value={item.cantidad}
                          onChange={e => updateItem(idx, "cantidad", e.target.value)} />
                      </div>
                    )}

                    {esMedible && item.cantidad && (
                      <div style={{
                        fontSize: 12, color: "var(--info)", fontWeight: 600,
                        whiteSpace: "nowrap", padding: "0 4px"
                      }}>
                        = {(Number(item.cantidad) * (productoInfo?.metros_por_unidad ?? 0)).toLocaleString()}m
                      </div>
                    )}

                    <button className="btn btn-danger-outline btn-sm btn-icon"
                      onClick={() => removeItem(idx)} type="button">
                      <Icon d={IC.trash} size={13} />
                    </button>
                  </div>

                  {esOnu && item.producto_id && (
                    <div style={{
                      marginTop: 6, padding: "10px 12px",
                      background: "var(--hover)", borderRadius: 8,
                      border: "1px solid var(--border)",
                    }}>
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
                      }}>
                        Seleccionar ONUs a asignar ({seleccionadas.length} seleccionadas)
                      </div>
                      {disponibles.length === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                          Sin ONUs con PON-SN disponibles en esta sede
                        </div>
                      ) : (
                        <>
                          <div className="search-box" style={{ marginBottom: 8 }}>
                            <Icon d={IC.search} size={14} color="var(--text-muted)" />
                            <input
                              placeholder="Filtrar por código PON..."
                              value={onuSearch[item.producto_id] ?? ""}
                              onChange={e => setOnuSearch(prev => ({ ...prev, [item.producto_id]: e.target.value }))}
                              style={{ fontSize: 12, fontFamily: "monospace" }}
                            />
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {disponibles
                              .filter(onu =>
                                !onuSearch[item.producto_id] ||
                                onu.codigo_pon?.toLowerCase().includes(onuSearch[item.producto_id].toLowerCase())
                              )
                              .map(onu => {
                            const seleccionada = seleccionadas.includes(onu.id);
                            return (
                              <button key={onu.id} type="button"
                                onClick={() => {
                                  setOnusSeleccionadas(prev => {
                                    const actual = prev[item.producto_id] ?? [];
                                    const nuevas = seleccionada
                                      ? actual.filter(id => id !== onu.id)
                                      : [...actual, onu.id];
                                    return { ...prev, [item.producto_id]: nuevas };
                                  });
                                }}
                                style={{
                                  padding: "4px 10px", borderRadius: 6,
                                  fontSize: 12, fontFamily: "monospace",
                                  cursor: "pointer", fontWeight: 600,
                                  border: "1px solid",
                                  borderColor: seleccionada ? "var(--primary)" : "var(--border)",
                                  background:  seleccionada ? "var(--primary)" : "white",
                                  color:       seleccionada ? "white" : "var(--text)",
                                  transition: "all .15s",
                                }}
                              >
                                {onu.codigo_pon}
                              </button>
                            );
                          })}
                        </div>
                         </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="form-group">
            <label className="form-label">Comentario <span>(opcional)</span></label>
            <textarea className="form-input" placeholder="Dirección, detalle del trabajo..."
              value={salida.comentario}
              onChange={e => setSalida(prev => ({ ...prev, comentario: e.target.value }))} />
          </div>
        </Modal>
      )}

      {/* Modal ONUs */}
      {onuModal && (
        <Modal
          title={`ONUs — ${onuModalItem?.nombre}`}
          onClose={() => { setOnuModal(false); setOnuEditando(null); setOnuCodigo("") }}
          footer={
            <button className="btn btn-outline"
              onClick={() => { setOnuModal(false); setOnuEditando(null); setOnuCodigo("") }}>
              Cerrar
            </button>
          }
        >
          {loadingOnus ? (
            <div style={{ padding: 24, color: "var(--text-muted)" }}>Cargando ONUs...</div>
          ) : onusLista.length === 0 ? (
            <div style={{ padding: 24, color: "var(--text-muted)", textAlign: "center" }}>
              No hay ONUs registradas para este producto en tu sede
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {onusLista.map(onu => (
                <div key={onu.id} style={{
                  padding: "10px 12px", borderRadius: 8,
                  border: "1px solid var(--border)", background: "var(--hover)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{ flex: 1 }}>
                    {onu.codigo_pon ? (
                      <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
                        {onu.codigo_pon}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                        Sin código PON
                      </span>
                    )}
                    {onu.tecnico_id && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        Asignada a técnico
                      </div>
                    )}
                  </div>

                  {(!onu.tecnico_id && !onu.activacion_id) && (
                    onuEditando?.id === onu.id ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          className="form-input"
                          placeholder="Ej: ZTEG-AB123456"
                          value={onuCodigo}
                          onChange={e => setOnuCodigo(e.target.value)}
                          style={{ fontSize: 12, fontFamily: "monospace", width: 180 }}
                          autoFocus
                        />
                        <button className="btn btn-primary btn-sm"
                          onClick={handleGuardarCodigo}
                          disabled={savingOnu || !onuCodigo.trim()}>
                          {savingOnu ? "..." : <Icon d={IC.check} size={13} />}
                        </button>
                        <button className="btn btn-outline btn-sm"
                          onClick={() => { setOnuEditando(null); setOnuCodigo("") }}>
                          <Icon d={IC.remove} size={13} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        className="btn btn-outline btn-sm btn-icon"
                        onClick={() => {
                          setOnuEditando(onu)
                          setOnuCodigo(onu.codigo_pon ?? "")
                        }}>
                        {onu.codigo_pon
                          ? <Icon d={IC.edit} size={13} />
                          : <><Icon d={IC.plus} size={13} /> Agregar código</>
                        }
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {modal === "salidaDirecta" && (() => {
        const sdValida =
          salidaDirecta.items.length > 0 &&
          salidaDirecta.items.every(i => {
            if (!i.producto_id) return false;
            const prod = stock.find(s => String(s.producto_id) === String(i.producto_id));
            if (prod?.categoria === "onu") {
              return (onusSeleccionadasSD[i.producto_id] ?? []).length > 0;
            }
            return Number(i.cantidad) > 0;
          }) &&
          !!salidaDirecta.comentario.trim();

        const yaAgregadosSD = salidaDirecta.items.map(i => String(i.producto_id));

        return (
          <Modal
            title="Salida directa de stock"
            onClose={() => setModal(false)}
            footer={
              <>
                <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleSalidaDirecta} disabled={saving || !sdValida}>
                  <Icon d={IC.check} size={15} />
                  {saving ? "Registrando..." : `Confirmar (${salidaDirecta.items.length} ítem${salidaDirecta.items.length !== 1 ? "s" : ""})`}
                </button>
              </>
            }
          >
            <div className="form-group">
              <label className="form-label">Buscar producto</label>
              <div className="search-box">
                <Icon d={IC.search} size={16} color="var(--text-muted)" />
                <input
                  placeholder="Nombre o código..."
                  value={salidaDirectaSearch}
                  onChange={e => setSalidaDirectaSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {salidaDirectaSearch.length > 0 && (
                <div style={{
                  border: "1px solid var(--border)", borderRadius: 8,
                  marginTop: 4, maxHeight: 200, overflowY: "auto",
                  background: "white", boxShadow: "0 4px 12px rgba(0,0,0,.08)"
                }}>
                  {stock
                    .filter(s =>
                      (s.producto.toLowerCase().includes(salidaDirectaSearch.toLowerCase()) ||
                      (s.codigo ?? "").toLowerCase().includes(salidaDirectaSearch.toLowerCase())) &&
                      !yaAgregadosSD.includes(String(s.producto_id))
                    )
                    .map(s => (
                      <div key={s.producto_id}
                        onClick={() => {
                          setSalidaDirecta(prev => ({
                            ...prev,
                            items: [...prev.items, { producto_id: String(s.producto_id), cantidad: "" }]
                          }));
                          if (s.categoria === "onu") {
                            onuService.getDisponibles(s.producto_id).then(data => {
                              setOnusDisponiblesSD(prev => ({ ...prev, [s.producto_id]: data }));
                              setOnusSeleccionadasSD(prev => ({ ...prev, [s.producto_id]: [] }));
                            }).catch(() => {});
                          }
                          setSalidaDirectaSearch("");
                        }}
                        style={{
                          padding: "9px 14px", cursor: "pointer", fontSize: 13,
                          borderBottom: "1px solid var(--border)",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                        onMouseLeave={e => e.currentTarget.style.background = "white"}
                      >
                        <div>
                          <span style={{ fontWeight: 600 }}>{s.producto}</span>
                          {s.codigo && <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>{s.codigo}</span>}
                          {s.categoria && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>· {s.categoria}</span>}
                        </div>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", marginLeft: 12 }}>
                          disp: <strong>{s.cantidad}</strong>
                        </span>
                      </div>
                    ))}
                  {stock.filter(s =>
                    (s.producto.toLowerCase().includes(salidaDirectaSearch.toLowerCase()) ||
                    (s.codigo ?? "").toLowerCase().includes(salidaDirectaSearch.toLowerCase())) &&
                    !yaAgregadosSD.includes(String(s.producto_id))
                  ).length === 0 && (
                    <div style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: 13 }}>
                      Sin resultados
                    </div>
                  )}
                </div>
              )}
            </div>

            {salidaDirecta.items.length > 0 && (
              <div className="form-group">
                <label className="form-label">Productos a descontar ({salidaDirecta.items.length})</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {salidaDirecta.items.map((item, idx) => {
                    const prod = stock.find(s => String(s.producto_id) === String(item.producto_id));
                    return (
                      <div key={idx} style={{ marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{prod?.producto ?? "—"}</div>
                            {prod?.codigo && <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{prod.codigo}</div>}
                          </div>
                          {prod?.categoria !== "onu" && (
                            <>
                              <input
                                className="form-input"
                                type="number" min="1" max={prod?.cantidad}
                                placeholder="Cantidad"
                                value={item.cantidad}
                                onChange={e => setSalidaDirecta(prev => ({
                                  ...prev,
                                  items: prev.items.map((it, i) => i === idx ? { ...it, cantidad: e.target.value } : it)
                                }))}
                                style={{ width: 100, textAlign: "center" }}
                              />
                              <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                / {prod?.cantidad ?? 0}
                              </span>
                            </>
                          )}
                          <button
                            className="btn btn-danger-outline btn-sm btn-icon"
                            onClick={() => setSalidaDirecta(prev => ({
                              ...prev,
                              items: prev.items.filter((_, i) => i !== idx)
                            }))}
                            type="button"
                          >
                            <Icon d={IC.remove} size={12} />
                          </button>
                        </div>

                        {prod?.categoria === "onu" && item.producto_id && (() => {
                          const disponiblesSD   = onusDisponiblesSD[item.producto_id] ?? [];
                          const seleccionadasSD = onusSeleccionadasSD[item.producto_id] ?? [];
                          return (
                            <div style={{
                              marginTop: 6, padding: "10px 12px",
                              background: "var(--hover)", borderRadius: 8,
                              border: "1px solid var(--border)",
                            }}>
                              <div style={{
                                fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                                textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
                              }}>
                                Seleccionar ONUs a retirar ({seleccionadasSD.length} seleccionadas)
                              </div>
                              {disponiblesSD.length === 0 ? (
                                <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                                  Sin ONUs disponibles en esta sede
                                </div>
                              ) : (
                                <>
                                  <div className="search-box" style={{ marginBottom: 8 }}>
                                    <Icon d={IC.search} size={14} color="var(--text-muted)" />
                                    <input
                                      placeholder="Filtrar por código PON..."
                                      value={onuSearchSD[item.producto_id] ?? ""}
                                      onChange={e => setOnuSearchSD(prev => ({ ...prev, [item.producto_id]: e.target.value }))}
                                      style={{ fontSize: 12, fontFamily: "monospace" }}
                                    />
                                  </div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {disponiblesSD
                                      .filter(onu =>
                                        !onuSearchSD[item.producto_id] ||
                                        onu.codigo_pon?.toLowerCase().includes(onuSearchSD[item.producto_id].toLowerCase())
                                      )
                                      .map(onu => {
                                        const seleccionada = seleccionadasSD.includes(onu.id);
                                        return (
                                          <button key={onu.id} type="button"
                                            onClick={() => {
                                              setOnusSeleccionadasSD(prev => {
                                                const actual = prev[item.producto_id] ?? [];
                                                const nuevas = seleccionada
                                                  ? actual.filter(id => id !== onu.id)
                                                  : [...actual, onu.id];
                                                return { ...prev, [item.producto_id]: nuevas };
                                              });
                                            }}
                                            style={{
                                              padding: "4px 10px", borderRadius: 6,
                                              fontSize: 12, fontFamily: "monospace",
                                              cursor: "pointer", fontWeight: 600,
                                              border: "1px solid",
                                              borderColor: seleccionada ? "var(--primary)" : "var(--border)",
                                              background:  seleccionada ? "var(--primary)" : "white",
                                              color:       seleccionada ? "white" : "var(--text)",
                                              transition: "all .15s",
                                            }}
                                          >
                                            {onu.codigo_pon}
                                          </button>
                                        );
                                      })}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {salidaDirecta.items.length === 0 && salidaDirectaSearch.length === 0 && (
              <div style={{ padding: "12px 0", color: "var(--text-muted)", fontSize: 13, fontStyle: "italic" }}>
                Buscá y seleccioná los productos a descontar.
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Motivo / comentario <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <textarea
                className="form-input"
                placeholder="Ej: Rotura durante instalación, uso en obra, merma..."
                value={salidaDirecta.comentario}
                onChange={e => setSalidaDirecta(prev => ({ ...prev, comentario: e.target.value }))}
                rows={2}
              />
            </div>
          </Modal>
        );
      })()}

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
              <select className="form-input" {...activoField("area")}
                disabled={activoModal === "editar"}>
                <option value="NOC">NOC</option>
                <option value="ADMINISTRACION">Administración</option>
              </select>
            </div>
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