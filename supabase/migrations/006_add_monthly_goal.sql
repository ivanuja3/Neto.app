-- Agregar columna monthly_goal a companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS monthly_goal numeric;
