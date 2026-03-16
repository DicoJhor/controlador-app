import api from "./api"

const recojosService = {
  getAll:   () => api.get("/recojos"),
  create:   (data) => api.post("/recojos", data),
  confirmar: (id, formData) => api.patch(`/recojos/${id}`, formData),
}

export default recojosService