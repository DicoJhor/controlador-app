import api from "./api";

const clientesService = {

  getAll: async ({ search = "", sede_id = "" } = {}) => {
    const q = new URLSearchParams();
    if (search)  q.append("search",  search);
    if (sede_id) q.append("sede_id", sede_id);
    return await api.get(`/clientes?${q.toString()}`);
  },

  getDetalle: async (clienteId) => {
    return await api.get(`/clientes/${clienteId}`);
  },

  update: async (clienteId, datos) => {
    return await api.put(`/clientes/${clienteId}`, datos);
  },

  exportarExcel: async ({ search = "", sede_id = "", cliente_id = "" } = {}) => {
    const q = new URLSearchParams();
    if (search)     q.append("search",     search);
    if (sede_id)    q.append("sede_id",    sede_id);
    if (cliente_id) q.append("cliente_id", cliente_id);
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/clientes/exportar/excel?${q.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!res.ok) throw new Error("Error al exportar Excel");
    return await res.blob();
  },

  exportarPDF: async ({ search = "", sede_id = "", cliente_id = "" } = {}) => {
    const q = new URLSearchParams();
    if (search)     q.append("search",     search);
    if (sede_id)    q.append("sede_id",    sede_id);
    if (cliente_id) q.append("cliente_id", cliente_id);
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/clientes/exportar/pdf?${q.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!res.ok) throw new Error("Error al exportar PDF");
    return await res.blob();
  },
};

export function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

export default clientesService;