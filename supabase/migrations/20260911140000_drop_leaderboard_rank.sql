-- Remove the stored leaderboard rank.
--
-- profiles.leaderboard_rank was write-only: resolve_market recomputed it for
-- every profile on each resolution, and nothing ever read it. It was also
-- wrong -- ranked by accuracy alone with no tie-break, so the many members
-- sitting at the default 0 came out in arbitrary order, and the column's own
-- default of 0 sorted brand new accounts to the top.
--
-- The app now derives rank from live stats when it loads the leaderboard, so
-- there is nothing to keep in sync. Dropping it also removes one UPDATE per
-- user per market resolution.

CREATE OR REPLACE FUNCTION "public"."resolve_market"("p_market_id" "uuid", "p_outcome" "text", "p_cutoff" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  if p_outcome not in ('yes', 'no', 'void') then
    raise exception 'Invalid outcome';
  end if;

  select question into v_question from markets where id = p_market_id;

  update markets
     set status = 'resolved', outcome = p_outcome, cutoff_at = p_cutoff,
         resolved_at = now()
   where id = p_market_id;
  if not found then
    raise exception 'Market not found';
  end if;

  for v_pos in
    select * from positions
     where market_id::text = p_market_id::text and resolved = false
  loop
    if p_outcome = 'void'
       or (p_cutoff is not null and v_pos.created_at > p_cutoff) then
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
         case when p_outcome = 'void'
           then 'Market voided, no conclusive result -- stake refunded: '
           else 'Voided after cutoff -- stake refunded: '
         end || coalesce(v_question, ''),
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

  return jsonb_build_object(
    'resolved', v_resolved,
    'voided', v_voided,
    'paid_out', v_paid
  );
end;
$$;

drop function if exists public.update_leaderboard_rank(uuid, integer);

alter table public.profiles drop column if exists leaderboard_rank;

