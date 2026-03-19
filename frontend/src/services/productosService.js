import api from "./api";

const productosService = {
  getAll:          ()         => api.get("/productos"),
  getStockBySede:  (sedeId)   => api.get(`/productos/stock-sede/${sedeId}`),
  create:          (data)     => api.post("/productos", data),
  update:          (id, data) => api.put(`/productos/${id}`, data),
  remove:          (id)       => api.delete(`/productos/${id}`),
  registrarEntrada: (data)    => api.post("/productos/entrada", data),
};

export default productosService;