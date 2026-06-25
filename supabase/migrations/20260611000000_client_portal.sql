-- ─────────────────────────────────────────────────────────────
-- Client Portal migration — agencies, access codes, journals
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────

-- ─── agency_settings ─────────────────────────────────────────
-- Single-row (for now) agency branding configuration.
-- Used by /clients/:slug public landing + portal display.
CREATE TABLE IF NOT EXISTS agency_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL DEFAULT 'Mon Agence',
  slug            text NOT NULL UNIQUE DEFAULT 'mon-agence',
  color           text NOT NULL DEFAULT '#7c3aed',
  script_gpt_url  text,
  brand_guide_url text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Seed a default row so the agency exists immediately
INSERT INTO agency_settings (name, slug, color)
VALUES ('Mon Agence', 'mon-agence', '#7c3aed')
ON CONFLICT (slug) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_agency_settings_slug ON agency_settings (slug);

-- ─── client_portal_codes ─────────────────────────────────────
-- Maps short access codes → client. Each client gets ONE code.
CREATE TABLE IF NOT EXISTS client_portal_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  access_code text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_portal_codes_access_code ON client_portal_codes (access_code);
CREATE INDEX IF NOT EXISTS idx_client_portal_codes_client_id   ON client_portal_codes (client_id);

-- ─── client_journal_entries ──────────────────────────────────
-- Shared idea-journal between client and agency.
CREATE TABLE IF NOT EXISTS client_journal_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content     text NOT NULL,
  author      text NOT NULL CHECK (author IN ('client', 'agency')),
  entry_date  date NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_journal_entries_client_id  ON client_journal_entries (client_id);
CREATE INDEX IF NOT EXISTS idx_client_journal_entries_created_at ON client_journal_entries (created_at DESC);

-- ─── Optional client metrics for portal display ──────────────
ALTER TABLE clients ADD COLUMN IF NOT EXISTS monthly_views integer;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cost_per_lead numeric;

-- ─── RLS — public access (consistent with existing tables) ──
ALTER TABLE agency_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_codes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all" ON agency_settings;
DROP POLICY IF EXISTS "public_all" ON client_portal_codes;
DROP POLICY IF EXISTS "public_all" ON client_journal_entries;

CREATE POLICY "public_all" ON agency_settings        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON client_portal_codes    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON client_journal_entries FOR ALL USING (true) WITH CHECK (true);

-- ─── Realtime for live journal updates ────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE client_journal_entries;
