-- Code d'invitation par agence — utilisé par la page /signup pour vérifier
-- qu'un nouvel utilisateur a bien la permission de rejoindre l'espace.
-- Note : cette vérification est UX/client seulement dans le MVP (Suna share
-- son code à ses collègues). Pas de garantie serveur — l'anon key permet
-- toujours de créer un compte via l'API sans code.

ALTER TABLE public.agency_settings
  ADD COLUMN IF NOT EXISTS invite_code text;

-- Génère un code random 6 chars (alphabet sans O/0/I/1 pour éviter la confusion)
-- pour les agences existantes qui n'en ont pas.
DO $$
DECLARE
  agency_row record;
  attempt text;
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i int;
BEGIN
  FOR agency_row IN SELECT id FROM public.agency_settings WHERE invite_code IS NULL LOOP
    attempt := '';
    FOR i IN 1..6 LOOP
      attempt := attempt || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    END LOOP;
    UPDATE public.agency_settings SET invite_code = attempt WHERE id = agency_row.id;
  END LOOP;
END $$;

-- Contrainte d'unicité pour rendre le code utilisable comme identifiant d'agence.
ALTER TABLE public.agency_settings
  DROP CONSTRAINT IF EXISTS agency_settings_invite_code_unique;
ALTER TABLE public.agency_settings
  ADD CONSTRAINT agency_settings_invite_code_unique UNIQUE (invite_code);
