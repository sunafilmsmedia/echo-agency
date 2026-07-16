-- ─────────────────────────────────────────────────────────────
-- Multi-provider OAuth integrations (Calendly, Gmail, Google Calendar, Stripe, …)
-- Tokens live server-side ONLY — never readable by the browser.
-- The public view exposes just "am I connected?" + non-sensitive metadata.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agency_integrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     uuid NOT NULL REFERENCES agency_settings(id) ON DELETE CASCADE,
  provider      text NOT NULL,
  access_token  text NOT NULL,
  refresh_token text,
  expires_at    timestamptz,
  scope         text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_agency_integrations_agency ON agency_integrations (agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_integrations_provider ON agency_integrations (provider);

-- Short-lived OAuth `state` values (CSRF protection).
-- Cleared on use OR after 15 minutes.
CREATE TABLE IF NOT EXISTS oauth_states (
  state       text PRIMARY KEY,
  agency_id   uuid NOT NULL REFERENCES agency_settings(id) ON DELETE CASCADE,
  provider    text NOT NULL,
  redirect_to text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS ──────────────────────────────────────────────────────
ALTER TABLE agency_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states        ENABLE ROW LEVEL SECURITY;

-- No public policy = service_role only. Tokens NEVER reach the client.
DROP POLICY IF EXISTS "no_public" ON agency_integrations;
DROP POLICY IF EXISTS "no_public" ON oauth_states;

-- ─── Public view for the frontend ─────────────────────────────
-- Exposes ONLY: "is this provider connected?" + non-secret metadata (e.g. account email).
CREATE OR REPLACE VIEW agency_integrations_public AS
SELECT
  id,
  agency_id,
  provider,
  scope,
  metadata,
  expires_at,
  created_at,
  updated_at
FROM agency_integrations;

GRANT SELECT ON agency_integrations_public TO anon, authenticated;

-- ─── Retire the legacy PAT column (superseded by OAuth) ───────
ALTER TABLE agency_settings DROP COLUMN IF EXISTS calendly_token;
