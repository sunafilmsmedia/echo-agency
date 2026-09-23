-- ─────────────────────────────────────────────────────────────────────────────
-- Ajoute un trigger sur INSERT également : si un client est créé DIRECTEMENT
-- en statut 'active' (au lieu de créer en pipeline puis update), on veut aussi
-- envoyer le code d'accès. L'Edge Function accepte les 2 shapes (old_record
-- null pour INSERT, old_record.status ≠ active pour UPDATE).
-- ─────────────────────────────────────────────────────────────────────────────

-- Fonction dédiée à l'INSERT — payload distinct (type='INSERT', old_record=null)
CREATE OR REPLACE FUNCTION public.trigger_send_client_access_code_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    PERFORM net.http_post(
      url     := 'https://tlnloltisfsipiaufmbk.supabase.co/functions/v1/send-client-access-code',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := jsonb_build_object(
        'type',       'INSERT',
        'table',      TG_TABLE_NAME,
        'schema',     TG_TABLE_SCHEMA,
        'record',     to_jsonb(NEW),
        'old_record', NULL
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_send_client_access_code_insert ON public.clients;
CREATE TRIGGER trg_send_client_access_code_insert
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_send_client_access_code_insert();
