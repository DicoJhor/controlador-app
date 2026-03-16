import api from "./api"

const productosService = {
  getAll: () => api.get("/productos"),
  create: (data) => api.post("/productos", data),
  update: (id, data) => api.put(`/productos/${id}`, data),
  remove: (id) => api.delete(`/productos/${id}`),
}

export default productosService