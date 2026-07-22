-- ============================================================
-- NETO.APP — Constraint único en orders para evitar duplicados
-- El sync de Tienda Nube (/api/tiendanube/sync) y el webhook de
-- ordenes deduplicaban leyendo order_number en memoria antes de
-- insertar, sin ningún respaldo a nivel de base — dos syncs en
-- paralelo (doble click, webhook + sync manual solapados) podían
-- insertar la misma orden dos veces. Este constraint hace que el
-- ON CONFLICT DO NOTHING del código sea la garantía real.
-- ============================================================

-- Primero, por las dudas, eliminar duplicados que ya existan
DELETE FROM order_items oi
USING orders o
WHERE oi.order_id = o.id
  AND o.id NOT IN (
    SELECT DISTINCT ON (user_id, channel, order_number) id
    FROM orders
    WHERE channel IS NOT NULL AND order_number IS NOT NULL
    ORDER BY user_id, channel, order_number, created_at ASC
  )
  AND o.channel IS NOT NULL AND o.order_number IS NOT NULL;

DELETE FROM orders
WHERE channel IS NOT NULL AND order_number IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT ON (user_id, channel, order_number) id
    FROM orders
    WHERE channel IS NOT NULL AND order_number IS NOT NULL
    ORDER BY user_id, channel, order_number, created_at ASC
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_user_channel_number_unique'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_user_channel_number_unique
      UNIQUE (user_id, channel, order_number);
  END IF;
END $$;
