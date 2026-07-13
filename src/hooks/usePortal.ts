import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase, type AgencySettings, type ClientPortalCode, type ClientJournalEntry, type Client } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Agency settings ─────────────────────────────────────────────────────────

export function useAgencySettings() {
  return useQuery({
    queryKey: ["agency-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as AgencySettings | null;
    },
  });
}

export function useAgencySettingsBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["agency-settings-slug", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_settings")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data as AgencySettings | null;
    },
  });
}

export function useUpdateAgencySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<AgencySettings>) => {
      // Find existing row (singleton-style)
      const { data: existing } = await supabase.from("agency_settings").select("id").limit(1).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("agency_settings").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("agency_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agency-settings"] });
      qc.invalidateQueries({ queryKey: ["agency-settings-slug"] });
      toast.success("Réglages sauvegardés");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors de la sauvegarde"),
  });
}

// ─── Client portal codes ─────────────────────────────────────────────────────

function generateAccessCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function useClientPortalCodes() {
  return useQuery({
    queryKey: ["client-portal-codes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_portal_codes").select("*");
      if (error) throw error;
      return data as ClientPortalCode[];
    },
  });
}

export function useEnsureClientCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string): Promise<string> => {
      // Existing?
      const { data: existing } = await supabase
        .from("client_portal_codes")
        .select("access_code")
        .eq("client_id", clientId)
        .maybeSingle();
      if (existing) return existing.access_code;
      // Create new (retry on collision)
      for (let i = 0; i < 5; i++) {
        const code = generateAccessCode();
        const { error } = await supabase.from("client_portal_codes").insert({ client_id: clientId, access_code: code });
        if (!error) return code;
        if (error.code !== "23505") throw error; // not a unique violation → real error
      }
      throw new Error("Impossible de générer un code unique");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-portal-codes"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });
}

export function useRegenerateClientCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string): Promise<string> => {
      await supabase.from("client_portal_codes").delete().eq("client_id", clientId);
      for (let i = 0; i < 5; i++) {
        const code = generateAccessCode();
        const { error } = await supabase.from("client_portal_codes").insert({ client_id: clientId, access_code: code });
        if (!error) return code;
        if (error.code !== "23505") throw error;
      }
      throw new Error("Impossible de générer un code unique");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-portal-codes"] });
      toast.success("Nouveau code généré");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });
}

// ─── Resolve code → client + agency snapshot (for portal) ────────────────────

export interface PortalSnapshot {
  client: Client;
  agency: AgencySettings;
  accessCode: string;
}

export function useResolveAccessCode(code: string | null) {
  return useQuery({
    queryKey: ["resolve-code", code],
    enabled: !!code,
    queryFn: async (): Promise<PortalSnapshot | null> => {
      const upperCode = (code || "").trim().toUpperCase();
      const { data: codeRow, error: codeErr } = await supabase
        .from("client_portal_codes")
        .select("access_code, client_id")
        .eq("access_code", upperCode)
        .maybeSingle();
      if (codeErr) throw codeErr;
      if (!codeRow) return null;
      const { data: client, error: clientErr } = await supabase
        .from("clients")
        .select("*")
        .eq("id", codeRow.client_id)
        .maybeSingle();
      if (clientErr) throw clientErr;
      if (!client) return null;
      const { data: agency, error: agencyErr } = await supabase
        .from("agency_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (agencyErr) throw agencyErr;
      if (!agency) return null;
      return { client: client as Client, agency: agency as AgencySettings, accessCode: upperCode };
    },
  });
}

// ─── Journal entries ─────────────────────────────────────────────────────────

export function useClientJournal(clientId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["client-journal", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_journal_entries")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ClientJournalEntry[];
    },
  });

  // Realtime
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel(`journal:${clientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "client_journal_entries", filter: `client_id=eq.${clientId}` },
        () => qc.invalidateQueries({ queryKey: ["client-journal", clientId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, qc]);

  return query;
}

export function useAddJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { client_id: string; content: string; author: "client" | "agency" }) => {
      const { error } = await supabase.from("client_journal_entries").insert(payload);
      if (error) throw error;
      // Fire-and-forget email notification when the CLIENT posts.
      // We don't await it — it shouldn't block the UI, and failures don't block the insert.
      if (payload.author === "client") {
        supabase.functions.invoke("notify-journal-entry", {
          body: {
            clientId: payload.client_id,
            content: payload.content,
            author: payload.author,
          },
        }).catch((err) => console.warn("[notify-journal-entry] failed:", err));
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["client-journal", vars.client_id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });
}
