import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROLES } from "../utils/constants";
import logo from "../assets/logo_enet.png";

function Icon({ d, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const IC = {
  alert:
    "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z",
  eyeOff:
    "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94 M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19 M1 1l22 22",
};

const roleRedirect = {
  [ROLES.ADMIN]: "/admin/dashboard",
  [ROLES.CONTROLADOR]: "/controlador/dashboard",
  [ROLES.TECNICO]: "/tecnico/dashboard",
};

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!email || !password) return;

    const user = await login(email.trim().toLowerCase(), password);

    if (user) {
      navigate(roleRedirect[user.rol] ?? "/", { replace: true });
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        {/* Logo centrado */}
        <div style={styles.logo}>
          <img src={logo} alt="Enet Fiber Perú" style={styles.logoImg} />

          <div style={styles.logoText}>
            <div style={styles.logoName}>Enet Fiber Perú</div>
            <div style={styles.logoSub}>Sistema de Inventario</div>
          </div>
        </div>

        <div style={styles.title}>Iniciar sesión</div>
        <div style={styles.subtitle}>
          Ingresá tus credenciales para acceder
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 20 }}>
            <Icon d={IC.alert} size={15} />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="usuario@telecom.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Contraseña</label>

            <div style={styles.passWrap}>
              <input
                className="form-input"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 42 }}
              />

              <button
                type="button"
                style={styles.eyeBtn}
                onClick={() => setShowPass(!showPass)}
                tabIndex={-1}
              >
                <Icon d={showPass ? IC.eyeOff : IC.eye} size={16} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading || !email || !password}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #1A56DB 100%)",
    padding: 20,
  },

  card: {
    background: "white",
    borderRadius: 16,
    padding: "48px 40px",
    width: "100%",
    maxWidth: 420,
    boxShadow: "var(--shadow-lg)",
  },

  logo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    marginBottom: 32,
  },

  logoText: {
    textAlign: "center",
  },

  logoImg: {
    width: 70,
    height: 70,
    objectFit: "contain",
  },

  logoName: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "-0.5px",
  },

  logoSub: {
    fontSize: 11,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: ".5px",
  },

  title: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 6,
  },

  subtitle: {
    color: "var(--text-secondary)",
    fontSize: 14,
    marginBottom: 28,
    textAlign: "center",
  },

  passWrap: {
    position: "relative",
  },

  eyeBtn: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    padding: 4,
  },
};