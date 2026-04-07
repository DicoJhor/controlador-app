import { useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ROLES } from "../../utils/constants";
import "./Topbar.css";

function Icon({ d, size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const IC = {
  bell:      "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0",
  hamburger: "M3 12h18 M3 6h18 M3 18h18",
};

const pageTitles = {
  "/admin/dashboard":  "Dashboard General",
  "/admin/sedes":      "Gestión de Sedes",
  "/admin/usuarios":   "Gestión de Usuarios",
  "/admin/inventario": "Gestión de Inventario",
  "/admin/catalogo":   "Catálogo Global",
  "/admin/auditoria":  "Auditoría Global",
  "/controlador/dashboard":  "Dashboard",
  "/controlador/tecnicos":   "Gestión de Técnicos",
  "/controlador/inventario": "Inventario de Sede",
  "/controlador/auditoria":  "Auditoría de Técnicos",
  "/controlador/recojos":    "Recojo de ONUs",
  "/tecnico/dashboard":        "Mi Inventario",
  "/tecnico/registrar-salida": "Registrar Salida",
  "/tecnico/historial":        "Mi Historial",
  "/tecnico/recojos":          "Recojos de ONUs",
};

const roleLabel = {
  [ROLES.SUPERADMIN]:  { label: "Super Admin", color: "#DC2626", bg: "#FEF2F2" },
  [ROLES.ADMIN]:       { label: "Admin",        color: "#7C3AED", bg: "#F5F3FF" },
  [ROLES.CONTROLADOR]: { label: "Controlador",  color: "#0891B2", bg: "#ECFEFF" },
  [ROLES.TECNICO]:     { label: "Técnico",       color: "#059669", bg: "#ECFDF5" },
};

/**
 * Props:
 *  - onMenuClick {function} — abre el sidebar en móvil
 */
export default function Topbar({ onMenuClick }) {
  const { user, role } = useAuth();
  const { pathname } = useLocation();

  const title = pageTitles[pathname] ?? "Enet Fiber Perú";
  const rl    = roleLabel[role] ?? {};

  return (
    <header style={styles.topbar}>
      {/* Izquierda: botón hamburguesa (solo móvil) + título */}
      <div style={styles.left}>
        {/* Botón hamburguesa — solo visible en móvil via CSS */}
        <button
          className="topbar-menu-btn"
          style={styles.menuBtn}
          onClick={onMenuClick}
          title="Abrir menú"
          aria-label="Abrir menú"
        >
          <Icon d={IC.hamburger} size={20} />
        </button>

        <div style={styles.title}>{title}</div>
      </div>

      {/* Derecha: notificaciones + usuario + avatar */}
      <div style={styles.right}>
        <button style={styles.notifBtn} title="Notificaciones">
          <Icon d={IC.bell} size={17} />
          <span style={styles.notifDot} />
        </button>

        {/* Info de usuario — se oculta en pantallas muy pequeñas */}
        <div className="topbar-user-info" style={styles.userInfo}>
          <div style={styles.userName}>{user?.nombre}</div>
          <span style={{ ...styles.rolePill, color: rl.color, background: rl.bg }}>
            {rl.label}
          </span>
        </div>

        <div style={styles.avatar} title={user?.nombre}>
          {user?.nombre?.charAt(0).toUpperCase() ?? "?"}
        </div>
      </div>
    </header>
  );
}

const styles = {
  topbar: {
    height: "var(--header-h)",
    background: "white",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    position: "sticky",
    top: 0,
    zIndex: 50,
    gap: 8,
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  menuBtn: {
    // Visible solo en móvil (controlado por CSS)
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "white",
    cursor: "pointer",
    color: "var(--text-secondary)",
    flexShrink: 0,
    transition: "background .15s",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  right:    { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  notifBtn: {
    width: 36, height: 36, borderRadius: 8,
    border: "1px solid var(--border)", background: "white",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "var(--text-secondary)", position: "relative",
    transition: "background .15s", flexShrink: 0,
  },
  notifDot: {
    width: 8, height: 8, background: "var(--danger)", borderRadius: "50%",
    position: "absolute", top: 6, right: 6, border: "2px solid white",
  },
  userInfo: { textAlign: "right" },
  userName: { fontSize: 13, fontWeight: 600, lineHeight: 1.3, whiteSpace: "nowrap" },
  rolePill: {
    display: "inline-block", fontSize: 10, fontWeight: 600,
    textTransform: "uppercase", letterSpacing: ".5px",
    padding: "1px 7px", borderRadius: 20, marginTop: 2,
  },
  avatar: {
    width: 34, height: 34, borderRadius: "50%",
    background: "var(--primary)", color: "white",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: 700, flexShrink: 0,
  },
};