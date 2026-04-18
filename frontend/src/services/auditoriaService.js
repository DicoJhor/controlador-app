import api from "./api"

const auditoriaService = {
  getAll:      () => api.get("/auditoria"),
  getEnvios:   () => api.get("/envios"),              // ← trae todos
  getEnvio:    (id) => api.get(`/envios/${id}`),
  editarEnvio: (id, data) => api.put(`/envios/${id}`, data),
}

export default auditoriaService