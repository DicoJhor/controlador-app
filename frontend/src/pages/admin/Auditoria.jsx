import { useState, useEffect } from "react";
import { Badge, MotivoBadge } from "../../components/ui/Badge";
import { formatDate } from "../../utils/formatters";
import auditoriaService from "../../services/auditoriaService";
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
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  comment:  "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
};

export default function AdminAuditoria() {
  const [movimientos,  setMovimientos]  = useState([]);
  const [sedes,        setSedes]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [filterSede,   setFilterSede]   = useState("todas");
  const [filterTipo,   setFilterTipo]   = useState("todos");
  const [filterMotivo, setFilterMotivo] = useState("todos");

  useEffect(() => {
    Promise.all([
      auditoriaService.getAll(),
      sedesService.getAll()
    ])
      .then(([dataMovimientos, dataSedes]) => {
        setMovimientos(dataMovimientos);
        setSedes(dataSedes);
        setLoading(false);
      })
      .catch(() => {
        setError("No se pudieron cargar los movimientos");
        setLoading(false);
      });
  }, []);

  const filtered = movimientos.filter(m => {
    const matchSearch  = (m.item ?? "").toLowerCase().includes(search.toLowerCase()) ||
                         (m.usuario ?? "").toLowerCase().includes(search.toLowerCase());
    const matchSede    = filterSede   === "todas" || m.sede === filterSede;
    const matchTipo    = filterTipo   === "todos" || m.tipo === filterTipo;
    const matchMotivo  = filterMotivo === "todos" || m.motivo === filterMotivo;
    return matchSearch && matchSede && matchTipo && matchMotivo;
  });

  const handleExportar = () => {
    if (filtered.length === 0) return;
    const headers = ["Fecha", "Tipo", "Ítem", "Cantidad", "Sede", "Usuario", "Rol", "Motivo", "Comentario"];
    const rows = filtered.map(m => [
      formatDate(m.fecha), m.tipo, m.item, m.cantidad,
      m.sede ?? "", m.usuario ?? "", m.rol ?? "",
      m.motivo ?? "", m.comentario ?? ""
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `auditoria_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Cargando movimientos...</div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Icon d={IC.search} size={16} color="var(--text-muted)" />
          <input
            placeholder="Buscar por ítem o usuario..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={filterSede} onChange={e => setFilterSede(e.target.value)}>
          <option value="todas">Todas las sedes</option>
          {sedes.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
        </select>
        <select className="filter-select" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option value="todos">Entrada y salida</option>
          <option value="entrada">Solo entradas</option>
          <option value="salida">Solo salidas</option>
        </select>
        <select className="filter-select" value={filterMotivo} onChange={e => setFilterMotivo(e.target.value)}>
          <option value="todos">Todos los motivos</option>
          <option value="nueva_conexion">Nueva conexión</option>
          <option value="averia">Avería</option>
          <option value="mantenimiento">Mantenimiento</option>
          <option value="compra">Compra</option>
          <option value="reposicion">Reposición</option>
          <option value="transferencia">Transferencia</option>
          <option value="instalacion">Instalación</option>
        </select>
        <button className="btn btn-outline" onClick={handleExportar}>
          <Icon d={IC.download} size={15} />
          Exportar
        </button>
      </div>

      {/* Contador */}
      <div style={{ marginBottom: 12, fontSize: 13, color: "var(--text-muted)" }}>
        {filtered.length} registro(s) encontrado(s)
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Ítem</th>
                <th>Cant.</th>
                <th>Sede</th>
                <th>Usuario</th>
                <th>Motivo</th>
                <th>Comentario</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    Sin registros con los filtros aplicados
                  </td>
                </tr>
              ) : filtered.map((m, i) => (
                <tr key={i}>
                  <td className="text-sm text-muted" style={{ whiteSpace: "nowrap" }}>
                    {formatDate(m.fecha)}
                  </td>
                  <td>
                    <Badge variant={m.tipo === "entrada" ? "entrada" : "salida"}>
                      {m.tipo}
                    </Badge>
                  </td>
                  <td className="fw-600">{m.item}</td>
                  <td className="mono">{m.cantidad}</td>
                  <td className="text-sm">{m.sede ?? "—"}</td>
                  <td>
                    <div className="fw-600" style={{ fontSize: 13 }}>{m.usuario ?? "—"}</div>
                    <div className="text-sm text-muted" style={{ textTransform: "capitalize" }}>
                      {m.rol ?? ""}
                    </div>
                  </td>
                  <td>
                    {m.motivo
                      ? <MotivoBadge motivo={m.motivo} />
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td>
                    {m.comentario ? (
                      <div style={styles.comentario}>
                        <Icon d={IC.comment} size={12} color="var(--text-muted)" />
                        <span className="text-sm">{m.comentario}</span>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  comentario: {
    display: "flex",
    alignItems: "flex-start",
    gap: 5,
    maxWidth: 200,
    color: "var(--text-secondary)",
  },
};