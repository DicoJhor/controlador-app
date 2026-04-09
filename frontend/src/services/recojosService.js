import api from "./api"

const recojosService = {
  getAll:     () => api.get("/recojos"),
  create:     (data) => api.post("/recojos", data),
  confirmar:  (id, formData) => api.patch(`/recojos/${id}`, formData),
  getAllAdmin: (sede_id) => api.get(`/recojos/admin?sede_id=${sede_id}`),
  getMisRecojos:     () => api.get("/recojos/mis-recojos"),
  confirmarTecnico:  (id, formData) => api.patch(`/recojos/${id}/tecnico`, formData),
  getEquiposReciclados: () => api.get("/recojos/equipos-reciclados"),
  revisarOnu:        (id, data) => api.patch(`/recojos/equipos-reciclados/${id}`, data),
}

export default recojosService