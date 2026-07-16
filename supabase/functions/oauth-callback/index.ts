// Receives the redirect from an OAuth provider after user authorization.
// - Verifies the `state` (CSRF)
// - Exchanges the `code` for tokens
// - Enriches with provider-specific metadata (email, user URI, …)
// - Upserts into agency_integrations
// - Redirects the user back to the app
//
// Provider posts as GET with ?code=...&state=... — Calendly, Google, Stripe all follow this pattern.

import { getProvider } from "../_shared/oauth-providers.ts";

const APP_BASE_URL_FALLBACK = "https://echo-agency15.vercel.app";

function htmlRedirect(url: string, message: string) {
  // Simple bounce page so the user sees a status before landing on the app.
  const safeMsg = message.replace(/</g, "&lt;");
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Redirection…</title>
     <meta http-equiv="refresh" content="1;url=${url}">
     <style>body{font-family:system-ui;padding:2rem;max-width:480px;margin:auto;color:#111}</style>
     <p>${safeMsg}</p><p><a href="${url}">Continuer →</a></p>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err   = url.searchParams.get("error");
  const appBase = Deno.env.get("APP_BASE_URL") ?? APP_BASE_URL_FALLBACK;

  if (err) {
    return htmlRedirect(
      `${appBase}/dashboard?integration_error=${encodeURIComponent(err)}`,
      `Autorisation refusée : ${err}`,
    );
  }
  if (!code || !state) {
    return htmlRedirect(`${appBase}/dashboard?integration_error=missing_params`, "Paramètres OAuth manquants.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // 1. Resolve & consume state
  const { data: stateRow, error: stateErr } = await supabase
    .from("oauth_states").select("*").eq("state", state).maybeSingle();
  if (stateErr || !stateRow) {
    return htmlRedirect(`${appBase}/dashboard?integration_error=bad_state`, "État OAuth invalide ou expiré.");
  }
  // Consume immediately (single-use)
  await supabase.from("oauth_states").delete().eq("state", state);

  const providerName: string = stateRow.provider;
  const provider = getProvider(providerName);
  const clientId     = Deno.env.get(provider.clientIdEnv);
  const clientSecret = Deno.env.get(provider.clientSecretEnv);
  if (!clientId || !clientSecret) {
    return htmlRedirect(
      `${appBase}/dashboard?integration_error=missing_secrets`,
      `Secrets ${provider.clientIdEnv} / ${provider.clientSecretEnv} manquants côté serveur.`,
    );
  }

  const redirectUri = `${supabaseUrl}/functions/v1/oauth-callback`;

  // 2. Exchange code → tokens (standard OAuth2 form-urlencoded)
  const body = new URLSearchParams({
    grant_type:   "authorization_code",
    code,
    client_id:    clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });
  // Include PKCE verifier when it was generated in oauth-start
  if (stateRow.code_verifier) {
    body.set("code_verifier", stateRow.code_verifier);
  }

  const tokenRes = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const tokenText = await tokenRes.text();
  let tokenData: any = {};
  try { tokenData = JSON.parse(tokenText); } catch { tokenData = { raw: tokenText }; }
  if (!tokenRes.ok) {
    return htmlRedirect(
      `${appBase}/dashboard?integration_error=token_exchange`,
      `Échec de l'échange de token : ${tokenData?.error_description ?? tokenData?.error ?? tokenText.slice(0, 200)}`,
    );
  }

  const accessToken:  string = tokenData.access_token;
  const refreshToken: string | undefined = tokenData.refresh_token;
  const expiresIn:    number | undefined = tokenData.expires_in;
  const scope:        string | undefined = tokenData.scope;

  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

  // 3. Enrich with provider-specific metadata
  let metadata: Record<string, unknown> = {};
  if (provider.fetchMetadata) {
    try { metadata = await provider.fetchMetadata(accessToken); }
    catch { /* non-fatal — continue without metadata */ }
  }

  // 4. Upsert
  const { error: upErr } = await supabase
    .from("agency_integrations")
    .upsert({
      agency_id:     stateRow.agency_id,
      provider:      providerName,
      access_token:  accessToken,
      refresh_token: refreshToken ?? null,
      expires_at:    expiresAt,
      scope:         scope ?? null,
      metadata,
      updated_at:    new Date().toISOString(),
    }, { onConflict: "agency_id,provider" });

  if (upErr) {
    return htmlRedirect(
      `${appBase}/dashboard?integration_error=store_failed`,
      `Erreur de sauvegarde : ${upErr.message}`,
    );
  }

  // 5. Redirect back to app (respecting redirect_to if given)
  const to = stateRow.redirect_to ?? `${appBase}/dashboard?integration_connected=${providerName}`;
  return htmlRedirect(to, `✓ ${providerName} connecté avec succès.`);
});
