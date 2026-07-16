// Server-side proxy to Anthropic's Messages API.
// Keeps ANTHROPIC_API_KEY server-only — never exposed to the browser.
//
// Body:
//   {
//     messages: MessageParam[],        // required
//     system?:  string,
//     tools?:   Tool[],
//     max_tokens?: number,             // default 1024
//     model?:   string,                // default DEFAULT_MODEL
//   }
//
// Returns the raw Anthropic response body verbatim (or an { error, message } shape on failure).

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

const DEFAULT_MODEL = "claude-opus-4-8";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return json({
      error: "MISSING_KEY",
      message: "ANTHROPIC_API_KEY n'est pas configuré dans les secrets Supabase.",
    }, 500);
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.messages)) {
    return json({ error: "BAD_REQUEST", message: "messages[] requis dans le body." }, 400);
  }

  const payload: Record<string, unknown> = {
    model: body.model ?? DEFAULT_MODEL,
    max_tokens: body.max_tokens ?? 1024,
    messages: body.messages,
  };
  if (body.system) payload.system = body.system;
  if (body.tools)  payload.tools  = body.tools;

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await upstream.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!upstream.ok) {
    return json({
      error: "ANTHROPIC_ERROR",
      status: upstream.status,
      message: (data as { error?: { message?: string } })?.error?.message ?? text.slice(0, 400),
    }, 502);
  }

  return json(data);
});
