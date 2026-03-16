import { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import tecnicoService from "../../services/tecnicoService";
import api from "../../services/api";

const BASE_URL = import.meta.env.VITE_API_URL.replace("/api", "");

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
  check: "M20 6L9 17l-5-5",
  image: "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 19",
};

export default function TecRecojos() {
  const [ordenes,    setOrdenes]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [comentario, setComentario] = useState("");
  const [foto,       setFoto]       = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    tecnicoService.getMisRecojos()
      .then(data => { setOrdenes(data); setLoading(false); })
      .catch(() => { setError("No se pudieron cargar los recojos"); setLoading(false); });
  }, []);

  const handleFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const confirmar = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      if (comentario) formData.append("comentario", comentario);
      if (foto) formData.append("foto", foto);

      await api.patchForm(`/tecnico/recojos/${selected.id}`, formData);

      setOrdenes(prev => prev.map(o =>
        o.id === selected.id
          ? { ...o, estado: "recogido", comentario, foto: foto?.name }
          : o
      ));
      setSelected(null);
      setComentario("");
      setFoto(null);
      setPreview(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const abrirModal = (o) => {
    setSelected(o);
    setComentario("");
    setFoto(null);
    setPreview(null);
  };

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando recojos...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Órdenes de recojo</div>
            <div className="card-subtitle">Equipos que debés recoger</div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Dirección</th>
                <th>Serie ONU</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {ordenes.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    Sin órdenes de recojo
                  </td>
                </tr>
              ) : ordenes.map(o => (
                <tr key={o.id}>
                  <td className="fw-600">{o.cliente ?? "—"}</td>
                  <td className="text-sm">{o.direccion ?? "—"}</td>
                  <td><span className="mono">{o.serie}</span></td>
                  <td className="text-sm text-muted">{formatFecha(o.created_at)}</td>
                  <td>
                    <span className={`badge badge-${o.estado === "pendiente" ? "warning" : "active"}`}>
                      {o.estado === "pendiente" ? "Pendiente" : "Recogido"}
                    </span>
                  </td>
                  <td>
                    {o.estado === "pendiente" ? (
                      <button className="btn btn-primary btn-sm" onClick={() => abrirModal(o)}>
                        Confirmar
                      </button>
                    ) : (
                      o.foto
                        ? 
                        <a
                            href={`${BASE_URL}/uploads/${o.foto}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline btn-sm"
                          >
                            <Icon d={IC.image} size={13} />
                            Ver foto
                          </a>
                        : null
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal
          title="Confirmar recojo"
          onClose={() => setSelected(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setSelected(null)} disabled={saving}>
                Cancelar
              </button>
              <button className="btn btn-success" onClick={confirmar} disabled={saving}>
                <Icon d={IC.check} size={14} />
                {saving ? "Confirmando..." : "Confirmar recojo"}
              </button>
            </>
          }
        >
          <div style={{ marginBottom: 12 }}>
            <div className="text-sm text-muted">Cliente</div>
            <div className="fw-600">{selected.cliente}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className="text-sm text-muted">Serie ONU</div>
            <div className="mono fw-600">{selected.serie}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Comentario <span>(opcional)</span></label>
            <textarea
              className="form-input"
              placeholder="Ej: Equipo en buen estado, cliente firmó conformidad..."
              value={comentario}
              onChange={e => setComentario(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Foto del equipo <span>(opcional)</span></label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="form-input"
              onChange={handleFoto}
            />
            {preview && (
              <div style={{ marginTop: 10 }}>
                <img
                  src={preview}
                  alt="preview"
                  style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, objectFit: "cover" }}
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}