-- Fix: markets.id is uuid, not bigint. Recreate place_trade / resolve_market
-- with uuid market-id params. (Everything else from the lockdown migration
-- is unchanged and stays in effect.)

drop function if exists public.place_trade(bigint, text, numeric);
drop function if exists public.resolve_market(bigint, text, timestamptz);

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

revoke execute on function public.place_trade(uuid, text, numeric) from public, anon;
grant execute on function public.place_trade(uuid, text, numeric) to authenticated;

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

revoke execute on function public.resolve_market(uuid, text, timestamptz) from public, anon;
grant execute on function public.resolve_market(uuid, text, timestamptz) to authenticated;
