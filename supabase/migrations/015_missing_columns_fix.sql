-- ============================================================
-- NETO.APP — Segunda tanda de columnas perdidas en la migración
-- de proyecto Supabase del 2026-07-18 (ver 014_products_price_columns.sql
-- para el contexto completo del bug).
--
-- Auditoría completa 2026-07-24 de src/lib/db/*.ts contra el
-- schema real en producción encontró dos casos más:
--
-- 1. orders.payment_method — usado en ventas/page.tsx, caja/page.tsx
--    y orders.ts (createOrder) en CADA venta. Sin esta columna,
--    TODA venta manual o por POS fallaba con 400 (PGRST204).
-- 2. partners.payment_terms / partners.lead_time — usado en
--    purchases.ts (createSupplier/updateSupplier) y proveedores/page.tsx
--    en CADA alta o edición de proveedor. Sin estas columnas,
--    TODO alta de proveedor fallaba con el mismo error.
--
-- Combinado con products.price_cash/price_installments (014), esto
-- significa que Ventas, Caja/POS y Proveedores estuvieron rotos
-- para carga real de datos desde el 18/07 hasta hoy — afectando a
-- todos los usuarios reales, incluido Octavio (cliente pago activo,
-- 0 filas en orders/products/partners pese a tener la cuenta activada
-- hace 2 días).
-- ============================================================

ALTER TABLE orders   ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS payment_terms  text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS lead_time      integer;
