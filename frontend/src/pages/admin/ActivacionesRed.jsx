import { useState, useEffect } from "react";
import activacionRedService from "../../services/activacionRedService";
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
  wifi:    "M5 12.55a11 11 0 0114.08 0 M1.42 9a16 16 0 0121.16 0 M8.53 16.11a6 6 0 016.95 0 M12 20h.01",
  search:  "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  check:   "M20 6L9 17l-5-5",
  edit:    "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  x:       "M18 6L6 18 M6 6l12 12",
  refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0020.49 15",
  save:    "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z M17 21v-8H7v8 M7 3v5h8",
  alert:   "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
  server:  "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-.99l7-3 7 3c.6.27 1 .86 1 1.5v6z",
  swap:    "M16 3l4 4-4 4 M8 21l-4-4 4-4 M4 7h16 M20 17H4", // icono para cambio de ONU
};

function DetRow({ label, value, mono = false }) {
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 13 }}>
      <span style={{ color: "var(--text-muted)", minWidth: 96 }}>{label}</span>
      <span style={{ fontWeight: 500, fontFamily: mono ? "monospace" : "inherit" }}>{value || "—"}</span>
    </div>
  );
}

// FUNCIÓN para clasificar el servicio (igual que en CtrlRecojos)
function labelServicio(s = "") {
  const u = s.toUpperCase();
  if (u.includes("CAMBIO DE EQUIPO")) return "Cambio ONU";
  if (u.includes("INSTALACION"))      return "Instalación";
  if (u.includes("AVERIA"))           return "Avería";
  if (u.includes("RECONEXION"))       return "Reconexión";
  return s;
}

// FILTROS de estado de IP
const FILTROS_IP = [
  { key: "sin_ip", label: "Sin IP" },
  { key: "con_ip", label: "Con IP" },
  { key: "todas",  label: "Todas"  },
];

// FILTROS de tipo de servicio (NUEVO)
const FILTROS_TIPO = [
  { key: "todas",        label: "📋 Todas" },
  { key: "instalacion",  label: "🆕 Instalaciones" },
  { key: "cambio_onu",   label: "🔄 Cambio de ONU" },
];

const emptyForm = { ip_local: "", mascara: "255.255.255.0", gateway: "" };

const ZONA_LABELS = {
  "ZONA 01": "Porvenir",
  "ZONA 05": "Río Seco",
  "ZONA 08": "Pesqueda",
  "ZONA 11": "Alto",
  "ZONA 17": "Florencia",
};

function formatSector(sector) {
  if (!sector) return null;
  const key = sector.trim().toUpperCase().replace(/ZONA (\d)$/, "ZONA 0$1");
  return ZONA_LABELS[key] ?? sector;
}



export default function ActivacionesRed() {
  const [ordenes,       setOrdenes]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filtroIp,      setFiltroIp]      = useState("sin_ip");
  const [filtroTipo,    setFiltroTipo]    = useState("todas"); // NUEVO
  const [search,        setSearch]        = useState("");
  const [ordenSel,      setOrdenSel]      = useState(null);
  const [form,          setForm]          = useState(emptyForm);
  const [saving,        setSaving]        = useState(false);
  const [savedId,       setSavedId]       = useState(null);
  const [errors,        setErrors]        = useState({});
  const [sedes,         setSedes]         = useState([]);
  const [sedeId,        setSedeId]        = useState("");
  const [copied,        setCopied]        = useState(false);

  const handleCopiar = () => {
    const texto = `${ordenSel.abonado} - ${ordenSel.nro_contrato}`;
    navigator.clipboard.writeText(texto).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await activacionRedService.getAll(filtroIp, sedeId);
      console.log("DATA RECIBIDA:", data);
      setOrdenes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setOrdenes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [filtroIp, sedeId]);

  useEffect(() => {
    sedesService.getAll().then(data => setSedes(Array.isArray(data) ? data : []));
  }, []);

  const abrirOrden = (orden) => {
    setOrdenSel(orden);
    setErrors({});
    setForm({
      ip_local:   orden.ip_local    || "",
      mascara:    orden.mascara     || "255.255.255.0",
      gateway:    orden.gateway     || "",
    });
  };

  const cerrar = () => { setOrdenSel(null); setForm(emptyForm); setErrors({}); };

  const validar = () => {
    const errs = {};
    const ipRx = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!form.ip_local)              errs.ip_local = "Requerido";
    else if (!ipRx.test(form.ip_local)) errs.ip_local = "Formato inválido";
    if (!form.mascara)               errs.mascara  = "Requerido";
    else if (!ipRx.test(form.mascara))  errs.mascara  = "Formato inválido";
    if (!form.gateway)               errs.gateway  = "Requerido";
    else if (!ipRx.test(form.gateway))  errs.gateway  = "Formato inválido";
    return errs;
  };

  const handleGuardar = async () => {
    const errs = validar();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      const res = await activacionRedService.guardarRed(ordenSel.id, form);
      setOrdenes(prev => prev.map(o =>
        o.id === ordenSel.id
          ? { ...o, ...form, red_id: res.data?.id ?? o.red_id }
          : o
      ));
      setSavedId(ordenSel.id);
      setTimeout(() => setSavedId(null), 2500);
      cerrar();
      if (filtroIp === "sin_ip") await cargar();
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // FILTRO combinado: por IP + por tipo de servicio + búsqueda
  const filtered = ordenes.filter(o => {
    // 1. Filtro por tipo de servicio
    const servicioLabel = labelServicio(o.servicio ?? "");
    let matchTipo = true;
    if (filtroTipo === "instalacion") {
      matchTipo = servicioLabel === "Instalación";
    } else if (filtroTipo === "cambio_onu") {
      matchTipo = servicioLabel === "Cambio ONU";
    }
    
    // 2. Filtro por búsqueda
    const matchSearch = !search ||
      (o.abonado      ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (o.nro_contrato ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (o.sede_nombre  ?? "").toLowerCase().includes(search.toLowerCase()) ||
      String(o.nro_orden).includes(search);
    
    return matchTipo && matchSearch;
  });

  const inputStyle = (field) => ({
    ...inpBase,
    borderColor: errors[field] ? "var(--danger, #e53e3e)" : "var(--border)",
  });

  // Obtener badge según el tipo de servicio
  const getServicioBadge = (servicio) => {
    const label = labelServicio(servicio);
    if (label === "Instalación") return { text: label, className: "badge-active", icon: "🆕" };
    if (label === "Cambio ONU") return { text: label, className: "badge-warning", icon: "🔄" };
    return { text: label, className: "badge-blue", icon: "📋" };
  };

  return (
    <>
      {/* Panel lateral - igual que antes */}
      {ordenSel && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={cerrar}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.35)" }} />
          <div style={{
            position: "relative", width: 440, maxWidth: "95vw",
            background: "white", height: "100%", overflowY: "auto",
            boxShadow: "-4px 0 32px rgba(0,0,0,.15)",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {labelServicio(ordenSel.servicio)} — Cargar datos de red
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Orden #{ordenSel.nro_orden} · {ordenSel.nro_contrato}
                </div>
              </div>
              <button onClick={cerrar} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <Icon d={IC.x} size={18} />
              </button>
            </div>

            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6, background: "var(--hover, #f8f9fa)" }}>
              <DetRow label="Abonado"   value={ordenSel.abonado} />
              <DetRow label="Dirección" value={ordenSel.direccion} />
              <DetRow label="Sede"      value={ordenSel.sede_nombre} />
              <DetRow label="Servicio"  value={labelServicio(ordenSel.servicio)} />
              <DetRow label="Tecnología" value={ordenSel.tecnologia} />
              <DetRow label="Contrato"  value={ordenSel.nro_contrato} mono />
            </div>

            <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--hover, #f8f9fa)" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>
                Texto para copiar
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "white", border: "1px solid var(--border)",
                borderRadius: 6, padding: "7px 10px",
              }}>
                <span style={{ flex: 1, fontFamily: "monospace", fontSize: 13, userSelect: "all" }}>
                  {ordenSel.abonado} - {ordenSel.nro_contrato}
                </span>
                <button
                  onClick={handleCopiar}
                  style={{
                    background: copied ? "var(--success, #16a34a)" : "var(--primary)",
                    color: "white", border: "none", borderRadius: 5,
                    padding: "4px 10px", fontSize: 12, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                    transition: "background 0.3s",
                  }}>
                  <Icon d={copied ? IC.check : IC.save} size={12} />
                  {copied ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
            </div>

            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Icon d={IC.server} size={15} color="var(--primary)" />
                <span style={{ fontWeight: 700, fontSize: 13, color: "var(--primary)" }}>Datos de red</span>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">IP local *</label>
                <input
                  className="form-input"
                  style={inputStyle("ip_local")}
                  placeholder="Ej: 192.168.1.100"
                  value={form.ip_local}
                  onChange={e => { setForm(p => ({ ...p, ip_local: e.target.value })); setErrors(p => ({ ...p, ip_local: null })); }}
                />
                {errors.ip_local && <span style={errStyle}>{errors.ip_local}</span>}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Máscara de subred *</label>
                <input
                  className="form-input"
                  style={inputStyle("mascara")}
                  placeholder="Ej: 255.255.255.0"
                  value={form.mascara}
                  onChange={e => { setForm(p => ({ ...p, mascara: e.target.value })); setErrors(p => ({ ...p, mascara: null })); }}
                />
                {errors.mascara && <span style={errStyle}>{errors.mascara}</span>}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Gateway *</label>
                <input
                  className="form-input"
                  style={inputStyle("gateway")}
                  placeholder="Ej: 192.168.1.1"
                  value={form.gateway}
                  onChange={e => { setForm(p => ({ ...p, gateway: e.target.value })); setErrors(p => ({ ...p, gateway: null })); }}
                />
                {errors.gateway && <span style={errStyle}>{errors.gateway}</span>}
              </div>
            </div>

            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={cerrar} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGuardar} disabled={saving}>
                <Icon d={saving ? IC.refresh : IC.save} size={14} />
                {saving ? "Guardando..." : (ordenSel.red_id ? "Actualizar" : "Guardar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.sectionTitle}>
              <Icon d={IC.wifi} size={18} color="var(--primary)" />
              Datos de red — Instalaciones y Cambios de ONU
            </div>
            <div style={styles.sectionSubtitle}>
              Cargá IP, máscara y gateway para que el técnico configure la ONU en campo
            </div>
          </div>
          <button onClick={cargar} style={{ padding: "5px 10px", borderRadius: 20, fontSize: 12, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <Icon d={IC.refresh} size={12} />
          </button>
        </div>

        {/* FILAS DE FILTROS */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* Filtro por tipo de servicio (NUEVO) */}
          {FILTROS_TIPO.map(f => (
            <button key={f.key} type="button" onClick={() => setFiltroTipo(f.key)}
              style={{
                padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: "1.5px solid", cursor: "pointer",
                borderColor: filtroTipo === f.key ? "var(--primary)" : "var(--border)",
                background:  filtroTipo === f.key ? "var(--primary)" : "white",
                color:       filtroTipo === f.key ? "white" : "var(--text-muted)",
              }}>
              {f.label}
            </button>
          ))}
          
          {/* Separador visual */}
          <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 4px" }} />
          
          {/* Filtro por estado de IP */}
          {FILTROS_IP.map(f => (
            <button key={f.key} type="button" onClick={() => setFiltroIp(f.key)}
              style={{
                padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: "1.5px solid", cursor: "pointer",
                borderColor: filtroIp === f.key ? "var(--primary)" : "var(--border)",
                background:  filtroIp === f.key ? "var(--primary)" : "white",
                color:       filtroIp === f.key ? "white" : "var(--text-muted)",
              }}>
              {f.label}
            </button>
          ))}
          
          <select
            value={sedeId}
            onChange={e => setSedeId(e.target.value)}
            style={{
              padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: "1.5px solid var(--border)", background: "white",
              color: sedeId ? "var(--text)" : "var(--text-muted)", cursor: "pointer",
              marginLeft: "auto",
            }}>
            <option value="">Todas las sedes</option>
            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          
          <div className="search-box">
            <Icon d={IC.search} size={15} color="var(--text-muted)" />
            <input
              placeholder="Buscar abonado, contrato, sede..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Contrato</th>
                  <th>Abonado</th>
                  <th>Dirección</th>
                  <th>Sede</th>
                  <th>Servicio</th>
                  <th>Tecnología</th>
                  <th>IP local</th>
                  <th>Gateway</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} style={{ textAlign: "center", padding: 28, color: "var(--text-muted)" }}>Cargando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
                    {ordenes.length === 0
                      ? "No hay órdenes de instalación o cambio de ONU."
                      : "Sin resultados para la búsqueda."}
                  </td></tr>
                ) : filtered.map(o => {
                  const badge = getServicioBadge(o.servicio);
                  return (
                    <tr key={o.id}
                      style={{
                        background: savedId === o.id ? "rgba(34,197,94,0.07)" : undefined,
                        transition: "background 0.6s",
                      }}>
                      <td className="mono text-sm">#{o.nro_orden}</td>
                      <td className="mono text-sm" style={{ color: "var(--primary)", fontWeight: 600 }}>{o.nro_contrato}</td>
                      <td className="fw-600">{o.abonado}</td>
                      <td className="text-sm text-muted">{o.direccion}</td>
                      <td className="text-sm">
                        {o.sede_nombre ?? "—"}
                        {o.sector && o.sede_nombre?.toLowerCase().includes("porvenir") && (
                          <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 4 }}>
                            · {formatSector(o.sector)}
                          </span>
                        )}
                      </td>
                      <td><span className={`badge ${badge.className}`}>{badge.icon} {badge.text}</span></td>
                      <td className="text-sm">{o.tecnologia ?? "—"}</td>
                      <td>
                        {o.ip_local
                          ? <span className="mono text-sm" style={{ color: "var(--success, #16a34a)", fontWeight: 600 }}>{o.ip_local}</span>
                          : <span className="text-muted text-sm">—</span>}
                      </td>
                      <td>
                        {o.gateway
                          ? <span className="mono text-sm">{o.gateway}</span>
                          : <span className="text-muted text-sm">—</span>}
                      </td>
                      <td>
                        {o.red_id
                          ? <span className="badge badge-active">IP cargada</span>
                          : <span className="badge badge-warning">Sin IP</span>}
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => abrirOrden(o)}
                          title={o.red_id ? "Editar datos de red" : "Cargar IP"}>
                          <Icon d={o.red_id ? IC.edit : IC.wifi} size={13} />
                          {o.red_id ? "Editar" : "Cargar IP"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

const inpBase = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  borderRadius: 6,
  border: "1px solid var(--border)",
  outline: "none",
  fontFamily: "monospace",
};

const errStyle = {
  fontSize: 11,
  color: "var(--danger, #e53e3e)",
  marginTop: 3,
  display: "block",
};

const styles = {
  sectionHeader: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 4,
  },
  sectionSubtitle: { fontSize: 13, color: "var(--text-muted)" },
};