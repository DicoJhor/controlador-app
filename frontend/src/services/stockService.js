import api from "./api"

const stockService = {
  getStock:                () => api.get("/stock"),
  getStats:                () => api.get("/stock/stats"),
  getAuditoria:            () => api.get("/stock/auditoria"),
  registrarEntrada:        (data) => api.post("/stock/entrada",          data),
  registrarSalida:         (data) => api.post("/stock/salida",           data),
  registrarSalidaMultiple: (data) => api.post("/stock/salida-multiple",  data),
  salidaDirecta:           (data) => api.post("/stock/salida-directa",   data),
  asignarCompleto:         (data) => api.post("/stock/asignar-completo", data),
  getTecnicoInventario:   (id) => api.get(`/stock/tecnico/${id}/inventario`),
  getTecnicoActividadHoy: (id) => api.get(`/stock/tecnico/${id}/actividad-hoy`),
}

export default stockService