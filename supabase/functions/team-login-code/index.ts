// team-login-code
//
// Connexion sans mot de passe pour les employés (table public.team_members).
//
//  { action: "send", email }    → public. Si l'email est un employé actif (ou un
//                                  compte existant, ex. propriétaire), génère
//                                  un code à 6 chiffres via auth.admin.generateLink
//                                  et l'envoie par Resend. Le front valide ensuite
//                                  avec supabase.auth.verifyOtp({ email, token, type: "email" }).
//  { action: "invite", email }  → propriétaire connecté seulement. Envoie le
//                                  courriel « tu as accès à Echo » avec le lien /login.
//
// Déployée avec --no-verify-jwt (le "send" est appelé avant d'être connecté) ;
// le mode "invite" vérifie le JWT lui-même.

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

function emailShell(agencyName: string, color: string, title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
      <div style="padding:24px;background:linear-gradient(135deg, ${color}, ${color}dd);color:#fff;">
        <p style="margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;opacity:0.85;">Équipe · ${escapeHtml(agencyName)}</p>
        <p style="margin:8px 0 0;font-size:22px;font-weight:700;">${title}</p>
      </div>
      <div style="padding:28px 24px;">${body}</div>
      <div style="padding:16px 24px;background:#fafbfc;border-top:1px solid #eef0f2;">
        <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">${escapeHtml(agencyName)} · propulsé par Echo</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")    return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(supabaseUrl, serviceRole);

  let payload: any;
  try { payload = await req.json(); }
  catch { return json({ error: "BAD_JSON" }, 400); }

  const action = payload?.action;
  const email  = String(payload?.email ?? "").trim().toLowerCase();
  if (!email) return json({ error: "MISSING_EMAIL" }, 400);

  const { data: member } = await supabase
    .from("team_members")
    .select("id, email, name, active")
    .eq("email", email)
    .maybeSingle();

  const { data: agency } = await supabase
    .from("agency_settings")
    .select("name, color, resend_api_key")
    .limit(1).maybeSingle();
  if (!agency?.resend_api_key) return json({ error: "MISSING_RESEND_KEY" }, 500);

  const agencyName = agency.name ?? "Mon Agence";
  const color      = agency.color ?? "#7c3aed";
  const appBase    = Deno.env.get("APP_BASE_URL") ?? APP_BASE_URL_FALLBACK;
  const firstName  = (member?.name ?? "").split(" ")[0];

  // Pas de getUserByEmail dans l'API admin : on parcourt (peu de comptes dans une agence).
  const authUserExists = async (target: string) => {
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return false;
      if (data.users.some((u: any) => u.email?.toLowerCase() === target)) return true;
      if (data.users.length < 1000) return false;
    }
    return false;
  };

  const sendEmail = async (subject: string, html: string) => {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${agency.resend_api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${agencyName} <contact@sunafilmsmedia.com>`, to: [email], subject, html }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
  };

  // ── Invitation (propriétaire seulement) ──
  if (action === "invite") {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData } = await supabase.auth.getUser(token);
    const callerEmail = userData?.user?.email?.toLowerCase();
    if (!callerEmail) return json({ error: "UNAUTHORIZED" }, 401);
    const { data: callerIsEmployee } = await supabase
      .from("team_members").select("id").eq("email", callerEmail).maybeSingle();
    if (callerIsEmployee) return json({ error: "FORBIDDEN" }, 403);
    if (!member || !member.active) return json({ error: "NOT_INVITED" }, 404);

    const loginUrl = `${appBase}/login?mode=code&email=${encodeURIComponent(email)}`;
    try {
      await sendEmail(
        `Tu as accès à l'espace ${agencyName}`,
        emailShell(agencyName, color, `Bienvenue dans l'équipe${firstName ? `, ${escapeHtml(firstName)}` : ""} 👋`, `
          <p style="margin:0 0 16px;color:#111827;font-size:15px;line-height:1.55;">
            Tu as maintenant accès à l'espace de travail <strong>${escapeHtml(agencyName)}</strong>.
            Pas besoin de mot de passe : entre ton courriel sur la page de connexion et on t'envoie un code à 6 chiffres.
          </p>
          <div style="margin-top:24px;text-align:center;">
            <a href="${escapeHtml(loginUrl)}" style="display:inline-block;padding:14px 28px;background:${color};color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">
              Me connecter →
            </a>
          </div>`),
      );
    } catch (e: any) {
      return json({ error: "RESEND_ERROR", message: e?.message }, 502);
    }
    return json({ ok: true, sentTo: email });
  }

  // ── Envoi du code de connexion ──
  if (action === "send") {
    // Qui peut recevoir un code :
    //  - un employé actif de team_members (son compte auth est créé au 1er login)
    //  - un compte auth déjà existant (propriétaires) — jamais de création pour eux
    if (member && !member.active) return json({ error: "NOT_INVITED" }, 404);
    if (!member && !(await authUserExists(email))) return json({ error: "NOT_INVITED" }, 404);

    // Crée le compte auth au besoin (premier login employé), puis génère l'OTP.
    let link = await supabase.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error) {
      const created = await supabase.auth.admin.createUser({ email, email_confirm: true });
      if (created.error && !/already/i.test(created.error.message)) {
        return json({ error: "USER_CREATE_FAILED", message: created.error.message }, 500);
      }
      link = await supabase.auth.admin.generateLink({ type: "magiclink", email });
    }
    const code = link.data?.properties?.email_otp;
    if (link.error || !code) return json({ error: "OTP_FAILED", message: link.error?.message }, 500);

    try {
      await sendEmail(
        `${code} — ton code de connexion ${agencyName}`,
        emailShell(agencyName, color, "Ton code de connexion 🔑", `
          <p style="margin:0 0 16px;color:#111827;font-size:15px;line-height:1.55;">
            Entre ce code sur la page de connexion pour accéder à ton espace :
          </p>
          <div style="margin:20px 0;padding:20px;text-align:center;border:2px dashed ${color};border-radius:12px;background:${color}0d;">
            <p style="margin:0;font-family:'Menlo','Monaco',monospace;font-size:34px;font-weight:800;letter-spacing:8px;color:${color};">${escapeHtml(code)}</p>
          </div>
          <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;">
            Ce code expire bientôt et ne fonctionne qu'une fois. Si tu n'as rien demandé, ignore ce courriel.
          </p>`),
      );
    } catch (e: any) {
      return json({ error: "RESEND_ERROR", message: e?.message }, 502);
    }

    if (member) await supabase.from("team_members").update({ last_login_at: new Date().toISOString() }).eq("id", member.id);
    return json({ ok: true });
  }

  return json({ error: "UNKNOWN_ACTION" }, 400);
});
