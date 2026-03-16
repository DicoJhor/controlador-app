import api from "./api"

const dashboardService = {
  getStats: () => api.get("/dashboard/stats"),
}

export default dashboardService