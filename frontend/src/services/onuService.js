import api from "./api";

const onuService = {
  crearOnu: (data) =>
    api.post("/onus", data),

  getBySedeProducto: (sede_id, producto_id) =>
    api.get(`/onus/sede/${sede_id}/producto/${producto_id}`),

  actualizarCodigo: (id, codigo_pon) =>
    api.patch(`/onus/${id}/codigo`, { codigo_pon }),

  getDisponibles: (producto_id) => api.get(`/onus/disponibles/${producto_id}`),
  asignarTecnico: (data) => api.post("/onus/asignar-tecnico", data),

  // ← Esto faltaba:
  getMisOnus: () => api.get("/onus/mis-onus"),
};

export default onuService;