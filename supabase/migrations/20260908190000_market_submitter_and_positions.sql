-- Admin market detail: who suggested a market, and who has bet on it.

-- ---------------------------------------------------------------------------
-- 1. Link markets back to the account that suggested them
-- ---------------------------------------------------------------------------
-- Approving a submission copied its fields into markets but dropped the
-- submitter, so there was no way to get from a live market back to a person.
alter table public.markets add column if not exists submitted_by uuid;

-- Backfill: approval copies the question verbatim, so matching on question
-- text recovers attribution for markets created before this column existed.
-- distinct on picks the earliest submission when a question was suggested
-- more than once; anything with no match is left null rather than guessed.
update public.markets m
   set submitted_by = sub.user_id
  from (
    select distinct on (question) question, user_id
      from public.submissions
     where user_id is not null
     order by question, created_at asc
  ) sub
 where sub.question = m.question
   and m.submitted_by is null;

-- ---------------------------------------------------------------------------
-- 2. Per-market bet ledger
-- ---------------------------------------------------------------------------
create or replace function public.admin_market_positions(p_market_id uuid)
returns table (
  id         uuid,
  user_id    uuid,
  username   text,
  email      text,
  side       text,
  shares     bigint,
  avg_price  bigint,
  invested   numeric,
  payout     numeric,
  resolved   boolean,
  won        boolean,
  voided     boolean,
  created_at timestamp
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
  select p.id, p.user_id, pr.username, u.email::text, p.side, p.shares,
         p.avg_price, p.invested, p.payout, p.resolved, p.won, p.voided,
         p.created_at
    from positions p
    left join auth.users u  on u.id::text = p.user_id::text
    left join profiles  pr on pr.user_id::text = p.user_id::text
   -- positions.market_id is text while markets.id is uuid
   where p.market_id = p_market_id::text
   order by p.created_at desc;
end;
$$;

revoke execute on function public.admin_market_positions(uuid) from public, anon;
grant execute on function public.admin_market_positions(uuid) to authenticated;
