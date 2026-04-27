import api from "./api";

const ordenesService = {
  getAll: (estado = "pendiente") => {
    const params = new URLSearchParams();
    if (estado !== "todas") params.append("estado", estado);
    return api.get(`/admin/ordenes?${params}`);
  },

  uploadExcel: (formData) =>
    api.postForm("/admin/ordenes/upload", formData),

  confirmarDuplicado: (ordenId, datos) =>
    api.post("/admin/ordenes/upload/confirmar-duplicada", { orden_id: ordenId, datos }),

  getDetalle: (id) => api.get(`/admin/ordenes/${id}`),
};

export default ordenesService;