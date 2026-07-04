// Stripe webhook: credits a user's balance after a successful checkout.
//
// Deploy with JWT verification DISABLED (Stripe cannot send a Supabase JWT):
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// Secrets required (supabase secrets set ...):
//   STRIPE_SECRET_KEY     - sk_test_... / sk_live_...
//   STRIPE_WEBHOOK_SECRET - whsec_... from the Stripe webhook endpoint config
//
// Authentication is the Stripe signature check below — never remove it.

import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const ok = (extra: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ received: true, ...extra }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "",
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // checkout.session.completed fires for card payments (payment_status=paid).
  // Async methods (e.g. bank debits) complete later via async_payment_succeeded.
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return ok({ ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return ok({ pending: true });

  const userId = session.metadata?.user_id;
  const credits = Number(session.metadata?.credits);
  if (!userId || !Number.isFinite(credits) || credits <= 0) {
    // Not a session we created (or malformed) — acknowledge so Stripe
    // doesn't retry forever, but log it for investigation.
    console.error("Checkout session missing credit metadata:", session.id);
    return ok({ skipped: "missing metadata" });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Idempotency: claim this session id first. A duplicate delivery (or the
  // async event arriving after completed) hits the primary-key conflict and
  // is safely ignored.
  const { error: claimError } = await admin
    .from("stripe_events")
    .insert({ id: session.id, type: event.type });
  if (claimError) {
    if (claimError.code === "23505") return ok({ duplicate: true });
    console.error("Failed to record stripe event:", claimError);
    return new Response("Storage error", { status: 500 }); // Stripe will retry
  }

  const amountDollars = (session.amount_total ?? 0) / 100;
  const { error: creditError } = await admin.rpc("credit_balance", {
    p_user_id: userId,
    p_amount: credits,
    p_ref: `stripe_${session.id}`,
    p_description: `Credit purchase — $${amountDollars.toFixed(2)} via Stripe`,
  });

  if (creditError) {
    console.error("Failed to credit balance:", creditError);
    // Release the idempotency claim so Stripe's retry can credit successfully.
    await admin.from("stripe_events").delete().eq("id", session.id);
    return new Response("Credit failed", { status: 500 });
  }

  return ok({ credited: credits, user: userId });
});
