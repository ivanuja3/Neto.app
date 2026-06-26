-- ============================================================
-- NETO.APP — Seed Data (conversión del mock-data actual)
-- Ejecutar DESPUÉS de crear un usuario en Supabase Auth
-- Reemplazar 'TU-USER-ID-ACÁ' con el UUID real del usuario
-- ============================================================

-- IMPORTANTE: reemplazá este valor con tu user_id de Supabase Auth
DO $$
DECLARE
  v_uid uuid := '7ce532b3-3dce-4aaf-b98c-1075960a043a';
BEGIN

-- ── Empresa ──────────────────────────────────────────────────
INSERT INTO companies (user_id, name, cuit, currency, tax_regime, industry)
VALUES (v_uid, 'Mi Negocio', '20-12345678-9', 'ARS', 'responsable_inscripto', 'ecommerce')
ON CONFLICT (user_id) DO NOTHING;

-- ── Categorías de productos ───────────────────────────────────
INSERT INTO product_categories (id, user_id, name) VALUES
  ('a1000000-0000-0000-0000-000000000001', v_uid, 'Indumentaria'),
  ('a1000000-0000-0000-0000-000000000002', v_uid, 'Accesorios'),
  ('a1000000-0000-0000-0000-000000000003', v_uid, 'Calzado')
ON CONFLICT DO NOTHING;

-- ── Productos (top 10 del mock) ──────────────────────────────
INSERT INTO products (id, user_id, name, sku, category_id, list_price, standard_cost) VALUES
  ('b1000000-0000-0000-0000-000000000001', v_uid, 'Remera Premium',    'REM-001', 'a1000000-0000-0000-0000-000000000001', 4500,  1800),
  ('b1000000-0000-0000-0000-000000000002', v_uid, 'Pantalón Jogger',   'PAN-001', 'a1000000-0000-0000-0000-000000000001', 8900,  3200),
  ('b1000000-0000-0000-0000-000000000003', v_uid, 'Campera Oversize',  'CAM-001', 'a1000000-0000-0000-0000-000000000001', 18500, 7200),
  ('b1000000-0000-0000-0000-000000000004', v_uid, 'Cinto de Cuero',    'CIN-001', 'a1000000-0000-0000-0000-000000000002', 3200,  1100),
  ('b1000000-0000-0000-0000-000000000005', v_uid, 'Zapatilla Urbana',  'ZAP-001', 'a1000000-0000-0000-0000-000000000003', 24000, 11000),
  ('b1000000-0000-0000-0000-000000000006', v_uid, 'Buzo Canguro',      'BUZ-001', 'a1000000-0000-0000-0000-000000000001', 12000, 4800),
  ('b1000000-0000-0000-0000-000000000007', v_uid, 'Gorra Snapback',    'GOR-001', 'a1000000-0000-0000-0000-000000000002', 2800,  950),
  ('b1000000-0000-0000-0000-000000000008', v_uid, 'Mochila Canvas',    'MOC-001', 'a1000000-0000-0000-0000-000000000002', 9500,  3800),
  ('b1000000-0000-0000-0000-000000000009', v_uid, 'Short Deportivo',   'SHO-001', 'a1000000-0000-0000-0000-000000000001', 5200,  1950),
  ('b1000000-0000-0000-0000-000000000010', v_uid, 'Medias Pack x3',    'MED-001', 'a1000000-0000-0000-0000-000000000002', 1800,  600)
ON CONFLICT DO NOTHING;

-- ── Niveles de inventario ────────────────────────────────────
INSERT INTO inventory_levels (user_id, product_id, qty_on_hand, avg_cost) VALUES
  (v_uid, 'b1000000-0000-0000-0000-000000000001', 142, 1800),
  (v_uid, 'b1000000-0000-0000-0000-000000000002', 87,  3200),
  (v_uid, 'b1000000-0000-0000-0000-000000000003', 34,  7200),
  (v_uid, 'b1000000-0000-0000-0000-000000000004', 210, 1100),
  (v_uid, 'b1000000-0000-0000-0000-000000000005', 28,  11000),
  (v_uid, 'b1000000-0000-0000-0000-000000000006', 95,  4800),
  (v_uid, 'b1000000-0000-0000-0000-000000000007', 167, 950),
  (v_uid, 'b1000000-0000-0000-0000-000000000008', 52,  3800),
  (v_uid, 'b1000000-0000-0000-0000-000000000009', 73,  1950),
  (v_uid, 'b1000000-0000-0000-0000-000000000010', 89,  600)
ON CONFLICT (user_id, product_id) DO NOTHING;

-- ── Proveedores ──────────────────────────────────────────────
INSERT INTO partners (user_id, name, type, cuit, phone) VALUES
  (v_uid, 'Textil Sur S.A.',      'supplier', '30-71234567-1', '011-4321-5678'),
  (v_uid, 'Distribuidora Norte',  'supplier', '30-68765432-2', '011-5678-1234'),
  (v_uid, 'Importadora XYZ',      'supplier', '30-55443322-3', '011-4444-9999'),
  (v_uid, 'Calzados Mendoza',     'supplier', '30-99887766-4', '0261-444-5555')
ON CONFLICT DO NOTHING;

-- ── Gastos (desde mock de costos) ────────────────────────────
INSERT INTO expenses (user_id, name, category, type, amount, frequency, date) VALUES
  (v_uid, 'Alquiler depósito',       'Infraestructura', 'fixed',    85000,   'monthly', CURRENT_DATE),
  (v_uid, 'Sueldos y cargas',        'Personal',        'fixed',    180000,  'monthly', CURRENT_DATE),
  (v_uid, 'Servicios (luz/internet)','Infraestructura', 'fixed',    22000,   'monthly', CURRENT_DATE),
  (v_uid, 'Software y suscripciones','Tecnología',      'fixed',    18000,   'monthly', CURRENT_DATE),
  (v_uid, 'Contador / asesoría',     'Profesional',     'fixed',    35000,   'monthly', CURRENT_DATE),
  (v_uid, 'COGS (costo de producto)','Producto',        'variable', 1138400, 'monthly', CURRENT_DATE),
  (v_uid, 'Envíos / logística',      'Logística',       'variable', 284750,  'monthly', CURRENT_DATE),
  (v_uid, 'Comisiones ML / TN',      'Comisiones',      'variable', 227800,  'monthly', CURRENT_DATE),
  (v_uid, 'Meta Ads',                'Marketing',       'variable', 426000,  'monthly', CURRENT_DATE),
  (v_uid, 'Devoluciones',            'Producto',        'variable', 56700,   'monthly', CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- ── Campaña de Meta Ads ──────────────────────────────────────
INSERT INTO ad_campaigns (user_id, name, platform, budget_daily, spend, impressions, clicks, orders_attributed, revenue_attributed, state, date_start) VALUES
  (v_uid, 'ABO Broad Ecom - Junio', 'meta', 3500, 98700, 487000, 6240, 47, 598000, 'active', CURRENT_DATE - 30)
ON CONFLICT DO NOTHING;

-- ── Líneas analíticas (6 meses de historial) ─────────────────
INSERT INTO analytic_lines (user_id, date, name, category, amount, channel) VALUES
  -- Enero
  (v_uid, '2026-01-31', 'Ventas Enero',      'venta',     2100000, NULL),
  (v_uid, '2026-01-31', 'COGS Enero',        'cogs',     -1050000, NULL),
  (v_uid, '2026-01-31', 'Meta Ads Enero',    'marketing',  -380000, NULL),
  (v_uid, '2026-01-31', 'Envíos Enero',      'logistica',  -210000, NULL),
  (v_uid, '2026-01-31', 'Fijos Enero',       'fijo',       -340000, NULL),
  -- Febrero
  (v_uid, '2026-02-28', 'Ventas Feb',        'venta',     2280000, NULL),
  (v_uid, '2026-02-28', 'COGS Feb',          'cogs',     -1140000, NULL),
  (v_uid, '2026-02-28', 'Meta Ads Feb',      'marketing',  -410000, NULL),
  (v_uid, '2026-02-28', 'Envíos Feb',        'logistica',  -228000, NULL),
  (v_uid, '2026-02-28', 'Fijos Feb',         'fijo',       -340000, NULL),
  -- Marzo
  (v_uid, '2026-03-31', 'Ventas Mar',        'venta',     2450000, NULL),
  (v_uid, '2026-03-31', 'COGS Mar',          'cogs',     -1225000, NULL),
  (v_uid, '2026-03-31', 'Meta Ads Mar',      'marketing',  -440000, NULL),
  (v_uid, '2026-03-31', 'Envíos Mar',        'logistica',  -245000, NULL),
  (v_uid, '2026-03-31', 'Fijos Mar',         'fijo',       -340000, NULL),
  -- Abril
  (v_uid, '2026-04-30', 'Ventas Abr',        'venta',     2620000, NULL),
  (v_uid, '2026-04-30', 'COGS Abr',          'cogs',     -1310000, NULL),
  (v_uid, '2026-04-30', 'Meta Ads Abr',      'marketing',  -470000, NULL),
  (v_uid, '2026-04-30', 'Envíos Abr',        'logistica',  -262000, NULL),
  (v_uid, '2026-04-30', 'Fijos Abr',         'fijo',       -340000, NULL),
  -- Mayo
  (v_uid, '2026-05-31', 'Ventas May',        'venta',     2710000, NULL),
  (v_uid, '2026-05-31', 'COGS May',          'cogs',     -1355000, NULL),
  (v_uid, '2026-05-31', 'Meta Ads May',      'marketing',  -490000, NULL),
  (v_uid, '2026-05-31', 'Envíos May',        'logistica',  -271000, NULL),
  (v_uid, '2026-05-31', 'Fijos May',         'fijo',       -340000, NULL),
  -- Junio (mes actual)
  (v_uid, '2026-06-24', 'Ventas Jun',        'venta',     2847500, NULL),
  (v_uid, '2026-06-24', 'COGS Jun',          'cogs',     -1423750, NULL),
  (v_uid, '2026-06-24', 'Meta Ads Jun',      'marketing',  -426000, NULL),
  (v_uid, '2026-06-24', 'Envíos Jun',        'logistica',  -284750, NULL),
  (v_uid, '2026-06-24', 'Fijos Jun',         'fijo',       -340000, NULL)
ON CONFLICT DO NOTHING;

END $$;
