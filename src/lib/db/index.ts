// ── Re-export de toda la capa de queries ──────────────────────
export * from "./orders";
export * from "./products";
export * from "./analytics";

// ── Queries de Proveedores ────────────────────────────────────
export { getSuppliers, getPurchases, createPurchase } from "./purchases";

// ── Queries de Campañas ───────────────────────────────────────
export { getAdCampaigns, getAdSummary } from "./campaigns";
