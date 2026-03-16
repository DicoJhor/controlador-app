import api from "./api"

const usuariosService = {
  getAll: () => api.get("/usuarios"),

  create: (data) => api.post("/usuarios", data),

  update: (id, data) => api.put(`/usuarios/${id}`, data),

  remove: (id) => api.delete(`/usuarios/${id}`),
}

export default usuariosService