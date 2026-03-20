import api from "./api"

const tecnicoService = {
  getMiInventario:         () => api.get("/tecnico/inventario"),
  getMiHistorial:          () => api.get("/tecnico/historial"),
  registrarSalida:         (data) => api.post("/tecnico/salida", data),
  registrarSalidaMultiple: (formData) => api.postForm("/tecnico/salida-multiple", formData),
  registrarActivacion:     (formData) => api.postForm("/tecnico/activaciones", formData),
  getMisRecojos:           () => api.get("/tecnico/recojos"),
  getMisActivaciones:      () => api.get("/tecnico/activaciones"),
  confirmarRecojo:         (id, formData) => api.patchForm(`/tecnico/recojos/${id}`, formData),
  getAverias:              () => api.get("/tecnico/averias"),
}

export default tecnicoService