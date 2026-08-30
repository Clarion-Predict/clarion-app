-- Demo prep: invite-only signup, granted practice credits, trading fees, and
-- a per-market position cap.
--
-- Fees are charged ON TOP of the stake: a $10 trade debits $10.30 ($10 to the
-- position, $0.20 platform, $0.10 charity). The previous place_trade wrote a
-- 1% pledge row to the ledger but never deducted it, so the ledger and the
-- balance disagreed; that is fixed here.

-- ---------------------------------------------------------------------------
-- 1. Invite codes
-- ---------------------------------------------------------------------------

create table if not exists public.invite_codes (
  code          text primary key,
  label         text,                                   -- who it was issued to
  max_uses      integer not null default 1 check (max_uses > 0),
  used_count    integer not null default 0 check (used_count >= 0),
  grant_amount  numeric not null default 200 check (grant_amount >= 0),
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- No policies on purpose: only the service role (the signup-with-invite edge
-- function) may read or claim a code. A browser must never see this table --
-- listing valid codes would defeat the gate.
alter table public.invite_codes enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Practice credits
-- ---------------------------------------------------------------------------
-- Granted (fake) money lives in the same balance as purchased credits, so we
-- track how much of the balance was granted. Withdrawals must never pay out
-- more than (balance - practice_credits).
--
-- Conservative rule for the friends-and-family cohort: an account with any
-- practice_credits is not withdrawable at all. Winnings on practice stakes are
-- not tracked as practice here, which is why the gate is all-or-nothing rather
-- than a running total -- revisit when real deposits and withdrawals coexist.
alter table public.balances
  add column if not exists practice_credits numeric not null default 0;

-- ---------------------------------------------------------------------------
-- 3. place_trade -- fees on top, position cap, honest ledger
-- ---------------------------------------------------------------------------

create or replace function public.place_trade(
  p_market_id uuid,
  p_side text,
  p_amount numeric
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_market markets%rowtype;
  v_balance numeric;
  v_price numeric;
  v_shares integer;
  v_yes_vol numeric;
  v_no_vol numeric;
  v_total numeric;
  v_new_yes integer;
  v_new_no integer;
  v_position positions%rowtype;
  v_platform_fee numeric;
  v_charity_fee numeric;
  v_total_debit numeric;
  v_new_balance numeric;
  v_open_exposure numeric;
  c_seed constant numeric := 50;          -- LIQUIDITY_SEED, mirrors the client
  c_platform_rate constant numeric := 0.02;  -- 2% to Cajuga
  c_charity_rate constant numeric := 0.01;   -- 1% to the chosen cause
  c_position_cap constant numeric := 100000; -- max stake per user, per market
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_side not in ('yes', 'no') then
    raise exception 'Invalid side';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid amount';
  end if;

  select * into v_market from markets where id = p_market_id for update;
  if not found then
    raise exception 'Market not found';
  end if;
  if v_market.status <> 'open' then
    raise exception 'Market is not open';
  end if;

  -- Per-market position cap: everything this user already has at risk here,
  -- plus what they are adding now.
  select coalesce(sum(invested), 0) into v_open_exposure
    from positions
   where user_id = v_uid
     and market_id::text = p_market_id::text
     and resolved = false;

  if v_open_exposure + p_amount > c_position_cap then
    raise exception 'Position limit reached: % of % already at risk in this market',
      round(v_open_exposure, 2), c_position_cap;
  end if;

  select balance into v_balance from balances where user_id = v_uid for update;
  if not found then
    raise exception 'No balance found';
  end if;

  -- Fees are charged on top of the stake, rounded to the cent so the ledger
  -- and the balance agree exactly.
  v_platform_fee := round(p_amount * c_platform_rate, 2);
  v_charity_fee  := round(p_amount * c_charity_rate, 2);
  v_total_debit  := p_amount + v_platform_fee + v_charity_fee;

  if v_balance < v_total_debit then
    raise exception 'Insufficient balance: % needed (% stake + % fees), % available',
      round(v_total_debit, 2), round(p_amount, 2),
      round(v_platform_fee + v_charity_fee, 2), round(v_balance, 2);
  end if;

  v_price := case when p_side = 'yes' then v_market.yes else v_market.no end;
  if v_price is null or v_price <= 0 then
    raise exception 'Invalid market price';
  end if;
  v_shares := floor(p_amount / (v_price / 100.0));

  v_yes_vol := coalesce(v_market.yes_volume, 0)
               + case when p_side = 'yes' then p_amount else 0 end;
  v_no_vol  := coalesce(v_market.no_volume, 0)
               + case when p_side = 'no' then p_amount else 0 end;
  v_total   := (v_yes_vol + c_seed) + (v_no_vol + c_seed);
  v_new_yes := round((v_yes_vol + c_seed) / v_total * 100);
  v_new_no  := 100 - v_new_yes;

  v_new_balance := v_balance - v_total_debit;

  -- Spending draws down granted credits first so practice money can never be
  -- inflated by trading.
  update balances
     set balance = v_new_balance,
         practice_credits = least(practice_credits, v_new_balance)
   where user_id = v_uid;

  insert into positions
    (user_id, market_id, market, category, side, shares, avg_price, invested)
  values
    (v_uid, p_market_id, v_market.question, v_market.category,
     p_side, v_shares, v_price, p_amount)
  returning * into v_position;

  update markets
     set yes = v_new_yes,
         no = v_new_no,
         yes_volume = v_yes_vol,
         no_volume = v_no_vol
   where id = p_market_id;

  insert into ledger (user_id, type, amount, ref, description) values
    (v_uid, 'trade', -p_amount, 'trd_' || v_position.id,
     upper(p_side) || ' trade -- ' || v_market.question),
    (v_uid, 'fee', -v_platform_fee, 'trd_' || v_position.id,
     '2% trading fee'),
    (v_uid, 'pledge', -v_charity_fee, 'trd_' || v_position.id,
     '1% pledge to charity');

  return jsonb_build_object(
    'new_balance', v_new_balance,
    'stake', p_amount,
    'platform_fee', v_platform_fee,
    'charity_fee', v_charity_fee,
    'total_debit', v_total_debit,
    'position', to_jsonb(v_position),
    'yes', v_new_yes,
    'no', v_new_no,
    'yes_volume', v_yes_vol,
    'no_volume', v_no_vol
  );
end;
$$;

revoke execute on function public.place_trade(uuid, text, numeric) from public, anon;
grant execute on function public.place_trade(uuid, text, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Starting grant: $50 -> $200, tracked as practice credits
-- ---------------------------------------------------------------------------

create or replace function public.ensure_balance()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_balance numeric;
  c_grant constant numeric := 200;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from balances where user_id = v_uid) then
    insert into balances (user_id, balance, practice_credits)
    values (v_uid, c_grant, c_grant);
  end if;

  select balance into v_balance from balances where user_id = v_uid;
  return jsonb_build_object('balance', v_balance);
end;
$$;

revoke execute on function public.ensure_balance() from public, anon;
grant execute on function public.ensure_balance() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Weekly refill tops up to the same $200, also as practice credits
-- ---------------------------------------------------------------------------

create or replace function public.claim_weekly_refill()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row balances%rowtype;
  v_today date := (now() at time zone 'America/New_York')::date;
  c_grant constant numeric := 200;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row from balances where user_id = v_uid for update;
  if not found then
    insert into balances (user_id, balance, practice_credits)
    values (v_uid, c_grant, c_grant)
    returning * into v_row;
    return jsonb_build_object('refilled', true, 'balance', c_grant);
  end if;

  if extract(isodow from (now() at time zone 'America/New_York')) = 1
     and v_row.balance < c_grant
     and v_row.last_refill is distinct from v_today then
    update balances
       set balance = c_grant,
           practice_credits = practice_credits + (c_grant - v_row.balance),
           last_refill = v_today
     where user_id = v_uid;
    return jsonb_build_object('refilled', true, 'balance', c_grant);
  end if;

  return jsonb_build_object('refilled', false, 'balance', v_row.balance);
end;
$$;

revoke execute on function public.claim_weekly_refill() from public, anon;
grant execute on function public.claim_weekly_refill() to authenticated;
