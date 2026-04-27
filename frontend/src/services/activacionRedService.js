import api from "./api";

const activacionRedService = {
  // Superadmin: trae todas las órdenes de instalación
  // estado: "sin_ip" | "con_ip" | "todas"
  getAll: (estado = "sin_ip", sedeId = "") => {
    const params = new URLSearchParams();
    if (estado !== "todas") params.append("estado", estado);
    if (sedeId)             params.append("sede_id", sedeId);
    return api.get(`/superadmin/activaciones-red?${params}`);
  },

  // Superadmin: carga o actualiza IP/mask/gateway de una orden
  guardarRed: (ordenId, datos) =>
    api.post(`/superadmin/activaciones-red/${ordenId}`, datos),

  // Técnico: consulta los datos de red de su orden
  getRed: (ordenId) =>
    api.get(`/tecnico/ordenes/${ordenId}/red`),
};

export default activacionRedService;