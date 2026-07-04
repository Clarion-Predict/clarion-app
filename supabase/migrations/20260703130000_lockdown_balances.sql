-- Lockdown: stop the browser from writing balances/positions/markets/ledger
-- directly. All balance math moves into SECURITY DEFINER functions; clients
-- get read-only access via RLS.
--
-- Run AFTER 20260703120000_stripe_credits.sql (supabase db push applies both).
--
-- NOTE: assumes markets.id / positions.market_id are bigint (Supabase default
-- identity columns). If yours are uuid, change the two `bigint` params below.

-- ---------------------------------------------------------------------------
-- 0. Helpers / schema tweaks
-- ---------------------------------------------------------------------------

-- Tracks the Monday practice-credit refill server-side (was localStorage).
alter table public.balances add column if not exists last_refill date;

-- Admin check usable inside RLS policies without recursing into admins' own
-- policies (security definer bypasses RLS).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- 1. RLS: wipe existing policies on the money tables, then re-create strict ones
-- ---------------------------------------------------------------------------

do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in ('balances', 'ledger', 'positions', 'markets', 'admins')
  loop
    execute format('drop policy %I on %I.%I',
                   pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

alter table public.balances  enable row level security;
alter table public.ledger    enable row level security;
alter table public.positions enable row level security;
alter table public.markets   enable row level security;
alter table public.admins    enable row level security;

-- Balances: users may read their own row. No client writes at all.
create policy balances_select_own on public.balances
  for select to authenticated using (auth.uid() = user_id);

-- Ledger: users may read their own entries. No client writes.
create policy ledger_select_own on public.ledger
  for select to authenticated using (auth.uid() = user_id);

-- Positions: readable by any logged-in user (the social feed shows other
-- users' bets). No client writes — place_trade/resolve_market do them.
create policy positions_select_all on public.positions
  for select to authenticated using (true);

-- Markets: public read (landing page loads markets before login).
-- Only admins may create/update (e.g. approving submissions).
create policy markets_select_all on public.markets
  for select to anon, authenticated using (true);
create policy markets_admin_insert on public.markets
  for insert to authenticated with check (public.is_admin());
create policy markets_admin_update on public.markets
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Admins: users can only see whether they themselves are an admin.
create policy admins_select_own on public.admins
  for select to authenticated using (auth.uid() = user_id);

-- The stats RPCs were callable by any logged-in user (= anyone could set
-- their own accuracy). Now only resolve_market (below) calls them.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('update_user_stats', 'update_leaderboard_rank')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. ensure_balance() — creates the $50 starting balance (was a client insert)
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
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from balances where user_id = v_uid) then
    insert into balances (user_id, balance) values (v_uid, 50);
  end if;

  select balance into v_balance from balances where user_id = v_uid;
  return jsonb_build_object('balance', v_balance);
end;
$$;

revoke execute on function public.ensure_balance() from public, anon;
grant execute on function public.ensure_balance() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. place_trade() — the only way a client can spend balance
-- ---------------------------------------------------------------------------

create or replace function public.place_trade(
  p_market_id bigint,
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
  c_seed constant numeric := 50;  -- LIQUIDITY_SEED, mirrors the old client math
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

  select balance into v_balance from balances where user_id = v_uid for update;
  if not found then
    raise exception 'No balance found';
  end if;
  if v_balance < p_amount then
    raise exception 'Insufficient balance';
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

  update balances set balance = balance - p_amount where user_id = v_uid;

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
     upper(p_side) || ' practice trade — ' || v_market.question),
    (v_uid, 'pledge', -(p_amount * 0.01), 'trd_' || v_position.id, '1% pledge');

  return jsonb_build_object(
    'new_balance', v_balance - p_amount,
    'position', to_jsonb(v_position),
    'yes', v_new_yes,
    'no', v_new_no,
    'yes_volume', v_yes_vol,
    'no_volume', v_no_vol
  );
end;
$$;

revoke execute on function public.place_trade(bigint, text, numeric) from public, anon;
grant execute on function public.place_trade(bigint, text, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. claim_weekly_refill() — Monday top-up to $100, enforced server-side
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
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row from balances where user_id = v_uid for update;
  if not found then
    insert into balances (user_id, balance) values (v_uid, 50)
    returning * into v_row;
  end if;

  if extract(isodow from (now() at time zone 'America/New_York')) = 1
     and v_row.balance < 100
     and v_row.last_refill is distinct from v_today then
    update balances
       set balance = 100, last_refill = v_today
     where user_id = v_uid;
    return jsonb_build_object('refilled', true, 'balance', 100);
  end if;

  return jsonb_build_object('refilled', false, 'balance', v_row.balance);
end;
$$;

revoke execute on function public.claim_weekly_refill() from public, anon;
grant execute on function public.claim_weekly_refill() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. resolve_market() — admin-only payout/void logic (was AdminPanel client code)
-- ---------------------------------------------------------------------------

create or replace function public.resolve_market(
  p_market_id bigint,
  p_outcome text,
  p_cutoff timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pos record;
  v_user record;
  v_won boolean;
  v_payout numeric;
  v_resolved int := 0;
  v_voided int := 0;
  v_paid numeric := 0;
  v_rank int := 0;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  if p_outcome not in ('yes', 'no') then
    raise exception 'Invalid outcome';
  end if;

  update markets
     set status = 'resolved', outcome = p_outcome, cutoff_at = p_cutoff
   where id = p_market_id;
  if not found then
    raise exception 'Market not found';
  end if;

  for v_pos in
    select * from positions
     where market_id = p_market_id and resolved = false
  loop
    if p_cutoff is not null and v_pos.created_at > p_cutoff then
      -- Placed after the cutoff: void it and refund the stake.
      update positions
         set resolved = true, won = false, payout = v_pos.invested, voided = true
       where id = v_pos.id;
      update balances set balance = balance + v_pos.invested
       where user_id = v_pos.user_id;
      v_voided := v_voided + 1;
    else
      v_won := (v_pos.side = p_outcome);
      v_payout := case when v_won then v_pos.shares else 0 end;
      update positions
         set resolved = true, won = v_won, payout = v_payout, voided = false
       where id = v_pos.id;
      if v_payout > 0 then
        update balances set balance = balance + v_payout
         where user_id = v_pos.user_id;
        v_paid := v_paid + v_payout;
      end if;
      v_resolved := v_resolved + 1;
    end if;
  end loop;

  -- Recompute accuracy/impact for every user touched by this market
  -- (voided positions don't count, matching the old client logic).
  for v_user in
    select p.user_id,
           count(*) filter (where p.won) as wins,
           count(*) as total
      from positions p
     where p.resolved = true
       and coalesce(p.voided, false) = false
       and p.user_id in (
         select distinct user_id from positions where market_id = p_market_id
       )
     group by p.user_id
  loop
    perform update_user_stats(
      p_user_id       => v_user.user_id,
      p_wins          => v_user.wins::int,
      p_total_resolved => v_user.total::int,
      p_accuracy      => round(v_user.wins::numeric / v_user.total * 100)::int,
      p_impact_score  => (v_user.wins * 10)::int
    );
  end loop;

  -- Recompute leaderboard ranks (was a client-side loop).
  for v_user in
    select user_id from profiles order by accuracy desc nulls last
  loop
    v_rank := v_rank + 1;
    perform update_leaderboard_rank(p_user_id => v_user.user_id, p_rank => v_rank);
  end loop;

  return jsonb_build_object(
    'resolved', v_resolved,
    'voided', v_voided,
    'paid_out', v_paid
  );
end;
$$;

revoke execute on function public.resolve_market(bigint, text, timestamptz) from public, anon;
grant execute on function public.resolve_market(bigint, text, timestamptz) to authenticated;
