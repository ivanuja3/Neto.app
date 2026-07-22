-- ============================================================
-- NETO.APP — Cantidad vendida en una ventana reciente (30 días)
-- get_top_products() no filtra por fecha (es histórico total),
-- lo cual estaba siendo mal usado en Inventario como si fuera una
-- tasa mensual, produciendo:
--   1) "stock mínimo" = 15% del propio stock actual (autorreferencial,
--      matemáticamente imposible de disparar la alerta)
--   2) "días de cobertura" = stock / (histórico total) * 30, muy
--      distorsionado para productos con meses/años de ventas.
-- Esta función SÍ acota por fecha, para usar como base de un
-- umbral de reposición real: reorder_point ≈ demanda diaria × 7 días.
-- ============================================================

CREATE OR REPLACE FUNCTION get_recent_sales_qty(p_user_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE (
  product_id  uuid,
  qty_vendida numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.product_id,
    SUM(oi.qty) AS qty_vendida
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.user_id = p_user_id
    AND o.state NOT IN ('cancelled','returned')
    AND o.date >= (CURRENT_DATE - p_days)
  GROUP BY oi.product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
