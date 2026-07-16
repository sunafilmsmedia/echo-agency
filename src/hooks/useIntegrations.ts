import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type AgencyIntegrationPublic, type IntegrationProvider } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── List integrations (no tokens — public view) ─────────────
export function useIntegrations() {
  return useQuery({
    queryKey: ["agency-integrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_integrations_public")
        .select("*");
      if (error) throw error;
      return (data ?? []) as AgencyIntegrationPublic[];
    },
  });
}

export function useIntegration(provider: IntegrationProvider) {
  const { data = [], ...rest } = useIntegrations();
  return { ...rest, data: data.find((i) => i.provider === provider) ?? null };
}

// ─── Start OAuth: hits oauth-start Edge Function, redirects browser ──
export function useConnectIntegration() {
  return useMutation({
    mutationFn: async (provider: IntegrationProvider) => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-start`;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? anonKey;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": anonKey,
        },
        body: JSON.stringify({
          provider,
          redirectTo: `${window.location.origin}${window.location.pathname}?integration_connected=${provider}`,
        }),
      });
      const text = await res.text();
      let j: any;
      try { j = JSON.parse(text); } catch { j = { raw: text }; }
      if (!res.ok || !j?.url) throw new Error(j?.message ?? `Erreur ${res.status}`);

      window.location.href = j.url;
    },
    onError: (e: any) => toast.error(e?.message ?? "Impossible de lancer l'OAuth"),
  });
}

// ─── Disconnect: delete the row (tokens too) ─────────────────
export function useDisconnectIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (provider: IntegrationProvider) => {
      // We can't delete from the base table via the anon key (no RLS policy allows it),
      // so we call a small Edge Function. For MVP simplicity we do it via a service
      // endpoint that the frontend has already been trusted with — an "integrations-disconnect" fn.
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integration-disconnect`;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? anonKey;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": anonKey,
        },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.slice(0, 200));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agency-integrations"] });
      qc.invalidateQueries({ queryKey: ["calendly-rdv-count"] });
      toast.success("Intégration déconnectée");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });
}
