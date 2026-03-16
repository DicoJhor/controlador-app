import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * Protege rutas por autenticación y opcionalmente por rol.
 *
 * Uso:
 *   <ProtectedRoute />                        → solo requiere estar logueado
 *   <ProtectedRoute allowedRoles={["admin"]}  → requiere rol específico
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { isAuth, role } = useAuth();

  // No está logueado → al login
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  // Está logueado pero no tiene el rol requerido → pantalla 403
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/no-autorizado" replace />;
  }

  return <Outlet />;
}