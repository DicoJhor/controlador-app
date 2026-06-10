import api from "./api"

const enviosService = {
  getAll:  (params) => api.get("/envios", { params }),
  create:  (data)   => api.post("/envios", data),
}

export default enviosService