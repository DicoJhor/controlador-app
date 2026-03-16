import { useEffect } from "react";

/**
 * Modal reutilizable.
 *
 * Props:
 *   title      {string}    — Título del encabezado
 *   onClose    {function}  — Callback al cerrar
 *   children               — Contenido del cuerpo
 *   footer     {node}      — Botones del pie (opcional)
 *   size       {"sm"|"md"|"lg"}  — Ancho del modal (default "md")
 */
export default function Modal({ title, onClose, children, footer, size = "md" }) {
  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const maxWidth = { sm: 400, md: 520, lg: 680 }[size];

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}