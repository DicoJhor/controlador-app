import api from "./api"

const activacionesService = {
  getAll:  () => api.get("/activaciones"),
  getMias: () => api.get("/activaciones/mias"),
  getAllAdmin: (sede_id) => api.get(`/activaciones/admin?sede_id=${sede_id}`),

  create: (formData) =>
    api.postForm("/activaciones", formData),
}

export default activacionesService