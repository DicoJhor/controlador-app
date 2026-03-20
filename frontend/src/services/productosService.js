import api from "./api";

const productosService = {
  // ── Productos ──────────────────────────────────────────
  getAll:           ()          => api.get("/productos"),
  getStockBySede:   (sedeId)    => api.get(`/productos/stock-sede/${sedeId}`),
  create:           (data)      => api.post("/productos", data),
  update:           (id, data)  => api.put(`/productos/${id}`, data),
  remove:           (id)        => api.delete(`/productos/${id}`),
  registrarEntrada: (data)      => api.post("/productos/entrada", data),

  // ── Variantes ──────────────────────────────────────────
  getVariantes:          (productoId)              => api.get(`/productos/${productoId}/variantes`),
  crearVariante:         (productoId, data)         => api.post(`/productos/${productoId}/variantes`, data),
  actualizarVariante:    (varianteId, data)         => api.put(`/productos/variantes/${varianteId}`, data),
  eliminarVariante:      (varianteId)               => api.delete(`/productos/variantes/${varianteId}`),
  entradaStockVariante:  (varianteId, data)         => api.post(`/productos/variantes/${varianteId}/entrada`, data),
};

export default productosService;