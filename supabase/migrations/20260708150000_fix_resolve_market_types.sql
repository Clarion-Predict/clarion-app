-- Fix: positions.market_id is a text column (uuid values were inserted into
-- it via implicit cast, but comparing text = uuid has no operator, so
-- resolve_market failed with "operator does not exist: text = uuid").
-- Recreate resolve_market comparing market ids as text on both sides, which
-- is correct whether the column is text or uuid. Same defensive cast on the
-- balances user_id match. Positions volume is small; index use is not a concern.

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
     where market_id::text = p_market_id::text and resolved = false
  loop
    if p_cutoff is not null and v_pos.created_at > p_cutoff then
      -- Placed after the cutoff: void it and refund the stake.
      update positions
         set resolved = true, won = false, payout = v_pos.invested, voided = true
       where id = v_pos.id;
      update balances set balance = balance + v_pos.invested
       where user_id::text = v_pos.user_id::text;
      v_voided := v_voided + 1;
    else
      v_won := (v_pos.side = p_outcome);
      v_payout := case when v_won then v_pos.shares else 0 end;
      update positions
         set resolved = true, won = v_won, payout = v_payout, voided = false
       where id = v_pos.id;
      if v_payout > 0 then
        update balances set balance = balance + v_payout
         where user_id::text = v_pos.user_id::text;
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
