import { useState, useEffect } from "react";
import clientesService, { descargarBlob } from "../../services/clientesService";
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
  search:   "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  user:     "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
  edit:     "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  save:     "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z M17 21v-8H7v8 M7 3v5h8",
  x:        "M18 6L6 18 M6 6l12 12",
  refresh:  "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0020.49 15",
  chevron:  "M6 9l6 6 6-6",
  contract: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  wifi:     "M5 12.55a11 11 0 0114.08 0 M1.42 9a16 16 0 0121.16 0 M8.53 16.11a6 6 0 016.95 0 M12 20h.01",
  excel:    "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M9 13l2 4 M11 13l-2 4 M13 13h2 M13 17h2",
  pdf:      "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M9 13h1v4H9 M13 13h1.5a1.5 1.5 0 010 3H13v-3 M17 13v4",
  check:    "M20 6L9 17l-5-5",
  list:     "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
};

function labelServicio(s = "") {
  const u = s.toUpperCase();
  if (u.includes("CAMBIO DE EQUIPO")) return "Cambio ONU";
  if (u.includes("INSTALACION"))      return "Instalación";
  if (u.includes("AVERIA"))           return "Avería";
  if (u.includes("RECONEXION"))       return "Reconexión";
  if (u.includes("RECOJO"))           return "Recojo";
  return s;
}

function badgeServicio(s = "") {
  const u = s.toUpperCase();
  if (u.includes("CAMBIO DE EQUIPO")) return "badge-warning";
  if (u.includes("INSTALACION"))      return "badge-active";
  if (u.includes("AVERIA"))           return "badge-danger";
  if (u.includes("RECONEXION"))       return "badge-blue";
  if (u.includes("RECOJO"))           return "badge-purple";
  return "badge-blue";
}

function contarTipos(contratos = []) {
  const counts = { instalaciones: 0, averias: 0, cambiosOnu: 0, reconexiones: 0, recojos: 0 };
  contratos.forEach(c => {
    (c.ordenes ?? []).forEach(o => {
      const u = (o.servicio ?? "").toUpperCase();
      if (u.includes("INSTALACION"))      counts.instalaciones++;
      else if (u.includes("AVERIA"))      counts.averias++;
      else if (u.includes("CAMBIO"))      counts.cambiosOnu++;
      else if (u.includes("RECONEXION"))  counts.reconexiones++;
      else if (u.includes("RECOJO"))      counts.recojos++;
    });
  });
  return counts;
}

function DetRow({ label, value, mono = false, color }) {
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 13 }}>
      <span style={{ color: "var(--text-muted)", minWidth: 110 }}>{label}</span>
      <span style={{ fontWeight: 500, fontFamily: mono ? "monospace" : "inherit", color: color || "inherit" }}>
        {value || "—"}
      </span>
    </div>
  );
}

function ContratoCard({ contrato }) {
  const [abierto, setAbierto] = useState(false);
  const ordenes = contrato.ordenes ?? [];
  const tieneIP = !!contrato.ip_local;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
      <div onClick={() => setAbierto(p => !p)}
        style={{ padding: "10px 14px", background: "var(--hover, #f8f9fa)",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
        <Icon d={IC.contract} size={15} color="var(--primary)" />
        <span style={{ fontWeight: 700, fontSize: 13, fontFamily: "monospace", color: "var(--primary)", flex: 1 }}>
          {contrato.nro_contrato}
        </span>
        <span className={`badge ${contrato.estado_contrato === "Activo" ? "badge-active" : "badge-warning"}`}
          style={{ fontSize: 11 }}>
          {contrato.estado_contrato ?? "—"}
        </span>
        {tieneIP
          ? <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--success, #16a34a)", fontWeight: 600 }}>
              {contrato.ip_local}
            </span>
          : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Sin IP</span>
        }
        <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>
          {ordenes.length} orden{ordenes.length !== 1 ? "es" : ""}
        </span>
        <div style={{ transform: abierto ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
          <Icon d={IC.chevron} size={14} color="var(--text-muted)" />
        </div>
      </div>

      {abierto && (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <DetRow label="Dirección"  value={contrato.direccion} />
            <DetRow label="Sector"     value={contrato.sector} />
            <DetRow label="Vía"        value={contrato.via} />
            <DetRow label="Referencia" value={contrato.referencia} />
            <DetRow label="Tecnología" value={contrato.tecnologia} />
          </div>

          {tieneIP && (
            <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "10px 12px",
              display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#15803d", marginBottom: 2,
                display: "flex", alignItems: "center", gap: 6 }}>
                <Icon d={IC.wifi} size={13} color="#15803d" /> Datos de red
              </div>
              <DetRow label="IP local" value={contrato.ip_local}  mono color="#15803d" />
              <DetRow label="Máscara"  value={contrato.mascara}   mono />
              <DetRow label="Gateway"  value={contrato.gateway}   mono />
              {contrato.modelo_onu && <DetRow label="Modelo ONU" value={contrato.modelo_onu} />}
              {contrato.perfil_onu && <DetRow label="Perfil ONU" value={contrato.perfil_onu} />}
            </div>
          )}

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8,
              textTransform: "uppercase", letterSpacing: 0.5 }}>
              Historial de órdenes
            </div>
            {ordenes.length === 0
              ? <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Sin órdenes registradas</span>
              : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {ordenes.map((o, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 10px", borderRadius: 7,
                      border: "1px solid var(--border)", background: "white" }}>
                      <span className="mono text-sm" style={{ color: "var(--text-muted)", minWidth: 54 }}>
                        #{o.nro_orden}
                      </span>
                      <span className={`badge ${badgeServicio(o.servicio)}`} style={{ fontSize: 11 }}>
                        {labelServicio(o.servicio)}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", flex: 1 }}>
                        {o.fecha_crea || "—"}
                      </span>
                      <span className={`badge ${o.estado_app === "completada" ? "badge-active" : "badge-warning"}`}
                        style={{ fontSize: 11 }}>
                        {o.estado_app === "completada" ? "Completada" : "Pendiente"}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function AdminClientes() {
  const [clientes,       setClientes]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [sedeId,         setSedeId]         = useState("");
  const [sedes,          setSedes]          = useState([]);

  const [clienteSel,     setClienteSel]     = useState(null);
  const [detalle,        setDetalle]        = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [editando,       setEditando]       = useState(false);
  const [formEdit,       setFormEdit]       = useState({});
  const [saving,         setSaving]         = useState(false);
  const [saveOk,         setSaveOk]         = useState(false);

  const [exportandoXls,  setExportandoXls]  = useState(false);
  const [exportandoPdf,  setExportandoPdf]  = useState(false);

  // Admin siempre carga todas las sedes
  useEffect(() => {
    sedesService.getAll().then(d => setSedes(Array.isArray(d) ? d : []))
  }, [])

  const cargarClientes = async () => {
    setLoading(true);
    try {
      const data = await clientesService.getAll({ search, sede_id: sedeId });
      setClientes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando clientes:", err);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarClientes(); }, [sedeId]);

  useEffect(() => {
    const t = setTimeout(() => cargarClientes(), 350);
    return () => clearTimeout(t);
  }, [search]);

  const abrirFicha = async (cliente) => {
    setClienteSel(cliente);
    setDetalle(null);
    setEditando(false);
    setFormEdit({
      nombre:        cliente.nombre        ?? "",
      doc_identidad: cliente.doc_identidad ?? "",
      telefono:      cliente.telefono      ?? "",
      sede_id:       cliente.sede_id       ?? "",
    });
    setLoadingDetalle(true);
    try {
      const data = await clientesService.getDetalle(cliente.id);
      setDetalle(data?.data ?? data);
    } catch (err) {
      console.error("Error cargando detalle:", err);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const cerrarFicha = () => {
    setClienteSel(null);
    setDetalle(null);
    setEditando(false);
    setSaveOk(false);
  };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      await clientesService.update(clienteSel.id, formEdit);
      setClientes(prev => prev.map(c =>
        c.id === clienteSel.id ? { ...c, ...formEdit } : c
      ));
      setClienteSel(prev => ({ ...prev, ...formEdit }));
      setDetalle(prev => prev ? { ...prev, ...formEdit } : prev);
      setSaveOk(true);
      setEditando(false);
      setTimeout(() => setSaveOk(false), 2500);
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const exportarExcel = async (soloEsteCliente = false) => {
    setExportandoXls(true);
    try {
      const blob = await clientesService.exportarExcel({
        search, sede_id: sedeId,
        cliente_id: soloEsteCliente && clienteSel ? clienteSel.id : "",
      });
      descargarBlob(blob, soloEsteCliente && clienteSel
        ? `cliente_${clienteSel.doc_identidad}.xlsx`
        : `clientes_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (err) {
      alert("Error al exportar Excel: " + err.message);
    } finally {
      setExportandoXls(false);
    }
  };

  const exportarPDF = async (soloEsteCliente = false) => {
    setExportandoPdf(true);
    try {
      const blob = await clientesService.exportarPDF({
        search, sede_id: sedeId,
        cliente_id: soloEsteCliente && clienteSel ? clienteSel.id : "",
      });
      descargarBlob(blob, soloEsteCliente && clienteSel
        ? `cliente_${clienteSel.doc_identidad}.pdf`
        : `clientes_${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } catch (err) {
      alert("Error al exportar PDF: " + err.message);
    } finally {
      setExportandoPdf(false);
    }
  };

  return (
    <>
      {clienteSel && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={cerrarFicha}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.35)" }} />
          <div style={{
            position: "relative", width: 480, maxWidth: "95vw",
            background: "white", height: "100%", overflowY: "auto",
            boxShadow: "-4px 0 32px rgba(0,0,0,.15)",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: "var(--primary)", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 16, flexShrink: 0,
              }}>
                {(clienteSel.nombre ?? "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis" }}>
                  {clienteSel.nombre}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>
                  DNI {clienteSel.doc_identidad}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button className="btn btn-outline btn-sm"
                  onClick={() => exportarExcel(true)} disabled={exportandoXls}>
                  <Icon d={IC.excel} size={13} color="#16803c" />
                </button>
                <button className="btn btn-outline btn-sm"
                  onClick={() => exportarPDF(true)} disabled={exportandoPdf}>
                  <Icon d={IC.pdf} size={13} color="#dc2626" />
                </button>
                <button onClick={cerrarFicha}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                  <Icon d={IC.x} size={18} />
                </button>
              </div>
            </div>

            {saveOk && (
              <div style={{ margin: "10px 20px 0", padding: "8px 12px", borderRadius: 8,
                background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 13, color: "#15803d",
                display: "flex", alignItems: "center", gap: 6 }}>
                <Icon d={IC.check} size={14} color="#15803d" /> Datos guardados correctamente
              </div>
            )}

            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Datos personales</span>
                {!editando
                  ? <button className="btn btn-outline btn-sm" onClick={() => setEditando(true)}>
                      <Icon d={IC.edit} size={13} /> Editar
                    </button>
                  : <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-outline btn-sm"
                        onClick={() => setEditando(false)} disabled={saving}>Cancelar</button>
                      <button className="btn btn-primary btn-sm"
                        onClick={handleGuardar} disabled={saving}>
                        <Icon d={saving ? IC.refresh : IC.save} size={13} />
                        {saving ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                }
              </div>

              {editando ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Nombre / Titular</label>
                    <input className="form-input" value={formEdit.nombre}
                      onChange={e => setFormEdit(p => ({ ...p, nombre: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Doc. Identidad (DNI)</label>
                    <input className="form-input" value={formEdit.doc_identidad}
                      onChange={e => setFormEdit(p => ({ ...p, doc_identidad: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Teléfono</label>
                    <input className="form-input" value={formEdit.telefono}
                      onChange={e => setFormEdit(p => ({ ...p, telefono: e.target.value }))} />
                  </div>
                  {/* Admin SÍ puede cambiar la sede del cliente */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Sede</label>
                    <select className="form-input" value={formEdit.sede_id}
                      onChange={e => setFormEdit(p => ({ ...p, sede_id: e.target.value }))}>
                      <option value="">Sin sede</option>
                      {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <DetRow label="Nombre"   value={clienteSel.nombre} />
                  <DetRow label="DNI"      value={clienteSel.doc_identidad} mono />
                  <DetRow label="Teléfono" value={clienteSel.telefono} />
                  <DetRow label="Sede"     value={clienteSel.sede_nombre} />
                </div>
              )}
            </div>

            {detalle && (() => {
              const c = contarTipos(detalle.contratos ?? []);
              const stats = [
                { label: "Instalaciones", val: c.instalaciones, color: "#16a34a" },
                { label: "Averías",       val: c.averias,       color: "#dc2626" },
                { label: "Cambios ONU",   val: c.cambiosOnu,    color: "#d97706" },
                { label: "Reconexiones",  val: c.reconexiones,  color: "#2563eb" },
                { label: "Recojos",       val: c.recojos,       color: "#7c3aed" },
              ].filter(s => s.val > 0);
              if (stats.length === 0) return null;
              return (
                <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)",
                  display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {stats.map((s, i) => (
                    <div key={i} style={{
                      background: "var(--hover, #f8f9fa)", borderRadius: 8, padding: "8px 14px",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                      minWidth: 70, flex: 1,
                    }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={{ padding: "14px 20px", flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12,
                display: "flex", alignItems: "center", gap: 6 }}>
                <Icon d={IC.contract} size={14} color="var(--primary)" />
                Contratos ({(detalle?.contratos ?? []).length})
              </div>
              {loadingDetalle ? (
                <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>
                  Cargando contratos...
                </div>
              ) : (detalle?.contratos ?? []).length === 0 ? (
                <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 13 }}>
                  Sin contratos registrados
                </div>
              ) : (
                (detalle?.contratos ?? []).map((c, i) => (
                  <ContratoCard key={i} contrato={c} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.sectionTitle}>
              <Icon d={IC.user} size={18} color="var(--primary)" />
              Clientes
            </div>
            <div style={styles.sectionSubtitle}>
              Directorio global de clientes — todas las sedes
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-outline" onClick={() => exportarExcel(false)}
              disabled={exportandoXls} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon d={IC.excel} size={14} color="#16803c" />
              {exportandoXls ? "Exportando..." : "Excel"}
            </button>
            <button className="btn btn-outline" onClick={() => exportarPDF(false)}
              disabled={exportandoPdf} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon d={IC.pdf} size={14} color="#dc2626" />
              {exportandoPdf ? "Exportando..." : "PDF"}
            </button>
            <button onClick={cargarClientes}
              style={{ padding: "5px 10px", borderRadius: 20, fontSize: 12,
                border: "1.5px solid var(--border)", background: "white",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Icon d={IC.refresh} size={12} />
            </button>
          </div>
        </div>

        {/* Filtros — admin ve selector de sede siempre */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select value={sedeId} onChange={e => setSedeId(e.target.value)}
            style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: "1.5px solid var(--border)", background: "white",
              color: sedeId ? "var(--text)" : "var(--text-muted)", cursor: "pointer",
            }}>
            <option value="">Todas las sedes</option>
            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <div className="search-box" style={{ marginLeft: "auto" }}>
            <Icon d={IC.search} size={15} color="var(--text-muted)" />
            <input placeholder="Buscar por nombre, DNI o contrato..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>DNI</th>
                  <th>Teléfono</th>
                  <th>Sede</th>
                  <th>Contratos</th>
                  <th>Instalaciones</th>
                  <th>Averías</th>
                  <th>Cambios ONU</th>
                  <th>IP asignada</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ textAlign: "center", padding: 28, color: "var(--text-muted)" }}>
                    Cargando clientes...
                  </td></tr>
                ) : clientes.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
                    No se encontraron clientes.
                  </td></tr>
                ) : clientes.map(c => (
                  <tr key={c.id} onClick={() => abrirFicha(c)} style={{ cursor: "pointer" }}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%",
                          background: "var(--primary)", color: "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 700, fontSize: 12, flexShrink: 0,
                        }}>
                          {(c.nombre ?? "?")[0].toUpperCase()}
                        </div>
                        <span className="fw-600">{c.nombre}</span>
                      </div>
                    </td>
                    <td className="mono text-sm">{c.doc_identidad || "—"}</td>
                    <td className="text-sm">{c.telefono || "—"}</td>
                    <td className="text-sm text-muted">{c.sede_nombre || "—"}</td>
                    <td>
                      <span style={{
                        background: "var(--hover, #f1f5f9)", borderRadius: 20,
                        padding: "2px 10px", fontSize: 12, fontWeight: 700, color: "var(--primary)",
                      }}>
                        {c.total_contratos ?? 0}
                      </span>
                    </td>
                    <td>
                      {(c.total_instalaciones ?? 0) > 0
                        ? <span className="badge badge-active">{c.total_instalaciones}</span>
                        : <span className="text-muted text-sm">—</span>}
                    </td>
                    <td>
                      {(c.total_averias ?? 0) > 0
                        ? <span className="badge badge-danger">{c.total_averias}</span>
                        : <span className="text-muted text-sm">—</span>}
                    </td>
                    <td>
                      {(c.total_cambios_onu ?? 0) > 0
                        ? <span className="badge badge-warning">{c.total_cambios_onu}</span>
                        : <span className="text-muted text-sm">—</span>}
                    </td>
                    <td>
                      {c.ip_local
                        ? <span className="mono text-sm" style={{ color: "var(--success, #16a34a)", fontWeight: 600 }}>
                            {c.ip_local}
                          </span>
                        : <span className="text-muted text-sm">Sin IP</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && clientes.length > 0 && (
          <div style={{ textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>
            {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} encontrado{clientes.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  sectionTitle:  { display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: "var(--text-muted)" },
};