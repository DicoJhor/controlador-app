import { useState, useEffect} from "react";
import { Badge } from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { formatDate } from "../../utils/formatters";
import auditoriaService from "../../services/auditoriaService";
import sedesService from "../../services/sedesService";
import { useAuth } from "../../hooks/useAuth";


import logoEnet from "../../assets/logo_enet.png";

function Icon({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const IC = {
  search:   "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  comment:  "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  edit:     "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  remove:   "M18 6L6 18 M6 6l12 12",
  alert:    "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
  entrada:  "M5 12h14 M12 5l7 7-7 7",
  salida:   "M19 12H5 M12 19l-7-7 7-7",
  envio:    "M22 2L11 13 M22 2L15 22l-4-9-9-4 22-7z",
  consumo:  "M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  calendar: "M3 4h18v18H3V4z M16 2v4 M8 2v4 M3 10h18",
  pdf:      "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  excel:    "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M8 13h2 M8 17h2 M14 13h2",
  box:      "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
};

const TIPO_CONFIG = {
  entrada: { label: "Entrada stock",          variant: "entrada", color: "#16a34a" },
  recepcion: { label: "Recepción de envío", variant: "blue",    color: "#0d9488" },
  salida:  { label: "Salida a técnico", variant: "salida",  color: "#dc2626" },
  envio:   { label: "Envío a sede",     variant: "blue",    color: "#2563eb" },
  consumo: { label: "Consumo técnico",  variant: "warning", color: "#d97706" },
};

function TipoBadge({ tipo }) {
  const cfg = TIPO_CONFIG[tipo] ?? { label: tipo, variant: "blue" };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function StatCard({ label, value, icon, color, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: active ? color + "18" : "var(--surface)",
      border: `1px solid ${active ? color : "var(--border)"}`,
      borderRadius: 10, padding: "14px 18px",
      display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 140,
      cursor: "pointer", transition: "all 0.15s",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, background: color + "18",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon d={icon} size={17} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function DetalleMovimiento({ m }) {
  switch (m.tipo) {
    case "entrada":
      return (
        <div>
          <div className="fw-600" style={{ fontSize: 13 }}>{m.item}</div>
          <div className="text-sm text-muted">
            {m.motivo ? <><span style={{ color: "var(--success)" }}>●</span> {m.motivo}</> : <>Por: {m.usuario ?? "—"}</>}
          </div>
        </div>
      );
    case "salida":
      return (
        <div>
          <div className="fw-600" style={{ fontSize: 13 }}>{m.item}</div>
          <div className="text-sm text-muted">Técnico: {m.usuario ?? "—"}</div>
        </div>
      );
    case "envio": {
      const partes  = (m.item ?? "").split(" → ");
      const destino = partes[1] ?? m.sede;
      return (
        <div>
          <div className="fw-600" style={{ fontSize: 13 }}>{partes[0] ?? m.item}</div>
          <div className="text-sm text-muted" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Icon d={IC.envio} size={11} color="var(--info)" />
            Hacia: <strong>{destino}</strong>
            {m.motivo && <> · {m.motivo}</>}
          </div>
        </div>
      );
    }
    case "consumo":
      return (
        <div>
          <div className="fw-600" style={{ fontSize: 13 }}>{m.item}</div>
          <div className="text-sm text-muted">Técnico: {m.usuario ?? "—"}</div>
        </div>
      );
    default:
      return <span className="fw-600">{m.item}</span>;
  }
}

function agruparPorFechaYGuia(movimientos) {
  const porFecha = {};
  for (const m of movimientos) {
    const fechaKey = m.fecha ? new Date(m.fecha).toISOString().split("T")[0] : "sin-fecha";
    if (!porFecha[fechaKey]) porFecha[fechaKey] = {};
    const guiaKey = m.motivo || m.guia || "sin-guia";
    if (!porFecha[fechaKey][guiaKey]) porFecha[fechaKey][guiaKey] = [];
    porFecha[fechaKey][guiaKey].push(m);
  }
  return Object.entries(porFecha)
  .sort((a, b) => b[0].localeCompare(a[0]))
  .map(([fecha, guias]) => [
    fecha,
    Object.entries(guias).sort((a, b) => {
      const maxIdA = Math.max(...a[1].map(m => m.id ?? 0));
      const maxIdB = Math.max(...b[1].map(m => m.id ?? 0));
      return maxIdB - maxIdA;
    })
  ]);
}

// Extrae nombres únicos de productos/ítems de los movimientos
function extraerProductos(movimientos) {
  const set = new Set();
  for (const m of movimientos) {
    if (m.item) {
      // Para envíos, solo tomamos la parte antes del " → "
      const nombre = m.tipo === "envio" ? m.item.split(" → ")[0].trim() : m.item.trim();
      if (nombre) set.add(nombre);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

const emptyExport = { fechaDesde: "", fechaHasta: "", sede: "todas", tipo: "todos", producto: "todos", formato: "pdf" };

export default function AdminAuditoria() {
  const { isSuperadmin } = useAuth();

  const [movimientos, setMovimientos] = useState([]);
  const [sedes,       setSedes]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [search,      setSearch]      = useState("");
  const [filterSede,  setFilterSede]  = useState("todas");
  const [filterTipo,  setFilterTipo]  = useState("todos");
  const [modalExport, setModalExport] = useState(false);
  const [exportForm,  setExportForm]  = useState(emptyExport);

  const [modalEditar, setModalEditar] = useState(false);
  const [envioEditar, setEnvioEditar] = useState(null);
  const [editForm,    setEditForm]    = useState(null);
  const [editSaving,  setEditSaving]  = useState(false);
  const [editError,   setEditError]   = useState("");

  const [modalEliminar, setModalEliminar] = useState(false);
  const [itemEliminar,  setItemEliminar]  = useState(null);
  const [elimSaving,    setElimSaving]    = useState(false);
  const [elimError,     setElimError]     = useState("");

  const [modalEditarEntrada, setModalEditarEntrada] = useState(false);
  const [entradaEditar, setEntradaEditar] = useState(null);

  useEffect(() => {
    Promise.all([auditoriaService.getAll(), sedesService.getAll()])
      .then(([data, sds]) => { setMovimientos(data); setSedes(sds); setLoading(false); })
      .catch(() => { setError("No se pudieron cargar los movimientos"); setLoading(false); });
  }, []);

  // Lista de productos únicos para el selector del modal
  const productos = extraerProductos(movimientos);

  const filtered = movimientos.filter(m => {
    const matchSearch = (m.item ?? "").toLowerCase().includes(search.toLowerCase()) ||
                        (m.usuario ?? "").toLowerCase().includes(search.toLowerCase()) ||
                        (m.motivo ?? "").toLowerCase().includes(search.toLowerCase()) ||
                        (m.sede ?? "").toLowerCase().includes(search.toLowerCase());
    const sedeDestino = m.tipo === "envio" ? (m.item ?? "").split(" → ")[1] ?? "" : "";
    const matchSede   = filterSede === "todas" || m.sede === filterSede || sedeDestino === filterSede;
    const matchTipo   = filterTipo === "todos" || m.tipo === filterTipo;
    return matchSearch && matchSede && matchTipo;
  });

  const grupos  = agruparPorFechaYGuia(filtered);
  const totales = {
    entrada: filtered.filter(m => m.tipo === "entrada").length,
    recepcion: filtered.filter(m => m.tipo === "recepcion").length,
    salida:  filtered.filter(m => m.tipo === "salida").length,
    envio:   filtered.filter(m => m.tipo === "envio").length,
    consumo: filtered.filter(m => m.tipo === "consumo").length,
  };

  const toggleTipo = (tipo) => setFilterTipo(t => t === tipo ? "todos" : tipo);

    const openEditarEnvio = async (guiaKey, items) => {
    setEditError("");
    try {
      // Buscar el envío completo desde obtenerEnvios
      const envios = await auditoriaService.getEnvios();
      // Limpiar prefijos de guía (tanto para envíos como recepciones)
      let guiaReal = guiaKey.replace(/^Guía:\s*/i, "").trim();
      // Si es recepción, también limpiar "Recibido de: X · Guía: "
      guiaReal = guiaReal.replace(/^Recibido de: .+ · Guía:\s*/i, "");
      
      const envio = envios.find(e => e.guia === guiaReal);
      if (!envio) return alert("No se encontró el envío/recepción");

      setEnvioEditar(envio);
      setEditForm({
        guia: envio.guia,
        fecha_envio: envio.fecha_envio
          ? new Date(envio.fecha_envio).toISOString().split("T")[0]
          : "",
        comentario: envio.comentario ?? "",
        sede_id: String(envio.sede_id ?? ""),
        productos: envio.productos.map(p => ({
          producto_id: p.producto_id ?? p.id,
          variante_id: p.variante_id ?? null,
          nombre: p.nombre,
          talla: p.talla ?? null,
          genero: p.genero ?? null,
          cantidad: p.cantidad,
        })),
      });
      setModalEditar(true);
    } catch (err) {
      alert("Error al cargar el envío/recepción: " + err.message);
    }
  };

  const openEditarEntrada = (entrada) => {
    setEditError("");
    setEntradaEditar(entrada);
    setEditForm({
      id: entrada.id,
      cantidad: entrada.cantidad,
      comentario: entrada.comentario || "",
      motivo: entrada.motivo || "",
    });
    setModalEditarEntrada(true);
  };

  // ✅ DESPUÉS — funciones separadas correctamente
const handleEliminar = async () => {
    setElimError("");
    setElimSaving(true);
    try {
      const { tipo, items } = itemEliminar;
      if (tipo === "envio" || tipo === "recepcion") {
        const guiaReal = itemEliminar.guiaKey.replace(/^Guía:\s*/i, "").trim();
        const envios   = await auditoriaService.getEnvios();
        const envio    = envios.find(e => e.guia === guiaReal);
        if (!envio) throw new Error("No se encontró el envío");
        await auditoriaService.eliminarEnvio(envio.id);
      } else if (tipo === "entrada") {
        await Promise.all(items.map(m => auditoriaService.eliminarEntrada(m.id)));
      } else {
        throw new Error(`La eliminación de "${tipo}" aún no está soportada.`);
      }
      const data = await auditoriaService.getAll();
      setMovimientos(data);
      setModalEliminar(false);
    } catch (err) {
      setElimError(err.message);
    } finally {
      setElimSaving(false);
    }
  };

  const handleEditarEnvio = async () => {
    setEditError("");
    if (!editForm.guia.trim())       return setEditError("Ingresá el número de guía.");
    if (!editForm.fecha_envio)       return setEditError("Ingresá la fecha.");
    if (!editForm.sede_id)           return setEditError("Seleccioná una sede destino.");
    if (!editForm.productos?.length) return setEditError("Debe haber al menos un producto.");
    for (const p of editForm.productos) {
      if (!p.cantidad || p.cantidad <= 0)
        return setEditError(`Cantidad inválida en "${p.nombre}".`);
    }

    setEditSaving(true);
    try {
      await auditoriaService.editarEnvio(envioEditar.id, {
        guia:        editForm.guia,
        fecha_envio: editForm.fecha_envio,
        comentario:  editForm.comentario,
        sede_id:     editForm.sede_id,
        productos:   editForm.productos.map(p => ({
          producto_id: p.producto_id,
          variante_id: p.variante_id ?? null,
          cantidad:    Number(p.cantidad),
        })),
      });
      const data = await auditoriaService.getAll();
      setMovimientos(data);
      setModalEditar(false);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  };



  const handleEditarEntrada = async () => {
    setEditError("");
    if (!editForm.cantidad || editForm.cantidad <= 0) {
      return setEditError("La cantidad debe ser mayor a 0");
    }

    setEditSaving(true);
    try {
      await auditoriaService.editarEntrada(entradaEditar.id, {
        cantidad: editForm.cantidad,
        comentario: editForm.comentario,
        motivo: editForm.motivo,
      });
      const data = await auditoriaService.getAll();
      setMovimientos(data);
      setModalEditarEntrada(false);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const aplicarFiltrosExport = () => movimientos.filter(m => {
    const sedeDestino = m.tipo === "envio" ? (m.item ?? "").split(" → ")[1] ?? "" : "";
    const matchSede   = exportForm.sede === "todas" || m.sede === exportForm.sede || sedeDestino === exportForm.sede;
    const matchTipo   = exportForm.tipo === "todos" || m.tipo === exportForm.tipo;

    // ── Filtro por producto ──────────────────────────────────
    let matchProducto = true;
    if (exportForm.producto !== "todos") {
      const itemNombre = m.tipo === "envio"
        ? (m.item ?? "").split(" → ")[0].trim()
        : (m.item ?? "").trim();
      matchProducto = itemNombre === exportForm.producto;
    }

    let matchFecha = true;
    if (m.fecha) {
      const d = new Date(m.fecha).toISOString().split("T")[0];
      if (exportForm.fechaDesde && d < exportForm.fechaDesde) matchFecha = false;
      if (exportForm.fechaHasta && d > exportForm.fechaHasta) matchFecha = false;
    }
    return matchSede && matchTipo && matchProducto && matchFecha;
  });

  // ── Excel profesional (HTML → .xls que Excel abre con estilos) ──
  const exportarExcel = (datos) => {
    const sedeLabel     = exportForm.sede === "todas" ? "Todas las sedes" : exportForm.sede;
    const tipoLabel     = exportForm.tipo === "todos" ? "Todos" : (TIPO_CONFIG[exportForm.tipo]?.label ?? exportForm.tipo);
    const productoLabel = exportForm.producto === "todos" ? "Todos los productos" : exportForm.producto;
    const fechaLabel    = exportForm.fechaDesde || exportForm.fechaHasta
      ? `${exportForm.fechaDesde || "—"} al ${exportForm.fechaHasta || "—"}`
      : "Sin filtro";

    const tipoColors = {
      entrada: "#16a34a", salida: "#dc2626", envio: "#2563eb", consumo: "#d97706"
    };

    const resumen = {
      entrada: datos.filter(m => m.tipo === "entrada").length,
      salida:  datos.filter(m => m.tipo === "salida").length,
      envio:   datos.filter(m => m.tipo === "envio").length,
      consumo: datos.filter(m => m.tipo === "consumo").length,
    };

    const filas = datos.map((m, i) => {
      const color = tipoColors[m.tipo] ?? "#333";
      const bg    = i % 2 === 0 ? "#fafafa" : "#ffffff";
      return `
        <tr style="background:${bg}">
          <td style="border:1px solid #ddd;padding:6px 10px;font-size:11px">${formatDate(m.fecha)}</td>
          <td style="border:1px solid #ddd;padding:6px 10px;font-size:11px;color:${color};font-weight:bold">${TIPO_CONFIG[m.tipo]?.label ?? m.tipo}</td>
          <td style="border:1px solid #ddd;padding:6px 10px;font-size:11px;font-weight:bold">${m.item ?? "—"}</td>
          <td style="border:1px solid #ddd;padding:6px 10px;font-size:11px;text-align:center;font-weight:bold">${m.cantidad}</td>
          <td style="border:1px solid #ddd;padding:6px 10px;font-size:11px">${m.sede ?? "—"}</td>
          <td style="border:1px solid #ddd;padding:6px 10px;font-size:11px">${m.usuario ?? "—"}</td>
          <td style="border:1px solid #ddd;padding:6px 10px;font-size:11px">${m.motivo ?? "—"}</td>
          <td style="border:1px solid #ddd;padding:6px 10px;font-size:11px">${m.comentario ?? "—"}</td>
        </tr>`;
    }).join("");

    const porSede = {};
    datos.forEach(m => {
      const s = m.sede ?? "Sin sede";
      if (!porSede[s]) porSede[s] = [];
      porSede[s].push(m);
    });
    const filasSede = Object.entries(porSede).map(([sede, movs], i) => `
      <tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">
        <td style="border:1px solid #ddd;padding:6px 10px;font-size:11px;font-weight:bold">${sede}</td>
        <td style="border:1px solid #ddd;padding:6px 10px;font-size:11px;text-align:center;color:#16a34a;font-weight:bold">${movs.filter(m=>m.tipo==="entrada").length}</td>
        <td style="border:1px solid #ddd;padding:6px 10px;font-size:11px;text-align:center;color:#dc2626;font-weight:bold">${movs.filter(m=>m.tipo==="salida").length}</td>
        <td style="border:1px solid #ddd;padding:6px 10px;font-size:11px;text-align:center;color:#2563eb;font-weight:bold">${movs.filter(m=>m.tipo==="envio").length}</td>
        <td style="border:1px solid #ddd;padding:6px 10px;font-size:11px;text-align:center;color:#d97706;font-weight:bold">${movs.filter(m=>m.tipo==="consumo").length}</td>
        <td style="border:1px solid #ddd;padding:6px 10px;font-size:11px;text-align:center;font-weight:bold">${movs.length}</td>
      </tr>`).join("");

    const thStyle = `style="background:#1a1a1a;color:white;padding:8px 10px;font-size:11px;font-weight:bold;border:1px solid #1a1a1a;text-align:center"`;

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
          <x:ExcelWorksheet><x:Name>Resumen</x:Name><x:WorksheetOptions><x:Selected/></x:WorksheetOptions></x:ExcelWorksheet>
          <x:ExcelWorksheet><x:Name>Detalle</x:Name></x:ExcelWorksheet>
          <x:ExcelWorksheet><x:Name>Por sede</x:Name></x:ExcelWorksheet>
        </x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      </head>
      <body>

        <!-- HOJA 1: RESUMEN -->
        <table style="font-family:Arial;margin-bottom:20px">
          <tr><td colspan="2" style="font-size:16px;font-weight:bold;padding:10px 0;color:#1a1a1a">ENET FIBER PERÚ</td></tr>
          <tr><td colspan="2" style="font-size:12px;color:#555;padding-bottom:16px">Reporte de Auditoría de Inventario</td></tr>
          <tr style="background:#f5f5f5"><td style="border:1px solid #ddd;padding:7px 12px;font-weight:bold;font-size:11px;width:180px">Generado el:</td><td style="border:1px solid #ddd;padding:7px 12px;font-size:11px">${new Date().toLocaleString("es-PE")}</td></tr>
          <tr><td style="border:1px solid #ddd;padding:7px 12px;font-weight:bold;font-size:11px">Sede:</td><td style="border:1px solid #ddd;padding:7px 12px;font-size:11px">${sedeLabel}</td></tr>
          <tr style="background:#f5f5f5"><td style="border:1px solid #ddd;padding:7px 12px;font-weight:bold;font-size:11px">Tipo:</td><td style="border:1px solid #ddd;padding:7px 12px;font-size:11px">${tipoLabel}</td></tr>
          <tr><td style="border:1px solid #ddd;padding:7px 12px;font-weight:bold;font-size:11px">Producto:</td><td style="border:1px solid #ddd;padding:7px 12px;font-size:11px">${productoLabel}</td></tr>
          <tr style="background:#f5f5f5"><td style="border:1px solid #ddd;padding:7px 12px;font-weight:bold;font-size:11px">Período:</td><td style="border:1px solid #ddd;padding:7px 12px;font-size:11px">${fechaLabel}</td></tr>
          <tr><td style="border:1px solid #ddd;padding:7px 12px;font-weight:bold;font-size:11px">Total registros:</td><td style="border:1px solid #ddd;padding:7px 12px;font-size:11px;font-weight:bold">${datos.length}</td></tr>
          <tr><td colspan="2" style="padding:12px 0"></td></tr>
          <tr><td colspan="2" style="font-size:12px;font-weight:bold;padding:6px 0;color:#1a1a1a">RESUMEN POR TIPO</td></tr>
          <tr><th ${thStyle}>Tipo de movimiento</th><th ${thStyle}>Cantidad</th></tr>
          <tr><td style="border:1px solid #ddd;padding:7px 12px;font-size:11px;color:#16a34a;font-weight:bold">Entradas de material</td><td style="border:1px solid #ddd;padding:7px 12px;font-size:11px;text-align:center;color:#16a34a;font-weight:bold">${resumen.entrada}</td></tr>
          <tr style="background:#f5f5f5"><td style="border:1px solid #ddd;padding:7px 12px;font-size:11px;color:#dc2626;font-weight:bold">Salidas a técnico</td><td style="border:1px solid #ddd;padding:7px 12px;font-size:11px;text-align:center;color:#dc2626;font-weight:bold">${resumen.salida}</td></tr>
          <tr><td style="border:1px solid #ddd;padding:7px 12px;font-size:11px;color:#2563eb;font-weight:bold">Envíos a sede</td><td style="border:1px solid #ddd;padding:7px 12px;font-size:11px;text-align:center;color:#2563eb;font-weight:bold">${resumen.envio}</td></tr>
          <tr style="background:#f5f5f5"><td style="border:1px solid #ddd;padding:7px 12px;font-size:11px;color:#d97706;font-weight:bold">Consumo técnico</td><td style="border:1px solid #ddd;padding:7px 12px;font-size:11px;text-align:center;color:#d97706;font-weight:bold">${resumen.consumo}</td></tr>
          <tr><td style="border:1px solid #1a1a1a;padding:7px 12px;font-size:11px;font-weight:bold;background:#1a1a1a;color:white">TOTAL</td><td style="border:1px solid #1a1a1a;padding:7px 12px;font-size:11px;font-weight:bold;background:#1a1a1a;color:white;text-align:center">${datos.length}</td></tr>
        </table>

        <br><br>

        <!-- HOJA 2: DETALLE -->
        <table style="font-family:Arial;width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr><td colspan="8" style="font-size:13px;font-weight:bold;padding:8px 0;color:#1a1a1a">DETALLE DE MOVIMIENTOS</td></tr>
          <tr>
            <th ${thStyle}>Fecha</th>
            <th ${thStyle}>Tipo</th>
            <th ${thStyle}>Producto / Ítem</th>
            <th ${thStyle}>Cant.</th>
            <th ${thStyle}>Sede</th>
            <th ${thStyle}>Usuario</th>
            <th ${thStyle}>Guía / Motivo</th>
            <th ${thStyle}>Comentario</th>
          </tr>
          ${filas}
          <tr>
            <td colspan="3" style="border:1px solid #1a1a1a;padding:7px 10px;background:#1a1a1a;color:white;font-weight:bold;font-size:11px">TOTAL: ${datos.length} registros</td>
            <td style="border:1px solid #1a1a1a;padding:7px 10px;background:#1a1a1a;color:white;font-weight:bold;font-size:11px;text-align:center">${datos.length}</td>
            <td colspan="4" style="border:1px solid #1a1a1a;background:#1a1a1a"></td>
          </tr>
        </table>

        <br><br>

        <!-- HOJA 3: POR SEDE -->
        <table style="font-family:Arial;border-collapse:collapse">
          <tr><td colspan="6" style="font-size:13px;font-weight:bold;padding:8px 0;color:#1a1a1a">RESUMEN POR SEDE</td></tr>
          <tr>
            <th ${thStyle}>Sede</th>
            <th ${thStyle} style="color:#16a34a">Entradas</th>
            <th ${thStyle} style="color:#dc2626">Salidas</th>
            <th ${thStyle} style="color:#2563eb">Envíos</th>
            <th ${thStyle} style="color:#d97706">Consumos</th>
            <th ${thStyle}>Total</th>
          </tr>
          ${filasSede}
          <tr>
            <td style="border:1px solid #1a1a1a;padding:7px 10px;background:#1a1a1a;color:white;font-weight:bold;font-size:11px">TOTAL GENERAL</td>
            <td style="border:1px solid #1a1a1a;padding:7px 10px;background:#1a1a1a;color:white;font-weight:bold;font-size:11px;text-align:center">${resumen.entrada}</td>
            <td style="border:1px solid #1a1a1a;padding:7px 10px;background:#1a1a1a;color:white;font-weight:bold;font-size:11px;text-align:center">${resumen.salida}</td>
            <td style="border:1px solid #1a1a1a;padding:7px 10px;background:#1a1a1a;color:white;font-weight:bold;font-size:11px;text-align:center">${resumen.envio}</td>
            <td style="border:1px solid #1a1a1a;padding:7px 10px;background:#1a1a1a;color:white;font-weight:bold;font-size:11px;text-align:center">${resumen.consumo}</td>
            <td style="border:1px solid #1a1a1a;padding:7px 10px;background:#1a1a1a;color:white;font-weight:bold;font-size:11px;text-align:center">${datos.length}</td>
          </tr>
        </table>

      </body>
      </html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `auditoria_enet_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── PDF tipo informe ───────────────────────────────────────
  const exportarPDF = (datos) => {
    const sedeLabel     = exportForm.sede === "todas" ? "Todas las sedes" : exportForm.sede;
    const tipoLabel     = exportForm.tipo === "todos" ? "Todos los tipos" : (TIPO_CONFIG[exportForm.tipo]?.label ?? exportForm.tipo);
    const productoLabel = exportForm.producto === "todos" ? "Todos los productos" : exportForm.producto;
    const fechaLabel    = exportForm.fechaDesde || exportForm.fechaHasta
      ? `${exportForm.fechaDesde || "—"} al ${exportForm.fechaHasta || "—"}`
      : "Sin filtro de fecha";

    const resumen = {
      entrada: datos.filter(m => m.tipo === "entrada").length,
      salida:  datos.filter(m => m.tipo === "salida").length,
      envio:   datos.filter(m => m.tipo === "envio").length,
      consumo: datos.filter(m => m.tipo === "consumo").length,
    };

    const gruposExp = agruparPorFechaYGuia(datos);

    // ✅ DESPUÉS — aplanamos guias → items correctamente
    const filasPorGrupo = gruposExp.map(([fechaKey, guias]) => {
      const items = guias.flatMap(([, movs]) => movs);
      return `
        <div class="grupo">
          <div class="grupo-header">
            <span class="grupo-fecha">${fechaKey === "sin-fecha" ? "Sin fecha" : formatDate(fechaKey)}</span>
            <span class="grupo-count">${items.length} movimiento${items.length !== 1 ? "s" : ""}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Producto / Ítem</th>
                <th>Cant.</th>
                <th>Sede</th>
                <th>Usuario</th>
                <th>Guía / Motivo</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(m => {
                const cfg = TIPO_CONFIG[m.tipo] ?? { label: m.tipo, color: "#666" };
                const itemText = m.tipo === "envio"
                  ? `${(m.item ?? "").split(" → ")[0]} <span style="color:${cfg.color}">→ ${(m.item ?? "").split(" → ")[1] ?? ""}</span>`
                  : (m.item ?? "—");
                return `
                  <tr>
                    <td><span class="badge" style="background:${cfg.color}22;color:${cfg.color}">${cfg.label}</span></td>
                    <td class="bold">${itemText}</td>
                    <td class="center">${m.cantidad}</td>
                    <td>${m.sede ?? "—"}</td>
                    <td>${m.usuario ?? "—"}</td>
                    <td class="small">${m.motivo ?? ""}${m.comentario ? `<br><span class="muted">${m.comentario}</span>` : ""}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      `;
    }).join("");

    // Bloque extra en filtros aplicados solo si se filtró por producto
    const productoFiltroHTML = exportForm.producto !== "todos" ? `
      <div class="filtro-item">
        <span class="filtro-label">Producto</span>
        <span class="filtro-value">${productoLabel}</span>
      </div>` : "";

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe de Auditoría — Enet Fiber Perú</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; font-size: 11px; color: #1a1a1a; background: white; }
    .page { padding: 36px 40px; max-width: 900px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #1a1a1a; }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .logo { height: 52px; object-fit: contain; }
    .company-name { font-size: 18px; font-weight: 800; color: #1a1a1a; letter-spacing: -0.3px; }
    .report-title { font-size: 12px; color: #666; margin-top: 2px; }
    .header-right { text-align: right; font-size: 10px; color: #888; line-height: 1.6; }
    .filtros { background: #f8f8f8; border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: flex; gap: 24px; flex-wrap: wrap; }
    .filtro-item { display: flex; flex-direction: column; gap: 2px; }
    .filtro-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; font-weight: 600; }
    .filtro-value { font-size: 11px; font-weight: 700; color: #1a1a1a; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px; }
    .stat { border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px 14px; }
    .stat-num { font-size: 24px; font-weight: 800; line-height: 1; }
    .stat-label { font-size: 10px; color: #888; margin-top: 4px; }
    .stat-bar { height: 3px; border-radius: 2px; margin-top: 8px; }
    .grupo { margin-bottom: 20px; page-break-inside: avoid; }
    .grupo-header { display: flex; align-items: center; gap: 10px; padding: 6px 0; margin-bottom: 6px; border-bottom: 1.5px solid #e5e5e5; }
    .grupo-fecha { font-weight: 700; font-size: 12px; }
    .grupo-count { font-size: 10px; color: #888; background: #f0f0f0; padding: 2px 8px; border-radius: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1a1a1a; color: white; padding: 7px 10px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.3px; }
    td { padding: 6px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; font-size: 10px; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: #fafafa; }
    .badge { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; white-space: nowrap; }
    .bold { font-weight: 600; }
    .center { text-align: center; font-weight: 700; }
    .small { font-size: 10px; }
    .muted { color: #888; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e5e5e5; display: flex; justify-content: space-between; font-size: 9px; color: #aaa; }
    @media print { body { font-size: 10px; } .page { padding: 20px; } .grupo { page-break-inside: avoid; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      <img src="${logoEnet}" class="logo" alt="Enet Fiber Perú" />
      <div>
        <div class="company-name">Enet Fiber Perú</div>
        <div class="report-title">Informe de Auditoría de Inventario</div>
      </div>
    </div>
    <div class="header-right">
      <div><strong>Fecha de emisión:</strong> ${new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}</div>
      <div><strong>Hora:</strong> ${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</div>
      <div><strong>Total registros:</strong> ${datos.length}</div>
    </div>
  </div>

  <div class="filtros">
    <div class="filtro-item">
      <span class="filtro-label">Período</span>
      <span class="filtro-value">${fechaLabel}</span>
    </div>
    <div class="filtro-item">
      <span class="filtro-label">Sede</span>
      <span class="filtro-value">${sedeLabel}</span>
    </div>
    <div class="filtro-item">
      <span class="filtro-label">Tipo de movimiento</span>
      <span class="filtro-value">${tipoLabel}</span>
    </div>
    ${productoFiltroHTML}
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-num" style="color:#16a34a">${resumen.entrada}</div>
      <div class="stat-label">Entradas de material</div>
      <div class="stat-bar" style="background:#16a34a;width:${datos.length ? Math.round((resumen.entrada/datos.length)*100) : 0}%"></div>
    </div>
    <div class="stat">
      <div class="stat-num" style="color:#dc2626">${resumen.salida}</div>
      <div class="stat-label">Salidas a técnico</div>
      <div class="stat-bar" style="background:#dc2626;width:${datos.length ? Math.round((resumen.salida/datos.length)*100) : 0}%"></div>
    </div>
    <div class="stat">
      <div class="stat-num" style="color:#2563eb">${resumen.envio}</div>
      <div class="stat-label">Envíos a sede</div>
      <div class="stat-bar" style="background:#2563eb;width:${datos.length ? Math.round((resumen.envio/datos.length)*100) : 0}%"></div>
    </div>
    <div class="stat">
      <div class="stat-num" style="color:#d97706">${resumen.consumo}</div>
      <div class="stat-label">Consumos técnico</div>
      <div class="stat-bar" style="background:#d97706;width:${datos.length ? Math.round((resumen.consumo/datos.length)*100) : 0}%"></div>
    </div>
  </div>

  ${filasPorGrupo}

  <div class="footer">
    <span>Enet Fiber Perú — Sistema de Control de Materiales</span>
    <span>Generado el ${new Date().toLocaleString("es-PE")} · ${datos.length} registros</span>
  </div>
</div>
</body>
</html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  const handleExportar = () => {
    const datos = aplicarFiltrosExport();
    if (datos.length === 0) { alert("No hay registros con los filtros seleccionados."); return; }
    if (exportForm.formato === "excel") exportarExcel(datos);
    else exportarPDF(datos);
    setModalExport(false);
  };

  const expField = (key) => ({
    value: exportForm[key],
    onChange: e => setExportForm(prev => ({ ...prev, [key]: e.target.value }))
  });

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando movimientos...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      {/* Tarjetas */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => (
          <StatCard key={tipo} label={cfg.label} value={totales[tipo]}
            icon={IC[tipo]} color={cfg.color}
            active={filterTipo === tipo} onClick={() => toggleTipo(tipo)} />
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Icon d={IC.search} size={16} color="var(--text-muted)" />
          <input placeholder="Buscar por ítem, usuario, guía o sede..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={filterSede} onChange={e => setFilterSede(e.target.value)}>
          <option value="todas">Todas las sedes</option>
          {sedes.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
        </select>
        <select className="filter-select" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option value="todos">Todos los tipos</option>
          {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => (
            <option key={tipo} value={tipo}>{cfg.label}</option>
          ))}
        </select>
        <button className="btn btn-outline" onClick={() => { setExportForm(emptyExport); setModalExport(true); }}>
          <Icon d={IC.download} size={15} />
          Exportar
        </button>
      </div>

      {/* Contador */}
      <div style={{ marginBottom: 12, fontSize: 13, color: "var(--text-muted)" }}>
        {filtered.length} registro(s) en {grupos.length} día(s)
        {filterSede !== "todas" && <> · Sede: <strong>{filterSede}</strong></>}
        {filterTipo !== "todos" && <> · Tipo: <strong>{TIPO_CONFIG[filterTipo]?.label}</strong></>}
      </div>

      {grupos.length === 0 && (
        <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
          Sin registros con los filtros aplicados
        </div>
      )}

      {/* Tabla agrupada por fecha */}
      {grupos.map(([fechaKey, guias]) => (
        <div key={fechaKey} style={{ marginBottom: 24 }}>
          {/* Cabecera de fecha */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            marginBottom: 12, paddingBottom: 6, borderBottom: "2px solid var(--border)",
          }}>
            <Icon d={IC.calendar} size={14} color="var(--text-muted)" />
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
              {fechaKey === "sin-fecha" ? "Sin fecha" : formatDate(fechaKey)}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--hover)", borderRadius: 12, padding: "2px 8px" }}>
              {guias.reduce((sum, [, items]) => sum + items.length, 0)} movimiento{guias.reduce((sum, [, items]) => sum + items.length, 0) !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Bloques por guía */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {guias.map(([guiaKey, items]) => {
              const primerItem = items[0];
              const cfg = TIPO_CONFIG[primerItem?.tipo] ?? { label: primerItem?.tipo, color: "#2563eb" };
              return (
                <div key={guiaKey} style={{
                  border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden"
                }}>
                  {/* Cabecera del bloque guía */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 14px",
                    background: cfg.color + "10",
                    borderBottom: "1px solid var(--border)",
                  }}>
                    <TipoBadge tipo={primerItem?.tipo} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                      {guiaKey === "sin-guia" ? "—" : guiaKey}
                    </span>
                    {primerItem?.sede && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        · {primerItem.sede}
                      </span>
                    )}
                    <span style={{
                      marginLeft: "auto", fontSize: 11, color: "var(--text-muted)",
                      background: "var(--hover)", borderRadius: 10, padding: "2px 8px"
                    }}>
                      {items.length} producto{items.length !== 1 ? "s" : ""}
                    </span>
                    {isSuperadmin && (
                      <>
                        {["envio", "recepcion"].includes(primerItem?.tipo) && guiaKey !== "sin-guia" && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openEditarEnvio(guiaKey, items)}
                            style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}
                          >
                            <Icon d={IC.edit} size={12} />
                            Editar
                          </button>
                        )}
                        {primerItem?.tipo === "entrada" && items.length === 1 && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openEditarEntrada(items[0])}
                            style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}
                          >
                            <Icon d={IC.edit} size={12} />
                            Editar
                          </button>
                        )}
                        {["envio", "recepcion", "entrada"].includes(primerItem?.tipo) && guiaKey !== "sin-guia" && (
                          <button
                            className="btn btn-danger-outline btn-sm"
                            onClick={() => {
                              setElimError("");
                              setItemEliminar({ guiaKey, tipo: primerItem?.tipo, items });
                              setModalEliminar(true);
                            }}
                            style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4 }}
                          >
                            <Icon d={IC.remove} size={12} />
                            Eliminar
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Tabla de productos del bloque */}
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Detalle</th>
                          <th>Cant.</th>
                          <th>Sede</th>
                          <th>Comentario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((m, i) => (
                          <tr key={i}>
                            <td><DetalleMovimiento m={m} /></td>
                            <td className="mono fw-600">{m.cantidad}</td>
                            <td className="text-sm">{m.sede ?? "—"}</td>
                            <td>
                              {m.comentario ? (
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 4, maxWidth: 200 }}>
                                  <Icon d={IC.comment} size={11} color="var(--text-muted)" />
                                  <span className="text-sm text-muted">{m.comentario}</span>
                                </div>
                              ) : <span className="text-muted">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Modal editar envío */}
      {modalEditar && editForm && (
        <Modal
          title={`Editar envío — Guía: ${envioEditar?.guia}`}
          onClose={() => setModalEditar(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModalEditar(false)} disabled={editSaving}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleEditarEnvio} disabled={editSaving}>
                {editSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </>
          }
        >
          <div style={{
            background: "#FEF3C7", border: "1px solid #F59E0B",
            borderRadius: 8, padding: "10px 14px", marginBottom: 16,
            display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13,
          }}>
            <Icon d={IC.alert} size={15} color="#D97706" />
            <span style={{ color: "#92400E" }}>
              <strong>Atención:</strong> Esta acción modifica el stock de las sedes involucradas.
              Usala solo para corregir errores.
            </span>
          </div>

          {editError && (
            <div className="alert alert-danger" style={{ marginBottom: 12 }}>
              <Icon d={IC.alert} size={14} color="var(--danger)" /> {editError}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Número de guía *</label>
              <input className="form-input" value={editForm.guia}
                onChange={e => setEditForm(prev => ({ ...prev, guia: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de envío *</label>
              <input className="form-input" type="date" value={editForm.fecha_envio}
                onChange={e => setEditForm(prev => ({ ...prev, fecha_envio: e.target.value }))} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sede destino *</label>
              <select className="form-input" value={editForm.sede_id}
                onChange={e => setEditForm(prev => ({ ...prev, sede_id: e.target.value }))}>
                <option value="">Seleccionar sede...</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Comentario</label>
              <input className="form-input" placeholder="Opcional..."
                value={editForm.comentario}
                onChange={e => setEditForm(prev => ({ ...prev, comentario: e.target.value }))} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Productos</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {editForm.productos.map((p, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: 8,
                  background: "var(--hover)", border: "1px solid var(--border)"
                }}>
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <span className="fw-600">{p.nombre}</span>
                    {p.talla && (
                      <span style={{ fontSize: 11, marginLeft: 6, color: "var(--text-muted)" }}>
                        {p.genero} — {p.talla}
                      </span>
                    )}
                  </div>
                  <input
                    type="number" min={1} value={p.cantidad}
                    onChange={e => setEditForm(prev => ({
                      ...prev,
                      productos: prev.productos.map((item, idx) =>
                        idx === i ? { ...item, cantidad: Number(e.target.value) } : item
                      )
                    }))}
                    style={{
                      width: 70, padding: "4px 8px", borderRadius: 6,
                      border: "1px solid var(--border)", fontSize: 13,
                      background: "var(--surface)", color: "var(--text)"
                    }}
                  />
                  <button
                    className="btn btn-danger-outline btn-sm btn-icon"
                    onClick={() => setEditForm(prev => ({
                      ...prev,
                      productos: prev.productos.filter((_, idx) => idx !== i)
                    }))}
                  >
                    <Icon d={IC.remove} size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {modalEliminar && itemEliminar && (
        <Modal
          title="Eliminar registro"
          onClose={() => setModalEliminar(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModalEliminar(false)} disabled={elimSaving}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={handleEliminar} disabled={elimSaving}>
                <Icon d={IC.remove} size={14} />
                {elimSaving ? "Eliminando..." : "Confirmar eliminación"}
              </button>
            </>
          }
        >
          <div style={{
            background: "#FEE2E2", border: "1px solid #FCA5A5",
            borderRadius: 8, padding: "10px 14px", marginBottom: 16,
            display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13,
          }}>
            <Icon d={IC.alert} size={15} color="#DC2626" />
            <span style={{ color: "#7F1D1D" }}>
              <strong>Esta acción es irreversible.</strong> Se eliminarán los registros
              y se revertirá el stock afectado.
            </span>
          </div>

          {elimError && (
            <div className="alert alert-danger" style={{ marginBottom: 12 }}>
              <Icon d={IC.alert} size={14} color="var(--danger)" /> {elimError}
            </div>
          )}

          <div style={{ fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: "var(--text-muted)" }}>Tipo: </span>
            <TipoBadge tipo={itemEliminar.tipo} />
          </div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            <span style={{ color: "var(--text-muted)" }}>Guía / motivo: </span>
            <strong>{itemEliminar.guiaKey === "sin-guia" ? "—" : itemEliminar.guiaKey}</strong>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
            Productos afectados:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {itemEliminar.items.map((m, i) => (
              <div key={i} style={{
                padding: "6px 10px", borderRadius: 6,
                background: "var(--hover)", border: "1px solid var(--border)",
                fontSize: 12, display: "flex", justifyContent: "space-between",
              }}>
                <span className="fw-600">{m.item}</span>
                <span style={{ color: "var(--text-muted)" }}>× {m.cantidad}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

            {/* Modal editar entrada */}
      {modalEditarEntrada && editForm && (
        <Modal
          title="Editar entrada de stock"
          onClose={() => setModalEditarEntrada(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModalEditarEntrada(false)} disabled={editSaving}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleEditarEntrada} disabled={editSaving}>
                {editSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </>
          }
        >
          <div style={{
            background: "#FEF3C7", border: "1px solid #F59E0B",
            borderRadius: 8, padding: "10px 14px", marginBottom: 16,
            display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13,
          }}>
            <Icon d={IC.alert} size={15} color="#D97706" />
            <span style={{ color: "#92400E" }}>
              <strong>Atención:</strong> Esta acción modifica el stock del producto.
              Usala solo para corregir errores.
            </span>
          </div>

          {editError && (
            <div className="alert alert-danger" style={{ marginBottom: 12 }}>
              <Icon d={IC.alert} size={14} color="var(--danger)" /> {editError}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Producto</label>
            <input className="form-input" value={entradaEditar?.item} disabled />
          </div>

          <div className="form-group">
            <label className="form-label">Cantidad *</label>
            <input 
              className="form-input" 
              type="number" 
              min={1}
              value={editForm.cantidad}
              onChange={e => setEditForm(prev => ({ ...prev, cantidad: Number(e.target.value) }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Motivo</label>
            <input 
              className="form-input" 
              value={editForm.motivo || ""}
              onChange={e => setEditForm(prev => ({ ...prev, motivo: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Comentario</label>
            <textarea 
              className="form-input" 
              rows={3}
              value={editForm.comentario || ""}
              onChange={e => setEditForm(prev => ({ ...prev, comentario: e.target.value }))}
            />
          </div>
        </Modal>
      )}

      {/* Modal exportar */}
      {modalExport && (
        <Modal
          title="Exportar auditoría"
          onClose={() => setModalExport(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModalExport(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleExportar}>
                <Icon d={exportForm.formato === "pdf" ? IC.pdf : IC.excel} size={14} />
                Exportar {exportForm.formato === "pdf" ? "PDF" : "Excel"}
              </button>
            </>
          }
        >
          {/* Selector de formato */}
          <div className="form-group">
            <label className="form-label">Formato</label>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { key: "pdf",   label: "PDF",   sub: "Informe imprimible con logo",       icon: IC.pdf   },
                { key: "excel", label: "Excel",  sub: "3 hojas: resumen, detalle, sedes",  icon: IC.excel },
              ].map(f => (
                <div key={f.key} onClick={() => setExportForm(prev => ({ ...prev, formato: f.key }))}
                  style={{
                    flex: 1, padding: "12px 14px", borderRadius: 8, cursor: "pointer",
                    border: `2px solid ${exportForm.formato === f.key ? "var(--primary)" : "var(--border)"}`,
                    background: exportForm.formato === f.key ? "var(--primary-bg, #f0f4ff)" : "var(--surface)",
                    display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s",
                  }}>
                  <Icon d={f.icon} size={18} color={exportForm.formato === f.key ? "var(--primary)" : "var(--text-muted)"} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rango de fechas */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Desde</label>
              <input className="form-input" type="date" {...expField("fechaDesde")} />
            </div>
            <div className="form-group">
              <label className="form-label">Hasta</label>
              <input className="form-input" type="date" {...expField("fechaHasta")} />
            </div>
          </div>

          {/* Sede y tipo */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sede</label>
              <select className="form-input" {...expField("sede")}>
                <option value="todas">Todas las sedes</option>
                {sedes.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-input" {...expField("tipo")}>
                <option value="todos">Todos</option>
                {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => (
                  <option key={tipo} value={tipo}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── NUEVO: Selector de producto ── */}
          <div className="form-group">
            <label className="form-label">
              <Icon d={IC.box} size={13} color="var(--text-muted)" style={{ marginRight: 4 }} />
              Producto
            </label>
            <select className="form-input" {...expField("producto")}>
              <option value="todos">Todos los productos</option>
              {productos.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Preview */}
          <div style={{
            padding: "10px 14px", background: "var(--hover)",
            borderRadius: 8, fontSize: 13, color: "var(--text-muted)"
          }}>
            Se exportarán <strong style={{ color: "var(--text)" }}>
              {aplicarFiltrosExport().length}
            </strong> registro(s) con los filtros seleccionados.
            {exportForm.producto !== "todos" && (
              <span style={{ marginLeft: 6, color: "var(--primary)", fontWeight: 600 }}>
                · Producto: {exportForm.producto}
              </span>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}