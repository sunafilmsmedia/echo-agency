-- Add per-agency Gamma API key so each agency can generate its own proposals
ALTER TABLE agency_settings
  ADD COLUMN IF NOT EXISTS gamma_api_key text;
