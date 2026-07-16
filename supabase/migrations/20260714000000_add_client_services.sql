-- Add services multi-select + normalize industry as free-form (kept as text).
-- `services` stores extra services beyond videos: ai, crm, ads, setter, social, web, seo, formulaire.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS services text[] NOT NULL DEFAULT '{}';
