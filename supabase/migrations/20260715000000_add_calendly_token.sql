-- Store Calendly personal access token per agency for auto-computed RDV/week metrics.
ALTER TABLE agency_settings
  ADD COLUMN IF NOT EXISTS calendly_token text;
