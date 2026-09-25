import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type ShootTeam } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useShootTeams() {
  return useQuery({
    queryKey: ["shoot-teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shoot_teams")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ShootTeam[];
    },
  });
}

export function useCreateShootTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ShootTeam>) => {
      const { data, error } = await supabase.from("shoot_teams").insert([payload]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shoot-teams"] });
      toast.success("Équipe créée");
    },
    onError: () => toast.error("Erreur lors de la création"),
  });
}

export function useUpdateShootTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<ShootTeam> & { id: string }) => {
      const { error } = await supabase.from("shoot_teams").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shoot-teams"] });
      toast.success("Équipe mise à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}

export function useDeleteShootTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // ON DELETE SET NULL sur clients.shoot_team_id — pas de perte de client.
      const { error } = await supabase.from("shoot_teams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shoot-teams"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Équipe supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}

// Assigne (ou détache si teamId=null) un client à une équipe. Léger — pas de toast
// pour permettre les changements rapides depuis la vue Équipes.
export function useAssignClientToTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, teamId }: { clientId: string; teamId: string | null }) => {
      const { error } = await supabase
        .from("clients")
        .update({ shoot_team_id: teamId })
        .eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: () => toast.error("Erreur lors de l'assignation"),
  });
}
