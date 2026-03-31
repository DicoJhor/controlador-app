import api from "./api"

const recojosService = {
  getAll:   () => api.get("/recojos"),
  create:   (data) => api.post("/recojos", data),
  confirmar: (id, formData) => api.patch(`/recojos/${id}`, formData),
  getAllAdmin: (sede_id) => api.get(`/recojos/admin?sede_id=${sede_id}`),
}

export default recojosService