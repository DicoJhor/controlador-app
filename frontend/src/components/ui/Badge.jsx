/**
 * Badge — para roles, estados, tipos de movimiento, etc.
 *
 * variant: "admin" | "ctrl" | "tech" | "active" | "inactive"
 *          "entrada" | "salida" | "warning" | "danger" | "blue" | "info"
 */
export function Badge({ variant = "blue", children }) {
  return (
    <span className={`badge badge-${variant}`}>
      {children}
    </span>
  );
}

/**
 * Tag — para motivos de salida (estilo monospace).
 *
 * variant: "nueva" | "averia" | "mant"
 */
export function Tag({ variant = "nueva", children }) {
  return (
    <span className={`tag tag-${variant}`}>
      {children}
    </span>
  );
}

/**
 * RoleBadge — shortcut para mostrar el rol de un usuario.
 */
export function RoleBadge({ role }) {
  const map = {
    admin:       { variant: "admin", label: "Admin" },
    controlador: { variant: "ctrl",  label: "Controlador" },
    tecnico:     { variant: "tech",  label: "Técnico" },
  };
  const { variant, label } = map[role] ?? { variant: "blue", label: role };
  return <Badge variant={variant}>{label}</Badge>;
}

/**
 * EstadoBadge — shortcut para estado activo/inactivo.
 * Acepta tanto texto ("activo"/"inactivo") como número (1/0) desde la BD.
 */
export function EstadoBadge({ estado }) {
  const activo = estado === "activo" || estado === 1;  // ✅ acepta ambos formatos
  return (
    <Badge variant={activo ? "active" : "inactive"}>
      {activo ? "Activo" : "Inactivo"}
    </Badge>
  );
}

/**
 * MotivoBadge — shortcut para motivos de salida.
 */
export function MotivoBadge({ motivo }) {
  const map = {
    nueva_conexion: { variant: "nueva",  label: "Nueva conexión" },
    averia:         { variant: "averia", label: "Avería" },
    mantenimiento:  { variant: "mant",   label: "Mantenimiento" },
    compra:         { variant: "nueva",  label: "Compra" },
    reposicion:     { variant: "mant",   label: "Reposición" },
    transferencia:  { variant: "averia", label: "Transferencia" },
  };
  const { variant, label } = map[motivo] ?? { variant: "nueva", label: motivo };
  return <Tag variant={variant}>{label}</Tag>;
}