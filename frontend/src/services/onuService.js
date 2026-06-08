import api from "./api";

const onuService = {
  crearOnu: (data) =>
    api.post("/onus", data),

  // DESPUÉS
  getBySedeProducto: (sede_id, producto_id, soloDisponibles = false) =>
    api.get(`/onus/sede/${sede_id}/producto/${producto_id}?solo_disponibles=${soloDisponibles}`),

  actualizarCodigo: (id, codigo_pon) =>
    api.patch(`/onus/${id}/codigo`, { codigo_pon }),

  getDisponibles: (producto_id) => api.get(`/onus/disponibles/${producto_id}`),
  asignarTecnico: (data) => api.post("/onus/asignar-tecnico", data),

  // ← Esto faltaba:
  getMisOnus: () => api.get("/onus/mis-onus"),
};

export default onuService;