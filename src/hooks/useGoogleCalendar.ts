import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
  htmlLink: string;
}

async function getProviderToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.provider_token ?? null;
}

export function useGoogleCalendarEvents(year: number, month: number) {
  return useQuery({
    queryKey: ["google-calendar", year, month],
    queryFn: async () => {
      const token = await getProviderToken();
      if (!token) return null; // not connected with Google

      const timeMin = new Date(year, month - 1, 1).toISOString();
      const timeMax = new Date(year, month, 0, 23, 59, 59).toISOString();

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        if (res.status === 401) return null; // token expired
        throw new Error("Erreur Google Calendar");
      }

      const data = await res.json();
      return data.items as GoogleCalendarEvent[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export async function checkGoogleConnected(): Promise<boolean> {
  const token = await getProviderToken();
  return !!token;
}
