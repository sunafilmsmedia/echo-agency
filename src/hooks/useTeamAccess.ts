import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  allowed_tabs: string[];
  can_see_money: boolean;
  active: boolean;
  last_login_at: string | null;
  created_at: string;
}

// ─── Accès de l'utilisateur connecté ─────────────────────────────────────────
// Pas dans team_members → propriétaire, accès complet (comportement d'avant).

export interface MyAccess {
  isLoading: boolean;
  isEmployee: boolean;
  allowedTabs: string[] | null; // null = tous les onglets
  canSeeMoney: boolean;
  member: TeamMember | null;
}

export function useMyAccess(): MyAccess {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email?.toLowerCase() ?? null));
  }, []);

  const { data: member, isLoading } = useQuery({
    queryKey: ["my-team-access", email],
    enabled: !!email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("email", email!)
        .maybeSingle();
      if (error) return null;
      return data as TeamMember | null;
    },
  });

  if (email === undefined || (!!email && isLoading)) {
    return { isLoading: true, isEmployee: false, allowedTabs: [], canSeeMoney: false, member: null };
  }
  if (!member) {
    return { isLoading: false, isEmployee: false, allowedTabs: null, canSeeMoney: true, member: null };
  }
  return {
    isLoading: false,
    isEmployee: true,
    allowedTabs: member.active ? member.allowed_tabs : [],
    canSeeMoney: member.active && member.can_see_money,
    member,
  };
}

// ─── Gestion de l'équipe (Settings, propriétaire) ────────────────────────────

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });
}

async function invokeTeamFn(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("team-login-code", { body });
  if (error) {
    const payload = await (error as any).context?.json?.().catch(() => null);
    throw Object.assign(new Error(payload?.message ?? payload?.error ?? error.message), { code: payload?.error });
  }
  return data;
}

export function useSendTeamInvite() {
  return useMutation({
    mutationFn: (email: string) => invokeTeamFn({ action: "invite", email }),
    onSuccess: (_d, email) => toast.success(`Invitation envoyée à ${email}`),
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors de l'envoi"),
  });
}

export function useAddTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; name: string; allowed_tabs: string[]; can_see_money: boolean }) => {
      const email = input.email.trim().toLowerCase();
      const { error } = await supabase.from("team_members").insert({ ...input, email, name: input.name.trim() || null });
      if (error) {
        if (error.code === "23505") throw new Error("Cette personne a déjà accès");
        throw error;
      }
      await invokeTeamFn({ action: "invite", email });
      return email;
    },
    onSuccess: (email) => {
      qc.invalidateQueries({ queryKey: ["team-members"] });
      toast.success(`Accès donné — invitation envoyée à ${email}`);
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ["team-members"] });
      toast.error(e?.message ?? "Erreur");
    },
  });
}

export function useUpdateTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<TeamMember> & { id: string }) => {
      const { error } = await supabase.from("team_members").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members"] }),
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });
}

export function useDeleteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Accès retiré");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });
}

// ─── Connexion par code (page /login) ────────────────────────────────────────

export async function requestLoginCode(email: string) {
  return invokeTeamFn({ action: "send", email: email.trim().toLowerCase() });
}
