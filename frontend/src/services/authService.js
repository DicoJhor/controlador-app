import api from "./api";

// ─── MOCK ────────────────────────────────────────────────────────────────────
const MOCK_USERS = [
  {
    id: 1,
    nombre: "Admin Principal",
    email: "admin@telecom.com",
    password: "admin123",
    rol: "admin",
  },
  {
    id: 2,
    nombre: "Carlos Controlador",
    email: "controlador@telecom.com",
    password: "control123",
    rol: "controlador",
  },
  {
    id: 3,
    nombre: "Juan Técnico",
    email: "tecnico@telecom.com",
    password: "tecnico123",
    rol: "tecnico",
    sede: "Sede Norte",
  },
];

const USE_MOCK = false;
// ─────────────────────────────────────────────────────────────────────────────

const authService = {
  /**
   * Inicia sesión con email y contraseña.
   * El backend devuelve { token, usuario: { id, nombre, rol } }
   */
  login: async (email, password) => {
    if (USE_MOCK) {
      const found = MOCK_USERS.find(
        (u) => u.email === email && u.password === password
      );
      if (!found) throw new Error("Credenciales incorrectas");
      const { password: _, ...user } = found;
      localStorage.setItem("token", `mock-token-${user.id}`);
      localStorage.setItem("user", JSON.stringify(user));
      return user;
    }

    const data = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.usuario)); // ✅ era data.user
    return data.usuario;                                         // ✅ era data.user
  },

  /**
   * Cierra la sesión del usuario actual.
   */
  logout: async () => {
    if (!USE_MOCK) {
      try {
        await api.post("/auth/logout");
      } catch {
        // Aunque falle el endpoint, limpiamos igual
      }
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