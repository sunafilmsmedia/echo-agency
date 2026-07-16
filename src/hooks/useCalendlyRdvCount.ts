import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CalendlyRdvCount {
  total: number;
  perWeek: number;
  from: string;
  to: string;
}

// Hits the calendly-rdv-count Edge Function. Uses raw fetch so we surface
// real Calendly error bodies (invoke() masks non-2xx responses).
export function useCalendlyRdvCount(fromDays = 7) {
  return useQuery<CalendlyRdvCount>({
    queryKey: ["calendly-rdv-count", fromDays],
    // Cache 5 min — Calendly rate-limits and count doesn't change minute-to-minute.
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendly-rdv-count`;
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
        body: JSON.stringify({ fromDays }),
      });

      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!res.ok) throw new Error(data?.message ?? `Erreur ${res.status}`);
      return data as CalendlyRdvCount;
    },
  });
}
