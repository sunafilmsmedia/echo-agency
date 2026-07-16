// Counts scheduled Calendly events in a rolling window.
// Uses the OAuth-issued access token stored in agency_integrations (auto-refreshes).
//
// Body (all optional): { fromDays?: number, toDays?: number }
// Response: { total, perWeek, from, to } — or { error, message } on failure.

import { getFreshAccessToken, getAgencyId } from "../_shared/get-access-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { fromDays = 7, toDays = 0 } = await req.json().catch(() => ({}));

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const agencyId = await getAgencyId(supabase);
    let token: string;
    try {
      token = await getFreshAccessToken({ supabase, agencyId, provider: "calendly" });
    } catch (e: any) {
      // Distinguish "not connected" from other errors so the UI can show the right hint
      if (String(e?.message).startsWith("NOT_CONNECTED")) {
        return json({ error: "NOT_CONNECTED", message: "Calendly n'est pas connecté." }, 400);
      }
      throw e;
    }

    // 1. User URI — try metadata first, fall back to /users/me
    const { data: integration } = await supabase
      .from("agency_integrations")
      .select("metadata")
      .eq("agency_id", agencyId).eq("provider", "calendly")
      .maybeSingle();
    let userUri: string | undefined = integration?.metadata?.user_uri;
    if (!userUri) {
      const meRes = await fetch("https://api.calendly.com/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meRes.ok) {
        return json({ error: "CALENDLY_ME_FAILED", message: `Calendly ${meRes.status}: ${(await meRes.text()).slice(0, 200)}` }, 502);
      }
      const meJson = await meRes.json();
      userUri = meJson?.resource?.uri;
    }
    if (!userUri) return json({ error: "NO_USER_URI" }, 502);

    // 2. Date range
    const now = new Date();
    const to = new Date(now.getTime() - toDays * 86_400_000);
    const from = new Date(to.getTime() - fromDays * 86_400_000);
    const minStart = from.toISOString();
    const maxStart = to.toISOString();

    // 3. Paginate (cap 5 pages)
    let total = 0;
    let nextPage: string | null =
      `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userUri)}` +
      `&min_start_time=${encodeURIComponent(minStart)}` +
      `&max_start_time=${encodeURIComponent(maxStart)}` +
      `&status=active&count=100`;

    for (let i = 0; i < 5 && nextPage; i++) {
      const evRes: Response = await fetch(nextPage, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!evRes.ok) {
        return json({ error: "CALENDLY_EVENTS_FAILED", message: `Calendly ${evRes.status}: ${(await evRes.text()).slice(0, 200)}` }, 502);
      }
      const evJson = await evRes.json();
      total += Array.isArray(evJson?.collection) ? evJson.collection.length : 0;
      nextPage = evJson?.pagination?.next_page ?? null;
    }

    const perWeek = +(total / (fromDays / 7)).toFixed(1);
    return json({ total, perWeek, from: minStart, to: maxStart });
  } catch (e: any) {
    return json({ error: "SERVER_ERROR", message: e?.message ?? String(e) }, 500);
  }
});
