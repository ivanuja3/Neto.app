-- ============================================================
-- NETO.APP — Row Level Security (RLS)
-- Cada usuario solo ve y modifica sus propios datos
-- Patrón: auth.uid() = user_id en cada tabla
-- ============================================================

-- ── Habilitar RLS en todas las tablas ────────────────────────
ALTER TABLE companies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_levels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_moves       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases         ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytic_lines    ENABLE ROW LEVEL SECURITY;

-- ── Políticas: usuario gestiona solo sus propios datos ────────

CREATE POLICY "own_data" ON companies
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_data" ON partners
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_data" ON product_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_data" ON products
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_data" ON inventory_levels
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_data" ON stock_moves
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_data" ON orders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_data" ON order_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_data" ON purchases
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_data" ON purchase_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_data" ON expenses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_data" ON ad_campaigns
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_data" ON analytic_lines
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
