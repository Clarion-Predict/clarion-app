-- Make the "Hide bet amounts" toggle real.
--
-- It was a local checkbox: never saved, never read, and positions_select_all
-- let any signed-in member read every position row -- side, stake and payout
-- for everyone. The setting promised privacy the database did not enforce.
--
-- Postgres RLS is row-level, so it cannot blank a single column. The feed
-- therefore reads through feed_positions(), which returns the rows but nulls
-- `invested` for members who asked for it, and direct reads are narrowed to
-- your own rows so the function cannot be bypassed.

alter table public.profiles
  add column if not exists amounts_private boolean not null default false;

-- Direct reads: your own rows only. Admin views go through
-- admin_market_positions(), and place_trade/resolve_market are security
-- definer, so none of them are affected.
drop policy if exists positions_select_all on public.positions;
create policy positions_select_own on public.positions
  for select to authenticated
  using (user_id = auth.uid());

-- The Gossip feed: other members' bets, with the stake hidden when they have
-- asked for it. Your own amount is always visible to you.
create or replace function public.feed_positions(p_user_ids uuid[])
returns table (
  id         uuid,
  user_id    uuid,
  market_id  text,
  market     text,
  category   text,
  side       text,
  shares     bigint,
  avg_price  bigint,
  invested   numeric,
  resolved   boolean,
  won        boolean,
  payout     numeric,
  voided     boolean,
  created_at timestamp
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select p.id, p.user_id, p.market_id, p.market, p.category, p.side,
         p.shares, p.avg_price,
         case
           when p.user_id = auth.uid()
             or not coalesce(pr.amounts_private, false)
           then p.invested
         end,
         p.resolved, p.won, p.payout, p.voided, p.created_at
    from positions p
    left join profiles pr on pr.user_id = p.user_id
   where p.user_id = any(p_user_ids)
   order by p.created_at desc;
end;
$$;

-- Trade counts are shown on the leaderboard and carry no amounts, so they stay
-- public -- but they can no longer be gathered by reading everyone's rows.
create or replace function public.trade_counts()
returns table (user_id uuid, trades bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select p.user_id, count(*)::bigint from positions p group by p.user_id;
end;
$$;

revoke execute on function public.feed_positions(uuid[]) from public, anon;
revoke execute on function public.trade_counts() from public, anon;
grant execute on function public.feed_positions(uuid[]) to authenticated;
grant execute on function public.trade_counts() to authenticated;
