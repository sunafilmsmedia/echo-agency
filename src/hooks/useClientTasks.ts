import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type ClientTask } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DEFAULT_TASKS = [
  "Idées envoyées",
  "Tournage",
  "Montage",
  "Sous-titrage",
  "Planification",
];

export function useClientTasks(clientId?: string) {
  return useQuery({
    queryKey: ["client-tasks", clientId],
    queryFn: async () => {
      let query = supabase.from("client_tasks").select("*").order("created_at");
      if (clientId) query = query.eq("client_id", clientId);
      const { data, error } = await query;
      if (error) throw error;
      return data as ClientTask[];
    },
  });
}

export function useCreateDefaultTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const cycleMonth = new Date();
      cycleMonth.setDate(1);
      const cycleStr = cycleMonth.toISOString().split("T")[0];

      const rows = DEFAULT_TASKS.map((title) => ({
        client_id: clientId,
        title,
        progress: 0,
        completed: false,
        cycle_month: cycleStr,
      }));

      const { error } = await supabase.from("client_tasks").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-tasks"] });
      toast.success("Tâches créées");
    },
    onError: () => toast.error("Erreur lors de la création des tâches"),
  });
}

export function useUpdateClientTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<ClientTask> & { id: string }) => {
      const { error } = await supabase.from("client_tasks").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-tasks"] });
    },
    onError: () => toast.error("Erreur lors de la mise à jour de la tâche"),
  });
}
