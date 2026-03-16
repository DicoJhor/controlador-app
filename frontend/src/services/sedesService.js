import api from "./api"

const sedesService = {
  getAll: () => api.get("/sedes"),
  create: (data) => api.post("/sedes", data),
  update: (id, data) => api.put(`/sedes/${id}`, data),
  remove: (id) => api.delete(`/sedes/${id}`),
}

export default sedesService