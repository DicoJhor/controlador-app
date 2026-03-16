import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROLES } from "../utils/constants";

function Icon({ d }) {
  return (
    <svg width={48} height={48} viewBox="0 0 24 24" fill="none"
      stroke="var(--danger)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const IC_LOCK = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z";

const home = {
  [ROLES.ADMIN]:       "/admin/dashboard",
  [ROLES.CONTROLADOR]: "/controlador/dashboard",
  [ROLES.TECNICO]:     "/tecnico/dashboard",
};

export default function NoAutorizado() {
  const { role } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <Icon d={IC_LOCK} />
        <h1 style={styles.title}>Acceso no autorizado</h1>
        <p style={styles.text}>
          No tenés permisos para ver esta página.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => navigate(home[role] ?? "/login", { replace: true })}
        >
          Volver al inicio
        </button>
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
    background: "var(--bg)",
  },
  card: {
    background: "white",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "48px 40px",
    textAlign: "center",
    maxWidth: 380,
    boxShadow: "var(--shadow)",
  },
  title: { fontSize: 22, fontWeight: 700, margin: "16px 0 8px" },
  text:  { color: "var(--text-secondary)", fontSize: 14, marginBottom: 28 },
};