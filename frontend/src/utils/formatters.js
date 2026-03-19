/**
 * Formatea una fecha ISO a formato legible
 * @param {string} dateStr - "2025-03-10" o "2025-03-10T00:00:00.000Z"
 * @returns {string} - "10 mar 2025"
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date)) return "—";
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * Formatea fecha y hora
 * @param {string} isoString
 * @returns {string} - "10 mar 2025, 14:32"
 */
export const formatDateTime = (isoString) => {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (isNaN(date)) return "—";
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Formatea número con separador de miles
 * @param {number} num
 * @returns {string} - "1.240"
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return "—";
  return num.toLocaleString("es-AR");
};

/**
 * Formatea precio en pesos argentinos
 * @param {number} amount
 * @returns {string} - "$1.240,00"
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
};

/**
 * Capitaliza la primera letra de un string
 * @param {string} str
 * @returns {string}
 */
export const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Devuelve el porcentaje de uso de stock
 * @param {number} stock
 * @param {number} minimo
 * @returns {"ok" | "warning" | "critical"}
 */
export const getStockStatus = (stock, minimo) => {
  if (stock <= minimo) return "critical";
  if (stock <= minimo * 1.5) return "warning";
  return "ok";
};