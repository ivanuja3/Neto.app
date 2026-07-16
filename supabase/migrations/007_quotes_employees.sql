-- ============================================================
-- NETO.APP — Presupuestos y Empleados
-- ============================================================

-- ── EMPLOYEES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre          text NOT NULL,
  rol             text NOT NULL DEFAULT 'Vendedor',
  email           text,
  celular         text,
  fecha_ingreso   date NOT NULL DEFAULT CURRENT_DATE,
  activo          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── QUOTES (presupuestos) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number          text NOT NULL,
  client_name     text NOT NULL DEFAULT '',
  date            date NOT NULL DEFAULT CURRENT_DATE,
  valid_days      integer NOT NULL DEFAULT 10,
  state           text NOT NULL DEFAULT 'draft'
                  CHECK (state IN ('draft','sent','accepted','rejected')),
  notes           text NOT NULL DEFAULT '',
  amount_total    numeric NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── QUOTE_ITEMS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quote_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id            uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id          uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name        text NOT NULL,
  sku                 text,
  qty                 numeric NOT NULL DEFAULT 1,
  price_unit          numeric NOT NULL DEFAULT 0,
  price_mode          text NOT NULL DEFAULT 'list',
  price_list          numeric NOT NULL DEFAULT 0,
  price_cash          numeric,
  price_installments  numeric,
  sort_order          integer NOT NULL DEFAULT 0
);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE employees   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_data" ON employees
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_data" ON quotes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_data" ON quote_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
