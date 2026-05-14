import { useState, useEffect } from "react";
import tecnicoService   from "../../services/tecnicoService";
import onuService       from "../../services/onuService";
import recojosService   from "../../services/recojosService";
import { db }           from "../../db/localDB";
import { fileToBase64 } from "../../services/syncService";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import TecConfigurarONU from "./TecConfigurarONU";

function Icon({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const IC = {
  wifi:      "M5 12.55a11 11 0 0114.08 0 M1.42 9a16 16 0 0121.16 0 M8.53 16.11a6 6 0 016.95 0 M12 20h.01",
  wrench:    "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  check:     "M20 6L9 17l-5-5",
  plus:      "M12 5v14 M5 12h14",
  trash:     "M3 6h18 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
  x:         "M18 6L6 18 M6 6l12 12",
  camera:    "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8",
  tag:       "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01",
  swap:      "M7 16V4m0 0L3 8m4-4l4 4 M17 8v12m0 0l4-4m-4 4l-4-4",
  search:    "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  arrowLeft: "M19 12H5 M12 19l-7-7 7-7",
  refresh:   "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0020.49 15",
  mapPin:    "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 7a3 3 0 100 6 3 3 0 000-6",
  repeat:    "M17 1l4 4-4 4 M3 11V9a4 4 0 014-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 01-4 4H3",
  list:      "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  server:    "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-.99l7-3 7 3c.6.27 1 .86 1 1.5v6z",
  recycle:   "M4 2v6h6 M20 22v-6h-6 M20 11A8 8 0 004.93 7.1 M4 13a8 8 0 0015.07 3.9",
};

function limpiarTelefono(raw = "") {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return null;
  if (digits.startsWith("51") && digits.length === 11) return digits;
  if (digits.length === 9) return `51${digits}`;
  return `51${digits.slice(-9)}`;
}

function mensajeWhatsApp(servicio = "", abonado = "") {
  const u = servicio.toUpperCase();
  const nombre = abonado.split(" ")[0];
  if (u.includes("INSTALACION"))      return `Hola ${nombre}, soy el técnico de la empresa. Me encuentro en camino para realizar su instalación de internet. ¿Se encuentra disponible?`;
  if (u.includes("CAMBIO DE EQUIPO")) return `Hola ${nombre}, soy el técnico de la empresa. Vengo a realizar el cambio de equipo (ONU) en su domicilio. ¿Se encuentra disponible?`;
  if (u.includes("AVERIA"))           return `Hola ${nombre}, soy el técnico de la empresa. Estoy yendo a su domicilio para revisar y solucionar la avería reportada. ¿Se encuentra disponible?`;
  if (u.includes("RECONEXION"))       return `Hola ${nombre}, soy el técnico de la empresa. Voy a su domicilio para realizar la reconexión del servicio. ¿Se encuentra disponible?`;
  if (u.includes("RECOJO"))           return `Hola ${nombre}, soy el técnico de la empresa. Paso a retirar los equipos de su domicilio. ¿Se encuentra disponible?`;
  return `Hola ${nombre}, soy el técnico de la empresa. Me dirijo a su domicilio. ¿Se encuentra disponible?`;
}

function BtnWhatsApp({ telefono, servicio, abonado }) {
  const numero = limpiarTelefono(telefono);
  if (!numero) return null;
  const msg  = mensajeWhatsApp(servicio, abonado);
  const href = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
  return (
    <a href={href} target="_blank" rel="noreferrer"
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "7px 14px", borderRadius: 8,
        background: "#25D366", color: "white",
        fontWeight: 700, fontSize: 13,
        textDecoration: "none", border: "none",
        boxShadow: "0 1px 4px rgba(37,211,102,.35)",
        transition: "opacity .15s",
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
      <svg width={15} height={15} viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      Avisar al cliente
    </a>
  );
}

function clasificarServicio(s = "") {
  const u = s.toUpperCase();
  if (u.includes("RETIRO DE EQUIPO")) return { tab: "recojo",  tipoAveria: null };
  if (u.includes("CAMBIO DE EQUIPO")) return { tab: "averia",  tipoAveria: "cambio_onu" };
  if (u.includes("AVERIA"))           return { tab: "averia",  tipoAveria: "comun" };
  return { tab: "activacion", tipoAveria: null };
}

function labelServicio(s = "") {
  const u = s.toUpperCase();
  if (u.includes("CAMBIO DE EQUIPO")) return "Cambio de equipo";
  if (u.includes("INSTALACION"))      return "Instalación";
  if (u.includes("AVERIA"))           return "Avería";
  if (u.includes("RECONEXION"))       return "Reconexión";
  return s;
}

function badgeStyle(s = "") {
  const u = s.toUpperCase();
  if (u.includes("CAMBIO DE EQUIPO")) return { bg: "#fff3cd", color: "#856404", border: "#ffc107", icon: IC.swap   };
  if (u.includes("INSTALACION"))      return { bg: "#d1e7dd", color: "#0a3622", border: "#198754", icon: IC.wifi   };
  if (u.includes("AVERIA"))           return { bg: "#f8d7da", color: "#842029", border: "#dc3545", icon: IC.wrench };
  if (u.includes("RECONEXION"))       return { bg: "#cfe2ff", color: "#084298", border: "#0d6efd", icon: IC.repeat };
  return { bg: "var(--hover)", color: "var(--text)", border: "var(--border)", icon: IC.list };
}

function detectarRed(s = "") {
  const u = s.toUpperCase();
  if (u.includes("(I)")) return "internet";
  if (u.includes("(C)")) return "cable";
  return null;
}

function esDuo(o = {}) {
  return (o.observacion ?? "").toUpperCase().includes("DUO");
}

function claveDuo(o = {}) {
  return `${o.doc_identidad}__${o.fecha_crea}`;
}

function agruparDuos(lista = []) {
  const grupos = {};
  const simples = [];

  lista.forEach(o => {
    if (!esDuo(o) || !o.doc_identidad || o.doc_identidad === "0") {
      simples.push(o);
      return;
    }
    const clave = claveDuo(o);
    if (!grupos[clave]) grupos[clave] = [];
    grupos[clave].push(o);
  });

  const resultado = [];
  Object.entries(grupos).forEach(([clave, ords]) => {
    const internet = ords.find(o => o.servicio?.toUpperCase().includes("(I)"));
    const cable    = ords.find(o => o.servicio?.toUpperCase().includes("(C)"));
    if (internet && cable) {
      resultado.push({ _esDuo: true, clave, internet, cable, abonado: internet.abonado, direccion: internet.direccion });
    } else {
      ords.forEach(o => simples.push(o));
    }
  });

  return [...resultado, ...simples];
}

function MultiPhotoUploader({ fotos, onChange, maxFotos = 5 }) {
  const handleAdd = (e) => {
    const files  = Array.from(e.target.files);
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

// ── ItemSelector con soporte de materiales recuperados ───────────────────────
function ItemSelector({ inventario, misOnus, recuperados = [], items, onChange }) {
  const yaAgregados       = items.map(i => String(i.producto_id));
  const yaAgregadosRecIds = items.map(i => i.recuperado_id).filter(Boolean);

  const add    = () => onChange([...items, { producto_id: "", cantidad: "", onu_id: null, recuperado_id: null }]);
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  const update = (idx, key, value) =>
    onChange(items.map((item, i) => {
      if (i !== idx) return item;
      if (key === "producto_id") return { ...item, [key]: value, onu_id: null, cantidad: "", recuperado_id: null };
      return { ...item, [key]: value };
    }));

  const addRecuperado = (rec) => {
    if (yaAgregadosRecIds.includes(rec.id)) return;
    onChange([...items, {
      producto_id:   String(rec.producto_id),
      cantidad:      "1",
      onu_id:        null,
      recuperado_id: rec.id,
      _nombre:       rec.producto_nombre,
      _esRecuperado: true,
    }]);
  };

  return (
    <div>
      {/* ── Materiales recuperados disponibles ── */}
      {recuperados.length > 0 && (
        <div style={{
          marginBottom: 14, padding: "10px 12px",
          background: "#faf5ff", borderRadius: 8,
          border: "1px solid #e9d5ff",
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: "#7c3aed",
            textTransform: "uppercase", letterSpacing: 0.5,
            marginBottom: 8, display: "flex", alignItems: "center", gap: 6,
          }}>
            <Icon d={IC.recycle} size={12} color="#7c3aed" />
            Materiales recuperados en tu poder
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {recuperados.map(rec => {
              const yaAgregado = yaAgregadosRecIds.includes(rec.id);
              return (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => addRecuperado(rec)}
                  disabled={yaAgregado}
                  style={{
                    padding: "5px 12px", borderRadius: 7, fontSize: 12,
                    fontWeight: 600, cursor: yaAgregado ? "default" : "pointer",
                    border: "1px solid",
                    borderColor: yaAgregado ? "#d8b4fe" : "#a855f7",
                    background:  yaAgregado ? "#ede9fe" : "white",
                    color:       yaAgregado ? "#9ca3af" : "#7c3aed",
                    display: "flex", alignItems: "center", gap: 5,
                    transition: "all .15s",
                  }}>
                  {yaAgregado
                    ? <Icon d={IC.check} size={11} color="#9ca3af" />
                    : <Icon d={IC.plus}  size={11} color="#7c3aed" />
                  }
                  {rec.producto_nombre || rec.tipo_equipo}
                  {rec.codigo_pon && (
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: "#9ca3af" }}>
                      · {rec.codigo_pon}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
            Tocá para agregar como material usado en esta orden
          </div>
        </div>
      )}

      {/* ── Items seleccionados ── */}
      {items.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "6px 0 10px" }}>
          Agregá los materiales utilizados.
        </div>
      )}

      {items.map((item, idx) => {
        // Si es material recuperado, mostrar fila simplificada
        if (item._esRecuperado) {
          return (
            <div key={idx} style={{
              marginBottom: 10, padding: "8px 12px",
              background: "#faf5ff", borderRadius: 8,
              border: "1px solid #e9d5ff",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <Icon d={IC.recycle} size={14} color="#7c3aed" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>
                  {item._nombre || "Material recuperado"}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>Material recuperado · cantidad: 1</div>
              </div>
              <button className="btn btn-danger-outline btn-sm btn-icon"
                onClick={() => remove(idx)} type="button"
                style={{ minWidth: 32, minHeight: 32 }}>
                <Icon d={IC.trash} size={13} />
              </button>
            </div>
          );
        }

        const prod  = inventario.find(i => String(i.producto_id) === String(item.producto_id));
        const esOnu = prod?.categoria === "onu";
        const onus  = misOnus.filter(o => String(o.producto_id) === String(item.producto_id));

        return (
          <div key={idx} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 2 }}>
                <select className="form-input" value={item.producto_id}
                  onChange={e => update(idx, "producto_id", e.target.value)} style={{ fontSize: 14 }}>
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
                    step={prod?.es_medible ? "0.01" : "1"}
                    placeholder={prod?.es_medible ? "Ej: 2.5" : "Cant."}
                    value={item.cantidad} max={prod?.disponible}
                    onChange={e => update(idx, "cantidad", e.target.value)}
                    style={{ fontSize: 14 }} />
                  {prod && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {prod.es_medible ? "metros" : prod.unidad} · máx {prod.disponible}
                    </div>
                  )}
                </div>
              )}
              <button className="btn btn-danger-outline btn-sm btn-icon"
                onClick={() => remove(idx)} type="button"
                style={{ marginTop: 2, minWidth: 36, minHeight: 36 }}>
                <Icon d={IC.trash} size={13} />
              </button>
            </div>

            {esOnu && item.producto_id && (
              <div style={{ marginTop: 8, padding: "10px 12px", background: "var(--hover)", borderRadius: 8, border: `1px solid ${item.onu_id ? "var(--primary)" : "var(--border)"}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon d={IC.tag} size={12} color="var(--text-muted)" /> Seleccioná la ONU a usar
                </div>
                {onus.length === 0
                  ? <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>No tenés ONUs de este modelo asignadas</div>
                  : <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {onus.map(onu => {
                        const sel = item.onu_id === onu.id;
                        return (
                          <button key={onu.id} type="button"
                            onClick={() => update(idx, "onu_id", sel ? null : onu.id)}
                            style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontFamily: "monospace", cursor: "pointer", fontWeight: 600, border: "1px solid", borderColor: sel ? "var(--primary)" : "var(--border)", background: sel ? "var(--primary)" : "white", color: sel ? "white" : "var(--text)", transition: "all .15s" }}>
                            {onu.codigo_pon}
                          </button>
                        );
                      })}
                    </div>
                }
                {item.onu_id && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                    <Icon d={IC.check} size={12} color="var(--primary)" />
                    ONU: {onus.find(o => o.id === item.onu_id)?.codigo_pon}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <button className="btn btn-outline btn-sm" style={{ marginTop: 4 }} onClick={add} type="button">
        <Icon d={IC.plus} size={13} /> Agregar material del inventario
      </button>
    </div>
  );
}

function DuoCard({ duo, onSeleccionar }) {
  return (
    <div onClick={() => onSeleccionar(duo)}
      style={{ padding: "14px 16px", borderRadius: 12, border: "1.5px solid #c4b5fd", background: "var(--card-bg,white)", cursor: "pointer", transition: "all .15s", marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(124,58,237,.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#c4b5fd"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "#ede9fe", border: "1px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon d="M21 12a9 9 0 11-18 0 9 9 0 0118 0M3.6 9h16.8M3.6 15h16.8" size={18} color="#7c3aed" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{duo.abonado}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#ede9fe", color: "#5b21b6", border: "1px solid #c4b5fd" }}>
            DUO
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#d1e7dd", color: "#0a3622", border: "1px solid #198754" }}>
            Instalación
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
            #{duo.internet.nro_orden} / #{duo.cable.nro_orden}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
          <Icon d={IC.mapPin} size={11} color="var(--text-muted)" />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{duo.direccion}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, background: "#f0f9ff", borderRadius: 7, padding: "6px 10px", border: "1px solid #bae6fd" }}>
            <div style={{ fontSize: 10, color: "#0369a1", fontWeight: 700, marginBottom: 2 }}>
              <Icon d={IC.wifi} size={10} color="#0369a1" /> INTERNET
            </div>
            <div style={{ fontSize: 11, fontFamily: "monospace", color: "#0369a1" }}>{duo.internet.nro_contrato}</div>
          </div>
          <div style={{ flex: 1, background: "#fffbeb", borderRadius: 7, padding: "6px 10px", border: "1px solid #fde68a" }}>
            <div style={{ fontSize: 10, color: "#92400e", fontWeight: 700, marginBottom: 2 }}>
              📺 CABLE/TV
            </div>
            <div style={{ fontSize: 11, fontFamily: "monospace", color: "#92400e" }}>{duo.cable.nro_contrato}</div>
          </div>
        </div>
      </div>
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 12 }}>
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  );
}

function OrdenCard({ orden, onSeleccionar }) {
  const bs    = badgeStyle(orden.servicio);
  const label = labelServicio(orden.servicio);
  return (
    <div onClick={() => onSeleccionar(orden)}
      style={{ padding: "14px 16px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--card-bg,white)", cursor: "pointer", transition: "all .15s", marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)";  e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: bs.bg, border: `1px solid ${bs.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon d={bs.icon} size={18} color={bs.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{orden.abonado}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: bs.bg, color: bs.color, border: `1px solid ${bs.border}` }}>
            {label}
          </span>
          {detectarRed(orden.servicio) === "internet" && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd", display: "flex", alignItems: "center", gap: 4 }}>
              <Icon d={IC.wifi} size={10} color="#0369a1" /> Internet
            </span>
          )}
          {detectarRed(orden.servicio) === "cable" && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
              📺 Cable/TV
            </span>
          )}
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
      </div>
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 12 }}>
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  );
}

export default function TecRegistrarSalida() {
  useOnlineStatus();

  const [inventario,      setInventario]      = useState([]);
  const [misOnus,         setMisOnus]         = useState([]);
  const [catalogoOnus,    setCatalogoOnus]    = useState([]);
  const [recuperados,     setRecuperados]     = useState([]);
  const [ordenes,         setOrdenes]         = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [loadingOrdenes,  setLoadingOrdenes]  = useState(true);

  const [ordenActual,         setOrdenActual]         = useState(null);
  const [items,               setItems]               = useState([]);
  const [fotos,               setFotos]               = useState([]);
  const [comentario,          setComentario]          = useState("");
  const [onuRecogidaPon,      setOnuRecogidaPon]      = useState("");
  const [onuRecogidaProducto, setOnuRecogidaProducto] = useState("");

  const [duoActual,      setDuoActual]      = useState(null);
  const [duoCompletadas, setDuoCompletadas] = useState([]);

  const [saving,       setSaving]       = useState(false);
  const [ubicacion,    setUbicacion]    = useState(null);
  const [loadingUbic,  setLoadingUbic]  = useState(false);
  const [errors,     setErrors]     = useState({});
  const [success,    setSuccess]    = useState(null);
  const [busqueda,   setBusqueda]   = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroRed,  setFiltroRed]  = useState("todas");
  const [vistaOnu,   setVistaOnu]   = useState(false);

  // ── Carga inventario + recuperados ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        if (navigator.onLine) {
          const [inv, onus, catalogo, rec] = await Promise.all([
            tecnicoService.getMiInventario(),
            onuService.getMisOnus(),
            tecnicoService.getCatalogoOnus(),
            recojosService.getMisRecuperados(),
          ]);
          const recuperadosData = Array.isArray(rec) ? rec : [];
          console.log("🔍 inv:", JSON.stringify(inv));
          
          const invData = inv.inventario ?? inv;  // ← Corrección aquí
          setInventario(invData);
          setMisOnus(onus);
          setCatalogoOnus(Array.isArray(catalogo) ? catalogo : []);
          setRecuperados(recuperadosData);
          
          await db.inventario.clear();    
          await db.inventario.bulkPut(invData);  // ← Usar invData
          await db.mis_onus.clear();      
          await db.mis_onus.bulkPut(onus);
          await db.catalogo_onus.clear(); 
          await db.catalogo_onus.bulkPut(Array.isArray(catalogo) ? catalogo : []);
          await db.recuperados.clear();   
          await db.recuperados.bulkPut(recuperadosData);
        
        } else {
          const [inv, onus, cat, rec] = await Promise.all([
            db.inventario.toArray(),
            db.mis_onus.toArray(),
            db.catalogo_onus.toArray(),
            db.recuperados.toArray(),
          ]);
          setInventario(inv);
          setMisOnus(onus);
          setCatalogoOnus(cat);
          setRecuperados(rec);
        }
      } catch {
        const [inv, onus, cat, rec] = await Promise.all([
          db.inventario.toArray(),
          db.mis_onus.toArray(),
          db.catalogo_onus.toArray(),
          db.recuperados.toArray(),
        ]);
        setInventario(inv);
        setMisOnus(onus);
        setCatalogoOnus(cat);
        setRecuperados(rec);
      } finally { setLoading(false); }
    })();
  }, []);

  // ── Carga órdenes ────────────────────────────────────────────────────────────
  const cargarOrdenes = async () => {
    setLoadingOrdenes(true);
    try {
      if (navigator.onLine) {
        const data = await tecnicoService.getOrdenesPendientes();
        setOrdenes(Array.isArray(data) ? data : []);
        await db.ordenes_pendientes?.clear();
        await db.ordenes_pendientes?.bulkPut(Array.isArray(data) ? data : []);
      } else {
        const data = await db.ordenes_pendientes?.toArray().catch(() => []) ?? [];
        setOrdenes(data);
      }
    } catch {
      const data = await db.ordenes_pendientes?.toArray().catch(() => []) ?? [];
      setOrdenes(data);
    } finally { setLoadingOrdenes(false); }
  };

  useEffect(() => { cargarOrdenes(); }, []);

  const recargarInventario = async () => {
    try {
      const [inv, onus, rec] = await Promise.all([
        tecnicoService.getMiInventario(),
        onuService.getMisOnus(),
        recojosService.getMisRecuperados(),
      ]);
      const recuperadosData = Array.isArray(rec) ? rec : [];
      
      const invData = inv.inventario ?? inv;  // ← Corrección aquí
      setInventario(invData);
      setMisOnus(onus);
      setRecuperados(recuperadosData);
      
      await db.inventario.clear();  
      await db.inventario.bulkPut(invData);  // ← Usar invData
      await db.mis_onus.clear();    
      await db.mis_onus.bulkPut(onus);
      await db.recuperados.clear(); 
      await db.recuperados.bulkPut(recuperadosData);
    } catch (error) {
      console.error("Error recargando inventario:", error);
    }
  };

  const seleccionar = async (item) => {
    if (item._esDuo) {
      setDuoActual(item);
      setOrdenActual(null);
      return;
    }
    setOrdenActual(item);
    setDuoActual(null);
    setVistaOnu(false);
    setItems([]); setFotos([]); setComentario("");
    setOnuRecogidaPon(""); setOnuRecogidaProducto("");
    setErrors({});

    const u = (item.servicio ?? "").toUpperCase();
    if (u.includes("INSTALACION") || u.includes("CAMBIO DE EQUIPO")) {
      try {
        const red = await tecnicoService.getOrdenRed(item.id);
        if (red?.ip_local) setOrdenActual({ ...item, ...red });
      } catch {}
    }
  };

  const seleccionarDesdeDuo = async (orden) => {
    setOrdenActual(orden);
    setVistaOnu(false);
    setItems([]); setFotos([]); setComentario("");
    setOnuRecogidaPon(""); setOnuRecogidaProducto("");
    setErrors({});
    const u = (orden.servicio ?? "").toUpperCase();
    if (u.includes("INSTALACION") || u.includes("CAMBIO DE EQUIPO")) {
      try {
        const red = await tecnicoService.getOrdenRed(orden.id);
        if (red?.ip_local) setOrdenActual({ ...orden, ...red });
      } catch {}
    }
  };
  const volver = () => { setOrdenActual(null); setErrors({}); setUbicacion(null); };

  const clasificacion = ordenActual ? clasificarServicio(ordenActual.servicio) : null;
  const esAveria    = clasificacion?.tab === "averia";
  const esCambioOnu = clasificacion?.tipoAveria === "cambio_onu";

  const getOnuId = (its) =>
    its.find(i => inventario.find(p => String(p.producto_id) === String(i.producto_id))?.categoria === "onu")?.onu_id ?? null;

  const validate = () => {
    const e = {};
    for (const item of items) {
      if (item._esRecuperado) continue; // recuperados no necesitan validación adicional
      if (!item.producto_id) { e.items = "Seleccioná un ítem en todos los materiales"; break; }
      const prod = inventario.find(i => String(i.producto_id) === String(item.producto_id));
      if (prod?.categoria === "onu" && !item.onu_id) { e.items = "Seleccioná qué ONU usaste"; break; }
      if (prod?.categoria !== "onu" && (!item.cantidad || item.cantidad <= 0)) { e.items = "Ingresá una cantidad válida"; break; }
    }
    if (esCambioOnu && !onuRecogidaPon.trim()) e.onu_pon = "Ingresá el código PON de la ONU recogida";
    return e;
  };

  const capturarUbicacion = async () => {
    setLoadingUbic(true);
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const pos = await Geolocation.getCurrentPosition({ timeout: 10000 });
      setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (err) {
      alert("No se pudo obtener la ubicación: " + err.message);
    } finally {
      setLoadingUbic(false);
    }
  };

  const handleRegistrar = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setSaving(true);
    try {
      // Separar items normales de recuperados
      const itemsNormales   = items.filter(i => !i._esRecuperado &&
        inventario.find(p => String(p.producto_id) === String(i.producto_id))?.categoria !== "onu"
      );
      const itemsRecuperados = items.filter(i => i._esRecuperado);
      const onuId = getOnuId(items);

      if (navigator.onLine) {
        const fd = new FormData();
        fd.append("items",      JSON.stringify(itemsNormales));
        fd.append("comentario", comentario || "");
        if (onuId) fd.append("onu_id", onuId);
        if (ubicacion) {
          fd.append("lat", ubicacion.lat);
          fd.append("lng", ubicacion.lng);
        }
        if (esCambioOnu) {
          fd.append("onu_recogida_codigo_pon",  onuRecogidaPon.trim());
          fd.append("onu_recogida_producto_id", onuRecogidaProducto || "");
        }
        fotos.forEach(f => fd.append("fotos", f.file));

        const res = await tecnicoService.completarOrden(ordenActual.id, fd);

        // Marcar materiales recuperados como usados
        // Marcar materiales recuperados como usados
        await Promise.allSettled(
          itemsRecuperados.map(async (i) => {
            try {
              await recojosService.marcarUsado(i.recuperado_id);
              await db.recuperados.delete(i.recuperado_id);
            } catch {}
          })
        );

        setSuccess(res?.codigo || "OK");
      } else {
        const payload = {
          orden_id:   ordenActual.id,
          items:      JSON.stringify(itemsNormales),
          comentario: comentario || "",
          ...(onuId && { onu_id: onuId }),
          ...(esCambioOnu && {
            onu_recogida_codigo_pon:  onuRecogidaPon.trim(),
            onu_recogida_producto_id: onuRecogidaProducto || "",
          }),
        };
        const localId = await db.salidas_pendientes.add({
          tipo: esAveria ? "averia" : "activacion", payload,
          syncStatus: "pending", creadoEn: new Date().toISOString(),
        });
        for (const foto of fotos) {
          const base64 = await fileToBase64(foto.file);
          await db.fotos_pendientes.add({
            salidaLocalId: localId, base64,
            filename: foto.file.name, mime: foto.file.type,
          });
        }
        for (const item of itemsNormales) {
          const local = await db.inventario.where("producto_id").equals(Number(item.producto_id)).first();
          if (local) await db.inventario.update(local.id, { disponible: local.disponible - Number(item.cantidad) });
        }
        setSuccess("OFFLINE");
      }

      // Eliminar solo la orden recién completada (no la otra del duo)
      setOrdenes(prev => prev.filter(o => o.id !== ordenActual.id));

      if (duoActual) {
        const nuevasCompletadas = [...duoCompletadas, ordenActual.id];
        setDuoCompletadas(nuevasCompletadas);
        try { await db.duo_estado.put({ clave: duoActual.clave, completadas: nuevasCompletadas }); } catch {}

        const ambasListas = nuevasCompletadas.includes(duoActual.internet.id) &&
                            nuevasCompletadas.includes(duoActual.cable.id);

        if (ambasListas) {
          setDuoActual(null);
          setDuoCompletadas([]);
          try { await db.duo_estado.delete(duoActual.clave); } catch {}
          setOrdenActual(null);
          setItems([]); setFotos([]); setComentario("");
          setOnuRecogidaPon(""); setOnuRecogidaProducto("");
          setUbicacion(null);
        } else {
          // Solo una completada → volver al selector del duo para que el técnico elija la otra
          setItems([]); setFotos([]); setComentario("");
          setOnuRecogidaPon(""); setOnuRecogidaProducto("");
          setUbicacion(null);
          setOrdenActual(null);
        }

        setTimeout(() => setSuccess(null), 6000);
        return;
      }

      setOrdenActual(null);
      setItems([]); setFotos([]); setComentario("");
      setOnuRecogidaPon(""); setOnuRecogidaProducto("");
      setTimeout(() => setSuccess(null), 6000);
      if (navigator.onLine) await recargarInventario();
    } catch (err) {
      alert(err.message);
    } finally { setSaving(false); }
  };

  const ordenesFiltradas = ordenes.filter(o => {
    const c = clasificarServicio(o.servicio);
    if (c.tab === "recojo") return false; // ← las de retiro van a TecRecojos

    const red = detectarRed(o.servicio);
    const matchRed =
      filtroRed === "todas" ||
      (filtroRed === "internet" && red === "internet") ||
      (filtroRed === "cable"    && red === "cable");

    const q = busqueda.toLowerCase();
    const matchQ = !q ||
      o.abonado?.toLowerCase().includes(q) ||
      o.direccion?.toLowerCase().includes(q) ||
      o.nro_contrato?.toLowerCase().includes(q) ||
      String(o.nro_orden).includes(q);

    const matchT =
      filtroTipo === "todos" ||
      (filtroTipo === "averia"     && c.tab === "averia"  && c.tipoAveria !== "cambio_onu") ||
      (filtroTipo === "cambio_onu" && c.tipoAveria === "cambio_onu") ||
      (filtroTipo === "activacion" && c.tab === "activacion");

    return matchRed && matchQ && matchT;
  });

  useEffect(() => {
    (async () => {
      if (!duoActual) return;
      try {
        const saved = await db.duo_estado.get(duoActual.clave);
        if (saved?.completadas) setDuoCompletadas(saved.completadas);
      } catch {}
    })();
  }, [duoActual?.clave]);

  const ordenesParaMostrar = agruparDuos(ordenesFiltradas);

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando...</div>;

  // ══ SELECTOR DUO ══
  if (duoActual && !ordenActual) {
    const internetLista = duoCompletadas.includes(duoActual.internet.id);
    const cableLista    = duoCompletadas.includes(duoActual.cable.id);
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <button type="button" className="btn btn-outline btn-sm"
          onClick={() => { setDuoActual(null); setDuoCompletadas([]); }}
          style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon d={IC.arrowLeft} size={14} /> Volver al listado
        </button>

        {success && (
          <div className="alert alert-success" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <Icon d={IC.check} size={16} color="var(--success)" />
            <div>
              <strong>Registrado correctamente</strong>
              <div style={{ fontSize: 13, marginTop: 2 }}>Ahora registrá el siguiente servicio</div>
            </div>
          </div>
        )}

        <div className="card">
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", background: "#faf5ff", borderRadius: "12px 12px 0 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: "white", border: "1px solid #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon d="M21 12a9 9 0 11-18 0 9 9 0 0118 0M3.6 9h16.8M3.6 15h16.8" size={17} color="#7c3aed" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#5b21b6" }}>
                  Instalación DUO — {duoActual.abonado}
                </div>
                <div style={{ fontSize: 12, color: "#7c3aed", opacity: 0.8 }}>
                  {duoActual.direccion}
                  {(internetLista || cableLista) && (
                    <span style={{ marginLeft: 8, fontWeight: 600 }}>
                      · {internetLista && cableLista ? "2" : "1"}/2 completada{internetLista && cableLista ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {(internetLista || cableLista) && (
              <div style={{ marginTop: 10 }}>
                <div style={{ height: 4, background: "#ede9fe", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: internetLista && cableLista ? "100%" : "50%", background: "#7c3aed", borderRadius: 2, transition: "width .4s" }} />
                </div>
              </div>
            )}
          </div>

          {[
            { orden: duoActual.internet, lista: internetLista, label: "Internet FTTH", bg: "#f0f9ff", border: "#bae6fd", color: "#0369a1", icon: IC.wifi },
            { orden: duoActual.cable,    lista: cableLista,    label: "Cable/TV",      bg: "#fffbeb", border: "#fde68a", color: "#92400e", icon: IC.repeat },
          ].map(({ orden, lista, label, bg, border, color, icon }) => (
            <div key={orden.id} style={{
              padding: "14px 16px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: 12,
              opacity: lista ? 0.55 : 1,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {lista
                  ? <Icon d={IC.check} size={16} color="#065f46" />
                  : <Icon d={icon} size={16} color={color} />
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: lista ? "var(--text-muted)" : "var(--text)" }}>{label}</div>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)" }}>
                  {orden.nro_contrato} · Orden #{orden.nro_orden}
                </div>
              </div>
              {lista
                ? <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7" }}>
                    <Icon d={IC.check} size={10} color="#065f46" /> Listo
                  </span>
                : <button className="btn btn-primary btn-sm"
                    onClick={() => seleccionarDesdeDuo(orden)}
                    style={{ minWidth: 90 }}>
                    Empezar
                  </button>
              }
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ══ LISTADO ══
  if (!ordenActual) return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {success && (
        <div className="alert alert-success" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <Icon d={IC.check} size={16} color="var(--success)" />
          <div>
            <strong>{success === "OFFLINE" ? "Guardado sin conexión" : "Registrado correctamente"}</strong>
            {success === "OFFLINE"
              ? <div style={{ fontSize: 13, marginTop: 2, color: "var(--text-muted)" }}>Se subirá cuando haya internet</div>
              : <div style={{ fontSize: 13, marginTop: 2 }}>Código: <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{success}</span></div>
            }
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 2 }}>Servicios pendientes</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Seleccioná el servicio que vas a realizar</div>
      </div>

      {/* Badge materiales recuperados en mano */}
      {recuperados.length > 0 && (
        <div style={{
          marginBottom: 14, padding: "8px 12px",
          background: "#faf5ff", borderRadius: 8,
          border: "1px solid #e9d5ff",
          display: "flex", alignItems: "center", gap: 8, fontSize: 13,
        }}>
          <Icon d={IC.recycle} size={14} color="#7c3aed" />
          <span style={{ color: "#7c3aed", fontWeight: 600 }}>
            {recuperados.length} material{recuperados.length !== 1 ? "es" : ""} recuperado{recuperados.length !== 1 ? "s" : ""} en tu poder
          </span>
          <span style={{ color: "#9ca3af", fontSize: 12 }}>— disponibles para usar en tus órdenes</span>
        </div>
      )}

      <div style={{ position: "relative", marginBottom: 10 }}>
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

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {/* Filtro red */}
        <div style={{ display: "flex", gap: 4, padding: "3px", borderRadius: 22, background: "var(--hover)", border: "1px solid var(--border)" }}>
          {[
            { key: "todas",    label: "Todas"      },
            { key: "internet", label: "🌐 Internet" },
            { key: "cable",    label: "📺 Cable"    },
          ].map(f => (
            <button key={f.key} type="button" onClick={() => setFiltroRed(f.key)}
              style={{ padding: "4px 12px", borderRadius: 18, fontSize: 12, fontWeight: 600, border: "none", background: filtroRed === f.key ? "white" : "transparent", color: filtroRed === f.key ? "var(--text)" : "var(--text-muted)", cursor: "pointer", transition: "all .15s", boxShadow: filtroRed === f.key ? "0 1px 4px rgba(0,0,0,.1)" : "none" }}>
              {f.label}
            </button>
          ))}
        </div>
        {[
          { key: "todos",      label: "Todos"         },
          { key: "averia",     label: "Averías"       },
          { key: "cambio_onu", label: "Cambio de ONU" },
          { key: "activacion", label: "Instalaciones" },
        ].map(f => (
          <button key={f.key} type="button" onClick={() => setFiltroTipo(f.key)}
            style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "1.5px solid", borderColor: filtroTipo === f.key ? "var(--primary)" : "var(--border)", background: filtroTipo === f.key ? "var(--primary)" : "white", color: filtroTipo === f.key ? "white" : "var(--text-muted)", cursor: "pointer", transition: "all .15s" }}>
            {f.label}
          </button>
        ))}
        <button type="button" onClick={cargarOrdenes}
          style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "1.5px solid var(--border)", background: "white", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <Icon d={IC.refresh} size={12} /> Actualizar
        </button>
      </div>

      {loadingOrdenes ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>Cargando órdenes...</div>
      ) : ordenesFiltradas.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
          <Icon d={IC.list} size={32} color="var(--border)" />
          <div style={{ marginTop: 10, fontSize: 14 }}>
            {ordenes.length === 0
              ? "No hay órdenes pendientes. El administrador debe cargar el Excel."
              : "No hay resultados para esa búsqueda."}
          </div>
        </div>
      ) : ordenesParaMostrar.map(o =>
        o._esDuo
          ? <DuoCard key={o.clave} duo={o} onSeleccionar={seleccionar} />
          : <OrdenCard key={o.id} orden={o} onSeleccionar={seleccionar} />
      )}
    </div>
  );

  // ══ VISTA ONU ══
  if (vistaOnu) {
    return <TecConfigurarONU ordenActual={ordenActual} onVolver={() => setVistaOnu(false)} />;
  }

  const bs    = badgeStyle(ordenActual.servicio);
  const label = labelServicio(ordenActual.servicio);

  // ══ FORMULARIO ══
  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <button type="button" className="btn btn-outline btn-sm"
        onClick={volver} style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon d={IC.arrowLeft} size={14} /> Volver al listado
      </button>

      <div className="card">
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", background: bs.bg, borderRadius: "12px 12px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: "white", border: `1px solid ${bs.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon d={bs.icon} size={17} color={bs.color} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: bs.color }}>{label} — Orden #{ordenActual.nro_orden}</div>
              <div style={{ fontSize: 12, color: bs.color, opacity: 0.8 }}>{ordenActual.tecnologia} · {ordenActual.sector}</div>
            </div>
          </div>
        </div>

        {/* Datos del cliente */}
        <div style={{ padding: "12px 16px", background: "var(--hover)", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            Datos del cliente
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Abonado</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{ordenActual.abonado}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Doc. Identidad</div>
              <div style={{ fontSize: 13 }}>{ordenActual.doc_identidad || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Teléfono</div>
              <div style={{ fontSize: 13 }}>{ordenActual.telefono || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Nº Contrato</div>
              <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color: "var(--primary)" }}>
                {ordenActual.nro_contrato}
              </div>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Dirección</div>
              <div style={{ fontSize: 13 }}>{ordenActual.direccion}</div>
            </div>
            {ordenActual.referencia && (
              <div style={{ gridColumn: "1/-1" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Referencia</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{ordenActual.referencia}</div>
              </div>
            )}
          </div>
          {limpiarTelefono(ordenActual.telefono) && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "white", borderRadius: 8, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>¿Vas en camino?</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Avisá al cliente antes de llegar</div>
              </div>
              <BtnWhatsApp telefono={ordenActual.telefono} servicio={ordenActual.servicio} abonado={ordenActual.abonado} />
            </div>
          )}
          {ordenActual.observacion && (
            <div style={{ marginTop: 10, padding: "7px 10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 7, fontSize: 12, color: "#78350f" }}>
              <span style={{ fontWeight: 700 }}>Nota: </span>{ordenActual.observacion}
            </div>
          )}
        </div>

        {/* Datos de red */}
        {(!esAveria || esCambioOnu) && (
          <div style={{ padding: "12px 16px", background: "#f0fdf4", borderBottom: "1px solid #bbf7d0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon d={IC.server} size={12} color="#166534" /> Datos de red
            </div>
            {ordenActual.ip_local ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 16px" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#166534" }}>IP local</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "#14532d" }}>{ordenActual.ip_local}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#166534" }}>Máscara</div>
                  <div style={{ fontSize: 13, fontFamily: "monospace", color: "#14532d" }}>{ordenActual.mascara || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#166534" }}>Gateway</div>
                  <div style={{ fontSize: 13, fontFamily: "monospace", color: "#14532d" }}>{ordenActual.gateway || "—"}</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#166534", opacity: 0.7, fontStyle: "italic" }}>
                Sin IP asignada — el administrador aún no cargó los datos de red.
              </div>
            )}
          </div>
        )}

        {/* Formulario */}
        <div style={{ padding: 16 }}>
          {(!esAveria || esCambioOnu) && ordenActual.ip_local && (
            <div style={{ marginBottom: 16 }}>
              <button type="button" className="btn btn-outline btn-full"
                onClick={() => setVistaOnu(true)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderColor: "var(--primary)", color: "var(--primary)", minHeight: 44 }}>
                <Icon d={IC.wifi} size={15} />
                Configurar ONU automáticamente
              </button>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Materiales utilizados{" "}
              <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(opcional)</span>
            </label>
            <ItemSelector
              inventario={inventario}
              misOnus={misOnus}
              recuperados={recuperados}
              items={items}
              onChange={setItems}
            />
            {errors.items && <div className="form-error" style={{ marginTop: 6 }}>{errors.items}</div>}
          </div>

          {esCambioOnu && (
            <div className="form-group">
              <label className="form-label">Código PON de la ONU recogida *</label>
              <input className={`form-input ${errors.onu_pon ? "error" : ""}`}
                placeholder="Ej: ZTEG-AB123456"
                value={onuRecogidaPon}
                onChange={e => { setOnuRecogidaPon(e.target.value); if (errors.onu_pon) setErrors(p => ({ ...p, onu_pon: null })); }}
                style={{ fontSize: 14, fontFamily: "monospace" }} />
              {errors.onu_pon && <div className="form-error">{errors.onu_pon}</div>}
              <div style={{ marginTop: 8 }}>
                <label className="form-label" style={{ fontSize: 12 }}>
                  Modelo <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(si no está registrado)</span>
                </label>
                <select className="form-input" value={onuRecogidaProducto}
                  onChange={e => setOnuRecogidaProducto(e.target.value)} style={{ fontSize: 14 }}>
                  <option value="">Sin modelo / ya registrada</option>
                  {catalogoOnus.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                Código que figura en la etiqueta física de la ONU que retirás del cliente
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Comentario <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(opcional)</span>
            </label>
            <textarea className="form-input"
              placeholder={esAveria ? "Ej: Puerto WAN dañado, se reemplazó ONU..." : "Observaciones del trabajo..."}
              rows={3} value={comentario} onChange={e => setComentario(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">
              Fotos <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(hasta 5)</span>
            </label>
            <MultiPhotoUploader fotos={fotos} onChange={setFotos} />
          </div>

          <div className="form-group">
            <label className="form-label">
              Ubicación <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(opcional)</span>
            </label>
            {ubicacion ? (
              <div style={{
                padding: "8px 12px", borderRadius: 8,
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <Icon d={IC.mapPin} size={14} color="#16a34a" />
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "#166534", flex: 1 }}>
                  {ubicacion.lat.toFixed(6)}, {ubicacion.lng.toFixed(6)}
                </span>
                <button type="button" onClick={() => setUbicacion(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <Icon d={IC.x} size={13} color="#16a34a" />
                </button>
              </div>
            ) : (
              <button type="button" className="btn btn-outline btn-full"
                onClick={capturarUbicacion} disabled={loadingUbic}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 44 }}>
                <Icon d={IC.mapPin} size={15} />
                {loadingUbic ? "Obteniendo ubicación..." : "Registrar mi ubicación actual"}
              </button>
            )}
          </div>

          <button className="btn btn-primary btn-lg btn-full"
            onClick={handleRegistrar} disabled={saving}
            style={{ marginTop: 8, minHeight: 48 }}>
            <Icon d={IC.check} size={16} />
            {saving ? "Registrando..." : `Registrar ${label.toLowerCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
