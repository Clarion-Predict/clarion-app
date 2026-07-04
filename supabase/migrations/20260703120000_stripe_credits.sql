-- Stripe credit purchases: idempotency ledger + atomic balance credit.
-- Run with `supabase db push`, or paste into the Supabase SQL editor.

-- Records every Stripe checkout session we have already credited so that
-- webhook retries / duplicate deliveries never double-credit a user.
create table if not exists public.stripe_events (
  id text primary key,          -- Stripe checkout session id (cs_...)
  type text not null,           -- Stripe event type that triggered the credit
  created_at timestamptz not null default now()
);

-- No policies on purpose: only the service-role key (used by the webhook
-- edge function) may touch this table. Anon/authenticated clients get nothing.
alter table public.stripe_events enable row level security;

-- Atomically credit a user's balance and write the matching ledger row.
-- SECURITY DEFINER so the webhook can call it via the service role while
-- regular clients cannot (execute is revoked below).
create or replace function public.credit_balance(
  p_user_id uuid,
  p_amount numeric,
  p_ref text,
  p_description text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'credit_balance: amount must be positive';
  end if;

  update balances
     set balance = balance + p_amount
   where user_id = p_user_id;

  if not found then
    insert into balances (user_id, balance)
    values (p_user_id, p_amount);
  end if;

  insert into ledger (user_id, type, amount, ref, description)
  values (p_user_id, 'deposit', p_amount, p_ref, p_description);
end;
$$;

revoke execute on function public.credit_balance(uuid, numeric, text, text) from public;
revoke execute on function public.credit_balance(uuid, numeric, text, text) from anon;
revoke execute on function public.credit_balance(uuid, numeric, text, text) from authenticated;
