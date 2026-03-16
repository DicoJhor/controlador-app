import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROLES } from "../utils/constants";
import ProtectedRoute from "./ProtectedRoute";

// Páginas públicas
import Login from "../pages/Login";
import NoAutorizado from "../pages/NoAutorizado";

// Layout
import MainLayout from "../components/layout/MainLayout";

// Admin
import AdminDashboard    from "../pages/admin/Dashboard";
import AdminSedes        from "../pages/admin/Sedes";
import AdminUsuarios     from "../pages/admin/Usuarios";
import AdminInventario   from "../pages/admin/Inventario";
import AdminAuditoria    from "../pages/admin/Auditoria";

// Controlador
import CtrlDashboard   from "../pages/controlador/Dashboard";
import CtrlTecnicos    from "../pages/controlador/Tecnicos";
import CtrlInventario  from "../pages/controlador/Inventario";
import CtrlAuditoria   from "../pages/controlador/Auditoria";
import CtrlRecojos   from "../pages/controlador/Recojos";


// Técnico
import TecDashboard       from "../pages/tecnico/Dashboard";
import TecRegistrarSalida from "../pages/tecnico/RegistrarSalida";
import TecHistorial       from "../pages/tecnico/Historial";
import TecRecojos   from "../pages/tecnico/Recojos";


/**
 * Redirige al dashboard correcto según el rol del usuario logueado.
 */
function RoleRedirect() {
  const { role } = useAuth();
  if (role === ROLES.ADMIN)        return <Navigate to="/admin/dashboard"       replace />;
  if (role === ROLES.CONTROLADOR)  return <Navigate to="/controlador/dashboard" replace />;
  if (role === ROLES.TECNICO)      return <Navigate to="/tecnico/dashboard"     replace />;
  return <Navigate to="/login" replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Pública ── */}
        <Route path="/login"         element={<Login />} />
        <Route path="/no-autorizado" element={<NoAutorizado />} />

        {/* ── Raíz: redirige según rol ── */}
        <Route path="/" element={<ProtectedRoute />}>
          <Route index element={<RoleRedirect />} />
        </Route>

        {/* ── Admin ── */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
          <Route element={<MainLayout />}>
            <Route path="/admin/dashboard"  element={<AdminDashboard />} />
            <Route path="/admin/sedes"      element={<AdminSedes />} />
            <Route path="/admin/usuarios"   element={<AdminUsuarios />} />
            <Route path="/admin/inventario" element={<AdminInventario />} />
            <Route path="/admin/auditoria"  element={<AdminAuditoria />} />
          </Route>
        </Route>

        {/* ── Controlador ── */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.CONTROLADOR]} />}>
          <Route element={<MainLayout />}>
            <Route path="/controlador/dashboard"  element={<CtrlDashboard />} />
            <Route path="/controlador/tecnicos"   element={<CtrlTecnicos />} />
            <Route path="/controlador/inventario" element={<CtrlInventario />} />
            <Route path="/controlador/auditoria"  element={<CtrlAuditoria />} />
            <Route path="/controlador/recojos"  element={<CtrlRecojos />} />

          </Route>
        </Route>

        {/* ── Técnico ── */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.TECNICO]} />}>
          <Route element={<MainLayout />}>
            <Route path="/tecnico/dashboard"        element={<TecDashboard />} />
            <Route path="/tecnico/registrar-salida" element={<TecRegistrarSalida />} />
            <Route path="/tecnico/historial"        element={<TecHistorial />} />
            <Route path="/tecnico/recojos"        element={<TecRecojos />} />

          </Route>
        </Route>

        {/* ── Cualquier ruta no encontrada ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}