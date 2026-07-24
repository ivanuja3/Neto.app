-- ============================================================
-- NETO.APP — Agrega price_cash / price_installments a products
-- BUG CRÍTICO descubierto el 2026-07-24: la tabla `products` real
-- en producción nunca tuvo estas dos columnas — ninguna migración
-- las creaba (deben haber existido en el proyecto Supabase viejo,
-- creadas a mano en el dashboard, y se perdieron en la migración
-- de proyecto del 2026-07-18 al reproducir solo los archivos .sql).
-- `database.ts`, `inventario/page.tsx`, `ventas/page.tsx` y
-- `product-import.tsx` ya asumían que existían. Resultado: CERO
-- productos se pudieron crear en producción desde el 18/07 — el
-- INSERT siempre fallaba con 400 "Could not find the 'price_cash'
-- column" (PGRST204), afectando a TODOS los usuarios reales,
-- incluido Octavio (cliente pago activo).
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS price_cash         numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_installments numeric;
