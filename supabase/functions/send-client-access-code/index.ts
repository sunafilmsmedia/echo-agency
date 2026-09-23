// send-client-access-code
//
// Déclenché par un Database Webhook Supabase sur UPDATE de public.clients.
// Le webhook nous envoie { type: "UPDATE", table, record, old_record, schema }.
//
// Comportement (spec du 22 sept.) :
//  1. Ne continue QUE si status vient de passer à 'active' pour la première fois
//     (record.status === 'active' && old_record.status !== 'active').
//  2. Si l'email du client est vide → log 'skipped' + arrêt, PAS d'envoi.
//  3. Va chercher ou génère le access_code dans client_portal_codes.
//  4. Si access_code_sent_at est déjà rempli → log 'skipped' + arrêt (idempotence :
//     un client qui repasse active → autre → active ne re-reçoit PAS le code).
//  5. Récupère resend_api_key + nom/slug/couleur d'agence dans agency_settings.
//  6. Envoie via Resend : to = client.email, cc = [HARDCODED_CC], sujet + HTML
//     branded avec code + lien direct vers /clients/{slug}.
//  7. Marque access_code_sent_at = now() sur le row du code, log 'success'.
//  8. Toute erreur en cours de route → log 'error' avec le message.
//
// Le CC est HARDCODÉ à sunafilmsmedia@gmail.com peu importe le client, comme demandé.

const HARDCODED_CC = "sunafilmsmedia@gmail.com";
const APP_BASE_URL_FALLBACK = "https://echo-agency15.vercel.app";

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function generateAccessCode(): string {
  // Alphabet unambiguous (no O/0, I/1), 6 chars → 30^6 ≈ 729M combinations.
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")    return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(supabaseUrl, serviceRole);

  // Helper: fire-and-forget log (never throws)
  const logRow = async (clientId: string | null, status: "success" | "skipped" | "error", errorMessage?: string) => {
    try {
      await supabase.from("automation_logs").insert({
        event_type: "send_client_access_code",
        client_id: clientId,
        status,
        error_message: errorMessage ?? null,
      });
    } catch { /* swallow — logging must never block or crash the function */ }
  };

  let payload: any;
  try { payload = await req.json(); }
  catch (e: any) {
    return json({ error: "BAD_JSON", message: e?.message ?? String(e) }, 400);
  }

  const record     = payload?.record     ?? null;
  const old_record = payload?.old_record ?? null;

  // ── Guard #1: le webhook doit être sur UPDATE public.clients ──
  if (!record || !record.id) {
    return json({ skipped: true, reason: "no_record_in_payload" });
  }

  // ── Guard #2: le client est ou vient d'être 'active' ──
  //    Accepte :
  //     - INSERT avec status='active' (old_record est null)
  //     - UPDATE d'un statut ≠ active vers active
  //    Rejette :
  //     - status actuel ≠ 'active'
  //     - déjà 'active' avant (UPDATE active→active, ou UPDATE active→X→active — c'est
  //       le guard access_code_sent_at ci-dessous qui rattrapera ce dernier cas)
  if (record.status !== "active") {
    return json({ skipped: true, reason: "status_not_active" });
  }
  if (old_record && old_record.status === "active") {
    return json({ skipped: true, reason: "already_active_before" });
  }

  // ── Guard #3: email du client rempli ? ──
  const clientEmail = (record.email ?? "").trim();
  if (!clientEmail) {
    await logRow(record.id, "skipped", "client email is empty — automation cannot send");
    return json({ skipped: true, reason: "missing_client_email" });
  }

  // ── Étape 1: récupérer ou générer le access_code ──
  let { data: codeRow, error: codeErr } = await supabase
    .from("client_portal_codes")
    .select("id, access_code, access_code_sent_at")
    .eq("client_id", record.id)
    .maybeSingle();

  if (codeErr) {
    await logRow(record.id, "error", `code lookup failed: ${codeErr.message}`);
    return json({ error: "CODE_LOOKUP_FAILED", message: codeErr.message }, 500);
  }

  // Idempotency: déjà envoyé → skip (comportement demandé)
  if (codeRow?.access_code_sent_at) {
    await logRow(record.id, "skipped", `code already sent at ${codeRow.access_code_sent_at}`);
    return json({ skipped: true, reason: "already_sent", sentAt: codeRow.access_code_sent_at });
  }

  // Génère un code si le client n'en a pas encore (jusqu'à 5 tentatives sur collision)
  if (!codeRow) {
    let created = null as null | { id: string; access_code: string; access_code_sent_at: string | null };
    for (let i = 0; i < 5 && !created; i++) {
      const attempt = generateAccessCode();
      const { data: inserted, error: insErr } = await supabase
        .from("client_portal_codes")
        .insert({ client_id: record.id, access_code: attempt })
        .select("id, access_code, access_code_sent_at")
        .single();
      if (!insErr)                         { created = inserted; break; }
      if (insErr.code !== "23505")         { // pas une collision d'unique
        await logRow(record.id, "error", `code insert failed: ${insErr.message}`);
        return json({ error: "CODE_INSERT_FAILED", message: insErr.message }, 500);
      }
    }
    if (!created) {
      await logRow(record.id, "error", "could not generate unique access code after 5 attempts");
      return json({ error: "CODE_GEN_FAILED" }, 500);
    }
    codeRow = created;
  }

  // ── Étape 2: agency + resend key ──
  const { data: agency, error: agencyErr } = await supabase
    .from("agency_settings")
    .select("name, slug, color, resend_api_key")
    .limit(1).maybeSingle();

  if (agencyErr || !agency) {
    await logRow(record.id, "error", `agency lookup failed: ${agencyErr?.message ?? "no agency row"}`);
    return json({ error: "AGENCY_LOOKUP_FAILED" }, 500);
  }
  if (!agency.resend_api_key) {
    await logRow(record.id, "error", "agency_settings.resend_api_key is empty");
    return json({ error: "MISSING_RESEND_KEY" }, 500);
  }

  // ── Étape 3: build email ──
  const appBase = Deno.env.get("APP_BASE_URL") ?? APP_BASE_URL_FALLBACK;
  const clientLandingUrl = `${appBase}/clients/${agency.slug}`;
  const agencyColor = agency.color ?? "#7c3aed";
  const clientName  = record.name ?? "";
  const agencyName  = agency.name ?? "Mon Agence";
  const code        = codeRow.access_code;

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
      <div style="padding:24px;background:linear-gradient(135deg, ${agencyColor}, ${agencyColor}dd);color:#fff;">
        <p style="margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;opacity:0.85;">Espace client · ${escapeHtml(agencyName)}</p>
        <p style="margin:8px 0 0;font-size:22px;font-weight:700;">Bienvenue${clientName ? `, ${escapeHtml(clientName.split(" ")[0])}` : ""} 🤝</p>
      </div>
      <div style="padding:28px 24px;">
        <p style="margin:0 0 16px;color:#111827;font-size:15px;line-height:1.55;">
          Ton compte est activé. Voici ton code d'accès personnel pour te connecter à ton espace client&nbsp;:
        </p>
        <div style="margin:20px 0;padding:20px;text-align:center;border:2px dashed ${agencyColor};border-radius:12px;background:${agencyColor}0d;">
          <p style="margin:0 0 6px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Ton code d'accès</p>
          <p style="margin:0;font-family:'Menlo','Monaco',monospace;font-size:34px;font-weight:800;letter-spacing:8px;color:${agencyColor};">${escapeHtml(code)}</p>
        </div>
        <div style="margin-top:24px;text-align:center;">
          <a href="${escapeHtml(clientLandingUrl)}"
             style="display:inline-block;padding:14px 28px;background:${agencyColor};color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">
            Accéder à mon espace →
          </a>
        </div>
        <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">
          Garde ce code en sûreté — c'est ta clé personnelle. Si tu as des questions, réponds simplement à ce courriel.
        </p>
      </div>
      <div style="padding:16px 24px;background:#fafbfc;border-top:1px solid #eef0f2;">
        <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">
          ${escapeHtml(agencyName)} · propulsé par Echo
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  // Domaine sunafilmsmedia.com vérifié dans Resend → envoi depuis contact@ qui
  // est une vraie mailbox monitorée : les replies y arrivent naturellement.
  const from = `${agencyName} <contact@sunafilmsmedia.com>`;

  const rRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${agency.resend_api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [clientEmail],
      cc: [HARDCODED_CC],
      subject: `🔑 Ton code d'accès à ton espace client ${agencyName}`,
      html,
    }),
  });

  const rText = await rRes.text();
  let rData: any = {}; try { rData = JSON.parse(rText); } catch { /* ignore */ }

  if (!rRes.ok) {
    const msg = `Resend ${rRes.status}: ${rData?.message ?? rText.slice(0, 300)}`;
    await logRow(record.id, "error", msg);
    return json({ error: "RESEND_ERROR", message: msg }, 502);
  }

  // ── Étape 4: mark sent_at ──
  const { error: markErr } = await supabase
    .from("client_portal_codes")
    .update({ access_code_sent_at: new Date().toISOString() })
    .eq("id", codeRow.id);

  if (markErr) {
    // Email est parti, mais on a raté le marquage. Log en warning, ne pas
    // renvoyer 500 sinon Supabase pourrait retenter et re-spammer le client.
    await logRow(record.id, "error", `email sent but sent_at update failed: ${markErr.message}`);
    return json({ ok: true, warning: "email_sent_but_sent_at_update_failed", resendId: rData?.id });
  }

  await logRow(record.id, "success");
  return json({ ok: true, sentTo: clientEmail, cc: HARDCODED_CC, resendId: rData?.id });
});
