// Fetches a valid access token for (agency, provider), auto-refreshing if expired.
// Any Edge Function that needs to hit a provider API should route through here.

import { getProvider } from "./oauth-providers.ts";

// Refresh if the token expires in less than this many seconds
const REFRESH_LEEWAY_S = 60;

interface Ctx {
  supabase: any; // service-role SupabaseClient
  agencyId: string;
  provider: string;
}

export async function getFreshAccessToken({ supabase, agencyId, provider }: Ctx): Promise<string> {
  const { data: row, error } = await supabase
    .from("agency_integrations")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) throw new Error(`INTEGRATION_QUERY_FAILED: ${error.message}`);
  if (!row) throw new Error(`NOT_CONNECTED: ${provider} n'est pas connecté.`);

  // Fresh enough?
  if (row.expires_at) {
    const secondsLeft = (new Date(row.expires_at).getTime() - Date.now()) / 1000;
    if (secondsLeft > REFRESH_LEEWAY_S) return row.access_token;
  } else {
    // No expiry recorded (e.g. Calendly PAT-style, non-expiring) → use as-is
    return row.access_token;
  }

  // Expired: refresh
  if (!row.refresh_token) {
    throw new Error(`TOKEN_EXPIRED_NO_REFRESH: ${provider} — reconnecte l'intégration.`);
  }

  const providerCfg = getProvider(provider);
  const clientId = Deno.env.get(providerCfg.clientIdEnv);
  const clientSecret = Deno.env.get(providerCfg.clientSecretEnv);
  if (!clientId || !clientSecret) throw new Error("MISSING_OAUTH_SECRETS");

  const res = await fetch(providerCfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: row.refresh_token,
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });
  const text = await res.text();
  let j: any = {};
  try { j = JSON.parse(text); } catch { j = { raw: text }; }
  if (!res.ok) {
    throw new Error(`REFRESH_FAILED: ${j?.error_description ?? j?.error ?? text.slice(0, 200)}`);
  }

  const newAccessToken:  string = j.access_token;
  const newRefreshToken: string | undefined = j.refresh_token; // some providers rotate it
  const newExpiresIn:    number | undefined = j.expires_in;
  const newExpiresAt = newExpiresIn ? new Date(Date.now() + newExpiresIn * 1000).toISOString() : null;

  await supabase.from("agency_integrations")
    .update({
      access_token:  newAccessToken,
      refresh_token: newRefreshToken ?? row.refresh_token,
      expires_at:    newExpiresAt,
      updated_at:    new Date().toISOString(),
    })
    .eq("id", row.id);

  return newAccessToken;
}

export async function getAgencyId(supabase: any): Promise<string> {
  const { data: agency, error } = await supabase
    .from("agency_settings").select("id").limit(1).maybeSingle();
  if (error) throw new Error(`AGENCY_QUERY_FAILED: ${error.message}`);
  if (!agency) throw new Error("NO_AGENCY");
  return agency.id;
}
