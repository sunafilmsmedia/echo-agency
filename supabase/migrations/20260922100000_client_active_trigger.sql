-- ─────────────────────────────────────────────────────────────────────────────
-- Fallback pour la feature "Database Webhooks" (schéma supabase_functions
-- indisponible sur ce projet). On appelle l'Edge Function directement depuis
-- un trigger SQL via pg_net, avec exactement la même shape de payload que
-- ce qu'un vrai webhook Supabase enverrait — l'Edge Function n'a rien à changer.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) pg_net — extension permettant les appels HTTP sortants depuis Postgres.
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2) Fonction trigger : ne fire QUE sur la transition status → 'active'.
CREATE OR REPLACE FUNCTION public.trigger_send_client_access_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
BEGIN
  IF NEW.status = 'active'
     AND (OLD.status IS DISTINCT FROM 'active') THEN
    PERFORM net.http_post(
      url     := 'https://tlnloltisfsipiaufmbk.supabase.co/functions/v1/send-client-access-code',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := jsonb_build_object(
        'type',       'UPDATE',
        'table',      TG_TABLE_NAME,
        'schema',     TG_TABLE_SCHEMA,
        'record',     to_jsonb(NEW),
        'old_record', to_jsonb(OLD)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Attache le trigger APRÈS un UPDATE de la colonne status (rien d'autre
--    ne peut le déclencher — pas d'INSERT, pas de changement de nom, etc.)
DROP TRIGGER IF EXISTS trg_send_client_access_code ON public.clients;
CREATE TRIGGER trg_send_client_access_code
  AFTER UPDATE OF status ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_send_client_access_code();
