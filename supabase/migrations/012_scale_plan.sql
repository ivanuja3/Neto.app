-- ============================================================
-- NETO.APP — Agrega el plan "scale" ($49) al catálogo
-- El CHECK constraint de companies.plan solo permitía
-- trial/starter/pro/enterprise. Se agrega 'scale' como tercer
-- plan autoservicio, entre Pro y el desarrollo a medida.
-- ============================================================

ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_plan_check;
ALTER TABLE companies
  ADD CONSTRAINT companies_plan_check
  CHECK (plan IN ('trial', 'starter', 'pro', 'scale', 'enterprise'));
