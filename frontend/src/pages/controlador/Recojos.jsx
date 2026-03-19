import { useState, useEffect } from "react";
import Modal from "../../components/ui/Modal";
import recojosService from "../../services/recojosService";
import stockService from "../../services/stockService";
import api from "../../services/api";

const BASE_URL = import.meta.env.VITE_API_URL.replace("/api", "");

const TIPOS_EQUIPO = ["ONU", "Triplexor", "Roseta", "Patchcord", "Otro"];

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
  plus:   "M12 5v14 M5 12h14",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  check:  "M20 6L9 17l-5-5",
  image:  "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 19",
};

const emptyForm = { tecnico_id: "", cliente: "", direccion: "", serie: "", tipo_equipo: "" };

// Equipos que no requieren serie
const SIN_SERIE = ["Roseta", "Patchcord", "Triplexor"];

export default function CtrlRecojos() {
  const [ordenes,  setOrdenes]  = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [modal,    setModal]    = useState(false);
  const [search,   setSearch]   = useState("");
  const [form,     setForm]     = useState(emptyForm);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    Promise.all([recojosService.getAll(), stockService.getStats()])
      .then(([dataOrdenes, dataStats]) => {
        setOrdenes(dataOrdenes);
        setTecnicos(dataStats.misTecnicos);
        setLoading(false);
      })
      .catch(() => { setError("No se pudieron cargar los recojos"); setLoading(false); });
  }, []);

  const filtered = ordenes.filter(o =>
    (o.cliente ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (o.serie ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (o.tecnico ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (o.tipo_equipo ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const requiereSerie = form.tipo_equipo && !SIN_SERIE.includes(form.tipo_equipo);

  const handleCrear = async () => {
    setSaving(true);
    try {
      const nueva = await recojosService.create({
        tecnico_id:  Number(form.tecnico_id),
        cliente:     form.cliente || null,
        direccion:   form.direccion || null,
        serie:       requiereSerie ? form.serie : null,
        tipo_equipo: form.tipo_equipo,
      });
      const tecnico = tecnicos.find(t => t.id === Number(form.tecnico_id));
      setOrdenes(prev => [{ ...nueva, tecnico: tecnico?.nombre ?? "—" }, ...prev]);
      setModal(false);
      setForm(emptyForm);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarcarRecogido = async (id) => {
    try {
      await api.patchForm(`/recojos/${id}`, new FormData());
      setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado: "recogido" } : o));
    } catch (err) {
      alert(err.message);
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: e => setForm(prev => ({ ...prev, [key]: e.target.value }))
  });

  const formValido = form.tecnico_id && form.tipo_equipo &&
    (!requiereSerie || form.serie.trim() !== "");

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando recojos...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <Icon d={IC.search} size={16} color="var(--text-muted)" />
          <input
            placeholder="Buscar por cliente, serie, equipo o técnico..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Icon d={IC.plus} size={15} />
          Nueva orden
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Técnico</th>
                <th>Cliente</th>
                <th>Dirección</th>
                <th>Equipo</th>
                <th>Serie</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    Sin órdenes de recojo
                  </td>
                </tr>
              ) : filtered.map(o => (
                <tr key={o.id}>
                  <td className="fw-600">{o.tecnico}</td>
                  <td>{o.cliente ?? "—"}</td>
                  <td className="text-sm">{o.direccion ?? "—"}</td>
                  <td>
                    <span className="badge badge-blue">{o.tipo_equipo ?? "—"}</span>
                  </td>
                  <td><span className="mono">{o.serie ?? "—"}</span></td>
                  <td className="text-sm text-muted">{formatFecha(o.created_at)}</td>
                  <td>
                    <span className={`badge badge-${o.estado === "pendiente" ? "warning" : "active"}`}>
                      {o.estado === "pendiente" ? "Pendiente" : "Recogido"}
                    </span>
                  </td>
                  <td>
                    {o.estado === "pendiente" ? (
                      <button className="btn btn-outline btn-sm" onClick={() => handleMarcarRecogido(o.id)}>
                        <Icon d={IC.check} size={13} />
                        Marcar recogido
                      </button>
                    ) : (
                      o.foto
                        ? <a href={`${BASE_URL}/uploads/${o.foto}`} target="_blank" rel="noreferrer"
                            className="btn btn-outline btn-sm">
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

      {modal && (
        <Modal
          title="Nueva orden de recojo"
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleCrear} disabled={saving || !formValido}>
                {saving ? "Creando..." : "Crear orden"}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Técnico *</label>
            <select className="form-input" {...field("tecnico_id")}>
              <option value="">Seleccionar técnico</option>
              {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Tipo de equipo *</label>
            <select className="form-input" {...field("tipo_equipo")}>
              <option value="">Seleccionar equipo...</option>
              {TIPOS_EQUIPO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {requiereSerie && (
            <div className="form-group">
              <label className="form-label">Número de serie *</label>
              <input className="form-input" placeholder="Ej: ONU-88721" {...field("serie")} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Cliente</label>
            <input className="form-input" placeholder="Nombre del cliente" {...field("cliente")} />
          </div>

          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input className="form-input" placeholder="Dirección del recojo" {...field("direccion")} />
          </div>
        </Modal>
      )}
    </div>
  );
}