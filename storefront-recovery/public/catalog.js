export const DEFAULT_PRODUCTS = Object.freeze([
  {
    name: "Full-Body Rope Access Harness",
    category: "Harnesses",
    note: "Configuration, fit, brand, and certification confirmed before supply.",
  },
  {
    name: "Work-at-Height Safety Helmet",
    category: "Head protection",
    note: "Model, accessories, and applicable certification confirmed before quotation.",
  },
  {
    name: "Low-Stretch Access Rope",
    category: "Ropes",
    note: "Diameter, length, termination, and system compatibility confirmed by NEAS.",
  },
  {
    name: "Rope Access Starter Kit",
    category: "PPE kits",
    note: "Final contents depend on role, task, site rules, and required certification.",
  },
]);

export const MODES = Object.freeze({
  SERVICE: "service_booking",
  MEETING: "meeting_request",
  QUOTE: "equipment_quote",
});

export function modeFromHash(hash) {
  if (hash === "#quote") return MODES.QUOTE;
  if (hash === "#meeting-request") return MODES.MEETING;
  return MODES.SERVICE;
}

export function hashForMode(mode) {
  if (mode === MODES.QUOTE) return "#quote";
  if (mode === MODES.MEETING) return "#meeting-request";
  return "#booking";
}

export function selectedItems(products, cart) {
  return products
    .map(({ name }) => ({ name, quantity: Number(cart[name] || 0) }))
    .filter(({ quantity }) => Number.isInteger(quantity) && quantity > 0);
}

export function validateCatalog(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) return null;
  const products = value.map((product) => ({
    name: typeof product?.name === "string" ? product.name.trim().slice(0, 180) : "",
    category: typeof product?.category === "string" ? product.category.trim().slice(0, 80) : "Equipment",
    note: typeof product?.note === "string" ? product.note.trim().slice(0, 500) : "Specification confirmed before quotation.",
  }));
  return products.every(({ name }) => name) ? products : null;
}
