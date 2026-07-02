// Edge function: generate a Gamma proposal for a client using the agency's own API key.
// The API key is stored per-agency in agency_settings.gamma_api_key (never exposed to frontend).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GAMMA_BASE = "https://public-api.gamma.app/v1.0";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? "create";

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch the (singleton) agency settings — includes gamma_api_key
    const { data: agency, error: agencyErr } = await supabase
      .from("agency_settings")
      .select("gamma_api_key, name, color")
      .limit(1)
      .maybeSingle();

    if (agencyErr) return json({ error: "AGENCY_QUERY_FAILED", message: agencyErr.message }, 500);
    if (!agency?.gamma_api_key) {
      return json({
        error: "GAMMA_KEY_MISSING",
        message: "Aucune clé API Gamma configurée. Va dans Settings → Intégrations pour la coller.",
      }, 400);
    }

    const gammaKey = agency.gamma_api_key as string;

    // ═══ action: create ═══
    if (action === "create") {
      const { inputText, additionalInstructions } = body as { inputText?: string; additionalInstructions?: string };
      if (!inputText || inputText.length < 20) {
        return json({ error: "INVALID_INPUT", message: "Le brief est trop court (min 20 caractères)." }, 400);
      }

      const gRes = await fetch(`${GAMMA_BASE}/generations`, {
        method: "POST",
        headers: {
          "X-API-KEY": gammaKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputText,
          format: "presentation",
          textOptions: {
            textMode: "generate",     // v1.0: generate = full AI-write from brief; condense = shorten; preserve = keep as-is
            language: "fr",
          },
          imageOptions: { source: "aiGenerated" },
          additionalInstructions: additionalInstructions ??
            `Utilise la couleur d'accent ${agency.color ?? "#7c3aed"} et présente comme si tu étais l'agence "${agency.name ?? "Mon Agence"}".`,
        }),
      });

      const responseText = await gRes.text();
      let gData: any = {};
      try { gData = JSON.parse(responseText); } catch { /* ignore */ }

      if (!gRes.ok) {
        return json({
          error: "GAMMA_ERROR",
          message: `Gamma API ${gRes.status}: ${gData?.message ?? responseText.slice(0, 300)}`,
          status: gRes.status,
        }, 502);
      }

      const generationId = gData?.generationId ?? gData?.id;
      if (!generationId) {
        return json({ error: "NO_GEN_ID", message: "Réponse Gamma sans generationId", raw: gData }, 502);
      }

      return json({ generationId });
    }

    // ═══ action: status ═══
    if (action === "status") {
      const generationId = body?.id;
      if (!generationId) return json({ error: "MISSING_ID", message: "id manquant" }, 400);

      const gRes = await fetch(`${GAMMA_BASE}/generations/${generationId}`, {
        headers: { "X-API-KEY": gammaKey },
      });
      const responseText = await gRes.text();
      let gData: any = {};
      try { gData = JSON.parse(responseText); } catch { /* ignore */ }

      if (!gRes.ok) {
        return json({
          error: "GAMMA_ERROR",
          message: `Gamma API ${gRes.status}: ${gData?.message ?? responseText.slice(0, 300)}`,
        }, 502);
      }

      return json({
        status: gData?.status,           // "pending" | "processing" | "completed" | "failed"
        gammaUrl: gData?.gammaUrl,
        thumbnailUrl: gData?.thumbnailUrl,
        credits: gData?.credits,
      });
    }

    return json({ error: "UNKNOWN_ACTION", message: `action=${action}` }, 400);

  } catch (e: any) {
    return json({
      error: "SERVER_ERROR",
      message: e?.message ?? String(e),
    }, 500);
  }
});
