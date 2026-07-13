// Sends an email notification when a new client journal entry is added.
// Called directly from the frontend after a successful insert.

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

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { clientId, content, author } = await req.json().catch(() => ({}));
    if (!clientId || !content) {
      return json({ error: "MISSING_PARAMS", message: "clientId + content requis" }, 400);
    }
    // Only notify when the CLIENT posts (not when the agency replies to itself)
    if (author !== "client") {
      return json({ skipped: true, reason: "author is not client" });
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load agency settings for the resend key + destination email
    const { data: agency, error: agencyErr } = await supabase
      .from("agency_settings")
      .select("name, color, slug, resend_api_key, notification_email, notifications_enabled")
      .limit(1)
      .maybeSingle();

    if (agencyErr) return json({ error: "AGENCY_QUERY_FAILED", message: agencyErr.message }, 500);
    if (!agency) return json({ skipped: true, reason: "no agency settings" });
    if (agency.notifications_enabled === false) return json({ skipped: true, reason: "notifications disabled" });
    if (!agency.resend_api_key) return json({ skipped: true, reason: "no Resend key" });
    if (!agency.notification_email) return json({ skipped: true, reason: "no notification_email" });

    // Load client name
    const { data: client } = await supabase
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .maybeSingle();
    const clientName = client?.name ?? "Un client";

    // Build the portal URL
    const origin = req.headers.get("origin") ?? "https://echo-agency15.vercel.app";
    const portalUrl = `${origin}/portail`;
    const clientCenterUrl = `${origin}/dashboard`;

    const agencyColor = agency.color ?? "#7c3aed";
    const excerpt = content.slice(0, 400) + (content.length > 400 ? "…" : "");

    const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
      <div style="padding:20px 24px;background:linear-gradient(135deg, ${agencyColor}, ${agencyColor}dd);color:#fff;">
        <p style="margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;opacity:0.85;">Nouveau message · Carnet d'idées</p>
        <p style="margin:6px 0 0;font-size:20px;font-weight:700;">${escapeHtml(clientName)}</p>
      </div>
      <div style="padding:28px 24px;">
        <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">a partagé une nouvelle idée dans son portail :</p>
        <div style="padding:16px 18px;border-left:3px solid ${agencyColor};background:${agencyColor}0d;border-radius:8px;color:#111827;font-size:15px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(excerpt)}</div>
        <div style="margin-top:24px;text-align:center;">
          <a href="${clientCenterUrl}" style="display:inline-block;padding:12px 24px;background:${agencyColor};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Ouvrir dans ${escapeHtml(agency.name ?? "Echo")}</a>
        </div>
      </div>
      <div style="padding:16px 24px;background:#fafbfc;border-top:1px solid #eef0f2;">
        <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">${escapeHtml(agency.name ?? "Echo")} · propulsé par Echo</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    // Send via Resend
    const from = `${(agency.name ?? "Echo")} <onboarding@resend.dev>`;
    // ⚠️ Resend requires a verified domain to send from custom addresses.
    // We use their sandbox "onboarding@resend.dev" which works out-of-the-box for testing.
    // Once user verifies their domain in Resend, they can update this.
    const rRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${agency.resend_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [agency.notification_email],
        subject: `📬 ${clientName} a un nouveau message pour toi`,
        html,
      }),
    });

    const responseText = await rRes.text();
    let rData: any = {};
    try { rData = JSON.parse(responseText); } catch { /* ignore */ }

    if (!rRes.ok) {
      return json({
        error: "RESEND_ERROR",
        message: `Resend ${rRes.status}: ${rData?.message ?? responseText.slice(0, 300)}`,
      }, 502);
    }

    return json({ sent: true, id: rData?.id });

  } catch (e: any) {
    return json({ error: "SERVER_ERROR", message: e?.message ?? String(e) }, 500);
  }
});
