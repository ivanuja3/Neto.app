-- ============================================================
-- NETO.APP — Funciones SQL
-- Cálculos de KPIs, CM1/CM2/CM3, P&L
-- Inspirado en la lógica de account module de Odoo
-- ============================================================

-- ── Función: P&L mensual ──────────────────────────────────────
-- Devuelve ingresos, COGS, CM1, gastos marketing, CM2, gastos fijos, CM3
-- por mes para un usuario dado
CREATE OR REPLACE FUNCTION get_pnl_monthly(p_user_id uuid, p_months integer DEFAULT 6)
RETURNS TABLE (
  mes             text,
  ingresos        numeric,
  cogs            numeric,
  cm1             numeric,
  cm1_pct         numeric,
  marketing       numeric,
  logistica       numeric,
  cm2             numeric,
  cm2_pct         numeric,
  gastos_fijos    numeric,
  cm3             numeric,
  cm3_pct         numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH meses AS (
    SELECT
      to_char(date_trunc('month', generate_series(
        date_trunc('month', now()) - (p_months - 1) * interval '1 month',
        date_trunc('month', now()),
        '1 month'
      )), 'YYYY-MM') AS mes_key
  ),
  ventas AS (
    SELECT
      to_char(date_trunc('month', date), 'YYYY-MM') AS mes_key,
      SUM(amount_total)  AS ingresos,
      SUM(amount_cost)   AS cogs
    FROM orders
    WHERE user_id = p_user_id
      AND state NOT IN ('cancelled','returned')
    GROUP BY 1
  ),
  analitico AS (
    SELECT
      to_char(date_trunc('month', date), 'YYYY-MM') AS mes_key,
      category,
      SUM(ABS(amount)) AS total
    FROM analytic_lines
    WHERE user_id = p_user_id
      AND category IN ('marketing','logistica','fijo')
    GROUP BY 1, 2
  ),
  pivot AS (
    SELECT
      mes_key,
      SUM(CASE WHEN category = 'marketing'  THEN total ELSE 0 END) AS mkt,
      SUM(CASE WHEN category = 'logistica'  THEN total ELSE 0 END) AS log,
      SUM(CASE WHEN category = 'fijo'       THEN total ELSE 0 END) AS fij
    FROM analitico
    GROUP BY mes_key
  )
  SELECT
    m.mes_key AS mes,
    COALESCE(v.ingresos, 0)                                     AS ingresos,
    COALESCE(v.cogs, 0)                                         AS cogs,
    COALESCE(v.ingresos, 0) - COALESCE(v.cogs, 0)              AS cm1,
    CASE WHEN COALESCE(v.ingresos, 0) > 0
         THEN ROUND(((COALESCE(v.ingresos,0) - COALESCE(v.cogs,0)) / v.ingresos * 100)::numeric, 1)
         ELSE 0 END                                             AS cm1_pct,
    COALESCE(p.mkt, 0)                                          AS marketing,
    COALESCE(p.log, 0)                                          AS logistica,
    COALESCE(v.ingresos,0) - COALESCE(v.cogs,0)
      - COALESCE(p.mkt,0) - COALESCE(p.log,0)                  AS cm2,
    CASE WHEN COALESCE(v.ingresos, 0) > 0
         THEN ROUND(((COALESCE(v.ingresos,0) - COALESCE(v.cogs,0)
              - COALESCE(p.mkt,0) - COALESCE(p.log,0)) / v.ingresos * 100)::numeric, 1)
         ELSE 0 END                                             AS cm2_pct,
    COALESCE(p.fij, 0)                                          AS gastos_fijos,
    COALESCE(v.ingresos,0) - COALESCE(v.cogs,0)
      - COALESCE(p.mkt,0) - COALESCE(p.log,0)
      - COALESCE(p.fij,0)                                       AS cm3,
    CASE WHEN COALESCE(v.ingresos, 0) > 0
         THEN ROUND(((COALESCE(v.ingresos,0) - COALESCE(v.cogs,0)
              - COALESCE(p.mkt,0) - COALESCE(p.log,0)
              - COALESCE(p.fij,0)) / v.ingresos * 100)::numeric, 1)
         ELSE 0 END                                             AS cm3_pct
  FROM meses m
  LEFT JOIN ventas v ON v.mes_key = m.mes_key
  LEFT JOIN pivot  p ON p.mes_key = m.mes_key
  ORDER BY m.mes_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Función: KPIs del período actual ─────────────────────────
CREATE OR REPLACE FUNCTION get_kpis_current_month(p_user_id uuid)
RETURNS TABLE (
  ingresos          numeric,
  ordenes           bigint,
  ticket_promedio   numeric,
  cm3               numeric,
  cm3_pct           numeric,
  roas              numeric,
  spend_ads         numeric,
  vs_mes_anterior   numeric
) AS $$
DECLARE
  v_mes_actual   text := to_char(now(), 'YYYY-MM');
  v_mes_anterior text := to_char(now() - interval '1 month', 'YYYY-MM');
BEGIN
  RETURN QUERY
  WITH actual AS (
    SELECT
      COALESCE(SUM(amount_total), 0) AS ing,
      COUNT(*)                        AS ords,
      COALESCE(AVG(amount_total), 0)  AS ticket,
      COALESCE(SUM(amount_total - amount_cost), 0) AS ganancia
    FROM orders
    WHERE user_id = p_user_id
      AND to_char(date, 'YYYY-MM') = v_mes_actual
      AND state NOT IN ('cancelled','returned')
  ),
  anterior AS (
    SELECT COALESCE(SUM(amount_total), 0) AS ing
    FROM orders
    WHERE user_id = p_user_id
      AND to_char(date, 'YYYY-MM') = v_mes_anterior
      AND state NOT IN ('cancelled','returned')
  ),
  ads AS (
    SELECT COALESCE(SUM(spend), 0) AS total_spend,
           COALESCE(SUM(revenue_attributed), 0) AS rev_attr
    FROM ad_campaigns
    WHERE user_id = p_user_id
      AND date_start <= CURRENT_DATE
      AND (date_end IS NULL OR date_end >= date_trunc('month', CURRENT_DATE))
  ),
  fijos AS (
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE user_id = p_user_id AND active = true AND type = 'fixed'
  )
  SELECT
    a.ing,
    a.ords,
    a.ticket,
    a.ganancia - f.total                                        AS cm3,
    CASE WHEN a.ing > 0
         THEN ROUND(((a.ganancia - f.total) / a.ing * 100)::numeric, 1)
         ELSE 0 END                                             AS cm3_pct,
    CASE WHEN d.total_spend > 0
         THEN ROUND((d.rev_attr / d.total_spend)::numeric, 2)
         ELSE 0 END                                             AS roas,
    d.total_spend,
    CASE WHEN ant.ing > 0
         THEN ROUND(((a.ing - ant.ing) / ant.ing * 100)::numeric, 1)
         ELSE 0 END                                             AS vs_mes_anterior
  FROM actual a, anterior ant, ads d, fijos f;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Función: top productos por margen ────────────────────────
CREATE OR REPLACE FUNCTION get_top_products(p_user_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE (
  product_id    uuid,
  product_name  text,
  qty_vendida   numeric,
  ingresos      numeric,
  costo         numeric,
  margen        numeric,
  margen_pct    numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.product_id,
    oi.product_name,
    SUM(oi.qty)             AS qty_vendida,
    SUM(oi.price_subtotal)  AS ingresos,
    SUM(oi.cost_subtotal)   AS costo,
    SUM(oi.margin)          AS margen,
    CASE WHEN SUM(oi.price_subtotal) > 0
         THEN ROUND((SUM(oi.margin) / SUM(oi.price_subtotal) * 100)::numeric, 1)
         ELSE 0
    END                     AS margen_pct
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.user_id = p_user_id
    AND o.state NOT IN ('cancelled','returned')
  GROUP BY oi.product_id, oi.product_name
  ORDER BY margen DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Función: ventas por canal ─────────────────────────────────
CREATE OR REPLACE FUNCTION get_sales_by_channel(p_user_id uuid, p_months integer DEFAULT 3)
RETURNS TABLE (
  channel     text,
  ordenes     bigint,
  ingresos    numeric,
  margen      numeric,
  margen_pct  numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.channel,
    COUNT(*)                AS ordenes,
    SUM(o.amount_total)     AS ingresos,
    SUM(o.margin)           AS margen,
    CASE WHEN SUM(o.amount_total) > 0
         THEN ROUND((SUM(o.margin) / SUM(o.amount_total) * 100)::numeric, 1)
         ELSE 0
    END                     AS margen_pct
  FROM orders o
  WHERE o.user_id = p_user_id
    AND o.date >= CURRENT_DATE - (p_months * 30)
    AND o.state NOT IN ('cancelled','returned')
  GROUP BY o.channel
  ORDER BY ingresos DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Función: actualizar nivel de inventario ───────────────────
-- Se llama después de cada stock_move (trigger o manual)
-- Implementa costo promedio ponderado (como Odoo con costing_method='average')
CREATE OR REPLACE FUNCTION update_inventory_level(
  p_user_id   uuid,
  p_product_id uuid,
  p_qty        numeric,
  p_cost_unit  numeric,
  p_type       text
) RETURNS void AS $$
DECLARE
  v_current_qty    numeric;
  v_current_cost   numeric;
  v_new_qty        numeric;
  v_new_avg_cost   numeric;
BEGIN
  SELECT qty_on_hand, avg_cost
  INTO v_current_qty, v_current_cost
  FROM inventory_levels
  WHERE user_id = p_user_id AND product_id = p_product_id;

  IF NOT FOUND THEN
    INSERT INTO inventory_levels(user_id, product_id, qty_on_hand, avg_cost)
    VALUES (p_user_id, p_product_id, 0, 0);
    v_current_qty  := 0;
    v_current_cost := 0;
  END IF;

  IF p_type = 'in' THEN
    -- Costo promedio ponderado (como Odoo average costing method)
    v_new_qty := v_current_qty + p_qty;
    IF v_new_qty > 0 THEN
      v_new_avg_cost := ((v_current_qty * v_current_cost) + (p_qty * p_cost_unit)) / v_new_qty;
    ELSE
      v_new_avg_cost := p_cost_unit;
    END IF;
  ELSIF p_type IN ('out','return') THEN
    v_new_qty      := v_current_qty - p_qty;
    v_new_avg_cost := v_current_cost;
  ELSE
    -- adjustment: sobreescribe
    v_new_qty      := p_qty;
    v_new_avg_cost := CASE WHEN p_cost_unit > 0 THEN p_cost_unit ELSE v_current_cost END;
  END IF;

  UPDATE inventory_levels
  SET qty_on_hand  = v_new_qty,
      avg_cost     = v_new_avg_cost,
      last_updated = now()
  WHERE user_id = p_user_id AND product_id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
