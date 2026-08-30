-- Admin console data access.
--
-- The security lockdown made balances/ledger read-own-only, which is correct
-- for users and blocks the admin console entirely. Rather than loosening those
-- table policies -- which would widen the blast radius of any future policy
-- mistake -- admins read through these SECURITY DEFINER functions.
--
-- Each one gates on is_admin() and returns exactly the shape the console needs,
-- so the browser makes one call per view instead of N+1 queries it isn't
-- allowed to make anyway.

-- ---------------------------------------------------------------------------
-- Per-user roll-up for the Users tab
-- ---------------------------------------------------------------------------
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
    p.username,
    coalesce(b.balance, 0)::numeric,
    coalesce(b.practice_credits, 0)::numeric,
    (a.user_id is not null),
    coalesce(pos.open_count, 0)::bigint,
    coalesce(pos.staked, 0)::numeric,
    coalesce(pay.payouts, 0)::numeric,
    u.created_at
  from auth.users u
  left join profiles p on p.user_id::text = u.id::text
  left join balances b on b.user_id::text = u.id::text
  left join admins   a on a.user_id::text = u.id::text
  left join lateral (
    select count(*) filter (where resolved = false) as open_count,
           sum(invested) filter (where resolved = false) as staked
      from positions where user_id::text = u.id::text
  ) pos on true
  left join lateral (
    select sum(amount) as payouts
      from ledger
     where user_id::text = u.id::text and type in ('payout', 'refund')
  ) pay on true
  order by u.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ledger for the Ledger tab, newest first, with the account attached
-- ---------------------------------------------------------------------------
create or replace function public.admin_ledger(
  p_limit integer default 200,
  p_user_id uuid default null
)
returns table (
  id            uuid,
  created_at    timestamptz,
  username      text,
  email         text,
  type          text,
  amount        numeric,
  balance_after numeric,
  description   text,
  ref           text,
  market_id     uuid
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
    l.id,
    l.created_at,
    p.username,
    u.email::text,
    l.type,
    l.amount,
    l.balance_after,
    l.description,
    l.ref,
    l.market_id
  from ledger l
  left join auth.users u on u.id::text = l.user_id::text
  left join profiles   p on p.user_id::text = l.user_id::text
  where p_user_id is null or l.user_id::text = p_user_id::text
  -- NULLS LAST keeps pre-migration rows (no timestamp) at the bottom instead
  -- of pretending they're the newest.
  order by l.created_at desc nulls last
  limit greatest(1, least(p_limit, 1000));
end;
$$;

-- ---------------------------------------------------------------------------
-- Platform totals for the Overview tab -- the revenue story, from the ledger
-- rather than from anything the client computes
-- ---------------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  select jsonb_build_object(
    'users',             (select count(*) from auth.users),
    'balance_out',       (select coalesce(sum(balance), 0) from balances),
    'practice_out',      (select coalesce(sum(practice_credits), 0) from balances),
    'deposits',          (select coalesce(sum(amount), 0) from ledger where type = 'deposit'),
    'fees_collected',    (select coalesce(sum(abs(amount)), 0) from ledger where type = 'fee'),
    'charity_pledged',   (select coalesce(sum(abs(amount)), 0) from ledger where type = 'pledge'),
    'payouts',           (select coalesce(sum(amount), 0) from ledger where type in ('payout','refund')),
    'trades',            (select count(*) from ledger where type = 'trade'),
    'staked_open',       (select coalesce(sum(invested), 0) from positions where resolved = false),
    'markets_open',      (select count(*) from markets where status = 'open'),
    'markets_resolved',  (select count(*) from markets where status = 'resolved'),
    'submissions_pending',(select count(*) from submissions where status = 'pending')
  ) into v;

  return v;
end;
$$;

revoke execute on function public.admin_user_overview() from public, anon;
revoke execute on function public.admin_ledger(integer, uuid) from public, anon;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_user_overview() to authenticated;
grant execute on function public.admin_ledger(integer, uuid) to authenticated;
grant execute on function public.admin_stats() to authenticated;
