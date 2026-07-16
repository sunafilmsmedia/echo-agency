// Deletes an integration row for the singleton agency.
// Uses service_role so we can bypass the deny-all RLS on agency_integrations.

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
    const { provider } = await req.json().catch(() => ({}));
    if (!provider) return json({ error: "MISSING_PROVIDER" }, 400);

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: agency } = await supabase.from("agency_settings").select("id").limit(1).maybeSingle();
    if (!agency) return json({ error: "NO_AGENCY" }, 500);

    const { error } = await supabase
      .from("agency_integrations")
      .delete()
      .eq("agency_id", agency.id)
      .eq("provider", provider);
    if (error) return json({ error: "DELETE_FAILED", message: error.message }, 500);

    return json({ disconnected: true });
  } catch (e: any) {
    return json({ error: "SERVER_ERROR", message: e?.message ?? String(e) }, 500);
  }
});
