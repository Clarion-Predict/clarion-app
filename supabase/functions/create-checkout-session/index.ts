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

// Preset prices live here, not in the browser. A custom amount may be
// requested by the client but is range-checked below before it's charged.
const CREDIT_PACKAGES: Record<string, { credits: number; amountCents: number; label: string }> = {
  starter: { credits: 5, amountCents: 500, label: "5 credits" },
  standard: { credits: 10, amountCents: 1000, label: "10 credits" },
  plus: { credits: 25, amountCents: 2500, label: "25 credits" },
  max: { credits: 50, amountCents: 5000, label: "50 credits" },
};

// Bounds for a custom amount. The browser may *request* an amount, but the
// server decides whether it's acceptable and derives both the Stripe charge
// and the credit grant from that one validated number -- so the two can never
// diverge, and nobody can buy $500 of credits for $1.
const MIN_CUSTOM_USD = 5;
const MAX_CUSTOM_USD = 500;

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

    const { packageId, amount } = await req.json().catch(() => ({}));

    let credits: number;
    let amountCents: number;
    let label: string;

    if (amount !== undefined && amount !== null && amount !== "") {
      const dollars = Number(amount);
      if (!Number.isFinite(dollars) || dollars <= 0) {
        return json({ error: "Enter a valid amount." }, 400);
      }
      // Round to the cent before range-checking so 4.999 can't sneak under the
      // minimum, and so the charge is an exact integer number of cents.
      const rounded = Math.round(dollars * 100) / 100;
      if (rounded < MIN_CUSTOM_USD || rounded > MAX_CUSTOM_USD) {
        return json(
          {
            error: `Enter an amount between $${MIN_CUSTOM_USD} and $${MAX_CUSTOM_USD}.`,
          },
          400,
        );
      }
      amountCents = Math.round(rounded * 100);
      credits = rounded;
      label = `${rounded} credits`;
    } else {
      const pkg = CREDIT_PACKAGES[packageId];
      if (!pkg) return json({ error: "Unknown credit package" }, 400);
      amountCents = pkg.amountCents;
      credits = pkg.credits;
      label = pkg.label;
    }

    const origin =
      req.headers.get("origin") ?? Deno.env.get("SITE_URL") ?? "";
    if (!origin) return json({ error: "No redirect origin configured" }, 500);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Cajuga — ${label}` },
            unit_amount: amountCents,
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
        credits: String(credits),
      },
    });

    return json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return json({ error: "Could not start checkout" }, 500);
  }
});
