-- Consolidate the 3% trade fee into a single ledger row.
--
-- place_trade used to charge 2% as a fee and 1% as a charity pledge, back when
-- the pledge came out of every trade. The pledge is now 1% of annual revenue
-- at the company level, so the split no longer describes anything -- members
-- pay the same 3% either way.
--
-- Rounding note: round(x*2%) + round(x*1%) differs from round(x*3%) by a cent
-- on ~17% of sub-dollar amounts. The trade input is integer dollars, where the
-- two agree exactly, so no member is charged differently than before.
--
-- Deliberately left alone: historical 'pledge' ledger rows, and admin_stats'
-- charity_pledged which still sums them. Past totals stay correct; new trades
-- simply stop adding to them.

CREATE OR REPLACE FUNCTION "public"."place_trade"("p_market_id" "uuid", "p_side" "text", "p_amount" numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
  v_fee numeric;
  v_total_debit numeric;
  v_after_stake numeric;
  v_new_balance numeric;
  v_open_exposure numeric;
  c_seed constant numeric := 50;
  c_fee_rate constant numeric := 0.03;
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

  v_fee         := round(p_amount * c_fee_rate, 2);
  v_total_debit := p_amount + v_fee;

  if v_balance < v_total_debit then
    raise exception 'Insufficient balance: % needed (% stake + % fees), % available',
      round(v_total_debit, 2), round(p_amount, 2),
      round(v_fee, 2), round(v_balance, 2);
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
  v_new_balance := v_after_stake - v_fee;

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
    (v_uid, 'fee', -v_fee, 'trd_' || v_position.id,
     '3% trading fee', v_new_balance, p_market_id);

  return jsonb_build_object(
    'new_balance', v_new_balance,
    'stake', p_amount,
    'fee', v_fee,
    'total_debit', v_total_debit,
    'position', to_jsonb(v_position),
    'yes', v_new_yes,
    'no', v_new_no,
    'yes_volume', v_yes_vol,
    'no_volume', v_no_vol
  );
end;
$$;
