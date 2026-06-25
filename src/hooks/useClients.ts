import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase, type Client, type ClientStatus } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });
}

async function recalcRevenue() {
  await supabase.rpc("calculate_revenue_metrics");
}

// Invalidate every revenue-related query so any open view auto-refreshes
function invalidateRevenueChain(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["clients"] });
  qc.invalidateQueries({ queryKey: ["revenue-metrics"] });
  qc.invalidateQueries({ queryKey: ["revenue-metrics-ytd"] });
  qc.invalidateQueries({ queryKey: ["revenue-metrics-history"] });
  qc.invalidateQueries({ queryKey: ["stripe-revenue"] });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Client>) => {
      const { data, error } = await supabase.from("clients").insert([payload]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await recalcRevenue();
      invalidateRevenueChain(qc);
      toast.success("Client créé");
    },
    onError: () => toast.error("Erreur lors de la création du client"),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase.from("clients").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await recalcRevenue();
      invalidateRevenueChain(qc);
      toast.success("Client mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await recalcRevenue();
      invalidateRevenueChain(qc);
      toast.success("Client supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}

export function useUpdateClientStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ClientStatus }) => {
      const { error } = await supabase.from("clients").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await recalcRevenue();
      invalidateRevenueChain(qc);
    },
    onError: () => toast.error("Erreur lors du changement de statut"),
  });
}
