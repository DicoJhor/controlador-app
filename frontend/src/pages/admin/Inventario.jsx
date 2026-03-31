import React, { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { formatNumber } from "../../utils/formatters";
import productosService from "../../services/productosService";
import sedesService from "../../services/sedesService";
import enviosService from "../../services/enviosService";
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
  alert:    "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
  send:     "M22 2L11 13 M22 2L15 22l-4-9-9-4 22-7z",
  remove:   "M18 6L6 18 M6 6l12 12",
  building: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  chevron:  "M6 9l6 6 6-6",
  tag:      "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01",
};

const CATEGORIAS = ["cables", "equipos", "accesorios", "herramientas", "otros", "ropa"];
const TALLAS     = ["XS", "S", "M", "L", "XL", "XXL"];
const GENEROS    = ["masculino", "femenino", "unisex"];

const emptyForm = {
  codigo: "", nombre: "", descripcion: "", categoria: "",
  unidad: "", stock_total: "", stock_minimo: "",
  es_medible: false, metros_por_unidad: "", metros_disponibles: "",
  tiene_variantes: false,
};

const emptyEnvio = {
  sede_id: "", guia: "", comentario: "",
  fecha_envio: new Date().toISOString().split("T")[0],
  productos: []
};

const emptyVarianteForm = {
  talla: "S", genero: "masculino",
  stock_total: "", stock_minimo: "", codigo: ""
};

// Variante nueva en el formulario de creación de producto
const emptyVarianteInline = {
  talla: "S", genero: "masculino", stock_total: "", stock_minimo: "", codigo: ""
};

function StockBar({ stock, minimo }) {
  if (!minimo) return <span className="mono">{formatNumber(stock)}</span>;
  const max   = minimo * 3;
  const pct   = Math.min(100, Math.round((stock / max) * 100));
  const low   = stock <= minimo;
  const warn  = stock <= minimo * 1.5;
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

export default function AdminInventario() {
  const { isSuperadmin } = useAuth();

  const [productos,     setProductos]     = useState([]);
  const [sedes,         setSedes]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [search,        setSearch]        = useState("");
  const [filterCat,     setFilterCat]     = useState("todas");
  const [modal,         setModal]         = useState(false);
  const [selected,      setSelected]      = useState(null);
  const [form,          setForm]          = useState(emptyForm);
  const [saving,        setSaving]        = useState(false);

  const [vistaMode,   setVistaMode]   = useState("central");
  const [sedeVista,   setSedeVista]   = useState("");
  const [stockSede,   setStockSede]   = useState([]);
  const [loadingSede, setLoadingSede] = useState(false);

  const [entradaForm,   setEntradaForm]   = useState({
    guia: "", sede_id: "2", comentario: "",
    fecha: new Date().toISOString().split("T")[0], productos: []
  });
  const [entradaSearch, setEntradaSearch] = useState("");
  const SEDE_CENTRAL = 2;

  const [envioForm,   setEnvioForm]   = useState(emptyEnvio);
  const [envioSearch, setEnvioSearch] = useState("");
  const [envioError,  setEnvioError]  = useState("");

  const [variantesMap,      setVariantesMap]      = useState({});
  const [expandedProduct,   setExpandedProduct]   = useState(null);
  const [loadingVariantes,  setLoadingVariantes]  = useState({});
  const [varianteModal,     setVarianteModal]     = useState(false);
  const [varianteSelected,  setVarianteSelected]  = useState(null);
  const [varianteForm,      setVarianteForm]      = useState(emptyVarianteForm);
  const [varianteProductoId, setVarianteProductoId] = useState(null);

  // Variantes inline en el modal de crear producto
  const [variantesInline,    setVariantesInline]    = useState([]);
  const [varianteInlineForm, setVarianteInlineForm] = useState(emptyVarianteInline);
  const [varianteInlineError, setVarianteInlineError] = useState("");

  useEffect(() => {
    Promise.all([
      productosService.getStockBySede(2),
      sedesService.getAll(),
    ]).then(([prods, sds]) => {
      setProductos(prods);
      setSedes(sds.filter(s => s.id !== 2));
      setLoading(false);
    }).catch(() => {
      setError("No se pudieron cargar los datos");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (vistaMode === "sede" && sedeVista) {
      setLoadingSede(true);
      productosService.getStockBySede(sedeVista)
        .then(data => setStockSede(data))
        .catch(() => alert("No se pudo cargar el stock de la sede"))
        .finally(() => setLoadingSede(false));
    }
  }, [vistaMode, sedeVista]);

  useEffect(() => {
    if (vistaMode === "sede" && !sedeVista && sedes.length > 0) {
      setSedeVista(String(sedes[0].id));
    }
  }, [vistaMode, sedes]);

  const filtered = productos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
                        (p.codigo ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat    = filterCat === "todas" || p.categoria === filterCat;
    return matchSearch && matchCat;
  });

  const filteredSede = stockSede.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (p.codigo ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = productos.filter(p =>
    p.stock_minimo > 0 && p.stock_total <= p.stock_minimo && !p.tiene_variantes
  ).length;

  const sedeName = sedes.find(s => String(s.id) === String(sedeVista))?.nombre ?? "";

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
      stock_total:  String(variante.stock_total),
      stock_minimo: String(variante.stock_minimo),
      codigo:       variante.codigo ?? "",
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
        stock_total:  Number(varianteForm.stock_total) || 0,
        stock_minimo: Number(varianteForm.stock_minimo) || 0,
        codigo:       varianteForm.codigo || null,
      };
      if (varianteModal === "crear") {
        const nueva = await productosService.crearVariante(varianteProductoId, payload);
        setVariantesMap(prev => ({
          ...prev,
          [varianteProductoId]: [...(prev[varianteProductoId] ?? []), nueva],
        }));
        setProductos(prev => prev.map(p =>
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
      const restantes = (variantesMap[varianteProductoId] ?? []).filter(v => v.id !== varianteSelected.id);
      setVariantesMap(prev => ({ ...prev, [varianteProductoId]: restantes }));
      if (restantes.length === 0) {
        setProductos(prev => prev.map(p =>
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

  // ── Variantes inline helpers ───────────────────────────
  const agregarVarianteInline = () => {
    setVarianteInlineError("");
    const { talla, genero, stock_total, stock_minimo, codigo } = varianteInlineForm;
    const duplicada = variantesInline.find(
      v => v.talla === talla && v.genero === genero
    );
    if (duplicada) {
      setVarianteInlineError(`Ya agregaste ${genero} — ${talla}.`);
      return;
    }
    setVariantesInline(prev => [...prev, {
      talla,
      genero,
      stock_total:  Number(stock_total) || 0,
      stock_minimo: Number(stock_minimo) || 0,
      codigo:       codigo || null,
      _key: Date.now(),
    }]);
    setVarianteInlineForm(emptyVarianteInline);
  };

  const quitarVarianteInline = (key) =>
    setVariantesInline(prev => prev.filter(v => v._key !== key));

  const inlineField = (key) => ({
    value: varianteInlineForm[key],
    onChange: (e) => setVarianteInlineForm(prev => ({ ...prev, [key]: e.target.value })),
  });

  // ── Envío helpers ──────────────────────────────────────
  const prodEnvioFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(envioSearch.toLowerCase()) ||
    (p.codigo ?? "").toLowerCase().includes(envioSearch.toLowerCase())
  );

  const agregarProductoEnvio = async (prod) => {
    if (prod.tiene_variantes) {
      if (!variantesMap[prod.id]) {
        try {
          const data = await productosService.getVariantes(prod.id);
          setVariantesMap(prev => ({ ...prev, [prod.id]: data }));
        } catch {
          alert("No se pudieron cargar las variantes");
          return;
        }
      }
      setEnvioForm(prev => {
        if (prev.productos.find(p => p.producto_id === prod.id)) return prev;
        return {
          ...prev,
          productos: [...prev.productos, {
            producto_id:     prod.id,
            nombre:          prod.nombre,
            codigo:          prod.codigo,
            tiene_variantes: true,
            variantes:       [],
          }]
        };
      });
    } else {
      setEnvioForm(prev => {
        if (prev.productos.find(p => p.producto_id === prod.id)) return prev;
        return {
          ...prev,
          productos: [...prev.productos, {
            producto_id:     prod.id,
            nombre:          prod.nombre,
            codigo:          prod.codigo,
            stock_total:     prod.stock_total,
            unidad:          prod.unidad,
            cantidad:        1,
            tiene_variantes: false,
          }]
        };
      });
    }
    setEnvioSearch("");
  };

  const quitarProductoEnvio = (producto_id) =>
    setEnvioForm(prev => ({
      ...prev,
      productos: prev.productos.filter(p => p.producto_id !== producto_id)
    }));

  const setCantidadEnvio = (producto_id, valor) =>
    setEnvioForm(prev => ({
      ...prev,
      productos: prev.productos.map(p =>
        p.producto_id === producto_id ? { ...p, cantidad: Number(valor) } : p
      )
    }));

  const toggleVarianteEnvio = (producto_id, variante) => {
    setEnvioForm(prev => ({
      ...prev,
      productos: prev.productos.map(p => {
        if (p.producto_id !== producto_id) return p;
        const yaEsta = p.variantes.find(v => v.variante_id === variante.id);
        if (yaEsta) {
          return { ...p, variantes: p.variantes.filter(v => v.variante_id !== variante.id) };
        } else {
          return {
            ...p,
            variantes: [...p.variantes, {
              variante_id: variante.id,
              talla:       variante.talla,
              genero:      variante.genero,
              stock_total: variante.stock_total,
              cantidad:    1,
            }]
          };
        }
      })
    }));
  };

  const setCantidadVarianteEnvio = (producto_id, variante_id, valor) => {
    setEnvioForm(prev => ({
      ...prev,
      productos: prev.productos.map(p => {
        if (p.producto_id !== producto_id) return p;
        return {
          ...p,
          variantes: p.variantes.map(v =>
            v.variante_id === variante_id ? { ...v, cantidad: Number(valor) } : v
          )
        };
      })
    }));
  };

  const handleEnviar = async () => {
    setEnvioError("");
    if (!envioForm.sede_id)               return setEnvioError("Seleccioná una sede destino.");
    if (!envioForm.guia.trim())           return setEnvioError("Ingresá el número de guía.");
    if (!envioForm.fecha_envio)           return setEnvioError("Ingresá la fecha de envío.");
    if (envioForm.productos.length === 0) return setEnvioError("Agregá al menos un producto.");

    for (const p of envioForm.productos) {
      if (p.tiene_variantes) {
        if (!p.variantes || p.variantes.length === 0)
          return setEnvioError(`Seleccioná al menos una variante de "${p.nombre}".`);
        for (const v of p.variantes) {
          if (!v.cantidad || v.cantidad <= 0)
            return setEnvioError(`Cantidad inválida en "${p.nombre}" — ${v.genero} ${v.talla}.`);
          if (v.cantidad > v.stock_total)
            return setEnvioError(`Stock insuficiente para "${p.nombre}" ${v.genero} ${v.talla}. Disponible: ${v.stock_total}.`);
        }
      } else {
        if (!p.cantidad || p.cantidad <= 0)
          return setEnvioError(`Cantidad inválida en "${p.nombre}".`);
        if (p.cantidad > p.stock_total)
          return setEnvioError(`Stock insuficiente para "${p.nombre}". Disponible: ${p.stock_total}.`);
      }
    }

    const productosPayload = [];
    for (const p of envioForm.productos) {
      if (p.tiene_variantes) {
        for (const v of p.variantes) {
          productosPayload.push({
            producto_id: p.producto_id,
            variante_id: v.variante_id,
            cantidad:    v.cantidad,
          });
        }
      } else {
        productosPayload.push({
          producto_id: p.producto_id,
          cantidad:    p.cantidad,
        });
      }
    }

    setSaving(true);
    try {
      await enviosService.create({
        sede_id:     envioForm.sede_id,
        guia:        envioForm.guia,
        comentario:  envioForm.comentario,
        fecha_envio: envioForm.fecha_envio,
        productos:   productosPayload,
      });

      // ✅ FIX 1: Actualizar stock_total de productos en el estado local
      setProductos(prev => prev.map(p => {
        const item = envioForm.productos.find(e => e.producto_id === p.id);
        if (!item) return p;
        if (item.tiene_variantes) {
          const totalEnviado = item.variantes.reduce((sum, v) => sum + v.cantidad, 0);
          return { ...p, stock_total: p.stock_total - totalEnviado };
        }
        return { ...p, stock_total: p.stock_total - item.cantidad };
      }));

      // ✅ FIX 2: Limpiar caché de variantes de los productos enviados
      // Esto fuerza una recarga fresca desde el servidor la próxima vez
      // que el usuario expanda las variantes, evitando mostrar datos desactualizados
      const idsConVariantes = envioForm.productos
        .filter(p => p.tiene_variantes)
        .map(p => p.producto_id);

      if (idsConVariantes.length > 0) {
        setVariantesMap(prev => {
          const updated = { ...prev };
          idsConVariantes.forEach(id => delete updated[id]);
          return updated;
        });
        // Si alguno de los productos enviados estaba expandido, cerrarlo
        if (idsConVariantes.includes(expandedProduct)) {
          setExpandedProduct(null);
        }
      }

      setEnvioForm(emptyEnvio);
      setModal(false);
    } catch (err) {
      setEnvioError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── CRUD helpers ───────────────────────────────────────
  const openCrear  = () => {
    setForm(emptyForm);
    setSelected(null);
    setVariantesInline([]);
    setVarianteInlineForm(emptyVarianteInline);
    setVarianteInlineError("");
    setModal("crear");
  };
  const openEditar = (p) => {
    setForm({
      codigo: p.codigo ?? "", nombre: p.nombre, descripcion: p.descripcion ?? "",
      categoria: p.categoria ?? "", unidad: p.unidad ?? "",
      stock_total: String(p.stock_total), stock_minimo: String(p.stock_minimo),
      es_medible: !!p.es_medible,
      metros_por_unidad: p.metros_por_unidad ?? "",
      metros_disponibles: p.metros_disponibles ?? "",
      tiene_variantes: !!p.tiene_variantes,
    });
    setSelected(p);
    setModal("editar");
  };
  const openEliminar = (p) => { setSelected(p); setModal("eliminar"); };
  const openEntrada = () => {
    setEntradaForm({
      guia: "",
      sede_id: isSuperadmin && vistaMode === "sede" ? sedeVista : "2",
      comentario: "",
      fecha: new Date().toISOString().split("T")[0],
      productos: []
    });
    setEntradaSearch("");
    setModal("entrada");
  };
  const openEnvio = () => {
    setEnvioForm(emptyEnvio);
    setEnvioSearch("");
    setEnvioError("");
    setModal("envio");
  };

  const handleEntrada = async () => {
    setSaving(true);
    try {
      const res = await productosService.registrarEntrada({
        guia:       entradaForm.guia,
        sede_id:    Number(entradaForm.sede_id) || SEDE_CENTRAL,
        comentario: entradaForm.comentario || null,
        fecha:      entradaForm.fecha,
        productos:  entradaForm.productos.map(p => ({ producto_id: p.producto_id, cantidad: p.cantidad })),
      });
      setProductos(prev => prev.map(p => {
        const updated = res.productos?.find(u => u.id === p.id);
        return updated ? { ...p, ...updated } : p;
      }));
      if (vistaMode === "sede" && sedeVista) {
        const data = await productosService.getStockBySede(sedeVista);
        setStockSede(data);
      }
      setModal(false);
      setEntradaForm({ guia: "", sede_id: "2", comentario: "", fecha: new Date().toISOString().split("T")[0], productos: [] });
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const agregarProductoEntrada = (prod) => {
    setEntradaForm(prev => {
      if (prev.productos.find(p => p.producto_id === prod.id)) return prev;
      return { ...prev, productos: [...prev.productos, {
        producto_id: prod.id, nombre: prod.nombre, codigo: prod.codigo,
        es_medible: prod.es_medible, metros_por_unidad: prod.metros_por_unidad, cantidad: 1
      }]};
    });
    setEntradaSearch("");
  };

  const quitarProductoEntrada = (producto_id) =>
    setEntradaForm(prev => ({ ...prev, productos: prev.productos.filter(p => p.producto_id !== producto_id) }));

  const setCantidadEntrada = (producto_id, valor) =>
    setEntradaForm(prev => ({ ...prev, productos: prev.productos.map(p =>
      p.producto_id === producto_id ? { ...p, cantidad: Number(valor) } : p
    )}));

  const prodEntradaFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(entradaSearch.toLowerCase()) ||
    (p.codigo ?? "").toLowerCase().includes(entradaSearch.toLowerCase())
  );

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const payload = {
        codigo: form.codigo || null, nombre: form.nombre,
        descripcion: form.descripcion || null, categoria: form.categoria || null,
        unidad: form.unidad || null,
        stock_total: Number(form.stock_total) || 0,
        stock_minimo: Number(form.stock_minimo) || 0,
        es_medible: form.es_medible ? 1 : 0,
        metros_por_unidad: form.es_medible ? (Number(form.metros_por_unidad) || null) : null,
        metros_disponibles: form.es_medible ? (Number(form.metros_disponibles) || null) : null,
        tiene_variantes: form.tiene_variantes ? 1 : 0,
      };

      if (modal === "crear") {
        const nuevo = await productosService.create(payload);

        // Si tiene variantes, crearlas todas de una
        if (form.tiene_variantes && variantesInline.length > 0) {
          const creadas = [];
          for (const v of variantesInline) {
            const nueva = await productosService.crearVariante(nuevo.id, {
              talla:        v.talla,
              genero:       v.genero,
              stock_total:  v.stock_total,
              stock_minimo: v.stock_minimo,
              codigo:       v.codigo,
            });
            creadas.push(nueva);
          }
          setVariantesMap(prev => ({ ...prev, [nuevo.id]: creadas }));
          setExpandedProduct(nuevo.id);
        } else if (form.tiene_variantes) {
          setVariantesMap(prev => ({ ...prev, [nuevo.id]: [] }));
          setExpandedProduct(nuevo.id);
        }

        setProductos(prev => [...prev, { ...nuevo, stock_total: Number(payload.stock_total) || 0 }]);
        setModal(false);

        setTimeout(() => {
          document.getElementById(`producto-row-${nuevo.id}`)?.scrollIntoView({
            behavior: "smooth", block: "center"
          });
        }, 150);

      } else {
        await productosService.update(selected.id, { ...payload, estado: selected.estado });
        setProductos(prev => prev.map(p => p.id === selected.id ? { ...p, ...payload } : p));
        if (vistaMode === "sede") {
          setStockSede(prev => prev.map(p => p.id === selected.id ? { ...p, ...payload } : p));
        }
        setModal(false);
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
      setProductos(prev => prev.filter(p => p.id !== selected.id));
      setStockSede(prev => prev.filter(p => p.id !== selected.id));
      setModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const field      = (key) => ({ value: form[key],      onChange: (e) => setForm(prev => ({ ...prev, [key]: e.target.value })) });
  const envioField = (key) => ({ value: envioForm[key], onChange: (e) => setEnvioForm(prev => ({ ...prev, [key]: e.target.value })) });

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando productos...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      {lowStockCount > 0 && vistaMode === "central" && (
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

        <div style={{ display: "flex", background: "var(--hover)", borderRadius: 8, padding: 3, gap: 2 }}>
          <button onClick={() => { setVistaMode("central"); setSearch(""); }}
            style={{
              padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500, transition: "all .15s",
              background: vistaMode === "central" ? "white" : "transparent",
              color: vistaMode === "central" ? "var(--text)" : "var(--text-muted)",
              boxShadow: vistaMode === "central" ? "0 1px 3px rgba(0,0,0,.1)" : "none",
            }}>
            Central
          </button>
          <button onClick={() => { setVistaMode("sede"); setSearch(""); }}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500, transition: "all .15s",
              background: vistaMode === "sede" ? "white" : "transparent",
              color: vistaMode === "sede" ? "var(--text)" : "var(--text-muted)",
              boxShadow: vistaMode === "sede" ? "0 1px 3px rgba(0,0,0,.1)" : "none",
            }}>
            <Icon d={IC.building} size={13} />
            Por sede
          </button>
        </div>

        {vistaMode === "sede" && (
          <select className="filter-select" value={sedeVista} onChange={e => setSedeVista(e.target.value)}>
            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}

        {vistaMode === "central" && (
          <select className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="todas">Todas las categorías</option>
            {CATEGORIAS.map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        )}

        {vistaMode === "central" && (
          <>
            <button className="btn btn-outline" onClick={openEnvio}>
              <Icon d={IC.send} size={15} />
              Enviar productos
            </button>
            <button className="btn btn-outline" onClick={openEntrada}>
              <Icon d="M5 12h14 M12 5l7 7-7 7" size={15} />
              Registrar entrada
            </button>
            <button className="btn btn-primary" onClick={openCrear}>
              <Icon d={IC.plus} size={15} />
              Nuevo producto
            </button>
          </>
        )}

        {vistaMode === "sede" && isSuperadmin && (
          <button className="btn btn-outline" onClick={openEntrada}>
            <Icon d="M5 12h14 M12 5l7 7-7 7" size={15} />
            Registrar entrada
          </button>
        )}
      </div>

      {/* ── Vista Central ── */}
      {vistaMode === "central" && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th><th>Nombre</th><th>Categoría</th>
                  <th>Unidad</th><th>Stock</th><th>Mínimo</th>
                  <th>Metros disp.</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                      Sin productos registrados
                    </td>
                  </tr>
                ) : filtered.map(p => {
                  const low  = !p.tiene_variantes && p.stock_minimo > 0 && p.stock_total <= p.stock_minimo;
                  const warn = !p.tiene_variantes && p.stock_minimo > 0 && p.stock_total <= p.stock_minimo * 1.5;
                  const isExpanded = expandedProduct === p.id;
                  const variantes  = variantesMap[p.id] ?? [];

                  return (
                    <React.Fragment key={p.id}>
                      <tr id={`producto-row-${p.id}`}
                        style={{ background: isExpanded ? "var(--hover)" : "transparent" }}>
                        <td><span className="mono">{p.codigo ?? "—"}</span></td>
                        <td>
                          <div className="fw-600">{p.nombre}</div>
                          {p.descripcion && <div className="text-sm text-muted">{p.descripcion}</div>}
                        </td>
                        <td>{p.categoria ? <Badge variant="blue">{p.categoria}</Badge> : <span className="text-muted">—</span>}</td>
                        <td className="text-sm">{p.unidad ?? "—"}</td>
                        <td>
                          <StockBar stock={p.stock_total} minimo={p.stock_minimo} />
                          {p.tiene_variantes && (
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                              {variantesMap[p.id]
                                ? `${variantesMap[p.id].length} variante(s)`
                                : "Expandir para ver"
                              }
                            </div>
                          )}
                        </td>
                        <td className="mono text-muted">{p.tiene_variantes ? "—" : p.stock_minimo}</td>
                        <td>
                          {p.es_medible && p.metros_disponibles !== null ? (
                            <div>
                              <span className="mono fw-600" style={{ color: "var(--info)" }}>{p.metros_disponibles}m</span>
                              <div className="text-sm text-muted">{p.metros_por_unidad}m/rollo</div>
                            </div>
                          ) : <span className="text-muted">—</span>}
                        </td>
                        <td>
                          {p.tiene_variantes
                            ? <Badge variant="blue">Con variantes</Badge>
                            : low   ? <Badge variant="danger">⚠ Bajo stock</Badge>
                            : warn  ? <Badge variant="warning">Atención</Badge>
                            : <Badge variant="active">OK</Badge>
                          }
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            {p.tiene_variantes && (
                              <button className="btn btn-outline btn-sm"
                                onClick={() => toggleVariantes(p.id)}
                                style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <Icon d={IC.tag} size={12} />
                                Variantes
                                <span style={{
                                  display: "inline-block", transition: "transform .2s",
                                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)"
                                }}>
                                  <Icon d={IC.chevron} size={12} />
                                </span>
                              </button>
                            )}
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

                      {isExpanded && (
                        <tr>
                          <td colSpan={9} style={{ padding: 0, background: "#F8FAFC" }}>
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
                                          <th style={thStyle}>Stock</th>
                                          <th style={thStyle}>Mínimo</th>
                                          <th style={thStyle}>Estado</th>
                                          <th style={thStyle}></th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {variantes.map(v => {
                                          const vLow  = v.stock_minimo > 0 && v.stock_total <= v.stock_minimo;
                                          const vWarn = v.stock_minimo > 0 && v.stock_total <= v.stock_minimo * 1.5;
                                          return (
                                            <tr key={v.id} style={{ background: "white" }}>
                                              <td style={{ padding: "8px 12px" }}>
                                                <VarianteBadge talla={v.talla} genero={v.genero} />
                                              </td>
                                              <td style={{ padding: "8px 12px" }}>
                                                <span className="mono">{v.codigo ?? "—"}</span>
                                              </td>
                                              <td style={{ padding: "8px 12px" }}>
                                                <StockBar stock={v.stock_total} minimo={v.stock_minimo} />
                                              </td>
                                              <td style={{ padding: "8px 12px" }} className="mono text-muted">
                                                {v.stock_minimo}
                                              </td>
                                              <td style={{ padding: "8px 12px" }}>
                                                {vLow  ? <Badge variant="danger">⚠ Bajo</Badge>
                                                       : vWarn ? <Badge variant="warning">Atención</Badge>
                                                       : <Badge variant="active">OK</Badge>}
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
                                          );
                                        })}
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
      )}

      {/* ── Vista Por Sede ── */}
      {vistaMode === "sede" && (
        <div className="card">
          {loadingSede ? (
            <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando stock de {sedeName}...</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Código</th><th>Nombre</th><th>Categoría</th>
                    <th>Unidad</th><th>Stock en sede</th><th>Estado</th>
                    {isSuperadmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredSede.length === 0 ? (
                    <tr>
                      <td colSpan={isSuperadmin ? 7 : 6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                        Sin stock registrado en {sedeName}
                      </td>
                    </tr>
                  ) : filteredSede.map(p => {
                    const low  = p.stock_minimo > 0 && p.stock_total <= p.stock_minimo;
                    const warn = p.stock_minimo > 0 && p.stock_total <= p.stock_minimo * 1.5;
                    return (
                      <tr key={p.id}>
                        <td><span className="mono">{p.codigo ?? "—"}</span></td>
                        <td>
                          <div className="fw-600">{p.nombre}</div>
                          {p.descripcion && <div className="text-sm text-muted">{p.descripcion}</div>}
                        </td>
                        <td>{p.categoria ? <Badge variant="blue">{p.categoria}</Badge> : <span className="text-muted">—</span>}</td>
                        <td className="text-sm">{p.unidad ?? "—"}</td>
                        <td><StockBar stock={p.stock_total} minimo={p.stock_minimo} /></td>
                        <td>
                          {low  ? <Badge variant="danger">⚠ Bajo stock</Badge>
                                : warn ? <Badge variant="warning">Atención</Badge>
                                : <Badge variant="active">OK</Badge>}
                        </td>
                        {isSuperadmin && (
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
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Enviar Productos */}
      {modal === "envio" && (
        <Modal title="Enviar productos a sede" onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleEnviar} disabled={saving}>
                {saving ? "Enviando..." : "Confirmar envío"}
              </button>
            </>
          }
        >
          {envioError && (
            <div className="alert alert-danger" style={{ marginBottom: 12 }}>
              <Icon d={IC.alert} size={14} color="var(--danger)" /> {envioError}
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sede destino *</label>
              <select className="form-input" {...envioField("sede_id")}>
                <option value="">Seleccionar sede...</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de envío *</label>
              <input className="form-input" type="date" {...envioField("fecha_envio")} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Número de guía *</label>
            <input className="form-input" placeholder="Ej: GU-2024-001" {...envioField("guia")} />
          </div>
          <div className="form-group">
            <label className="form-label">Comentario</label>
            <input className="form-input" placeholder="Opcional..." {...envioField("comentario")} />
          </div>

          <div className="form-group" style={{ position: "relative" }}>
            <label className="form-label">Agregar productos *</label>
            <div className="search-box">
              <Icon d={IC.search} size={15} color="var(--text-muted)" />
              <input placeholder="Buscar producto..." value={envioSearch} onChange={e => setEnvioSearch(e.target.value)} />
            </div>
            {envioSearch.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,.1)" }}>
                {prodEnvioFiltrados.length === 0
                  ? <div style={{ padding: "10px 14px", color: "var(--text-muted)", fontSize: 13 }}>Sin resultados</div>
                  : prodEnvioFiltrados.map(p => (
                    <div key={p.id} onClick={() => agregarProductoEnvio(p)}
                      style={{ padding: "8px 14px", cursor: "pointer", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span><strong>{p.codigo}</strong> — {p.nombre}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {p.tiene_variantes && (
                          <span style={{ fontSize: 11, background: "#EFF6FF", color: "#1D4ED8", padding: "1px 6px", borderRadius: 10, fontWeight: 600 }}>
                            variantes
                          </span>
                        )}
                        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Stock: {p.stock_total}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {envioForm.productos.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {envioForm.productos.map(p => (
                <div key={p.producto_id} style={{
                  background: "var(--hover)", borderRadius: 8,
                  border: "1px solid var(--border)", overflow: "hidden"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
                    <div style={{ flex: 1, fontSize: 13 }}>
                      <span className="fw-600">{p.codigo}</span> — {p.nombre}
                      {p.tiene_variantes && (
                        <span style={{ fontSize: 11, background: "#EFF6FF", color: "#1D4ED8", padding: "1px 6px", borderRadius: 10, fontWeight: 600, marginLeft: 6 }}>
                          {p.variantes?.length ?? 0} seleccionada(s)
                        </span>
                      )}
                      {!p.tiene_variantes && (
                        <span style={{ color: "var(--text-muted)", marginLeft: 6, fontSize: 12 }}>
                          (Disponible: {p.stock_total} {p.unidad ?? ""})
                        </span>
                      )}
                    </div>
                    {!p.tiene_variantes && (
                      <input type="number" min={1} max={p.stock_total} value={p.cantidad}
                        onChange={e => setCantidadEnvio(p.producto_id, e.target.value)}
                        style={{ width: 70, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--text)" }} />
                    )}
                    <button className="btn btn-danger-outline btn-sm btn-icon"
                      onClick={() => quitarProductoEnvio(p.producto_id)}>
                      <Icon d={IC.remove} size={12} />
                    </button>
                  </div>

                  {p.tiene_variantes && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "8px 10px", background: "white" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Seleccionar variantes a enviar:
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(variantesMap[p.producto_id] ?? []).map(v => {
                          const seleccionada = p.variantes?.find(sv => sv.variante_id === v.id);
                          return (
                            <div key={v.id} style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "6px 8px", borderRadius: 6,
                              background: seleccionada ? "#EFF6FF" : "var(--hover)",
                              border: `1px solid ${seleccionada ? "#BFDBFE" : "var(--border)"}`,
                              cursor: "pointer",
                            }}
                              onClick={() => toggleVarianteEnvio(p.producto_id, v)}
                            >
                              <input type="checkbox"
                                checked={!!seleccionada}
                                onChange={() => toggleVarianteEnvio(p.producto_id, v)}
                                style={{ cursor: "pointer" }}
                              />
                              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                                <VarianteBadge talla={v.talla} genero={v.genero} />
                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                  Stock: {v.stock_total}
                                </span>
                              </div>
                              {seleccionada && (
                                <input type="number" min={1} max={v.stock_total}
                                  value={seleccionada.cantidad}
                                  onChange={e => setCantidadVarianteEnvio(p.producto_id, v.id, e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                  style={{ width: 70, padding: "4px 8px", borderRadius: 6, border: "1px solid #BFDBFE", fontSize: 13, background: "white", color: "var(--text)" }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Modal Entrada de Stock */}
      {modal === "entrada" && (
        <Modal title="Registrar entrada de productos" onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleEntrada}
                disabled={saving || !entradaForm.guia.trim() || entradaForm.productos.length === 0}>
                {saving ? "Registrando..." : "Confirmar entrada"}
              </button>
            </>
          }
        >
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Número de guía *</label>
              <input className="form-input" placeholder="Ej: GU-2024-001"
                value={entradaForm.guia} onChange={e => setEntradaForm(prev => ({ ...prev, guia: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha *</label>
              <input className="form-input" type="date"
                value={entradaForm.fecha} onChange={e => setEntradaForm(prev => ({ ...prev, fecha: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            {isSuperadmin && (
              <div className="form-group">
                <label className="form-label">Sede destino</label>
                <select className="form-input" value={entradaForm.sede_id}
                  onChange={e => setEntradaForm(prev => ({ ...prev, sede_id: e.target.value }))}>
                  <option value="2">COVICORTI - CENTRAL</option>
                  {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Comentario</label>
              <input className="form-input" placeholder="Opcional..."
                value={entradaForm.comentario} onChange={e => setEntradaForm(prev => ({ ...prev, comentario: e.target.value }))} />
            </div>
          </div>
          <div className="form-group" style={{ position: "relative" }}>
            <label className="form-label">Agregar productos *</label>
            <div className="search-box">
              <Icon d={IC.search} size={15} color="var(--text-muted)" />
              <input placeholder="Buscar producto..." value={entradaSearch} onChange={e => setEntradaSearch(e.target.value)} />
            </div>
            {entradaSearch.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,.1)" }}>
                {prodEntradaFiltrados.length === 0
                  ? <div style={{ padding: "10px 14px", color: "var(--text-muted)", fontSize: 13 }}>Sin resultados</div>
                  : prodEntradaFiltrados.map(p => (
                    <div key={p.id} onClick={() => agregarProductoEntrada(p)}
                      style={{ padding: "8px 14px", cursor: "pointer", fontSize: 13, display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span><strong>{p.codigo}</strong> — {p.nombre}</span>
                      <span style={{ color: "var(--text-muted)" }}>Stock: {p.stock_total}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
          {entradaForm.productos.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {entradaForm.productos.map(p => (
                <div key={p.producto_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 6, background: "var(--hover)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <span className="fw-600">{p.codigo}</span> — {p.nombre}
                    {p.es_medible && p.metros_por_unidad && (
                      <span style={{ color: "var(--info)", marginLeft: 6, fontSize: 12 }}>
                        +{(p.cantidad || 0) * p.metros_por_unidad}m
                      </span>
                    )}
                  </div>
                  <input type="number" min={1} value={p.cantidad}
                    onChange={e => setCantidadEntrada(p.producto_id, e.target.value)}
                    style={{ width: 70, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 13, background: "var(--surface)", color: "var(--text)" }} />
                  <button className="btn btn-danger-outline btn-sm btn-icon" onClick={() => quitarProductoEntrada(p.producto_id)}>
                    <Icon d={IC.remove} size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Modal Crear / Editar producto */}
      {(modal === "crear" || modal === "editar") && (
        <Modal
          title={modal === "crear" ? "Nuevo Producto" : `Editar — ${selected?.nombre}`}
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
              <input className="form-input" placeholder="Ej: CBL-UTP-001" {...field("codigo")} />
            </div>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select className="form-input" {...field("categoria")}>
                <option value="">Seleccionar...</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
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
            {!form.tiene_variantes && (
              <div className="form-group">
                <label className="form-label">Stock mínimo</label>
                <input className="form-input" type="number" min="0" placeholder="0" {...field("stock_minimo")} />
              </div>
            )}
          </div>
          {modal === "crear" && !form.tiene_variantes && (
            <div className="form-group">
              <label className="form-label">Stock inicial</label>
              <input className="form-input" type="number" min="0" placeholder="0" {...field("stock_total")} />
            </div>
          )}
          {!form.tiene_variantes && (
            <div className="form-group" style={{ marginTop: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                <input type="checkbox" checked={!!form.es_medible}
                  onChange={e => setForm(prev => ({ ...prev, es_medible: e.target.checked, metros_por_unidad: "", metros_disponibles: "" }))} />
                Este producto se mide en metros (cable, fibra, rollo...)
              </label>
            </div>
          )}
          {form.es_medible && !form.tiene_variantes && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Metros por unidad/rollo</label>
                <input className="form-input" type="number" min="1" placeholder="Ej: 1000" {...field("metros_por_unidad")} />
              </div>
              <div className="form-group">
                <label className="form-label">Metros disponibles actuales</label>
                <input className="form-input" type="number" min="0" placeholder="Ej: 41000" {...field("metros_disponibles")} />
              </div>
            </div>
          )}

          {/* ── Sección variantes ── */}
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox" checked={!!form.tiene_variantes}
                onChange={e => {
                  setForm(prev => ({
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

            {form.tiene_variantes && modal === "crear" && (
              <div style={{ marginTop: 12 }}>

                {/* Formulario para agregar variante */}
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
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={agregarVarianteInline}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Icon d={IC.plus} size={13} />
                    Agregar variante
                  </button>
                </div>

                {/* Lista de variantes agregadas */}
                {variantesInline.length > 0 && (
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
                        <button
                          type="button"
                          className="btn btn-danger-outline btn-sm btn-icon"
                          onClick={() => quitarVarianteInline(v._key)}
                        >
                          <Icon d={IC.remove} size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {variantesInline.length === 0 && (
                  <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>
                    Todavía no agregaste variantes. Podés hacerlo ahora o después desde la tabla.
                  </div>
                )}
              </div>
            )}

            {form.tiene_variantes && modal === "editar" && (
              <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--hover)", borderRadius: 8, fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon d={IC.tag} size={13} color="var(--text-muted)" />
                Para editar variantes, usá el panel de variantes en la tabla.
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Eliminar producto */}
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
            ¿Eliminás <strong>{selected?.nombre}</strong>? Esta acción no se puede deshacer.
          </div>
        </Modal>
      )}

      {/* Modal Crear / Editar variante */}
      {(varianteModal === "crear" || varianteModal === "editar") && (
        <Modal
          title={varianteModal === "crear" ? "Nueva variante" : "Editar variante"}
          onClose={() => setVarianteModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setVarianteModal(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGuardarVariante} disabled={saving}>
                {saving ? "Guardando..." : varianteModal === "crear" ? "Agregar variante" : "Guardar cambios"}
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
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Stock inicial</label>
              <input className="form-input" type="number" min="0" placeholder="0" {...varianteField("stock_total")} />
            </div>
            <div className="form-group">
              <label className="form-label">Stock mínimo</label>
              <input className="form-input" type="number" min="0" placeholder="0" {...varianteField("stock_minimo")} />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Eliminar variante */}
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
            ¿Eliminás la variante <strong>
              {varianteSelected?.genero} — {varianteSelected?.talla}
            </strong>? Esta acción no se puede deshacer.
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