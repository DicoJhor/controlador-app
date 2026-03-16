function Icon({ d, size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/**
 * StatCard — tarjeta de métrica para dashboards.
 *
 * Props:
 *   label       {string}   — Etiqueta
 *   value       {string|number}
 *   icon        {string}   — Path SVG del ícono
 *   iconColor   {string}   — Color del ícono
 *   iconBg      {string}   — Fondo del ícono
 *   change      {string}   — Texto de cambio (opcional)
 *   changeType  {"up"|"down"|"neutral"}
 */
export default function StatCard({
  label,
  value,
  icon,
  iconColor = "var(--primary)",
  iconBg    = "var(--primary-light)",
  change,
  changeType = "neutral",
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: iconBg }}>
        <Icon d={icon} size={20} color={iconColor} />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {change && (
        <div className={`stat-change ${changeType}`}>{change}</div>
      )}
    </div>
  );
}