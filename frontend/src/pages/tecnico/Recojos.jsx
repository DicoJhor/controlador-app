import { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import tecnicoService from "../../services/tecnicoService";

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace("/api", "");
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
  image:  "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 19",
  x:      "M18 6L6 18 M6 6l12 12",
};

// ── Uploader de fotos múltiples ────────────────────────────────────────────
function MultiPhotoUploader({ fotos, onChange, maxFotos = 5 }) {
  const handleAdd = (e) => {
    const files  = Array.from(e.target.files);
    const libres = maxFotos - fotos.length;
    const nuevas = files.slice(0, libres).map(f => ({
      file:    f,
      preview: URL.createObjectURL(f),
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
            <button
              type="button"
              style={mps.removeBtn}
              onClick={() => onChange(fotos.filter((_, i) => i !== idx))}
            >
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
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              style={{ display: "none" }}
              onChange={handleAdd}
            />
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

// ── Componente principal ───────────────────────────────────────────────────
export default function TecRecojos() {
  const [ordenes,    setOrdenes]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [comentario, setComentario] = useState("");
  const [fotos,      setFotos]      = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [lastCodigo, setLastCodigo] = useState(null);

  useEffect(() => {
    tecnicoService.getMisRecojos()
      .then(data => { setOrdenes(data); setLoading(false); })
      .catch(() => { setError("No se pudieron cargar los recojos"); setLoading(false); });
  }, []);

  const abrirModal = (o) => {
    setSelected(o);
    setComentario("");
    setFotos([]);
    setLastCodigo(null);
  };

  const confirmar = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      if (comentario) fd.append("comentario", comentario);
      fotos.forEach(f => fd.append("fotos", f.file));

      const res = await tecnicoService.confirmarRecojo(selected.id, fd);

      setOrdenes(prev => prev.map(o =>
        o.id === selected.id
          ? { ...o, estado: "recogido", comentario, codigo: res?.codigo, fotos: fotos.map(f => ({ ruta: f.preview })) }
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

  const pendientes  = ordenes.filter(o => o.estado === "pendiente");
  const completados = ordenes.filter(o => o.estado === "recogido");

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
            {pendientes.map(o => (
              <div key={o.id} style={cs.orderCard}>
                <div style={cs.orderTop}>
                  <div>
                    <span className="badge badge-blue" style={{ marginBottom: 4 }}>{o.tipo_equipo ?? "—"}</span>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{o.cliente ?? "—"}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{o.direccion ?? "—"}</div>
                    {o.serie && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, fontFamily: "monospace" }}>
                        Serie: {o.serie}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                      {formatFecha(o.created_at)}
                    </div>
                    <span className="badge badge-warning">Pendiente</span>
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-full"
                  style={{ marginTop: 12, minHeight: 44 }}
                  onClick={() => abrirModal(o)}
                >
                  <Icon d={IC.check} size={15} />
                  Confirmar recojo
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
            {completados.map(o => (
              <div key={o.id} style={{ ...cs.orderCard, opacity: 0.85 }}>
                <div style={cs.orderTop}>
                  <div>
                    {o.codigo && (
                      <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--primary)", fontWeight: 700, marginBottom: 4 }}>
                        {o.codigo}
                      </div>
                    )}
                    <span className="badge badge-blue" style={{ marginBottom: 4 }}>{o.tipo_equipo ?? "—"}</span>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{o.cliente ?? "—"}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{o.direccion ?? "—"}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                      {formatFecha(o.created_at)}
                    </div>
                    <span className="badge badge-active">Recogido</span>
                  </div>
                </div>
                {/* Miniaturas de fotos */}
                {o.fotos?.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    {o.fotos.map((f, i) => (
                      <a key={i} href={`${BASE_URL}/uploads/${f.ruta}`} target="_blank" rel="noreferrer">
                        <img
                          src={`${BASE_URL}/uploads/${f.ruta}`}
                          alt=""
                          style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }}
                        />
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
        <Modal
          title="Confirmar recojo"
          onClose={() => setSelected(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setSelected(null)} disabled={saving}>
                Cancelar
              </button>
              <button className="btn btn-success" onClick={confirmar} disabled={saving} style={{ minHeight: 44 }}>
                <Icon d={IC.check} size={14} />
                {saving ? "Confirmando..." : "Confirmar recojo"}
              </button>
            </>
          }
        >
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Cliente</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.cliente ?? "—"}</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Tipo de equipo</div>
            <span className="badge badge-blue">{selected.tipo_equipo ?? "—"}</span>
          </div>
          {selected.serie && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Serie</div>
              <div style={{ fontFamily: "monospace", fontWeight: 700 }}>{selected.serie}</div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Comentario <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(opcional)</span></label>
            <textarea
              className="form-input"
              placeholder="Ej: Equipo en buen estado..."
              rows={2}
              value={comentario}
              onChange={e => setComentario(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fotos <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(hasta 5)</span></label>
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
  dot: (color) => ({
    width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0,
  }),
  cardList: { display: "flex", flexDirection: "column", gap: 12 },
  orderCard: {
    background: "white", border: "1px solid var(--border)",
    borderRadius: 12, padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,.06)",
  },
  orderTop: { display: "flex", justifyContent: "space-between", gap: 12 },
};