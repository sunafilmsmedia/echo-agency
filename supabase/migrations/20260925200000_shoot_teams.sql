-- ─────────────────────────────────────────────────────────────────────────────
-- Équipes de tournage — permet de répartir qui s'occupe de quel client.
-- Members = texte libre (Josué, Sylvain, Sasha…) — pas de FK auth pour l'instant :
-- ça couvre les crews qui ne sont pas des users Echo.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shoot_teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#8b5cf6',
  members     text,                                 -- membres séparés par virgule
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shoot_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all" ON public.shoot_teams;
CREATE POLICY "public_all" ON public.shoot_teams FOR ALL USING (true) WITH CHECK (true);

-- Assignation optionnelle d'un client à une équipe. ON DELETE SET NULL : si l'équipe
-- est supprimée, le client passe à "non assigné" (pas de perte de client).
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS shoot_team_id uuid REFERENCES public.shoot_teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_shoot_team ON public.clients (shoot_team_id);
