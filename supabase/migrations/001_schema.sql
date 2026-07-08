 -- ============================================================
-- NETO.APP — Schema v1.0 (inspirado en modelos de Odoo 17)
-- Aprendido de: account.move, sale.order, stock.quant,
--               purchase.order, analytic.line, product.template
-- ============================================================

-- ── Extensiones ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── COMPANIES (configuración del negocio por usuario) ────────
-- Inspirado en res.company de Odoo
CREATE TABLE IF NOT EXISTS companies (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  cuit                text,
  address             text,
  phone               text,
  email               text,
  currency            text NOT NULL DEFAULT 'ARS',
  fiscal_year_start   integer NOT NULL DEFAULT 1,        -- mes 1-12
  tax_regime          text DEFAULT 'responsable_inscripto',
  industry            text DEFAULT 'ecommerce',
  monthly_goal        numeric,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)                                        -- 1 empresa por usuario (por ahora)
);

-- ── PARTNERS (clientes y proveedores) ────────────────────────
-- Inspirado en res.partner de Odoo
CREATE TABLE IF NOT EXISTS partners (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  type        text NOT NULL DEFAULT 'customer'
              CHECK (type IN ('customer','supplier','both')),
  cuit        text,
  email       text,
  phone       text,
  address     text,
  notes       text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── CATEGORÍAS DE PRODUCTOS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS product_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  parent_id   uuid REFERENCES product_categories(id)
);

-- ── PRODUCTOS ─────────────────────────────────────────────────
-- Inspirado en product.template + product.product de Odoo
-- Simplificado: un registro por SKU (sin variantes por ahora)
CREATE TABLE IF NOT EXISTS products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  sku             text,
  barcode         text,
  category_id     uuid REFERENCES product_categories(id),
  type            text NOT NULL DEFAULT 'physical'
                  CHECK (type IN ('physical','service','digital')),
  list_price      numeric(14,2) NOT NULL DEFAULT 0,     -- precio de venta
  standard_cost   numeric(14,2) NOT NULL DEFAULT 0,     -- costo estándar (como standard_price en Odoo)
  active          boolean NOT NULL DEFAULT true,
  image_url       text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── NIVELES DE INVENTARIO ─────────────────────────────────────
-- Inspirado en stock.quant de Odoo (cantidad disponible por producto)
CREATE TABLE IF NOT EXISTS inventory_levels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty_on_hand     numeric(14,3) NOT NULL DEFAULT 0,
  qty_reserved    numeric(14,3) NOT NULL DEFAULT 0,
  avg_cost        numeric(14,2) NOT NULL DEFAULT 0,     -- costo promedio ponderado
  last_updated    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- ── MOVIMIENTOS DE STOCK ──────────────────────────────────────
-- Inspirado en stock.move + stock.valuation.layer de Odoo
CREATE TABLE IF NOT EXISTS stock_moves (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id),
  type        text NOT NULL
              CHECK (type IN ('in','out','adjustment','return')),
  qty         numeric(14,3) NOT NULL,
  cost_unit   numeric(14,2) NOT NULL DEFAULT 0,
  ref_type    text CHECK (ref_type IN ('order','purchase','adjustment','manual')),
  ref_id      uuid,
  date        date NOT NULL DEFAULT CURRENT_DATE,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── ÓRDENES DE VENTA ─────────────────────────────────────────
-- Inspirado en sale.order de Odoo
-- Columnas de margen calculadas automáticamente (como @property en Odoo)
CREATE TABLE IF NOT EXISTS orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id        uuid REFERENCES partners(id),
  order_number      text,
  date              date NOT NULL DEFAULT CURRENT_DATE,
  state             text NOT NULL DEFAULT 'confirmed'
                    CHECK (state IN ('draft','confirmed','shipped','delivered','cancelled','returned')),
  channel           text NOT NULL DEFAULT 'tiendanube'
                    CHECK (channel IN ('tiendanube','mercadolibre','whatsapp','instagram','web','other')),
  -- importes (como amount_* en account.move de Odoo)
  amount_subtotal   numeric(14,2) NOT NULL DEFAULT 0,
  amount_discount   numeric(14,2) NOT NULL DEFAULT 0,
  amount_shipping   numeric(14,2) NOT NULL DEFAULT 0,
  amount_tax        numeric(14,2) NOT NULL DEFAULT 0,
  amount_total      numeric(14,2) NOT NULL DEFAULT 0,
  amount_cost       numeric(14,2) NOT NULL DEFAULT 0,
  -- margen calculado (como campo computed/stored en Odoo)
  margin            numeric(14,2) GENERATED ALWAYS AS (amount_total - amount_cost) STORED,
  margin_percent    numeric(6,2) GENERATED ALWAYS AS (
    CASE WHEN amount_total > 0
         THEN ROUND(((amount_total - amount_cost) / amount_total * 100)::numeric, 2)
         ELSE 0
    END
  ) STORED,
  -- estado de pago (como payment_state en account.move de Odoo)
  payment_state     text NOT NULL DEFAULT 'not_paid'
                    CHECK (payment_state IN ('not_paid','paid','partial','refunded')),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ── LÍNEAS DE ORDEN ───────────────────────────────────────────
-- Inspirado en sale.order.line de Odoo
CREATE TABLE IF NOT EXISTS order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id      uuid REFERENCES products(id),
  product_name    text NOT NULL,               -- desnormalizado (Odoo también lo hace)
  qty             numeric(14,3) NOT NULL DEFAULT 1,
  price_unit      numeric(14,2) NOT NULL DEFAULT 0,
  discount_pct    numeric(6,2) NOT NULL DEFAULT 0,
  cost_unit       numeric(14,2) NOT NULL DEFAULT 0,
  price_subtotal  numeric(14,2) NOT NULL DEFAULT 0,
  cost_subtotal   numeric(14,2) NOT NULL DEFAULT 0,
  margin          numeric(14,2) GENERATED ALWAYS AS (price_subtotal - cost_subtotal) STORED
);

-- ── ÓRDENES DE COMPRA A PROVEEDORES ──────────────────────────
-- Inspirado en purchase.order de Odoo
CREATE TABLE IF NOT EXISTS purchases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id      uuid REFERENCES partners(id),
  purchase_number text,
  date            date NOT NULL DEFAULT CURRENT_DATE,
  date_expected   date,
  state           text NOT NULL DEFAULT 'draft'
                  CHECK (state IN ('draft','confirmed','received','invoiced','cancelled')),
  amount_subtotal numeric(14,2) NOT NULL DEFAULT 0,
  amount_tax      numeric(14,2) NOT NULL DEFAULT 0,
  amount_total    numeric(14,2) NOT NULL DEFAULT 0,
  invoice_status  text NOT NULL DEFAULT 'pending'
                  CHECK (invoice_status IN ('pending','partial','invoiced')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── LÍNEAS DE COMPRA ──────────────────────────────────────────
-- Inspirado en purchase.order.line de Odoo
CREATE TABLE IF NOT EXISTS purchase_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id     uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id      uuid REFERENCES products(id),
  product_name    text NOT NULL,
  qty             numeric(14,3) NOT NULL DEFAULT 1,
  price_unit      numeric(14,2) NOT NULL DEFAULT 0,
  price_subtotal  numeric(14,2) NOT NULL DEFAULT 0
);

-- ── GASTOS / COSTOS OPERATIVOS ────────────────────────────────
-- Separación fijos/variables (Odoo lo hace via account_type)
CREATE TABLE IF NOT EXISTS expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  category    text NOT NULL,
  type        text NOT NULL DEFAULT 'fixed'
              CHECK (type IN ('fixed','variable')),
  amount      numeric(14,2) NOT NULL DEFAULT 0,
  frequency   text NOT NULL DEFAULT 'monthly'
              CHECK (frequency IN ('one_time','monthly','quarterly','yearly')),
  date        date NOT NULL DEFAULT CURRENT_DATE,
  active      boolean NOT NULL DEFAULT true,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── CAMPAÑAS DE META ADS ──────────────────────────────────────
-- Sin equivalente directo en Odoo — módulo propio de Neto
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  platform            text NOT NULL DEFAULT 'meta'
                      CHECK (platform IN ('meta','google','tiktok','other')),
  objective           text,
  budget_daily        numeric(14,2) NOT NULL DEFAULT 0,
  budget_total        numeric(14,2),
  spend               numeric(14,2) NOT NULL DEFAULT 0,
  impressions         bigint NOT NULL DEFAULT 0,
  clicks              integer NOT NULL DEFAULT 0,
  orders_attributed   integer NOT NULL DEFAULT 0,
  revenue_attributed  numeric(14,2) NOT NULL DEFAULT 0,
  -- métricas calculadas por función
  ctr                 numeric(6,4) GENERATED ALWAYS AS (
    CASE WHEN impressions > 0 THEN ROUND((clicks::numeric / impressions * 100)::numeric, 4) ELSE 0 END
  ) STORED,
  roas                numeric(8,2) GENERATED ALWAYS AS (
    CASE WHEN spend > 0 THEN ROUND((revenue_attributed / spend)::numeric, 2) ELSE 0 END
  ) STORED,
  cpa                 numeric(14,2) GENERATED ALWAYS AS (
    CASE WHEN orders_attributed > 0 THEN ROUND((spend / orders_attributed)::numeric, 2) ELSE 0 END
  ) STORED,
  state               text NOT NULL DEFAULT 'active'
                      CHECK (state IN ('active','paused','ended')),
  date_start          date NOT NULL,
  date_end            date,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── LÍNEAS ANALÍTICAS ─────────────────────────────────────────
-- Inspirado en account.analytic.line de Odoo
-- Permite calcular P&L, CM1/CM2/CM3 por período/canal
CREATE TABLE IF NOT EXISTS analytic_lines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        date NOT NULL DEFAULT CURRENT_DATE,
  name        text NOT NULL,
  category    text NOT NULL,   -- 'venta','cogs','marketing','logistica','fijo','impuesto'
  amount      numeric(14,2) NOT NULL, -- positivo=ingreso, negativo=costo
  channel     text,            -- canal de venta (ml, tn, etc.)
  ref_type    text CHECK (ref_type IN ('order','purchase','expense','campaign','manual')),
  ref_id      uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── ÍNDICES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user_date   ON orders(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_state        ON orders(user_id, state);
CREATE INDEX IF NOT EXISTS idx_orders_channel      ON orders(user_id, channel);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_product ON stock_moves(user_id, product_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_analytic_date       ON analytic_lines(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_analytic_category   ON analytic_lines(user_id, category);
CREATE INDEX IF NOT EXISTS idx_expenses_user       ON expenses(user_id, active);
CREATE INDEX IF NOT EXISTS idx_purchases_user_date ON purchases(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_user   ON ad_campaigns(user_id, state);
CREATE INDEX IF NOT EXISTS idx_products_user       ON products(user_id, active);
CREATE INDEX IF NOT EXISTS idx_partners_user       ON partners(user_id, type);
