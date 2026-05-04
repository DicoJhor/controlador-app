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
  getMisRecuperados:    () => api.get("/recojos/mis-recuperados"),
  enviarASede:          (id) => api.patch(`/recojos/recuperados/${id}/enviar-sede`),
  marcarUsado:          (id) => api.patch(`/recojos/recuperados/${id}/usar`),
}

export default recojosService