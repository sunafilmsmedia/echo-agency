import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type ShootTeam } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Deux types d'équipes au même format : tournage (shoot) et montage (edit).
// Chaque client a une assignation indépendante pour chacun.
export type TeamKind = "shoot" | "edit";
export const TEAM_KIND_CONFIG = {
  shoot: { table: "shoot_teams", column: "shoot_team_id", queryKey: "shoot-teams" },
  edit:  { table: "edit_teams",  column: "edit_team_id",  queryKey: "edit-teams" },
} as const;

export function useShootTeams(kind: TeamKind = "shoot") {
  const cfg = TEAM_KIND_CONFIG[kind];
  return useQuery({
    queryKey: [cfg.queryKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(cfg.table)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ShootTeam[];
    },
  });
}

export function useCreateShootTeam(kind: TeamKind = "shoot") {
  const cfg = TEAM_KIND_CONFIG[kind];
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ShootTeam>) => {
      const { data, error } = await supabase.from(cfg.table).insert([payload]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [cfg.queryKey] });
      toast.success("Équipe créée");
    },
    onError: () => toast.error("Erreur lors de la création"),
  });
}

export function useUpdateShootTeam(kind: TeamKind = "shoot") {
  const cfg = TEAM_KIND_CONFIG[kind];
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<ShootTeam> & { id: string }) => {
      const { error } = await supabase.from(cfg.table).update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [cfg.queryKey] });
      toast.success("Équipe mise à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}

export function useDeleteShootTeam(kind: TeamKind = "shoot") {
  const cfg = TEAM_KIND_CONFIG[kind];
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // ON DELETE SET NULL sur clients.shoot_team_id — pas de perte de client.
      const { error } = await supabase.from(cfg.table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [cfg.queryKey] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Équipe supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}

// Assigne (ou détache si teamId=null) un client à une équipe. Léger — pas de toast
// pour permettre les changements rapides depuis la vue Équipes.
export function useAssignClientToTeam(kind: TeamKind = "shoot") {
  const cfg = TEAM_KIND_CONFIG[kind];
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, teamId }: { clientId: string; teamId: string | null }) => {
      const { error } = await supabase
        .from("clients")
        .update({ [cfg.column]: teamId })
        .eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: () => toast.error("Erreur lors de l'assignation"),
  });
}
