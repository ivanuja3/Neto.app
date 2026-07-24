-- ============================================================
-- NETO.APP — Centros de costo ("cajas") + transferencias entre ellos
-- Caso real: un cliente tiene dos unidades bajo la misma cuenta
-- (ej. colegio + salón de eventos) que hoy mezcla en un solo
-- Excel, y necesita separar ingresos/gastos por unidad y trackear
-- los préstamos de plata entre una caja y la otra sin depender
-- de la memoria. Es una dimensión opcional: orders/expenses sin
-- cost_center_id siguen funcionando igual que antes (negocio de
-- una sola unidad, el caso más común).
-- ============================================================

CREATE TABLE IF NOT EXISTS cost_centers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_data" ON cost_centers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Dimensión opcional en orders/expenses. ON DELETE SET NULL porque
-- borrar (desactivar) un centro de costo nunca debe romper el
-- historial de ventas/gastos ya cargado.
ALTER TABLE orders   ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES cost_centers(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES cost_centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_cost_center   ON orders(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_expenses_cost_center ON expenses(cost_center_id);

-- Transferencias/préstamos entre centros de costo. "from" le prestó
-- plata a "to" — el saldo de cada centro se deriva sumando estos
-- movimientos (from = prestó, to = recibió), no hay columna de
-- saldo que proteger con trigger: siempre se recalcula en el
-- cliente a partir de esta tabla, que es el libro mayor real.
CREATE TABLE IF NOT EXISTS cost_center_transfers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                date NOT NULL DEFAULT current_date,
  from_cost_center_id uuid NOT NULL REFERENCES cost_centers(id) ON DELETE RESTRICT,
  to_cost_center_id   uuid NOT NULL REFERENCES cost_centers(id) ON DELETE RESTRICT,
  amount              numeric(14,2) NOT NULL CHECK (amount > 0),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (from_cost_center_id <> to_cost_center_id)
);

ALTER TABLE cost_center_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_data" ON cost_center_transfers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_transfers_from ON cost_center_transfers(from_cost_center_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to   ON cost_center_transfers(to_cost_center_id);
