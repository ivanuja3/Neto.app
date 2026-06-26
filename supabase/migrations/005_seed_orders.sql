-- ============================================================
-- NETO.APP — Seed órdenes, compras y movimientos de stock
-- Ejecutar después de 004_seed.sql
-- Genera 6 meses de historial de ventas para que el dashboard
-- muestre datos reales (funciones get_pnl_monthly, get_kpis_*, etc.)
-- ============================================================

DO $$
DECLARE
  v_uid uuid := '7ce532b3-3dce-4aaf-b98c-1075960a043a';

  -- Productos y precios (mismo orden que 004_seed.sql)
  v_pids   uuid[] := ARRAY[
    'b1000000-0000-0000-0000-000000000001'::uuid,
    'b1000000-0000-0000-0000-000000000002'::uuid,
    'b1000000-0000-0000-0000-000000000003'::uuid,
    'b1000000-0000-0000-0000-000000000004'::uuid,
    'b1000000-0000-0000-0000-000000000005'::uuid,
    'b1000000-0000-0000-0000-000000000006'::uuid,
    'b1000000-0000-0000-0000-000000000007'::uuid,
    'b1000000-0000-0000-0000-000000000008'::uuid,
    'b1000000-0000-0000-0000-000000000009'::uuid,
    'b1000000-0000-0000-0000-000000000010'::uuid
  ];
  v_pnames text[] := ARRAY[
    'Remera Premium','Pantalón Jogger','Campera Oversize','Cinto de Cuero',
    'Zapatilla Urbana','Buzo Canguro','Gorra Snapback','Mochila Canvas',
    'Short Deportivo','Medias Pack x3'
  ];
  v_prices numeric[] := ARRAY[4500, 8900, 18500, 3200, 24000, 12000, 2800, 9500, 5200, 1800];
  v_costs  numeric[] := ARRAY[1800, 3200,  7200, 1100, 11000,  4800,  950, 3800, 1950,  600];

  -- Canales de venta
  v_chans  text[] := ARRAY['mercadolibre','tiendanube','instagram'];

  -- Ingresos objetivo por mes (Jan-Jun 2026, coincide con analytic_lines)
  v_targets numeric[] := ARRAY[2100000, 2280000, 2450000, 2620000, 2710000, 2847500];
  v_months  date[]    := ARRAY[
    '2026-01-01'::date, '2026-02-01'::date, '2026-03-01'::date,
    '2026-04-01'::date, '2026-05-01'::date, '2026-06-01'::date
  ];

  -- Temporales
  v_oid     uuid;
  v_date    date;
  v_chan    text;
  v_idx     integer;
  v_price   numeric;
  v_cost    numeric;
  v_qty     integer;
  v_subtot  numeric;
  v_ctot    numeric;
  v_avg     numeric;
  m         integer;
  i         integer;
  v_n       integer := 35; -- órdenes por mes
BEGIN

  FOR m IN 1..6 LOOP
    v_avg := v_targets[m] / v_n;

    FOR i IN 1..v_n LOOP
      v_oid  := gen_random_uuid();
      v_date := v_months[m] + ((i * 27 / v_n)::integer);

      -- Canal: 40% ML, 35% TN, 25% IG
      v_chan := CASE
        WHEN i % 20 < 8  THEN 'mercadolibre'
        WHEN i % 20 < 15 THEN 'tiendanube'
        ELSE                   'instagram'
      END;

      -- Producto rotativo
      v_idx   := 1 + ((i - 1) % 10);
      v_price := v_prices[v_idx];
      v_cost  := v_costs[v_idx];

      -- Cantidad para llegar al ticket promedio objetivo
      v_qty    := GREATEST(1, ROUND(v_avg / v_price)::integer);
      v_subtot := v_price * v_qty;
      v_ctot   := v_cost  * v_qty;

      INSERT INTO orders (
        id, user_id, date, channel, state,
        amount_subtotal, amount_total, amount_cost, payment_state
      ) VALUES (
        v_oid, v_uid, v_date, v_chan, 'delivered',
        v_subtot, v_subtot, v_ctot, 'paid'
      );

      INSERT INTO order_items (
        order_id, user_id, product_id, product_name,
        qty, price_unit, cost_unit, price_subtotal, cost_subtotal
      ) VALUES (
        v_oid, v_uid, v_pids[v_idx], v_pnames[v_idx],
        v_qty, v_price, v_cost, v_subtot, v_ctot
      );
    END LOOP;
  END LOOP;

  -- ── Órdenes de compra a proveedores ─────────────────────────
  INSERT INTO purchases (
    user_id, partner_id, purchase_number, date, date_expected,
    state, amount_subtotal, amount_total, invoice_status, notes
  )
  SELECT
    v_uid,
    p.id,
    'OC-2026-' || LPAD(ROW_NUMBER() OVER (ORDER BY p.name)::text, 3, '0'),
    oc.fecha::date,
    oc.venc::date,
    oc.estado,
    oc.monto,
    oc.monto,
    CASE WHEN oc.estado = 'received' THEN 'invoiced' ELSE 'pending' END,
    oc.nota
  FROM (VALUES
    ('Textil Sur S.A.',     '2026-04-10', '2026-04-25', 'received',  380000, 'Remeras y buzos Q2'),
    ('Distribuidora Norte', '2026-04-20', '2026-05-05', 'received',  215000, 'Pantalones jogger'),
    ('Importadora XYZ',     '2026-05-02', '2026-05-18', 'received',  540000, 'Zapatillas urbanas'),
    ('Calzados Mendoza',    '2026-05-15', '2026-05-30', 'received',  320000, 'Calzado temporada invierno'),
    ('Textil Sur S.A.',     '2026-06-01', '2026-06-20', 'confirmed', 425000, 'Camperas oversize Q3'),
    ('Distribuidora Norte', '2026-06-10', '2026-06-25', 'confirmed', 188000, 'Gorras y accesorios'),
    ('Importadora XYZ',     '2026-05-28', '2026-06-10', 'confirmed', 312000, 'Mochilas canvas'),
    ('Calzados Mendoza',    '2026-04-05', '2026-04-15', 'received',  175000, 'Shorts deportivos')
  ) AS oc(proveedor, fecha, venc, estado, monto, nota)
  JOIN partners p ON p.user_id = v_uid AND p.name = oc.proveedor;

  -- ── Movimientos de stock ─────────────────────────────────────
  INSERT INTO stock_moves (user_id, product_id, type, qty, cost_unit, date, notes)
  VALUES
    -- Entradas recientes
    (v_uid, 'b1000000-0000-0000-0000-000000000001', 'in',  100, 1800, '2026-05-20', 'Reposición Remeras Q2'),
    (v_uid, 'b1000000-0000-0000-0000-000000000002', 'in',   80, 3200, '2026-05-22', 'Pantalones jogger Lote 5'),
    (v_uid, 'b1000000-0000-0000-0000-000000000003', 'in',   40, 7200, '2026-06-02', 'Camperas oversize Junio'),
    (v_uid, 'b1000000-0000-0000-0000-000000000005', 'in',   30, 11000,'2026-06-05', 'Zapatillas urbanas Invierno'),
    (v_uid, 'b1000000-0000-0000-0000-000000000006', 'in',   60, 4800, '2026-06-08', 'Buzos canguro Junio'),
    -- Salidas por ventas
    (v_uid, 'b1000000-0000-0000-0000-000000000001', 'out',  42, 1800, '2026-06-15', 'Ventas semana 1-2 Junio'),
    (v_uid, 'b1000000-0000-0000-0000-000000000007', 'out',  38, 950,  '2026-06-16', 'Ventas gorras Junio'),
    (v_uid, 'b1000000-0000-0000-0000-000000000009', 'out',  25, 1950, '2026-06-17', 'Ventas shorts Junio'),
    (v_uid, 'b1000000-0000-0000-0000-000000000004', 'out',  55, 1100, '2026-06-18', 'Ventas cintos Junio'),
    (v_uid, 'b1000000-0000-0000-0000-000000000010', 'out',  60, 600,  '2026-06-19', 'Ventas medias Junio'),
    -- Ajustes
    (v_uid, 'b1000000-0000-0000-0000-000000000008', 'adjustment', 52, 3800, '2026-06-01', 'Recuento físico mochilas'),
    (v_uid, 'b1000000-0000-0000-0000-000000000002', 'out',  18, 3200, '2026-06-20', 'Ventas pantalones semana 3');

END $$;
