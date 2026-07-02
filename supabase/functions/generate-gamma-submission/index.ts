// Edge function: generate a Gamma proposal for a client using the agency's own API key.
// The API key is stored per-agency in agency_settings.gamma_api_key (never exposed to frontend).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const GAMMA_BASE = "https://public-api.gamma.app/v0.2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
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

    if (agencyErr) throw agencyErr;
    if (!agency?.gamma_api_key) {
      return new Response(JSON.stringify({
        error: "GAMMA_KEY_MISSING",
        message: "Aucune clé API Gamma configurée. Va dans Settings → Intégrations pour la coller.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const gammaKey = agency.gamma_api_key as string;
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "create";

    // ═══ action: create — kicks off a generation and returns the generationId ═══
    if (action === "create") {
      const body = await req.json();
      const { inputText, additionalInstructions } = body as { inputText: string; additionalInstructions?: string };
      if (!inputText || inputText.length < 20) {
        return new Response(JSON.stringify({ error: "INVALID_INPUT", message: "Brief trop court" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
          textOptions: { amount: "detailed", language: "fr" },
          imageOptions: { source: "aiGenerated" },
          additionalInstructions: additionalInstructions ??
            `Utilise la couleur d'accent ${agency.color ?? "#7c3aed"} et présente comme si tu étais l'agence "${agency.name ?? "Mon Agence"}".`,
        }),
      });

      if (!gRes.ok) {
        const errText = await gRes.text();
        return new Response(JSON.stringify({
          error: "GAMMA_ERROR",
          message: `Gamma API a répondu ${gRes.status}: ${errText.slice(0, 300)}`,
        }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await gRes.json();
      return new Response(JSON.stringify({
        generationId: data.generationId ?? data.id,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ═══ action: status — polls a generation and returns its state ═══
    if (action === "status") {
      const generationId = url.searchParams.get("id");
      if (!generationId) {
        return new Response(JSON.stringify({ error: "MISSING_ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const gRes = await fetch(`${GAMMA_BASE}/generations/${generationId}`, {
        headers: { "X-API-KEY": gammaKey },
      });

      if (!gRes.ok) {
        const errText = await gRes.text();
        return new Response(JSON.stringify({
          error: "GAMMA_ERROR",
          message: `Gamma API a répondu ${gRes.status}: ${errText.slice(0, 300)}`,
        }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await gRes.json();
      return new Response(JSON.stringify({
        status: data.status,       // "pending" | "processing" | "completed" | "failed"
        gammaUrl: data.gammaUrl,   // present when completed
        thumbnailUrl: data.thumbnailUrl,
        credits: data.credits,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "UNKNOWN_ACTION" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    return new Response(JSON.stringify({
      error: "SERVER_ERROR",
      message: e?.message ?? String(e),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
