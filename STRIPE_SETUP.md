# Stripe credit purchases — setup

How money flows:

1. User clicks the **+** next to their balance → picks a credit package in `BuyCreditsModal`.
2. The browser calls the `create-checkout-session` Supabase Edge Function (with the user's JWT). The function looks up the package price **server-side** and creates a Stripe Checkout session with `user_id` + `credits` in its metadata.
3. User pays on Stripe's hosted page and is redirected back to `/?checkout=success`.
4. Stripe calls the `stripe-webhook` Edge Function. It verifies the Stripe signature, checks idempotency (`stripe_events` table), then atomically credits `balances` and writes a `deposit` row to `ledger` via the `credit_balance` Postgres function.
5. The app polls the balance for ~20s after redirect so the new credits appear without a refresh.

The frontend needs **no Stripe keys and no new npm packages** — checkout happens on Stripe's domain, and all secrets live in Supabase Edge Function secrets.

## 1. Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed and logged in
- A Stripe account (test mode is fine to start)

Link the project (once):

```sh
supabase link --project-ref tidkhozcxzpcvbtcktkc
```

## 2. Apply the database migration

```sh
supabase db push
```

(or paste `supabase/migrations/20260703120000_stripe_credits.sql` into the Supabase SQL editor)

This creates the `stripe_events` idempotency table and the `credit_balance()` function. Only the service role can use either.

## 3. Set the secrets

From the Stripe dashboard → Developers → API keys, grab the **secret key** (`sk_test_...`). Then:

```sh
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set SITE_URL=https://your-production-domain.com   # fallback for redirects
```

(`STRIPE_WEBHOOK_SECRET` comes in step 5.)

Note: the old plan mentioned `STRIPE_PUBLIC_KEY` — it's not needed with hosted Checkout.

## 4. Deploy the edge functions

```sh
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook --no-verify-jwt
```

`--no-verify-jwt` is required on the webhook because Stripe can't send a Supabase JWT — the Stripe **signature check inside the function** is its authentication. Never remove that check.

## 5. Create the Stripe webhook endpoint

Stripe dashboard → Developers → Webhooks → **Add endpoint**:

- URL: `https://tidkhozcxzpcvbtcktkc.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed` and `checkout.session.async_payment_succeeded`

Copy the signing secret (`whsec_...`) and:

```sh
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

## 6. Test it (test mode)

1. `npm start`, log in, click the **+** next to your balance, pick a package.
2. Pay with Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC.
3. You're redirected back; within a few seconds the balance updates and a `deposit` row appears in `ledger`.
4. In the Stripe dashboard → Webhooks you can see the delivery and the function's response.

To iterate locally without deploying:

```sh
supabase functions serve --env-file supabase/.env.local
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
```

(`stripe listen` prints a temporary `whsec_...` — put it in `supabase/.env.local` as `STRIPE_WEBHOOK_SECRET`.)

## Changing packages / prices

Edit `CREDIT_PACKAGES` in `supabase/functions/create-checkout-session/index.ts` (authoritative) and the matching display list in `src/BuyCreditsModal.tsx`, then redeploy the function. The client only ever sends a package **id** — prices are never trusted from the browser.

## ⚠️ Balance-write lockdown (implemented — apply the migration)

Previously the app **updated `balances` directly from the browser** (trades, market resolution, weekly refill), meaning any logged-in user could set their own balance from the console. This is now fixed by `supabase/migrations/20260703130000_lockdown_balances.sql` + matching App.tsx changes:

- **RLS**: `balances`/`ledger` are read-own-only; `positions` read-only (any logged-in user, for the social feed); `markets` publicly readable, writable only by admins; `admins` visible only to yourself. No client can write to any of them.
- **`place_trade(market_id, side, amount)`** — validates balance & market status, deducts, records position + ledger, moves prices, all in one transaction.
- **`claim_weekly_refill()`** — Monday top-up to $100, enforced server-side (was localStorage).
- **`ensure_balance()`** — creates the fixed $50 starting balance at signup.
- **`resolve_market(market_id, outcome, cutoff)`** — admin-gated payouts/voids/stats (checks the `admins` table server-side).
- The pre-existing `update_user_stats` / `update_leaderboard_rank` RPCs were callable by anyone (anyone could set their own accuracy); execute is now revoked and `resolve_market` calls them internally.

Type note: the migration assumes `markets.id` / `positions.market_id` are `bigint`. If your tables use `uuid`, change the two parameter types in `place_trade` and `resolve_market`.

## Withdrawals (later)

Deliberately not built yet — it's a bigger lift than deposits:

- **Stripe Connect** is the right primitive: each user onboards as a Connect account (Stripe handles identity/KYC), and you pay out via Transfers. Refunding to the original card is not a substitute — Stripe only allows refunds up to the charged amount, not winnings.
- It **must not ship** until the client-side balance writes above are locked down, otherwise users can mint balance and withdraw it.
- You'll also want a manual-review queue (the admin panel already has ledger scaffolding) and per-day limits before automating payouts.
- Regulatory note: real-money prediction markets with cash-out are regulated territory (the app itself mentions CFTC registration) — get that cleared before enabling.
