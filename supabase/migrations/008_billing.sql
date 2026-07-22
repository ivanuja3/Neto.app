-- ============================================================
-- NETO.APP — Billing Fase 1 (trial gate, sin checkout todavía)
-- Agrega estado de plan/suscripción a companies y lo blinda
-- contra escritura desde el cliente (anon/authenticated key).
-- ============================================================

-- ── Columnas de billing ───────────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial'
    CHECK (plan IN ('trial', 'starter', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled')),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  ADD COLUMN IF NOT EXISTS plan_activated_at TIMESTAMPTZ;

-- ── Trigger: columnas de billing solo editables server-side ──
-- La RLS de companies (002_rls.sql) permite UPDATE de cualquier
-- columna sobre la propia fila (auth.uid() = user_id). Sin este
-- trigger, cualquier usuario podría auto-activarse el plan desde
-- el cliente con la anon key. Solo el rol service_role (usado por
-- adminClient() en rutas server-side) puede modificar estas 4
-- columnas; cualquier otro rol las revierte a su valor anterior.
CREATE OR REPLACE FUNCTION protect_billing_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role') <> 'service_role' THEN
    NEW.plan                := OLD.plan;
    NEW.subscription_status := OLD.subscription_status;
    NEW.trial_ends_at       := OLD.trial_ends_at;
    NEW.plan_activated_at   := OLD.plan_activated_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER billing_columns_readonly
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION protect_billing_columns();
