-- ─────────────────────────────────────────────────────────────────────────────
-- Équipes de montage — même principe que shoot_teams : répartir les clients
-- entre monteurs. Indépendant de l'équipe de tournage (un client a les deux).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.edit_teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#8b5cf6',
  members     text,                                 -- membres séparés par virgule
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.edit_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all" ON public.edit_teams;
CREATE POLICY "public_all" ON public.edit_teams FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS edit_team_id uuid REFERENCES public.edit_teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_edit_team ON public.clients (edit_team_id);
