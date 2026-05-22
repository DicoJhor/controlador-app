import api from "./api";

const authService = {
  /**
   * Inicia sesión con email y contraseña.
   * El backend devuelve { token, usuario: { id, nombre, rol } }
   */
  login: async (email, password) => {
    const data = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.usuario));
    return data.usuario;
  },

  /**
   * Cierra la sesión del usuario actual.
   */
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Aunque falle el endpoint, limpiamos igual
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  /**
   * Devuelve el usuario guardado en localStorage (sin hacer fetch).
   * Útil para rehidratar el contexto al recargar la página.
   */
  getCurrentUser: () => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  },

  /**
   * Devuelve el token actual.
   */
  getToken: () => localStorage.getItem("token"),

  /**
   * Verifica si hay una sesión activa.
   */
  isAuthenticated: () => !!localStorage.getItem("token"),
};

export default authService;