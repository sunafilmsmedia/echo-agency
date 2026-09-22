-- ─────────────────────────────────────────────────────────────────────────────
-- Automation "send access code on status → active"
-- Adds the fields the Edge Function + webhook need. Non-destructive:
-- everything is nullable, so the 23 existing clients + their portal codes
-- stay untouched.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Contact email on each client (destination du courriel envoyé au client)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS email text;

-- 2) Idempotency guard on portal codes — set once the email is confirmed sent.
--    While non-null, the automation must NOT re-send (matches the user's
--    requested behavior: pas de renvoi si repassage active → autre → active).
ALTER TABLE public.client_portal_codes
  ADD COLUMN IF NOT EXISTS access_code_sent_at timestamptz;

-- 3) Audit log for every automation attempt (success / skipped / error).
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type     text NOT NULL,                                     -- ex: 'send_client_access_code'
  client_id      uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  status         text NOT NULL,                                     -- 'success' | 'skipped' | 'error'
  error_message  text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_client  ON public.automation_logs (client_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created ON public.automation_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_event   ON public.automation_logs (event_type);

-- RLS — même pattern que les autres tables (public_all)
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all" ON public.automation_logs;
CREATE POLICY "public_all" ON public.automation_logs FOR ALL USING (true) WITH CHECK (true);
