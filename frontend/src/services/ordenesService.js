import api from "./api";

const ordenesService = {
  getAll: (estado = "pendiente", sedeId = "") => {
    const params = new URLSearchParams();
    if (estado !== "todas") params.append("estado", estado);
    if (sedeId) params.append("sede_id", sedeId);
    return api.get(`/admin/ordenes?${params}`);
  },

  uploadExcel: (formData) =>
    api.postForm("/admin/ordenes/upload", formData),

  confirmarDuplicado: (ordenId, datos) =>
    api.post("/admin/ordenes/upload/confirmar-duplicada", { orden_id: ordenId, datos }),

  getDetalle: (id) => api.get(`/admin/ordenes/${id}`),
};

export default ordenesService;