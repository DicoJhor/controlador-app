import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ROLES } from "../../utils/constants";
import logo from "../../assets/logo_enet.png";
import "./Sidebar.css";

function Icon({ d, size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const IC = {
  dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  users:     "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
  building:  "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  inventory: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  audit:     "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2 M9 12l2 2 4-4",
  exit:      "M19 12H5 M12 19l-7-7 7-7",
  activity:  "M22 12h-4l-3 9L9 3l-3 9H2",
  package:   "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12",
  logout:    "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
  close:     "M18 6L6 18 M6 6l12 12",
  recycle:   "M4 2v6h6 M20 22v-6h-6 M20 11A8 8 0 004.93 7.1 M4 13a8 8 0 0015.07 3.9",
  wifi: "M5 12.55a11 11 0 0114.08 0 M1.42 9a16 16 0 0121.16 0 M8.53 16.11a6 6 0 016.95 0 M12 20h.01",
};

const navConfig = {
  [ROLES.SUPERADMIN]: [
    {
      section: "General",
      items: [
        { to: "/admin/dashboard",  label: "Dashboard", icon: IC.dashboard },
        { to: "/admin/sedes",      label: "Sedes",     icon: IC.building  },
        { to: "/admin/usuarios",   label: "Usuarios",  icon: IC.users     },
        { to: "/admin/activaciones-red", label: "Activaciones Red", icon: IC.wifi },
      ],
    },
    {
      section: "Operaciones",
      items: [
        { to: "/admin/inventario",   label: "Inventario",   icon: IC.inventory },
        { to: "/admin/catalogo",     label: "Catálogo",      icon: IC.package  },
        { to: "/admin/auditoria",    label: "Auditoría",    icon: IC.audit     },
        { to: "/admin/operaciones",  label: "Operaciones",  icon: IC.package   },
      ],
    },
  ],

  [ROLES.ADMIN]: [
    {
      section: "General",
      items: [
        { to: "/admin/dashboard",  label: "Dashboard", icon: IC.dashboard },
        { to: "/admin/sedes",      label: "Sedes",     icon: IC.building  },
        { to: "/admin/usuarios",   label: "Usuarios",  icon: IC.users     },
      ],
    },
    {
      section: "Operaciones",
      items: [
        { to: "/admin/inventario",   label: "Inventario",   icon: IC.inventory },
        { to: "/admin/catalogo",     label: "Catálogo",     icon: IC.package   },
        { to: "/admin/auditoria",    label: "Auditoría",    icon: IC.audit     },
        { to: "/admin/operaciones",  label: "Operaciones",  icon: IC.package   },
      ],
    },
  ],

  [ROLES.CONTROLADOR]: [
    {
      section: "Mi Sede",
      items: [
        { to: "/controlador/dashboard",   label: "Dashboard",    icon: IC.dashboard },
        { to: "/controlador/tecnicos",    label: "Mis Técnicos", icon: IC.users     },
        { to: "/controlador/recojos",     label: "Operaciones",  icon: IC.package   },
      ],
    },
    {
      section: "Inventario",
      items: [
        { to: "/controlador/inventario",  label: "Inventario",   icon: IC.inventory },
        { to: "/controlador/onus-recicladas", label: "ONUs Recicladas", icon: IC.recycle   },
        { to: "/controlador/auditoria",   label: "Auditoría",    icon: IC.audit     },
      ],
    },
  ],

  [ROLES.TECNICO]: [
    {
      section: "Mi Trabajo",
      items: [
        { to: "/tecnico/dashboard",        label: "Mi Inventario",    icon: IC.package  },
        { to: "/tecnico/registrar-salida", label: "Registrar Salida", icon: IC.exit     },
        { to: "/tecnico/recojos",          label: "Recojos",          icon: IC.package  },
        { to: "/tecnico/historial",        label: "Mi Historial",     icon: IC.activity },
      ],
    },
  ],
};

const roleInfo = {
  [ROLES.SUPERADMIN]:  { label: "Super Admin",   color: "#DC2626", bg: "#FEF2F2" },
  [ROLES.ADMIN]:       { label: "Admin General", color: "#7C3AED", bg: "#F5F3FF" },
  [ROLES.CONTROLADOR]: { label: "Controlador",   color: "#0891B2", bg: "#ECFEFF" },
  [ROLES.TECNICO]:     { label: "Técnico",        color: "#059669", bg: "#ECFDF5" },
};

/**
 * Props:
 *  - isOpen  {boolean}  — si está abierto en móvil
 *  - onClose {function} — cierra el drawer en móvil
 */
export default function Sidebar({ isOpen, onClose }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const nav = navConfig[role] ?? [];
  const ri  = roleInfo[role]  ?? {};

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  // Al hacer clic en un link en móvil, cierra el sidebar
  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`} style={styles.sidebar}>

      {/* Header: logo + botón cerrar en móvil */}
      <div style={styles.header}>
        <img src={logo} alt="Enet Fiber Perú" style={styles.logoImg} />
        <div style={{ flex: 1 }}>
          <div style={styles.brandName}>Enet Fiber Perú</div>
          <div style={styles.brandSub}>Sistema de Inventario</div>
        </div>
        {/* Botón X solo visible en móvil */}
        <button
          className="sidebar-close-btn"
          style={styles.closeBtn}
          onClick={onClose}
          title="Cerrar menú"
        >
          <Icon d={IC.close} size={18} />
        </button>
      </div>

      {/* Usuario */}
      <div style={styles.userSection}>
        <span style={{ ...styles.roleBadge, color: ri.color, background: ri.bg }}>
          {ri.label}
        </span>
        <div style={styles.userName}>{user?.nombre}</div>
        <div style={styles.userEmail}>{user?.email}</div>
        {user?.sede && <div style={styles.userSede}>{user.sede}</div>}
      </div>

      {/* Navegación */}
      <nav style={styles.nav}>
        {nav.map((section) => (
          <div key={section.section}>
            <div style={styles.navSection}>{section.section}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                style={({ isActive }) => ({
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                })}
              >
                <Icon d={item.icon} size={17} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={styles.footer}>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          <Icon d={IC.logout} size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: "var(--sidebar-w)",
    background: "#0F172A",
    color: "white",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    top: 0, left: 0, bottom: 0,
    zIndex: 100,
    // La transición la maneja el CSS
  },
  header: {
    padding: "20px 18px",
    borderBottom: "1px solid rgba(255,255,255,.08)",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoImg:   { width: 48, height: 48, objectFit: "contain", flexShrink: 0 },
  brandName: { fontSize: 14, fontWeight: 700 },
  brandSub:  { fontSize: 10, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".5px" },
  closeBtn: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,.5)",
    cursor: "pointer",
    padding: 6,
    borderRadius: 6,
    display: "none", // Se muestra con CSS en móvil
    flexShrink: 0,
  },
  userSection: { padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,.08)" },
  roleBadge: {
    display: "inline-flex", alignItems: "center",
    padding: "3px 10px", borderRadius: 20,
    fontSize: 11, fontWeight: 600,
    textTransform: "uppercase", letterSpacing: ".5px",
    marginBottom: 7,
  },
  userName:  { fontSize: 13, fontWeight: 500 },
  userEmail: { fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 1 },
  userSede:  { fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 },
  nav:       { flex: 1, padding: "12px 10px", overflowY: "auto" },
  navSection: {
    fontSize: 10, fontWeight: 600,
    textTransform: "uppercase", letterSpacing: 1,
    color: "rgba(255,255,255,.3)", padding: "12px 8px 6px",
  },
  navItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 10px", borderRadius: 8, cursor: "pointer",
    fontSize: 13.5, fontWeight: 500,
    color: "rgba(255,255,255,.6)", textDecoration: "none",
    transition: "all .15s", marginBottom: 2,
  },
  navItemActive: { background: "var(--primary)", color: "white" },
  footer: { padding: "14px 10px", borderTop: "1px solid rgba(255,255,255,.08)" },
  logoutBtn: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 10px", borderRadius: 8, cursor: "pointer",
    fontSize: 13, fontWeight: 500,
    color: "rgba(255,255,255,.5)", transition: "all .15s",
    width: "100%", background: "none", border: "none", fontFamily: "inherit",
  },
};

// v2