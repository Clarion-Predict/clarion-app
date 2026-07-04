// Creates a Stripe Checkout session for a credit package.
// Called from the browser via supabase.functions.invoke("create-checkout-session")
// with the user's JWT attached, so we can trust the user identity server-side.
//
// Secrets required (supabase secrets set ...):
//   STRIPE_SECRET_KEY  - sk_test_... / sk_live_...
//   SITE_URL           - optional fallback for redirect URLs, e.g. https://app.cajuga.com

import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");

// Prices are defined server-side only. Never trust an amount from the client.
const CREDIT_PACKAGES: Record<string, { credits: number; amountCents: number; label: string }> = {
  starter: { credits: 5, amountCents: 500, label: "5 credits" },
  standard: { credits: 10, amountCents: 1000, label: "10 credits" },
  plus: { credits: 25, amountCents: 2500, label: "25 credits" },
  max: { credits: 50, amountCents: 5000, label: "50 credits" },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Resolve the calling user from their JWT.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const { packageId } = await req.json().catch(() => ({}));
    const pkg = CREDIT_PACKAGES[packageId];
    if (!pkg) return json({ error: "Unknown credit package" }, 400);

    const origin =
      req.headers.get("origin") ?? Deno.env.get("SITE_URL") ?? "";
    if (!origin) return json({ error: "No redirect origin configured" }, 500);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Cajuga — ${pkg.label}` },
            unit_amount: pkg.amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      customer_email: user.email ?? undefined,
      // The webhook reads these to know who to credit and by how much.
      metadata: {
        user_id: user.id,
        credits: String(pkg.credits),
      },
    });

    return json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return json({ error: "Could not start checkout" }, 500);
  }
});
