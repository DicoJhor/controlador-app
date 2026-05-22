import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROLES } from "../utils/constants";
import ProtectedRoute from "./ProtectedRoute";
import AdminOperaciones from "../pages/admin/Operaciones";
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
import AdminCatalogo     from "../pages/admin/Catalogo";
import ActivacionesRed from "../pages/admin/ActivacionesRed";
import AdminClientes from "../pages/admin/clientes";  // ← minúscula

// Controlador
import CtrlDashboard   from "../pages/controlador/Dashboard";
import CtrlTecnicos    from "../pages/controlador/Tecnicos";
import CtrlInventario  from "../pages/controlador/Inventario";
import CtrlAuditoria   from "../pages/controlador/Auditoria";
import CtrlRecojos   from "../pages/controlador/Recojos";
import CtrlOnusRecicladas  from "../pages/controlador/EquiposReciclados";
import CtrlClientes  from "../pages/controlador/Clientes";

//Secretaria
import ServiciosList from "../pages/secretaria/ServiciosList";



// Técnico
import TecDashboard       from "../pages/tecnico/Dashboard";
import TecRegistrarSalida from "../pages/tecnico/RegistrarSalida";
import TecHistorial       from "../pages/tecnico/Historial";
import TecRecojos   from "../pages/tecnico/Recojos";
import TecConfigurarONU from "../pages/tecnico/TecConfigurarONU";
import TecLayout          from "../components/layout/TecLayout";



/**
 * Redirige al dashboard correcto según el rol del usuario logueado.
 */
function RoleRedirect() {
  const { role } = useAuth();
  if (role === ROLES.SUPERADMIN)        return <Navigate to="/admin/dashboard"       replace />;
  if (role === ROLES.ADMIN)        return <Navigate to="/admin/dashboard"       replace />;
  if (role === ROLES.CONTROLADOR)  return <Navigate to="/controlador/dashboard" replace />;
  if (role === ROLES.TECNICO)      return <Navigate to="/tecnico/dashboard"     replace />;
  if (role === ROLES.SECRETARIA)  return <Navigate to="/secretaria/servicios"   replace />;
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
        <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]} />}>
          <Route element={<MainLayout />}>
            <Route path="/admin/dashboard"  element={<AdminDashboard />} />
            <Route path="/admin/sedes"      element={<AdminSedes />} />
            <Route path="/admin/operaciones" element={<AdminOperaciones />} />
            <Route path="/admin/usuarios"   element={<AdminUsuarios />} />
            <Route path="/admin/inventario" element={<AdminInventario />} />
            <Route path="/admin/catalogo"   element={<AdminCatalogo />} />
            <Route path="/admin/auditoria"  element={<AdminAuditoria />} />
            <Route path="/admin/activaciones-red" element={<ActivacionesRed />} />
            <Route path="/admin/clientes" element={<AdminClientes />} />
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
            <Route path="/controlador/onus-recicladas"  element={<CtrlOnusRecicladas />} />
            <Route path="/controlador/clientes"  element={<CtrlClientes />} />
            <Route path="/controlador/servicios"  element={<ServiciosList />} />


          </Route>
        </Route>

        {/* ── Técnico ── */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.TECNICO]} />}>
          <Route element={<TecLayout />}>
            <Route path="/tecnico/dashboard"        element={<TecDashboard />} />
            <Route path="/tecnico/registrar-salida" element={<TecRegistrarSalida />} />
            <Route path="/tecnico/historial"        element={<TecHistorial />} />
            <Route path="/tecnico/recojos"        element={<TecRecojos />} />
            <Route path="/tecnico/configurar-onu" element={<TecConfigurarONU />} />


          </Route>
        </Route>

        {/* ── Secretaria ── */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.SECRETARIA]} />}>
          <Route element={<MainLayout />}>
            <Route path="/secretaria/servicios" element={<ServiciosList />} />


          </Route>
        </Route>

        {/* ── Cualquier ruta no encontrada ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}