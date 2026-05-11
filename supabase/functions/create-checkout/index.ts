import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const { workspaceName } = await req.json();
    if (!workspaceName) throw new Error("workspaceName is required");

    // Get the user's email from the auth token
    const authHeader = req.headers.get("Authorization");
    let userEmail = "";
    let userId = "";
    if (authHeader) {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      userEmail = user?.email ?? "";
      userId = user?.id ?? "";
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Create or retrieve Stripe customer
    let customerId: string | undefined;
    if (userEmail) {
      const existing = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const customer = await stripe.customers.create({ email: userEmail });
        customerId = customer.id;
      }
    }

    // Create checkout session
    // NOTE: replace PRICE_ID below with your actual Stripe Price ID for $57/month
    const priceId = Deno.env.get("STRIPE_PRICE_ID") || "";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: priceId
        ? [{ price: priceId, quantity: 1 }]
        : [{
            price_data: {
              currency: "usd",
              product_data: { name: "Echo — Espace Agence", description: "Accès complet à la plateforme Echo + jusqu'à 3 membres" },
              unit_amount: 5700, // $57.00
              recurring: { interval: "month" },
            },
            quantity: 1,
          }],
      metadata: {
        workspace_name: workspaceName,
        user_id: userId,
      },
      success_url: `${origin}/workspace-success?session_id={CHECKOUT_SESSION_ID}&name=${encodeURIComponent(workspaceName)}`,
      cancel_url: `${origin}/workspace-setup?intent=create`,
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
