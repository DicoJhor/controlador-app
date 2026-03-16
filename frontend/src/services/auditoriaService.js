import api from "./api"

const auditoriaService = {
  getAll: () => api.get("/auditoria"),
}

export default auditoriaService