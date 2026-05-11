import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type CalendarEvent } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useCalendarEvents(year: number, month: number) {
  const start = new Date(year, month, 1).toISOString().split("T")[0];
  const end = new Date(year, month + 1, 0).toISOString().split("T")[0];

  return useQuery({
    queryKey: ["calendar-events", year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .gte("event_date", start)
        .lte("event_date", end)
        .order("event_date");
      if (error) throw error;
      return data as CalendarEvent[];
    },
  });
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CalendarEvent>) => {
      const { data, error } = await supabase.from("calendar_events").insert([payload]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Événement créé");
    },
    onError: () => toast.error("Erreur lors de la création"),
  });
}

export function useUpdateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CalendarEvent> & { id: string }) => {
      const { error } = await supabase.from("calendar_events").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Événement mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}

export function useDeleteCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Événement supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });
}
