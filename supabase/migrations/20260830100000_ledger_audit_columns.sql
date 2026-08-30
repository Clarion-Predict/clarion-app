-- Make the ledger a real audit trail.
--
-- It had only (id, user_id, type, amount, ref, description) -- no timestamp,
-- so rows couldn't be sorted by time; no running balance, so you couldn't tell
-- whether the books reconcile without summing everything; and no market link,
-- so you couldn't ask "show me all activity on this market".
--
-- Resolution payouts and refunds also moved money without writing any ledger
-- row at all. That's fixed here too.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------

-- Added without a default first, so existing rows stay NULL rather than being
-- back-stamped with a time they didn't happen at. New rows get now().
alter table public.ledger add column if not exists created_at timestamptz;
alter table public.ledger alter column created_at set default now();

-- Balance immediately after this row was applied. Makes every row auditable on
-- its own: you can see the balance walk down a trade -> fee -> pledge sequence
-- without recomputing from the beginning.
alter table public.ledger add column if not exists balance_after numeric;

-- Which market this row relates to (null for deposits and withdrawals).
alter table public.ledger add column if not exists market_id uuid;

create index if not exists ledger_created_at_idx on public.ledger (created_at desc);
create index if not exists ledger_user_created_idx on public.ledger (user_id, created_at desc);
create index if not exists ledger_market_idx on public.ledger (market_id);

-- ---------------------------------------------------------------------------
-- 2. place_trade -- record running balance and the market on each row
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
  v_after_stake numeric;
  v_after_fee numeric;
  v_new_balance numeric;
  v_open_exposure numeric;
  c_seed constant numeric := 50;
  c_platform_rate constant numeric := 0.02;
  c_charity_rate constant numeric := 0.01;
  c_position_cap constant numeric := 100000;
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

  -- Running balance, so each ledger row shows the balance after itself.
  v_after_stake := v_balance - p_amount;
  v_after_fee   := v_after_stake - v_platform_fee;
  v_new_balance := v_after_fee - v_charity_fee;

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

  insert into ledger
    (user_id, type, amount, ref, description, balance_after, market_id)
  values
    (v_uid, 'trade', -p_amount, 'trd_' || v_position.id,
     upper(p_side) || ' trade: ' || v_market.question,
     v_after_stake, p_market_id),
    (v_uid, 'fee', -v_platform_fee, 'trd_' || v_position.id,
     '2% trading fee', v_after_fee, p_market_id),
    (v_uid, 'pledge', -v_charity_fee, 'trd_' || v_position.id,
     '1% pledge to charity', v_new_balance, p_market_id);

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
-- 3. credit_balance -- record the post-deposit balance
-- ---------------------------------------------------------------------------

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
declare
  v_after numeric;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'credit_balance: amount must be positive';
  end if;

  update balances
     set balance = balance + p_amount
   where user_id = p_user_id
  returning balance into v_after;

  if v_after is null then
    insert into balances (user_id, balance) values (p_user_id, p_amount)
    returning balance into v_after;
  end if;

  insert into ledger
    (user_id, type, amount, ref, description, balance_after)
  values
    (p_user_id, 'deposit', p_amount, p_ref, p_description, v_after);
end;
$$;

revoke execute on function public.credit_balance(uuid, numeric, text, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. resolve_market -- payouts and refunds now write ledger rows
-- ---------------------------------------------------------------------------

create or replace function public.resolve_market(
  p_market_id uuid,
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
  v_after numeric;
  v_question text;
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

  select question into v_question from markets where id = p_market_id;

  update markets
     set status = 'resolved', outcome = p_outcome, cutoff_at = p_cutoff
   where id = p_market_id;
  if not found then
    raise exception 'Market not found';
  end if;

  for v_pos in
    select * from positions
     where market_id::text = p_market_id::text and resolved = false
  loop
    if p_cutoff is not null and v_pos.created_at > p_cutoff then
      update positions
         set resolved = true, won = false, payout = v_pos.invested, voided = true
       where id = v_pos.id;

      update balances set balance = balance + v_pos.invested
       where user_id::text = v_pos.user_id::text
      returning balance into v_after;

      insert into ledger
        (user_id, type, amount, ref, description, balance_after, market_id)
      values
        (v_pos.user_id, 'refund', v_pos.invested, 'mkt_' || p_market_id,
         'Voided after cutoff -- stake refunded: ' || coalesce(v_question, ''),
         v_after, p_market_id);

      v_voided := v_voided + 1;
    else
      v_won := (v_pos.side = p_outcome);
      v_payout := case when v_won then v_pos.shares else 0 end;

      update positions
         set resolved = true, won = v_won, payout = v_payout, voided = false
       where id = v_pos.id;

      if v_payout > 0 then
        update balances set balance = balance + v_payout
         where user_id::text = v_pos.user_id::text
        returning balance into v_after;

        insert into ledger
          (user_id, type, amount, ref, description, balance_after, market_id)
        values
          (v_pos.user_id, 'payout', v_payout, 'mkt_' || p_market_id,
           'Won ' || v_pos.shares || ' ' || upper(v_pos.side)
             || ' shares: ' || coalesce(v_question, ''),
           v_after, p_market_id);

        v_paid := v_paid + v_payout;
      end if;
      v_resolved := v_resolved + 1;
    end if;
  end loop;

  for v_user in
    select p.user_id,
           count(*) filter (where p.won) as wins,
           count(*) as total
      from positions p
     where p.resolved = true
       and coalesce(p.voided, false) = false
       and p.user_id in (
         select distinct user_id from positions
          where market_id::text = p_market_id::text
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

revoke execute on function public.resolve_market(uuid, text, timestamptz) from public, anon;
grant execute on function public.resolve_market(uuid, text, timestamptz) to authenticated;
