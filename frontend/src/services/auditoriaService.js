import api from "./api"

const auditoriaService = {
  getAll:              () => api.get("/auditoria"),
  getEnvios:           () => api.get("/envios"),
  getEnvio:            (id) => api.get(`/envios/${id}`),
  editarEnvio:         (id, data) => api.put(`/envios/${id}`, data),
  eliminarEnvio:       (id) => api.delete(`/envios/${id}`),
  eliminarEntrada:     (id) => api.delete(`/productos/entradas/${id}`),
}

export default auditoriaService