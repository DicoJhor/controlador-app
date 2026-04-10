import { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import tecnicoService from "../../services/tecnicoService";
import api from "../../services/api";

const BASE_URL = "https://api.38.224.68.30.nip.io";

// Mapeo de tipo_equipo -> categorías del catálogo para filtrar productos
const CATEGORIAS_POR_TIPO = {
  ONU:       ["onu"],
  Triplexor: ["PAS", "otros"],
  Roseta:    ["INF", "accesorios"],
  Patchcord: ["PAS"],
  Otro:      [], // sin filtro, busca en todo
};

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
  check:  "M20 6L9 17l-5-5",
  camera: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8",
  x:      "M18 6L6 18 M6 6l12 12",
  alert:  "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
};

function MultiPhotoUploader({ fotos, onChange, maxFotos = 5 }) {
  const handleAdd = (e) => {
    const files  = Array.from(e.target.files);
    const libres = maxFotos - fotos.length;
    const nuevas = files.slice(0, libres).map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    onChange([...fotos, ...nuevas]);
    e.target.value = "";
  };
  return (
    <div>
      <div style={mps.grid}>
        {fotos.map((f, idx) => (
          <div key={idx} style={mps.thumb}>
            <img src={f.preview} alt="" style={mps.img} />
            <button type="button" style={mps.removeBtn}
              onClick={() => onChange(fotos.filter((_, i) => i !== idx))}>
              <Icon d={IC.x} size={11} color="white" />
            </button>
          </div>
        ))}
        {fotos.length < maxFotos && (
          <label style={mps.addBtn}>
            <Icon d={IC.camera} size={20} color="var(--text-muted)" />
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              {fotos.length === 0 ? "Agregar foto" : "Más"}
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple
              style={{ display: "none" }} onChange={handleAdd} />
          </label>
        )}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
        {fotos.length}/{maxFotos} fotos
      </div>
    </div>
  );
}

const mps = {
  grid:      { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8 },
  thumb:     { position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: "1", background: "var(--hover)" },
  img:       { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  removeBtn: { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,.6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 },
  addBtn:    { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", aspectRatio: "1", borderRadius: 8, border: "1.5px dashed var(--border)", cursor: "pointer", background: "var(--hover)", minHeight: 72 },
};

// Buscador de producto del catálogo filtrado por tipo de equipo
function ProductoSelector({ tipoEquipo, value, onChange }) {
  const [productos,  setProductos]  = useState([]);
  const [busqueda,   setBusqueda]   = useState("");
  const [cargando,   setCargando]   = useState(false);
  const [abierto,    setAbierto]    = useState(false);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      setCargando(true);
      try {
        const data = await api.get("/productos");
        if (!activo) return;
        const cats = CATEGORIAS_POR_TIPO[tipoEquipo] || [];
        const filtrados = cats.length > 0
          ? data.filter(p => cats.includes(p.categoria))
          : data;
        setProductos(filtrados);
      } catch {
        // ignorar error de carga
      }
      finally {
        if (activo) setCargando(false);
      }
    };

  cargar();
  return () => { activo = false; };
  }, [tipoEquipo]);

  const productoSeleccionado = productos.find(p => p.id === value);

  const resultados = busqueda.trim()
    ? productos.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      ).slice(0, 8)
    : productos.slice(0, 8);

  return (
    <div style={{ position: "relative" }}>
      {/* Campo trigger */}
      <div
        onClick={() => setAbierto(true)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px", borderRadius: 8, cursor: "pointer",
          border: "1px solid var(--border)", background: "var(--input-bg, #fff)",
          minHeight: 38,
        }}
      >
        <Icon d={IC.search} size={14} color="var(--text-muted)" />
        <span style={{
          fontSize: 13,
          color: productoSeleccionado ? "var(--text)" : "var(--text-muted)",
          flex: 1,
        }}>
          {productoSeleccionado
            ? productoSeleccionado.nombre
            : cargando ? "Cargando..." : "Buscar producto del catálogo..."}
        </span>
        {productoSeleccionado && (
          <button type="button"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--text-muted)" }}
            onClick={e => { e.stopPropagation(); onChange(null); setBusqueda(""); }}>
            <Icon d={IC.x} size={13} />
          </button>
        )}
      </div>

      {/* Panel de búsqueda */}
      {abierto && (
        <>
          {/* Overlay para cerrar */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
            onClick={() => { setAbierto(false); setBusqueda(""); }}
          />
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
            background: "var(--card-bg, #fff)", border: "1px solid var(--border)",
            borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.14)",
            overflow: "hidden",
          }}>
            {/* Input búsqueda */}
            <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon d={IC.search} size={14} color="var(--text-muted)" />
              <input
                autoFocus
                placeholder="Buscar por nombre..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{
                  border: "none", outline: "none", fontSize: 13,
                  background: "transparent", color: "var(--text)", flex: 1,
                }}
              />
            </div>

            {/* Lista */}
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {resultados.length === 0 ? (
                <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--text-muted)" }}>
                  Sin resultados
                </div>
              ) : resultados.map(p => (
                <div key={p.id}
                  onClick={() => { onChange(p.id); setAbierto(false); setBusqueda(""); }}
                  style={{
                    padding: "9px 14px", cursor: "pointer", fontSize: 13,
                    borderBottom: "1px solid var(--border)",
                    background: value === p.id ? "var(--hover)" : "transparent",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = value === p.id ? "var(--hover)" : "transparent"}
                >
                  <div style={{ fontWeight: 500 }}>{p.nombre}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{p.categoria}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function agruparOrdenes(ordenes) {
  const map = new Map();
  for (const o of ordenes) {
    const key = o.grupo_orden || `solo-${o.id}`;
    if (!map.has(key)) {
      map.set(key, {
        grupo_orden: key,
        cliente:     o.cliente,
        direccion:   o.direccion,
        estado:      o.estado,
        created_at:  o.created_at,
        items:       [],
      });
    }
    const grupo = map.get(key);
    grupo.items.push(o);
    if (o.estado === "pendiente") grupo.estado = "pendiente";
  }
  return Array.from(map.values());
}

export default function TecRecojos() {
  const [ordenes,    setOrdenes]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [comentario, setComentario] = useState("");
  const [fotos,      setFotos]      = useState([]);
  // itemsData: { [recojo_id]: { producto_id, codigo_pon } }
  const [itemsData,  setItemsData]  = useState({});
  const [saving,     setSaving]     = useState(false);
  const [lastCodigo, setLastCodigo] = useState(null);

  useEffect(() => {
    tecnicoService.getMisRecojos()
      .then(data => { setOrdenes(data); setLoading(false); })
      .catch(() => { setError("No se pudieron cargar los recojos"); setLoading(false); });
  }, []);

  const grupos     = agruparOrdenes(ordenes);
  const pendientes  = grupos.filter(g => g.estado === "pendiente");
  const completados = grupos.filter(g => g.estado !== "pendiente");

  const abrirModal = (grupo) => {
    setSelected(grupo);
    setComentario("");
    setFotos([]);
    setLastCodigo(null);
    // Pre-poblar con codigo_pon existente si viene del backend
    const inicial = {};
    grupo.items.forEach(item => {
      inicial[item.id] = {
        producto_id: null,
        codigo_pon:  item.codigo_pon || "",
      };
    });
    setItemsData(inicial);
  };

  const setItemField = (id, field, value) =>
    setItemsData(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));

  // ONUs sin codigo_pon requieren que el técnico lo ingrese

  // Validar: todas las ONUs sin código previo deben tener codigo_pon ingresado
  // y todos los items deben tener producto_id seleccionado
  const confirmarValido = selected
    ? selected.items.every(item => {
        const d = itemsData[item.id] || {};
        const tieneProducto = !!d.producto_id;
        const tieneCodigoPon = item.tipo_equipo !== "ONU" || item.codigo_pon || (d.codigo_pon || "").trim() !== "";
        return tieneProducto && tieneCodigoPon;
      })
    : false;

  const confirmar = async () => {
    setSaving(true);
    try {
      const primerItem = selected.items.find(i => i.estado === "pendiente");
      const fd = new FormData();
      if (comentario) fd.append("comentario", comentario);
      fotos.forEach(f => fd.append("fotos", f.file));

      // Construir array de items con producto_id y codigo_pon
      const itemsArr = selected.items.map(item => ({
        id:          item.id,
        producto_id: itemsData[item.id]?.producto_id || null,
        codigo_pon:  itemsData[item.id]?.codigo_pon  || item.codigo_pon || null,
      }));
      fd.append("items", JSON.stringify(itemsArr));

      const res = await tecnicoService.confirmarRecojo(primerItem.id, fd);

      setOrdenes(prev => prev.map(o =>
        selected.items.find(i => i.id === o.id)
          ? {
              ...o,
              estado:     "recogido",
              comentario,
              codigo:     res?.codigo,
              codigo_pon: itemsData[o.id]?.codigo_pon || o.codigo_pon,
            }
          : o
      ));
      setLastCodigo(res?.codigo);
      setSelected(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando recojos...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>

      {lastCodigo && (
        <div className="alert alert-success" style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
          <Icon d={IC.check} size={16} color="var(--success)" />
          <div>
            <strong>Recojo confirmado</strong>
            <div style={{ fontSize: 13, marginTop: 2 }}>
              Código: <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{lastCodigo}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Pendientes ── */}
      {pendientes.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={cs.sectionTitle}>
            <span style={cs.dot("var(--warning)")} />
            Pendientes ({pendientes.length})
          </div>
          <div style={cs.cardList}>
            {pendientes.map(grupo => (
              <div key={grupo.grupo_orden} style={cs.orderCard}>
                <div style={cs.orderTop}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{grupo.cliente ?? "—"}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{grupo.direccion ?? "—"}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      {grupo.items.map(item => (
                        <div key={item.id} style={{
                          display: "flex", alignItems: "center", gap: 4,
                          background: "var(--hover)", borderRadius: 6, padding: "3px 8px", fontSize: 12,
                        }}>
                          <span className="badge badge-blue" style={{ fontSize: 11, padding: "1px 6px" }}>
                            {item.tipo_equipo}
                          </span>
                          {item.tipo_equipo === "ONU" && !item.codigo_pon && (
                            <span style={{ color: "var(--warning)", fontSize: 11, display: "flex", alignItems: "center", gap: 2 }}>
                              <Icon d={IC.alert} size={12} color="var(--warning)" /> Sin PON
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                      {formatFecha(grupo.created_at)}
                    </div>
                    <span className="badge badge-warning">Pendiente</span>
                  </div>
                </div>
                <button className="btn btn-primary btn-full" style={{ marginTop: 12, minHeight: 44 }}
                  onClick={() => abrirModal(grupo)}>
                  <Icon d={IC.check} size={15} />
                  Confirmar recojo ({grupo.items.length} equipo{grupo.items.length > 1 ? "s" : ""})
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Completados ── */}
      {completados.length > 0 && (
        <div>
          <div style={cs.sectionTitle}>
            <span style={cs.dot("var(--success)")} />
            Completados ({completados.length})
          </div>
          <div style={cs.cardList}>
            {completados.map(grupo => (
              <div key={grupo.grupo_orden} style={{ ...cs.orderCard, opacity: 0.85 }}>
                <div style={cs.orderTop}>
                  <div>
                    {grupo.items[0]?.codigo && (
                      <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--primary)", fontWeight: 700, marginBottom: 4 }}>
                        {grupo.items[0].codigo}
                      </div>
                    )}
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{grupo.cliente ?? "—"}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{grupo.direccion ?? "—"}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      {grupo.items.map(item => (
                        <div key={item.id} style={{
                          display: "flex", alignItems: "center", gap: 4,
                          background: "var(--hover)", borderRadius: 6, padding: "3px 8px", fontSize: 12,
                        }}>
                          <span className="badge badge-blue" style={{ fontSize: 11, padding: "1px 6px" }}>
                            {item.tipo_equipo}
                          </span>
                          {item.tipo_equipo === "ONU" && item.codigo_pon && (
                            <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>
                              {item.codigo_pon}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                      {formatFecha(grupo.created_at)}
                    </div>
                    <span className="badge badge-active">Recogido</span>
                  </div>
                </div>
                {grupo.items[0]?.fotos?.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    {grupo.items[0].fotos.map((f, i) => (
                      <a key={i} href={`${BASE_URL}/uploads/${f.ruta}`} target="_blank" rel="noreferrer">
                        <img src={`${BASE_URL}/uploads/${f.ruta}`} alt=""
                          style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {ordenes.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          Sin órdenes de recojo asignadas
        </div>
      )}

      {/* ── Modal confirmar ── */}
      {selected && (
        <Modal title="Confirmar recojo" onClose={() => setSelected(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setSelected(null)} disabled={saving}>
                Cancelar
              </button>
              <button className="btn btn-success" onClick={confirmar}
                disabled={saving || !confirmarValido} style={{ minHeight: 44 }}>
                <Icon d={IC.check} size={14} />
                {saving ? "Confirmando..." : "Confirmar recojo"}
              </button>
            </>
          }
        >
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Cliente</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.cliente ?? "—"}</div>
            {selected.direccion && (
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{selected.direccion}</div>
            )}
          </div>

          {/* Un bloque por equipo */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
              Equipos ({selected.items.length}) — selecciona el producto exacto de cada uno
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {selected.items.map(item => (
                <div key={item.id} style={{
                  background: "var(--hover)", borderRadius: 10, padding: "12px 14px",
                  border: "1px solid var(--border)",
                }}>
                  {/* Cabecera tipo */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span className="badge badge-blue">{item.tipo_equipo}</span>
                    {item.tipo_equipo === "ONU" && item.codigo_pon && (
                      <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>
                        PON: {item.codigo_pon}
                      </span>
                    )}
                  </div>

                  {/* Buscador producto catálogo */}
                  <div className="form-group" style={{ margin: "0 0 8px 0" }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                      Producto del catálogo *
                    </label>
                    <ProductoSelector
                      tipoEquipo={item.tipo_equipo}
                      value={itemsData[item.id]?.producto_id || null}
                      onChange={pid => setItemField(item.id, "producto_id", pid)}
                    />
                  </div>

                  {/* Código PON si es ONU sin código previo */}
                  {item.tipo_equipo === "ONU" && !item.codigo_pon && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{
                        fontSize: 11, fontWeight: 600,
                        color: "var(--warning)", display: "flex", alignItems: "center", gap: 4, marginBottom: 4,
                      }}>
                        <Icon d={IC.alert} size={12} color="var(--warning)" />
                        Código PON-SN *
                      </label>
                      <input
                        className="form-input"
                        placeholder="Ej: ZTEGC1234567"
                        value={itemsData[item.id]?.codigo_pon || ""}
                        onChange={e => setItemField(item.id, "codigo_pon", e.target.value)}
                        style={{ fontSize: 13, fontFamily: "monospace" }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Comentario <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(opcional)</span>
            </label>
            <textarea className="form-input" placeholder="Ej: Equipos en buen estado..."
              rows={2} value={comentario} onChange={e => setComentario(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">
              Fotos <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(hasta 5)</span>
            </label>
            <MultiPhotoUploader fotos={fotos} onChange={setFotos} />
          </div>
        </Modal>
      )}
    </div>
  );
}

const cs = {
  sectionTitle: {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 13, fontWeight: 600, color: "var(--text-secondary)",
    marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em",
  },
  dot: (color) => ({ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }),
  cardList: { display: "flex", flexDirection: "column", gap: 12 },
  orderCard: {
    background: "white", border: "1px solid var(--border)",
    borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,.06)",
  },
  orderTop: { display: "flex", justifyContent: "space-between", gap: 12 },
};