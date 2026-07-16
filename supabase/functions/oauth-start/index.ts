// Generates the OAuth authorize URL for a given provider.
// Stores a random state in oauth_states (auto-expires after 15 min).
// Frontend calls this, then window.location.href = data.url.
//
// Body: { provider: string, redirectTo?: string }
// Returns: { url: string }

import { getProvider } from "../_shared/oauth-providers.ts";

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
    const { provider: providerName, redirectTo } = await req.json().catch(() => ({}));
    if (!providerName) return json({ error: "MISSING_PROVIDER" }, 400);

    const provider = getProvider(providerName);
    const clientId = Deno.env.get(provider.clientIdEnv);
    if (!clientId) {
      return json({
        error: "MISSING_CLIENT_ID",
        message: `${provider.clientIdEnv} n'est pas configuré dans les secrets Supabase.`,
      }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const redirectUri = `${supabaseUrl}/functions/v1/oauth-callback`;

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Resolve the singleton agency
    const { data: agency, error: agencyErr } = await supabase
      .from("agency_settings").select("id").limit(1).maybeSingle();
    if (agencyErr || !agency) {
      return json({ error: "NO_AGENCY", message: agencyErr?.message ?? "Aucune agence trouvée." }, 500);
    }

    // Generate CSRF state
    const state = crypto.randomUUID() + crypto.randomUUID();

    // Best-effort: garbage-collect states older than 15 min before inserting
    await supabase.from("oauth_states")
      .delete()
      .lt("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());

    const { error: stateErr } = await supabase.from("oauth_states").insert({
      state,
      agency_id: agency.id,
      provider: providerName,
      redirect_to: redirectTo ?? null,
    });
    if (stateErr) return json({ error: "STATE_STORE_FAILED", message: stateErr.message }, 500);

    // Build authorize URL
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      state,
    });
    if (provider.scope) params.set("scope", provider.scope);
    for (const [k, v] of Object.entries(provider.extraAuthorizeParams ?? {})) {
      params.set(k, v);
    }

    return json({ url: `${provider.authorizeUrl}?${params.toString()}` });
  } catch (e: any) {
    return json({ error: "SERVER_ERROR", message: e?.message ?? String(e) }, 500);
  }
});
