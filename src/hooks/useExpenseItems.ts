import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type ExpenseItem } from "@/integrations/supabase/client";
import { toast } from "sonner";

function currentPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export function useExpenseItems() {
  return useQuery({
    queryKey: ["expense-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_items")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data as ExpenseItem[];
    },
  });
}

export function useCreateExpenseItem() {
  const qc = useQueryClient();
  const { start, end } = currentPeriod();
  return useMutation({
    mutationFn: async (payload: { category: string; label: string; amount: number }) => {
      const { error } = await supabase.from("expense_items").insert([{
        ...payload,
        period_start: start,
        period_end: end,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense-items"] });
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });
}

export function useDeleteExpenseItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expense_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense-items"] });
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}
