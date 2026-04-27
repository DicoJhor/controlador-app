import api from "./api";

const activosService = {
  getAll:              ()         => api.get("/activos"),
  getBySede:           (sedeId)   => api.get(`/activos/sede/${sedeId}`),
  create:              (data)     => api.post("/activos", data),
  update:              (id, data) => api.put(`/activos/${id}`, data),
  remove:              (id)       => api.delete(`/activos/${id}`),
  enviarDesdeAlmacen:  (data)     => api.post("/activos/desde-almacen", data), // ← AGREGAR
};

export default activosService;