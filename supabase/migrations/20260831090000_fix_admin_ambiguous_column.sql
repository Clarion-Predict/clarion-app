-- Fix: "column reference user_id is ambiguous" in admin_user_overview.
--
-- RETURNS TABLE (user_id uuid, ...) puts user_id in scope as a PL/pgSQL
-- variable. Inside the lateral subqueries, a bare `user_id` could mean either
-- that variable or the table's column, and PL/pgSQL refuses to guess.
--
-- Fix: alias every table in the subqueries and qualify every column reference.

create or replace function public.admin_user_overview()
returns table (
  user_id          uuid,
  email            text,
  username         text,
  balance          numeric,
  practice_credits numeric,
  is_admin         boolean,
  open_positions   bigint,
  total_staked     numeric,
  net_payouts      numeric,
  joined_at        timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  return query
  select
    u.id,
    u.email::text,
    pr.username,
    coalesce(ba.balance, 0)::numeric,
    coalesce(ba.practice_credits, 0)::numeric,
    (ad.user_id is not null),
    coalesce(po.open_count, 0)::bigint,
    coalesce(po.staked, 0)::numeric,
    coalesce(pay.payouts, 0)::numeric,
    u.created_at
  from auth.users u
  left join profiles pr on pr.user_id::text = u.id::text
  left join balances ba on ba.user_id::text = u.id::text
  left join admins   ad on ad.user_id::text = u.id::text
  left join lateral (
    select count(*) filter (where p2.resolved = false) as open_count,
           sum(p2.invested) filter (where p2.resolved = false) as staked
      from positions p2
     where p2.user_id::text = u.id::text
  ) po on true
  left join lateral (
    select sum(l2.amount) as payouts
      from ledger l2
     where l2.user_id::text = u.id::text
       and l2.type in ('payout', 'refund')
  ) pay on true
  order by u.created_at desc;
end;
$$;

revoke execute on function public.admin_user_overview() from public, anon;
grant execute on function public.admin_user_overview() to authenticated;
