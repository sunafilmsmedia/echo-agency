-- Prénom de l'owner de l'agence — utilisé pour personnaliser le hero du dashboard
-- ("Bonjour Josué"). Nullable pour n'imposer aucune contrainte sur les autres agences.

ALTER TABLE public.agency_settings
  ADD COLUMN IF NOT EXISTS owner_first_name text;

-- Backfill l'agence existante avec la valeur connue.
UPDATE public.agency_settings
SET owner_first_name = 'Josué'
WHERE slug = 'suna-films-media' AND owner_first_name IS NULL;
