import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type RevenueMetrics } from "@/integrations/supabase/client";
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

export function useRevenueMetrics() {
  const { start, end } = currentPeriod();
  return useQuery({
    queryKey: ["revenue-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_metrics")
        .select("*")
        .eq("period_start", start)
        .eq("period_end", end)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data as RevenueMetrics | null;
    },
  });
}

export function useRevenueMetricsHistory() {
  const year = new Date().getFullYear();
  return useQuery({
    queryKey: ["revenue-metrics-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_metrics")
        .select("*")
        .order("period_start", { ascending: true });
      if (error) throw error;
      return data as RevenueMetrics[];
    },
  });
}

export function useRevenueMetricsYTD() {
  const year = new Date().getFullYear();
  return useQuery({
    queryKey: ["revenue-metrics-ytd"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_metrics")
        .select("*")
        .gte("period_start", `${year}-01-01`)
        .lte("period_end", `${year}-12-31`)
        .order("period_start");
      if (error) throw error;
      return data as RevenueMetrics[];
    },
  });
}

export function useUpdateRevenueMetrics() {
  const qc = useQueryClient();
  const { start, end } = currentPeriod();
  return useMutation({
    mutationFn: async (payload: Partial<RevenueMetrics>) => {
      const { error } = await supabase
        .from("revenue_metrics")
        .update(payload)
        .eq("period_start", start)
        .eq("period_end", end);
      if (error) throw error;
    },
    // Silent on success — this fires on every auto-sync (expense add, extra revenue change).
    // Use useUpdateRevenueMetricsForPeriod for explicit user saves.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["revenue-metrics"] });
      qc.invalidateQueries({ queryKey: ["revenue-metrics-ytd"] });
      qc.invalidateQueries({ queryKey: ["revenue-metrics-history"] });
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });
}

// Insert or update a specific month (for correcting/adding historical values)
export function useUpdateRevenueMetricsForPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ period_start, ...payload }: Partial<RevenueMetrics> & { period_start: string }) => {
      // Derive period_end (last day of the same month) — timezone-safe
      const [yearStr, monthStr] = period_start.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const lastDay = new Date(year, month, 0).getDate(); // day count is timezone-independent
      const period_end = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

      const { data: existing } = await supabase
        .from("revenue_metrics")
        .select("id")
        .eq("period_start", period_start)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("revenue_metrics").update(payload).eq("period_start", period_start);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("revenue_metrics").insert({ ...payload, period_start, period_end });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["revenue-metrics-history"] });
      qc.invalidateQueries({ queryKey: ["revenue-metrics-ytd"] });
      qc.invalidateQueries({ queryKey: ["revenue-metrics"] });
      toast.success("Mois sauvegardé");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde du mois"),
  });
}
