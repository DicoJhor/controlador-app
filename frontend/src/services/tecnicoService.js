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
  getAveriasAdmin:         (sede_id) => api.get(`/tecnico/averias/admin?sede_id=${sede_id}`),
  getRecojosControlador:   () => api.get("/tecnico/recojos/controlador"),
  getCatalogoOnus: () => api.get("/tecnico/catalogo-onus"),
  buscarCliente: (q) => api.get(`/tecnico/buscar-cliente?q=${encodeURIComponent(q)}`),
  getOrdenesPendientes: () => api.get("/tecnico/ordenes-pendientes"),
  completarOrden: (id, formData) => api.postForm(`/tecnico/ordenes/${id}/completar`, formData),
  getCatalogoProductos: () => api.get("/tecnico/catalogo-productos"),
  getOrdenRed: (id) => api.get(`/tecnico/ordenes/${id}/red`),
  completarRecojo: (id, formData) => api.postForm(`/tecnico/ordenes/${id}/completar-recojo`, formData),
}

export default tecnicoService