import api from "./api"

const activacionesService = {
  getAll:  () => api.get("/activaciones"),
  getMias: () => api.get("/activaciones/mias"),

  create: (formData) =>
    api.postForm("/activaciones", formData),
}

export default activacionesService