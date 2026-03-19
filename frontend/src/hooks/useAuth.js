import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { ROLES } from "../utils/constants";

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");

  return {
    ...ctx,
    isSuperadmin:  ctx.role === ROLES.SUPERADMIN,  // ← nuevo
    isAdmin:       ctx.role === ROLES.ADMIN,
    isControlador: ctx.role === ROLES.CONTROLADOR,
    isTecnico:     ctx.role === ROLES.TECNICO,
  };
}