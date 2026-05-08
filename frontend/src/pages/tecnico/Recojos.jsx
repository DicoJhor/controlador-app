import { useState, useEffect, useRef } from "react";
import { db } from "../../db/localDB";
import { fileToBase64 } from "../../services/syncService";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import ordenesService from "../../services/ordenesService";
import tecnicoService from "../../services/tecnicoService";

const BASE_URL = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "";

function formatFecha(fecha) {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function Icon({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const IC = {
  check:     "M20 6L9 17l-5-5",
  x:         "M18 6L6 18 M6 6l12 12",
  camera:    "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8",
  search:    "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  arrowLeft: "M19 12H5 M12 19l-7-7 7-7",
  plus:      "M12 5v14 M5 12h14",
  trash:     "M3 6h18 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
  mapPin:    "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 7a3 3 0 100 6 3 3 0 000-6",
  refresh:   "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0020.49 15",
  box:       "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  tag:       "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01",
  alert:     "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
};

/* ─── Helper WhatsApp ── */
function limpiarTelefono(raw = "") {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return null;
  if (digits.startsWith("51") && digits.length === 11) return digits;
  if (digits.length === 9) return `51${digits}`;
  return `51${digits.slice(-9)}`;
}

function BtnWhatsApp({ telefono, servicio, abonado }) {
  const numero = limpiarTelefono(telefono);
  if (!numero) return null;
  const nombre = (abonado || "").split(" ")[0];
  const msg = `Hola ${nombre}, soy el técnico de la empresa. Paso a retirar los equipos de su domicilio. ¿Se encuentra disponible?`;
  const href = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
  return (
    <a href={href} target="_blank" rel="noreferrer"
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "7px 14px", borderRadius: 8,
        background: "#25D366", color: "white",
        fontWeight: 700, fontSize: 13,
        textDecoration: "none", border: "none",
        transition: "opacity .15s",
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
    >
      <svg width={15} height={15} viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      Avisar al cliente
    </a>
  );
}

/* ─── MultiPhotoUploader ── */
function MultiPhotoUploader({ fotos, onChange, maxFotos = 5 }) {
  const handleAdd = (e) => {
    const files = Array.from(e.target.files);
    const nuevas = files.slice(0, maxFotos - fotos.length)
      .map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    onChange([...fotos, ...nuevas]);
    e.target.value = "";
  };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 8 }}>
        {fotos.map((f, i) => (
          <div key={i} style={{ position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: "1", background: "var(--hover)" }}>
            <img src={f.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <button type="button"
              style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,.6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
              onClick={() => onChange(fotos.filter((_, j) => j !== i))}>
              <Icon d={IC.x} size={11} color="white" />
            </button>
          </div>
        ))}
        {fotos.length < maxFotos && (
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", aspectRatio: "1", borderRadius: 8, border: "1.5px dashed var(--border)", cursor: "pointer", background: "var(--hover)", minHeight: 80 }}>
            <Icon d={IC.camera} size={22} color="var(--text-muted)" />
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              {fotos.length === 0 ? "Agregar foto" : "Más"}
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: "none" }} onChange={handleAdd} />
          </label>
        )}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{fotos.length}/{maxFotos} fotos</div>
    </div>
  );
}

/* ─── EquipoRecojoRow — una fila por equipo recogido ── */
function EquipoRecojoRow({ item, catalogo, onChange, onRemove }) {
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);

  const productoSel = catalogo.find(p => (p.id ?? p.producto_id) === item.producto_id);
  const esOnu = productoSel?.categoria?.toLowerCase() === "onu";

  const resultados = busqueda.trim()
    ? catalogo.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).slice(0, 8)
    : catalogo.slice(0, 8);

  return (
    <div style={{ background: "var(--hover)", borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border)", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>
          Equipo #{item._idx + 1}
        </div>
        <button type="button" onClick={onRemove}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-muted)" }}>
          <Icon d={IC.trash} size={14} />
        </button>
      </div>

      {/* Buscador producto */}
      <div style={{ marginBottom: 10, position: "relative" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
          Producto del catálogo *
        </div>
        <div
          onClick={() => setAbierto(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "white", cursor: "pointer", minHeight: 38 }}>
          <Icon d={IC.search} size={14} color="var(--text-muted)" />
          <span style={{ fontSize: 13, color: productoSel ? "var(--text)" : "var(--text-muted)", flex: 1 }}>
            {productoSel ? productoSel.nombre : "Buscar en catálogo..."}
          </span>
          {productoSel && (
            <button type="button"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              onClick={e => { e.stopPropagation(); onChange({ ...item, producto_id: null, codigo_pon: "" }); }}>
              <Icon d={IC.x} size={13} color="var(--text-muted)" />
            </button>
          )}
        </div>

        {abierto && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => { setAbierto(false); setBusqueda(""); }} />
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50, background: "white", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,.14)", overflow: "hidden" }}>
              <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon d={IC.search} size={14} color="var(--text-muted)" />
                <input
                  autoFocus
                  placeholder="Buscar por nombre..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  style={{ border: "none", outline: "none", fontSize: 13, background: "transparent", color: "var(--text)", flex: 1 }}
                />
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {resultados.length === 0 ? (
                  <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--text-muted)" }}>Sin resultados</div>
                ) : resultados.map(p => (
                  <div key={p.id ?? p.producto_id}
                    onClick={() => { onChange({ ...item, producto_id: p.id ?? p.producto_id, codigo_pon: "" }); setAbierto(false); setBusqueda(""); }}
                    style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ fontWeight: 500 }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{p.categoria}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Código PON si es ONU */}
      {esOnu && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--warning)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <Icon d={IC.tag} size={11} color="var(--warning)" /> Código PON-SN *
          </div>
          <input
            className="form-input"
            placeholder="Ej: ZTEGC1234567"
            value={item.codigo_pon || ""}
            onChange={e => onChange({ ...item, codigo_pon: e.target.value })}
            style={{ fontSize: 13, fontFamily: "monospace" }}
          />
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
            Código de la etiqueta trasera de la ONU
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── OrdenCard ── */
function OrdenCard({ orden, onSeleccionar }) {
  return (
    <div
      onClick={() => onSeleccionar(orden)}
      style={{ padding: "14px 16px", borderRadius: 12, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start", transition: "all .15s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f3e8ff", border: "1px solid #d8b4fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon d={IC.box} size={18} color="#7c3aed" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{orden.abonado}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#f3e8ff", color: "#7c3aed", border: "1px solid #d8b4fe" }}>
            Recojo
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>#{orden.nro_orden}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
          <Icon d={IC.mapPin} size={11} color="var(--text-muted)" />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{orden.direccion}</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{orden.nro_contrato}</div>
        {orden.observacion && (
          <div style={{ fontSize: 12, color: "#78350f", padding: "4px 8px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, marginTop: 6 }}>
            💬 {orden.observacion}
          </div>
        )}
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{formatFecha(orden.fecha_crea)}</div>
      </div>
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 12 }}>
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  );
}

/* ─── Componente principal ── */
export default function TecRecojos() {
  const online = useOnlineStatus();
  const [ordenes,    setOrdenes]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [catalogo,   setCatalogo]   = useState([]);
  const [ordenActual, setOrdenActual] = useState(null);

  // Form state
  const [equipos,    setEquipos]    = useState([]); // [{ _idx, producto_id, codigo_pon }]
  const [fotos,      setFotos]      = useState([]);
  const [comentario, setComentario] = useState("");
  const [saving,     setSaving]     = useState(false);
  const [errors,     setErrors]     = useState({});
  const [success,    setSuccess]    = useState(null);
  const [busqueda,   setBusqueda]   = useState("");

  // Cargar órdenes y catálogo
  useEffect(() => {
    const cargar = async () => {
      try {
        if (navigator.onLine) {
          const [ords, cat] = await Promise.all([
            ordenesService.getOrdenesRecojos(),
            tecnicoService.getCatalogoProductos(),
          ]);
          setOrdenes(Array.isArray(ords) ? ords : []);
          setCatalogo(Array.isArray(cat) ? cat : []);
          await db.recojos.clear();
          await db.recojos.bulkPut(Array.isArray(ords) ? ords : []);
        } else {
          const ords = await db.recojos.toArray();
          setOrdenes(ords);
          const cat = await db.inventario.toArray();
          setCatalogo(cat);
        }
      } catch {
        const ords = await db.recojos.toArray();
        const cat  = await db.inventario.toArray();
        setOrdenes(ords);
        setCatalogo(cat);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const pendientes  = ordenes.filter(o => (o.estado_app ?? o.estado) === "pendiente");
  const completados = ordenes.filter(o => (o.estado_app ?? o.estado) !== "pendiente");

  const ordenesFiltradas = pendientes.filter(o => {
    const q = busqueda.toLowerCase();
    return !q ||
      (o.abonado    ?? "").toLowerCase().includes(q) ||
      (o.direccion  ?? "").toLowerCase().includes(q) ||
      (o.nro_contrato ?? "").toLowerCase().includes(q) ||
      String(o.nro_orden).includes(q);
  });

  const seleccionar = (orden) => {
    setOrdenActual(orden);
    setEquipos([{ _idx: 0, producto_id: null, codigo_pon: "" }]);
    setFotos([]);
    setComentario("");
    setErrors({});
  };

  const volver = () => { setOrdenActual(null); setErrors({}); };

  const agregarEquipo = () => {
    setEquipos(prev => [...prev, { _idx: prev.length, producto_id: null, codigo_pon: "" }]);
  };

  const actualizarEquipo = (idx, data) => {
    setEquipos(prev => prev.map((e, i) => i === idx ? { ...data, _idx: idx } : e));
  };

  const eliminarEquipo = (idx) => {
    setEquipos(prev => prev.filter((_, i) => i !== idx).map((e, i) => ({ ...e, _idx: i })));
  };

  // Validación
  const validate = () => {
    const e = {};
    if (equipos.length === 0) {
      e.equipos = "Agregá al menos un equipo recogido";
      return e;
    }
    for (const eq of equipos) {
      if (!eq.producto_id) { e.equipos = "Seleccioná el producto de todos los equipos"; break; }
      const prod = catalogo.find(p => p.id === eq.producto_id);
      const esOnu = prod?.categoria?.toLowerCase() === "onu";
      if (esOnu && !(eq.codigo_pon || "").trim()) {
        e.equipos = "Ingresá el código PON de la ONU recogida";
        break;
      }
    }
    return e;
  };

  const confirmar = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setSaving(true);
    try {
      const equiposPayload = equipos.map(eq => ({
        producto_id: eq.producto_id,
        codigo_pon:  eq.codigo_pon || null,
      }));

      if (navigator.onLine) {
        const fd = new FormData();
        fd.append("items",      JSON.stringify(equiposPayload));
        fd.append("comentario", comentario || "");
        fotos.forEach(f => fd.append("fotos", f.file));

        const res = await tecnicoService.completarRecojo(ordenActual.id, fd);
        setSuccess(res?.codigo || "OK");
      } else {
        const localId = await db.recojos_pendientes.add({
          ordenId:    ordenActual.id,
          equipos:    JSON.stringify(equiposPayload),
          comentario: comentario || "",
          syncStatus: "pending",
          creadoEn:   new Date().toISOString(),
        });
        for (const foto of fotos) {
          const base64 = await fileToBase64(foto.file);
          await db.fotos_pendientes.add({
            salidaLocalId: localId, base64,
            filename: foto.file.name, mime: foto.file.type,
          });
        }
        setSuccess("OFFLINE");
      }

      setOrdenes(prev => prev.map(o =>
        o.id === ordenActual.id ? { ...o, estado: "recogido" } : o
      ));
      setOrdenActual(null);
      setTimeout(() => setSuccess(null), 6000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando recojos...</div>;

  /* ══ LISTADO ══ */
  if (!ordenActual) return (
    <div style={{ maxWidth: 580, margin: "0 auto" }}>
      {success && (
        <div className="alert alert-success" style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
          <Icon d={IC.check} size={16} color="var(--success)" />
          <div>
            <strong>{success === "OFFLINE" ? "Guardado sin conexión" : "Recojo confirmado"}</strong>
            {success === "OFFLINE"
              ? <div style={{ fontSize: 13, marginTop: 2, color: "var(--text-muted)" }}>Se subirá cuando haya internet</div>
              : <div style={{ fontSize: 13, marginTop: 2 }}>Código: <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{success}</span></div>
            }
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 2 }}>Órdenes de recojo</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {pendientes.length} pendiente{pendientes.length !== 1 ? "s" : ""}
          {completados.length > 0 && ` · ${completados.length} completado${completados.length !== 1 ? "s" : ""}`}
        </div>
      </div>

      {/* Buscador */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <input className="form-input"
          placeholder="Buscar por cliente, contrato, dirección u orden..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          style={{ fontSize: 14, paddingLeft: 36 }} />
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
          <Icon d={IC.search} size={15} color="var(--text-muted)" />
        </span>
        {busqueda && (
          <button onClick={() => setBusqueda("")}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <Icon d={IC.x} size={14} color="var(--text-muted)" />
          </button>
        )}
      </div>

      {/* Pendientes */}
      {ordenesFiltradas.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
          <Icon d={IC.box} size={36} color="var(--border)" />
          <div style={{ marginTop: 12, fontSize: 14 }}>
            {pendientes.length === 0
              ? "No hay órdenes de recojo pendientes"
              : "Sin resultados para esa búsqueda"}
          </div>
        </div>
      ) : ordenesFiltradas.map(o => (
        <OrdenCard key={o.id} orden={o} onSeleccionar={seleccionar} />
      ))}

      {/* Completados colapsados */}
      {completados.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
            Completados ({completados.length})
          </div>
          {completados.map(o => (
            <div key={o.id} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "white", opacity: 0.75, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{o.abonado}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{o.direccion}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="badge badge-active" style={{ fontSize: 11 }}>Recogido</span>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{formatFecha(o.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ══ FORMULARIO ══ */
  return (
    <div style={{ maxWidth: 580, margin: "0 auto" }}>
      <button type="button" className="btn btn-outline btn-sm"
        onClick={volver} style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon d={IC.arrowLeft} size={14} /> Volver al listado
      </button>

      <div className="card">
        {/* Header orden */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", background: "#f3e8ff", borderRadius: "12px 12px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: "white", border: "1px solid #d8b4fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon d={IC.box} size={17} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#5b21b6" }}>
                Recojo — Orden #{ordenActual.nro_orden}
              </div>
              <div style={{ fontSize: 12, color: "#7c3aed", opacity: 0.8 }}>{ordenActual.nro_contrato}</div>
            </div>
          </div>
        </div>

        {/* Datos cliente */}
        <div style={{ padding: "12px 16px", background: "var(--hover)", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            Cliente
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Abonado</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{ordenActual.abonado}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Contrato</div>
              <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color: "var(--primary)" }}>{ordenActual.nro_contrato}</div>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Dirección</div>
              <div style={{ fontSize: 13 }}>{ordenActual.direccion}</div>
            </div>
          </div>

          {limpiarTelefono(ordenActual.telefono) && (
            <div style={{
              marginTop: 12, padding: "10px 14px",
              background: "white", borderRadius: 8,
              border: "1px solid var(--border)",
              display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>¿Vas en camino?</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Avisá al cliente antes de llegar</div>
              </div>
              <BtnWhatsApp
                telefono={ordenActual.telefono}
                servicio="RECOJO"
                abonado={ordenActual.abonado}
              />
            </div>
          )}

          {ordenActual.observacion && (
            <div style={{ marginTop: 8, padding: "6px 10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 7, fontSize: 12, color: "#78350f" }}>
              💬 {ordenActual.observacion}
            </div>
          )}
        </div>

        {/* Formulario */}
        <div style={{ padding: 16 }}>

          {/* Equipos recogidos */}
          <div className="form-group">
            <label className="form-label">
              Equipos recogidos *
            </label>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
              Seleccioná del catálogo cada equipo que retirás del cliente
            </div>

            {equipos.map((eq, idx) => (
              <EquipoRecojoRow
                key={idx}
                item={eq}
                catalogo={catalogo}
                onChange={data => actualizarEquipo(idx, data)}
                onRemove={() => eliminarEquipo(idx)}
              />
            ))}

            <button type="button" className="btn btn-outline btn-sm"
              onClick={agregarEquipo}
              style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <Icon d={IC.plus} size={13} /> Agregar equipo
            </button>

            {errors.equipos && (
              <div className="form-error" style={{ marginTop: 8 }}>{errors.equipos}</div>
            )}
          </div>

          {/* Comentario */}
          <div className="form-group">
            <label className="form-label">
              Comentario <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(opcional)</span>
            </label>
            <textarea className="form-input"
              placeholder="Ej: Equipos en buen estado, cliente firmó conformidad..."
              rows={2} value={comentario} onChange={e => setComentario(e.target.value)} />
          </div>

          {/* Fotos */}
          <div className="form-group">
            <label className="form-label">
              Fotos <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(hasta 5)</span>
            </label>
            <MultiPhotoUploader fotos={fotos} onChange={setFotos} />
          </div>

          <button className="btn btn-primary btn-lg btn-full"
            onClick={confirmar} disabled={saving}
            style={{ marginTop: 8, minHeight: 48 }}>
            <Icon d={IC.check} size={16} />
            {saving ? "Confirmando..." : "Confirmar recojo"}
          </button>
        </div>
      </div>
    </div>
  );
}