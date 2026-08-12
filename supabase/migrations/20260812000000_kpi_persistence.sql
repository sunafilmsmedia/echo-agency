-- KPI persistence — move Sandra + René + Élodie tracking from browser localStorage
-- to Supabase so data survives across devices, deploys, and cache clears.

-- One row per (client × year × month) — views/videos for Sandra, budget/leads for René.
CREATE TABLE IF NOT EXISTS kpi_client_month (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year         integer NOT NULL,
  month        integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  views        integer,
  videos       integer,
  budget       numeric,
  leads        integer,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_kpi_client_month_ym     ON kpi_client_month (year, month);
CREATE INDEX IF NOT EXISTS idx_kpi_client_month_client ON kpi_client_month (client_id);

-- Per-client config (baselines used by Sandra's bonus tiers + René's ads-tracking flag).
CREATE TABLE IF NOT EXISTS kpi_client_config (
  client_id       uuid PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  baseline_views  integer NOT NULL DEFAULT 0,
  baseline_videos integer NOT NULL DEFAULT 0,
  tracked_by_ads  boolean NOT NULL DEFAULT false,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Corrections KPI (Élodie) — one row per (employee × year × month).
CREATE TABLE IF NOT EXISTS kpi_corrections_month (
  employee_id  text NOT NULL,
  year         integer NOT NULL,
  month        integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  total        integer NOT NULL DEFAULT 0,
  categories   jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes        text,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, year, month)
);

-- RLS: match the existing 'public_all' pattern used across the app.
ALTER TABLE kpi_client_month       ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_client_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_corrections_month  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all" ON kpi_client_month;
DROP POLICY IF EXISTS "public_all" ON kpi_client_config;
DROP POLICY IF EXISTS "public_all" ON kpi_corrections_month;

CREATE POLICY "public_all" ON kpi_client_month      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON kpi_client_config     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON kpi_corrections_month FOR ALL USING (true) WITH CHECK (true);
