import api from "./api"

const tecnicoService = {
  getMiInventario:  () => api.get("/tecnico/inventario"),
  getMiHistorial:   () => api.get("/tecnico/historial"),
  registrarSalida:  (data) => api.post("/tecnico/salida", data),
  getMisRecojos:    () => api.get("/tecnico/recojos"),
  confirmarRecojo:  (id, formData) => api.patch(`/tecnico/recojos/${id}`, formData),
}

export default tecnicoService