import { useState, useEffect } from "react";
import tecnicoService from "../../services/tecnicoService";
import onuService from "../../services/onuService";
import { db } from "../../db/localDB";
import { fileToBase64 } from "../../services/syncService";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";


function Icon({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const IC = {
  wifi:   "M5 12.55a11 11 0 0114.08 0 M1.42 9a16 16 0 0121.16 0 M8.53 16.11a6 6 0 016.95 0 M12 20h.01",
  wrench: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  check:  "M20 6L9 17l-5-5",
  plus:   "M12 5v14 M5 12h14",
  trash:  "M3 6h18 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
  x:      "M18 6L6 18 M6 6l12 12",
  camera: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8",
  tag:    "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01",
  swap:   "M7 16V4m0 0L3 8m4-4l4 4 M17 8v12m0 0l4-4m-4 4l-4-4",
};

// ── Fotos múltiples ────────────────────────────────────────────────────────
function MultiPhotoUploader({ fotos, onChange, maxFotos = 5 }) {
  const handleAdd = (e) => {
    const files  = Array.from(e.target.files);
    const libres = maxFotos - fotos.length;
    const nuevas = files.slice(0, libres).map(f => ({
      file: f, preview: URL.createObjectURL(f),
    }));
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
            <Icon d={IC.camera} size={22} color="var(--text-muted)" />
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              {fotos.length === 0 ? "Agregar foto" : "Más"}
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple
              style={{ display: "none" }} onChange={handleAdd} />
          </label>
        )}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
        {fotos.length}/{maxFotos} fotos
      </div>
    </div>
  );
}

const mps = {
  grid:      { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 },
  thumb:     { position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: "1", background: "var(--hover)" },
  img:       { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  removeBtn: { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,.6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 },
  addBtn:    { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", aspectRatio: "1", borderRadius: 8, border: "1.5px dashed var(--border)", cursor: "pointer", background: "var(--hover)", minHeight: 80 },
};

// ── Selector de materiales ─────────────────────────────────────────────────
function ItemSelector({ inventario, misOnus, items, onChange }) {
  const yaAgregados = items.map(i => String(i.producto_id));

  const agregarItem = () => onChange([...items, { producto_id: "", cantidad: "", onu_id: null }]);
  const quitarItem  = (idx) => onChange(items.filter((_, i) => i !== idx));
  const updateItem  = (idx, key, value) =>
    onChange(items.map((item, i) => {
      if (i !== idx) return item;
      if (key === "producto_id") return { ...item, [key]: value, onu_id: null, cantidad: "" };
      return { ...item, [key]: value };
    }));

  return (
    <div>
      {items.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "6px 0 10px" }}>
          Agregá los materiales utilizados.
        </div>
      )}
      {items.map((item, idx) => {
        const prodInfo        = inventario.find(i => String(i.producto_id) === String(item.producto_id));
        const isMedible       = prodInfo?.es_medible;
        const esOnu           = prodInfo?.categoria === "onu";
        const onusDelProducto = misOnus.filter(o => String(o.producto_id) === String(item.producto_id));

        return (
          <div key={idx} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 2 }}>
                <select className="form-input" value={item.producto_id}
                  onChange={e => updateItem(idx, "producto_id", e.target.value)}
                  style={{ fontSize: 14 }}>
                  <option value="">Seleccionar ítem...</option>
                  {inventario.map(i => (
                    <option key={i.producto_id} value={i.producto_id}
                      disabled={
                        (yaAgregados.includes(String(i.producto_id)) &&
                          String(i.producto_id) !== String(item.producto_id)) ||
                        i.disponible <= 0
                      }>
                      {i.nombre} — disp: {i.disponible} {i.es_medible ? "m" : i.unidad}
                    </option>
                  ))}
                </select>
              </div>

              {!esOnu && (
                <div style={{ flex: 1 }}>
                  <input className="form-input" type="number" min="0.01"
                    step={isMedible ? "0.01" : "1"}
                    placeholder={isMedible ? "Ej: 2.5" : "Cant."}
                    value={item.cantidad}
                    max={prodInfo?.disponible}
                    onChange={e => updateItem(idx, "cantidad", e.target.value)}
                    style={{ fontSize: 14 }} />
                  {prodInfo && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {isMedible ? "metros" : prodInfo.unidad} · máx {prodInfo.disponible}
                    </div>
                  )}
                </div>
              )}

              <button className="btn btn-danger-outline btn-sm btn-icon"
                onClick={() => quitarItem(idx)} type="button"
                style={{ marginTop: 2, minWidth: 36, minHeight: 36 }}>
                <Icon d={IC.trash} size={13} />
              </button>
            </div>

            {esOnu && item.producto_id && (
              <div style={{
                marginTop: 8, padding: "10px 12px",
                background: "var(--hover)", borderRadius: 8,
                border: `1px solid ${item.onu_id ? "var(--primary)" : "var(--border)"}`,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                  textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <Icon d={IC.tag} size={12} color="var(--text-muted)" />
                  Seleccioná la ONU a usar
                </div>
                {onusDelProducto.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                    No tenés ONUs de este modelo asignadas
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {onusDelProducto.map(onu => {
                      const sel = item.onu_id === onu.id;
                      return (
                        <button key={onu.id} type="button"
                          onClick={() => updateItem(idx, "onu_id", sel ? null : onu.id)}
                          style={{
                            padding: "5px 12px", borderRadius: 6,
                            fontSize: 12, fontFamily: "monospace",
                            cursor: "pointer", fontWeight: 600, border: "1px solid",
                            borderColor: sel ? "var(--primary)" : "var(--border)",
                            background:  sel ? "var(--primary)" : "white",
                            color:       sel ? "white" : "var(--text)",
                            transition: "all .15s",
                          }}>
                          {onu.codigo_pon}
                        </button>
                      );
                    })}
                  </div>
                )}
                {item.onu_id && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--primary)",
                    fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                    <Icon d={IC.check} size={12} color="var(--primary)" />
                    ONU seleccionada: {onusDelProducto.find(o => o.id === item.onu_id)?.codigo_pon}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <button className="btn btn-outline btn-sm" style={{ marginTop: 4 }}
        onClick={agregarItem} type="button">
        <Icon d={IC.plus} size={13} />
        Agregar material
      </button>
    </div>
  );
}

// ── ONU Recogida selector ──────────────────────────────────────────────────
function OnuRecogidaPanel({ catalogoOnus, onuRecogida, onChange }) {
  return (
    <div style={{
      marginTop: 4, padding: "12px 14px",
      background: "var(--hover)", borderRadius: 10,
      border: "1.5px solid var(--border)",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <Icon d={IC.swap} size={12} color="var(--text-muted)" />
        ONU recogida del cliente
      </div>

      <div className="form-group" style={{ marginBottom: 10 }}>
        <label className="form-label">Modelo de ONU *</label>
        <select className="form-input"
          value={onuRecogida.producto_id}
          onChange={e => onChange({ ...onuRecogida, producto_id: e.target.value, codigo_pon: "" })}
          style={{ fontSize: 14 }}>
          <option value="">Seleccionar modelo...</option>
          {catalogoOnus.map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Código PON *</label>
        <input className="form-input"
          placeholder="Ej: ZTEG-AB123456"
          value={onuRecogida.codigo_pon}
          onChange={e => onChange({ ...onuRecogida, codigo_pon: e.target.value })}
          style={{ fontSize: 14, fontFamily: "monospace" }}
        />
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          Ingresá el código que figura en la etiqueta de la ONU recogida
        </div>
      </div>
    </div>
  );
}

// ── Formularios vacíos ─────────────────────────────────────────────────────
const emptyAveriaForm = { cliente: "", direccion: "", comentario: "", items: [] };
const emptyActivForm  = { cliente: "", direccion: "", comentario: "", items: [] };
const emptyOnuRecogida = { producto_id: "", codigo_pon: "" };

// ── Componente principal ───────────────────────────────────────────────────
export default function TecRegistrarSalida() {
  const [tab, setTab] = useState("averia");
  const online = useOnlineStatus();


  const [inventario,   setInventario]   = useState([]);
  const [misOnus,      setMisOnus]      = useState([]);
  const [catalogoOnus, setCatalogoOnus] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [success,      setSuccess]      = useState(null);

  // Avería
  const [tipoAveria,   setTipoAveria]   = useState("comun"); // "comun" | "cambio_onu"
  const [averiaForm,   setAveriaForm]   = useState(emptyAveriaForm);
  const [fotosAveria,  setFotosAveria]  = useState([]);
  const [onuRecogida,  setOnuRecogida]  = useState(emptyOnuRecogida);
  const [savingAveria, setSavingAveria] = useState(false);
  const [errorsAveria, setErrorsAveria] = useState({});

  // Activación
  const [activForm,   setActivForm]   = useState(emptyActivForm);
  const [fotosActiv,  setFotosActiv]  = useState([]);
  const [savingActiv, setSavingActiv] = useState(false);
  const [errorsActiv, setErrorsActiv] = useState({});

  useEffect(() => {
    const cargar = async () => {
      try {
        if (navigator.onLine) {
          const [inv, onus, catalogo] = await Promise.all([
            tecnicoService.getMiInventario(),
            onuService.getMisOnus(),
            tecnicoService.getCatalogoOnus(),
          ]);
          setInventario(inv);
          setMisOnus(onus);
          setCatalogoOnus(Array.isArray(catalogo) ? catalogo : []);
          await db.inventario.clear();
          await db.inventario.bulkAdd(inv);
          await db.mis_onus.clear();
          await db.mis_onus.bulkAdd(onus);
          await db.catalogo_onus.clear();
          await db.catalogo_onus.bulkAdd(Array.isArray(catalogo) ? catalogo : []);
        } else {
          const [inv, onus, catalogo] = await Promise.all([
            db.inventario.toArray(),
            db.mis_onus.toArray(),
            db.catalogo_onus.toArray(),
          ]);
          setInventario(inv);
          setMisOnus(onus);
          setCatalogoOnus(catalogo);
        }
      } catch {
        const [inv, onus, catalogo] = await Promise.all([
          db.inventario.toArray(),
          db.mis_onus.toArray(),
          db.catalogo_onus.toArray(),
        ]);
        setInventario(inv);
        setMisOnus(onus);
        setCatalogoOnus(catalogo);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const recargarInventario = async () => {
    const [inv, onus] = await Promise.all([
      tecnicoService.getMiInventario(),
      onuService.getMisOnus(),
    ]);
    setInventario(inv);
    setMisOnus(onus);
  };

  const tieneOnu = (items) =>
    items.some(i => {
      const prod = inventario.find(p => String(p.producto_id) === String(i.producto_id));
      return prod?.categoria === "onu";
    });

  const getOnuId = (items) => {
    const item = items.find(i => {
      const prod = inventario.find(p => String(p.producto_id) === String(i.producto_id));
      return prod?.categoria === "onu";
    });
    return item?.onu_id ?? null;
  };

  // ── Validación avería ──────────────────────────────────────────────────
  const validateAveria = () => {
    const e = {};
    if (averiaForm.items.length === 0) {
      e.items = "Agregá al menos un material";
    } else {
      for (const item of averiaForm.items) {
        if (!item.producto_id) { e.items = "Seleccioná un ítem en todos los materiales"; break; }
        const prod = inventario.find(i => String(i.producto_id) === String(item.producto_id));
        if (prod?.categoria === "onu") {
          if (!item.onu_id) { e.items = "Seleccioná qué ONU usaste"; break; }
        } else {
          if (!item.cantidad || item.cantidad <= 0) { e.items = "Ingresá una cantidad válida"; break; }
        }
      }
    }
    if (tieneOnu(averiaForm.items)) {
      if (!averiaForm.cliente.trim())   e.cliente   = "Ingresá el nombre del cliente";
      if (!averiaForm.direccion.trim()) e.direccion = "Ingresá la dirección";
    }
    // Validar ONU recogida si es cambio de ONU
    if (tipoAveria === "cambio_onu") {
      if (!onuRecogida.producto_id) e.onu_recogida_producto = "Seleccioná el modelo de la ONU recogida";
      if (!onuRecogida.codigo_pon.trim()) e.onu_recogida_pon = "Ingresá el código PON de la ONU recogida";
    }
    return e;
  };

  // ── Submit avería ──────────────────────────────────────────────────────
  const handleRegistrarAveria = async () => {
    const e = validateAveria();
    if (Object.keys(e).length > 0) { setErrorsAveria(e); return; }
    setErrorsAveria({});
    setSavingAveria(true);
    // DESPUÉS:
    try {
      if (navigator.onLine) {
        const fd = new FormData();
        fd.append("comentario", averiaForm.comentario || "");
        const itemsNormales = averiaForm.items.filter(i => {
          const prod = inventario.find(p => String(p.producto_id) === String(i.producto_id));
          return prod?.categoria !== "onu";
        });
        fd.append("items", JSON.stringify(itemsNormales));
        const onuId = getOnuId(averiaForm.items);
        if (onuId) {
          fd.append("onu_id",    onuId);
          fd.append("cliente",   averiaForm.cliente);
          fd.append("direccion", averiaForm.direccion);
        }
        if (tipoAveria === "cambio_onu") {
          fd.append("onu_recogida_producto_id", onuRecogida.producto_id);
          fd.append("onu_recogida_codigo_pon",  onuRecogida.codigo_pon.trim());
        }
        fotosAveria.forEach(f => fd.append("fotos", f.file));
        const res = await tecnicoService.registrarSalidaMultiple(fd);
        setSuccess(`averia:${res?.codigo || ""}`);
      } else {
        const itemsNormales = averiaForm.items.filter(i => {
          const prod = inventario.find(p => String(p.producto_id) === String(i.producto_id));
          return prod?.categoria !== "onu";
        });
        const onuId = getOnuId(averiaForm.items);
        const payload = {
          comentario: averiaForm.comentario || "",
          items:      JSON.stringify(itemsNormales),
          ...(onuId && {
            onu_id:    onuId,
            cliente:   averiaForm.cliente,
            direccion: averiaForm.direccion,
          }),
          ...(tipoAveria === "cambio_onu" && {
            onu_recogida_producto_id: onuRecogida.producto_id,
            onu_recogida_codigo_pon:  onuRecogida.codigo_pon.trim(),
          }),
        };
        const localId = await db.salidas_pendientes.add({
          tipo: 'averia', payload,
          syncStatus: 'pending',
          creadoEn: new Date().toISOString(),
        });
        for (const foto of fotosAveria) {
          const base64 = await fileToBase64(foto.file);
          await db.fotos_pendientes.add({
            salidaLocalId: localId,
            base64, filename: foto.file.name, mime: foto.file.type,
          });
        }
        for (const item of itemsNormales) {
          const local = await db.inventario
            .where('producto_id').equals(Number(item.producto_id)).first();
          if (local) {
            await db.inventario.update(local.id, {
              disponible: local.disponible - Number(item.cantidad)
            });
          }
        }
        setSuccess("averia:OFFLINE-GUARDADO");
      }
      // Siempre se ejecutan:
      setAveriaForm(emptyAveriaForm);
      setFotosAveria([]);
      setOnuRecogida(emptyOnuRecogida);
      setTipoAveria("comun");
      setTimeout(() => setSuccess(null), 5000);
      if (navigator.onLine) await recargarInventario();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingAveria(false);
    }
  };

  // ── Validación activación ──────────────────────────────────────────────
  const validateActiv = () => {
    const e = {};
    if (!activForm.cliente.trim())   e.cliente   = "Ingresá el nombre del cliente";
    if (!activForm.direccion.trim()) e.direccion = "Ingresá la dirección";
    for (const item of activForm.items) {
      if (!item.producto_id) { e.items = "Seleccioná un ítem en todos los materiales"; break; }
      const prod = inventario.find(i => String(i.producto_id) === String(item.producto_id));
      if (prod?.categoria === "onu" && !item.onu_id) {
        e.items = "Seleccioná qué ONU estás instalando"; break;
      }
    }
    return e;
  };

  // ── Submit activación ──────────────────────────────────────────────────
  const handleRegistrarActivacion = async () => {
    const e = validateActiv();
    if (Object.keys(e).length > 0) { setErrorsActiv(e); return; }
    setErrorsActiv({});
    setSavingActiv(true);
    try {
      if (navigator.onLine) {
        const fd = new FormData();
        fd.append("cliente",    activForm.cliente);
        fd.append("direccion",  activForm.direccion);
        fd.append("comentario", activForm.comentario || "");
        const itemsNormales = activForm.items.filter(i => {
          const prod = inventario.find(p => String(p.producto_id) === String(i.producto_id));
          return prod?.categoria !== "onu";
        });
        fd.append("items", JSON.stringify(itemsNormales));
        const onuId = getOnuId(activForm.items);
        if (onuId) fd.append("onu_id", onuId);
        fotosActiv.forEach(f => fd.append("fotos", f.file));
        const res = await tecnicoService.registrarActivacion(fd);
        setSuccess(`activacion:${res?.codigo || ""}`);
      } else {
        const itemsNormales = activForm.items.filter(i => {
          const prod = inventario.find(p => String(p.producto_id) === String(i.producto_id));
          return prod?.categoria !== "onu";
        });
        const onuId = getOnuId(activForm.items);
        const payload = {
          cliente:    activForm.cliente,
          direccion:  activForm.direccion,
          comentario: activForm.comentario || "",
          items:      JSON.stringify(itemsNormales),
          ...(onuId && { onu_id: onuId }),
        };
        const localId = await db.salidas_pendientes.add({
          tipo: 'activacion', payload,
          syncStatus: 'pending',
          creadoEn: new Date().toISOString(),
        });
        for (const foto of fotosActiv) {
          const base64 = await fileToBase64(foto.file);
          await db.fotos_pendientes.add({
            salidaLocalId: localId,
            base64, filename: foto.file.name, mime: foto.file.type,
          });
        }
        setSuccess("activacion:OFFLINE-GUARDADO");
      }
      // Siempre se ejecutan:
      setActivForm(emptyActivForm);
      setFotosActiv([]);
      setTimeout(() => setSuccess(null), 5000);
      if (navigator.onLine) await recargarInventario();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingActiv(false);
    }
  };

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando...</div>;

  const successTipo   = success?.split(":")?.[0];
  const successCodigo = success?.split(":")?.[1];

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>

      {success && (
        <div className="alert alert-success" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <Icon d={IC.check} size={16} color="var(--success)" />
          <div>
            <strong>
              {successTipo === "averia" ? "Avería" : "Activación"}{" "}
              {successCodigo === "OFFLINE-GUARDADO" ? "guardada offline" : "registrada correctamente"}
            </strong>
            {successCodigo === "OFFLINE-GUARDADO" ? (
              <div style={{ fontSize: 13, marginTop: 2, color: "var(--text-muted)" }}>
                Se subirá automáticamente cuando haya internet
              </div>
            ) : successCodigo ? (
              <div style={{ fontSize: 13, marginTop: 2 }}>
                Código: <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{successCodigo}</span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Tabs principales */}
      <div style={ts.tabBar}>
        {[
          { key: "averia",     label: "Avería",    icon: IC.wrench },
          { key: "activacion", label: "Activación", icon: IC.wifi  },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              ...ts.tabBtn,
              background: tab === t.key ? "white" : "transparent",
              color:      tab === t.key ? "var(--text)" : "var(--text-muted)",
              boxShadow:  tab === t.key ? "0 1px 3px rgba(0,0,0,.12)" : "none",
              flex: 1,
            }}>
            <Icon d={t.icon} size={16} color={tab === t.key ? "var(--primary)" : "var(--text-muted)"} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ Tab Avería ══════════ */}
      {tab === "averia" && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Registrar avería</div>
              <div className="card-subtitle">Materiales utilizados en la reparación</div>
            </div>
          </div>

          {/* Sub-tipo avería */}
          <div className="form-group">
            <label className="form-label">Tipo de avería *</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { key: "comun",     label: "Avería común" },
                { key: "cambio_onu", label: "Cambio de ONU" },
              ].map(t => (
                <button key={t.key} type="button"
                  onClick={() => { setTipoAveria(t.key); setOnuRecogida(emptyOnuRecogida); setErrorsAveria({}); }}
                  style={{
                    flex: 1, padding: "10px 8px", borderRadius: 8, border: "1.5px solid",
                    borderColor:  tipoAveria === t.key ? "var(--primary)" : "var(--border)",
                    background:   tipoAveria === t.key ? "var(--primary)" : "white",
                    color:        tipoAveria === t.key ? "white" : "var(--text)",
                    fontWeight:   600, fontSize: 13, cursor: "pointer", transition: "all .15s",
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Materiales utilizados *</label>
            <ItemSelector
              inventario={inventario}
              misOnus={misOnus}
              items={averiaForm.items}
              onChange={items => setAveriaForm(p => ({ ...p, items }))}
            />
            {errorsAveria.items && (
              <div className="form-error" style={{ marginTop: 6 }}>{errorsAveria.items}</div>
            )}
          </div>

          {tieneOnu(averiaForm.items) && (
            <>
              <div className="form-group">
                <label className="form-label">Cliente *</label>
                <input
                  className={`form-input ${errorsAveria.cliente ? "error" : ""}`}
                  placeholder="Nombre del cliente"
                  value={averiaForm.cliente}
                  onChange={e => {
                    setAveriaForm(p => ({ ...p, cliente: e.target.value }));
                    if (errorsAveria.cliente) setErrorsAveria(p => ({ ...p, cliente: null }));
                  }}
                  style={{ fontSize: 16 }}
                />
                {errorsAveria.cliente && <div className="form-error">{errorsAveria.cliente}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Dirección *</label>
                <input
                  className={`form-input ${errorsAveria.direccion ? "error" : ""}`}
                  placeholder="Av. Ejemplo 1234"
                  value={averiaForm.direccion}
                  onChange={e => {
                    setAveriaForm(p => ({ ...p, direccion: e.target.value }));
                    if (errorsAveria.direccion) setErrorsAveria(p => ({ ...p, direccion: null }));
                  }}
                  style={{ fontSize: 16 }}
                />
                {errorsAveria.direccion && <div className="form-error">{errorsAveria.direccion}</div>}
              </div>
            </>
          )}

          {/* ONU recogida — solo si tipo es cambio_onu */}
          {tipoAveria === "cambio_onu" && (
            <div className="form-group">
              <label className="form-label">ONU recogida del cliente *</label>
              <OnuRecogidaPanel
                catalogoOnus={catalogoOnus}
                onuRecogida={onuRecogida}
                onChange={setOnuRecogida}
              />
              {errorsAveria.onu_recogida_producto && (
                <div className="form-error" style={{ marginTop: 6 }}>{errorsAveria.onu_recogida_producto}</div>
              )}
              {errorsAveria.onu_recogida_pon && (
                <div className="form-error" style={{ marginTop: 4 }}>{errorsAveria.onu_recogida_pon}</div>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Comentario <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(opcional)</span></label>
            <textarea className="form-input"
              placeholder="Ej: Puerto WAN dañado, se reemplazó ONU..."
              rows={3}
              value={averiaForm.comentario}
              onChange={e => setAveriaForm(p => ({ ...p, comentario: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fotos <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(hasta 5)</span></label>
            <MultiPhotoUploader fotos={fotosAveria} onChange={setFotosAveria} />
          </div>

          <button className="btn btn-primary btn-lg btn-full"
            onClick={handleRegistrarAveria} disabled={savingAveria}
            style={{ marginTop: 8, minHeight: 48 }}>
            <Icon d={IC.check} size={16} />
            {savingAveria ? "Registrando..." : "Registrar avería"}
          </button>
        </div>
      )}

      {/* ══════════ Tab Activación ══════════ */}
      {tab === "activacion" && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Nueva activación</div>
              <div className="card-subtitle">Registrá cliente, materiales y fotos</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Cliente *</label>
            <input
              className={`form-input ${errorsActiv.cliente ? "error" : ""}`}
              placeholder="Nombre del cliente"
              value={activForm.cliente}
              onChange={e => {
                setActivForm(p => ({ ...p, cliente: e.target.value }));
                if (errorsActiv.cliente) setErrorsActiv(p => ({ ...p, cliente: null }));
              }}
              style={{ fontSize: 16 }}
            />
            {errorsActiv.cliente && <div className="form-error">{errorsActiv.cliente}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Dirección *</label>
            <input
              className={`form-input ${errorsActiv.direccion ? "error" : ""}`}
              placeholder="Av. Ejemplo 1234"
              value={activForm.direccion}
              onChange={e => {
                setActivForm(p => ({ ...p, direccion: e.target.value }));
                if (errorsActiv.direccion) setErrorsActiv(p => ({ ...p, direccion: null }));
              }}
              style={{ fontSize: 16 }}
            />
            {errorsActiv.direccion && <div className="form-error">{errorsActiv.direccion}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Materiales <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(opcional)</span></label>
            <ItemSelector
              inventario={inventario}
              misOnus={misOnus}
              items={activForm.items}
              onChange={items => setActivForm(p => ({ ...p, items }))}
            />
            {errorsActiv.items && (
              <div className="form-error" style={{ marginTop: 6 }}>{errorsActiv.items}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Comentario <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(opcional)</span></label>
            <textarea className="form-input"
              placeholder="Observaciones del trabajo..."
              rows={3}
              value={activForm.comentario}
              onChange={e => setActivForm(p => ({ ...p, comentario: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fotos <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(hasta 5)</span></label>
            <MultiPhotoUploader fotos={fotosActiv} onChange={setFotosActiv} />
          </div>

          <button className="btn btn-primary btn-lg btn-full"
            onClick={handleRegistrarActivacion} disabled={savingActiv}
            style={{ marginTop: 8, minHeight: 48 }}>
            <Icon d={IC.check} size={16} />
            {savingActiv ? "Registrando..." : "Registrar activación"}
          </button>
        </div>
      )}
    </div>
  );
}

const ts = {
  tabBar: {
    display: "flex", gap: 4, background: "var(--hover)",
    borderRadius: 12, padding: 4,
  },
  tabBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 6, padding: "10px 12px", borderRadius: 9,
    border: "none", cursor: "pointer", fontSize: 14,
    fontWeight: 500, transition: "all .15s",
  },
};