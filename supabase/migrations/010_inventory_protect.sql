-- ============================================================
-- NETO.APP — Protege qty_on_hand/avg_cost de inventory_levels
-- Mismo patrón que 008_billing.sql: la RLS "own_data" deja al
-- dueño de la fila hacer UPDATE de cualquier columna, incluyendo
-- qty_on_hand/avg_cost — que deberían derivarse SOLO de
-- update_inventory_level() (costo promedio ponderado a partir de
-- stock_moves), nunca de una escritura directa del cliente.
--
-- A diferencia del trigger de billing, acá no alcanza con chequear
-- current_setting('role') = 'service_role', porque la escritura
-- legítima pasa por un RPC (update_inventory_level, SECURITY
-- DEFINER) invocado por el usuario autenticado — no por el
-- service_role. Por eso el RPC marca la transacción como
-- "confiable" con una variable local antes de escribir, y el
-- trigger solo permite el UPDATE si esa marca está presente.
-- ============================================================

CREATE OR REPLACE FUNCTION protect_inventory_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role') <> 'service_role'
     AND current_setting('neto.trusted_inventory_write', true) IS DISTINCT FROM 'on' THEN
    NEW.qty_on_hand := OLD.qty_on_hand;
    NEW.avg_cost    := OLD.avg_cost;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS inventory_levels_readonly ON inventory_levels;
CREATE TRIGGER inventory_levels_readonly
  BEFORE UPDATE ON inventory_levels
  FOR EACH ROW EXECUTE FUNCTION protect_inventory_columns();

-- update_inventory_level() marca la transacción como confiable
-- (set_config con is_local=true: se resetea solo al terminar la
-- transacción, no persiste ni se filtra a otras requests) justo
-- antes de la escritura real.
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
    v_new_qty      := p_qty;
    v_new_avg_cost := CASE WHEN p_cost_unit > 0 THEN p_cost_unit ELSE v_current_cost END;
  END IF;

  PERFORM set_config('neto.trusted_inventory_write', 'on', true);

  UPDATE inventory_levels
  SET qty_on_hand  = v_new_qty,
      avg_cost     = v_new_avg_cost,
      last_updated = now()
  WHERE user_id = p_user_id AND product_id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
