-- Accès employés : connexion sans mot de passe (code par email) + onglets choisis
-- par le propriétaire. Toute personne connectée qui N'EST PAS dans cette table
-- garde l'accès complet (comptes propriétaires existants).

CREATE TABLE IF NOT EXISTS public.team_members (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL CHECK (email = lower(trim(email))),
  name           text,
  allowed_tabs   text[] NOT NULL DEFAULT '{}',
  can_see_money  boolean NOT NULL DEFAULT false,
  active         boolean NOT NULL DEFAULT true,
  last_login_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS team_members_email_unique ON public.team_members (lower(email));

-- SECURITY DEFINER pour éviter la récursion RLS (la policy lit la même table).
CREATE OR REPLACE FUNCTION public.is_team_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur connecté (un employé doit lire ses propres permissions).
DROP POLICY IF EXISTS "team_members_read" ON public.team_members;
CREATE POLICY "team_members_read" ON public.team_members
  FOR SELECT TO authenticated USING (true);

-- Écriture : propriétaires seulement — un employé ne peut pas s'ouvrir des onglets.
DROP POLICY IF EXISTS "team_members_owner_write" ON public.team_members;
CREATE POLICY "team_members_owner_write" ON public.team_members
  FOR ALL TO authenticated
  USING (NOT public.is_team_member())
  WITH CHECK (NOT public.is_team_member());
