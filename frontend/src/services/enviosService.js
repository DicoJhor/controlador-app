import api from "./api"

const enviosService = {
  getAll:  ()       => api.get("/envios"),
  create:  (data)   => api.post("/envios", data),
}

export default enviosService