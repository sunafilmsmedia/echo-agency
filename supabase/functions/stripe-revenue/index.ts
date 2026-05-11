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

    // Get current month boundaries
    const now = new Date();
    const months: { label: string; start: number; end: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = Math.floor(d.getTime() / 1000);
      const end = Math.floor(new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime() / 1000);
      const label = d.toLocaleString("fr-CA", { month: "short", year: "numeric" });
      months.push({ label, start, end });
    }

    // Fetch charges for each month
    const monthlyRevenue = await Promise.all(
      months.map(async ({ label, start, end }) => {
        const charges = await stripe.charges.list({
          created: { gte: start, lte: end },
          limit: 100,
        });
        const total = charges.data
          .filter((c) => c.status === "succeeded" && !c.refunded)
          .reduce((sum, c) => sum + c.amount, 0);
        return { month: label, revenue: total / 100 };
      })
    );

    // Current MRR from active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
    });

    const mrr = subscriptions.data.reduce((sum, sub) => {
      const monthly = sub.items.data.reduce((s, item) => {
        const price = item.price;
        if (!price.unit_amount) return s;
        if (price.recurring?.interval === "year") {
          return s + price.unit_amount / 12;
        }
        return s + price.unit_amount;
      }, 0);
      return sum + monthly;
    }, 0) / 100;

    // Active subscribers count
    const activeCount = subscriptions.data.length;

    // Recent charges (last 10)
    const recentCharges = await stripe.charges.list({ limit: 10 });
    const recent = recentCharges.data
      .filter((c) => c.status === "succeeded")
      .map((c) => ({
        id: c.id,
        amount: c.amount / 100,
        description: c.description ?? c.billing_details?.name ?? "Paiement",
        date: new Date(c.created * 1000).toISOString().split("T")[0],
      }));

    return new Response(
      JSON.stringify({ mrr, activeCount, monthlyRevenue, recentCharges: recent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
