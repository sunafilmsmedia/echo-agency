-- ─────────────────────────────────────────────────────────────────────────────
-- Géolocalisation client — ville + coords pour la carte du Québec.
-- Tout est nullable : aucune donnée existante impactée, la carte affiche
-- seulement les clients qui ont un couple lat/lng renseigné.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS city      text,
  ADD COLUMN IF NOT EXISTS latitude  numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;
