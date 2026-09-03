-- User feedback: bug reports, ideas, market suggestions.

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,                       -- null if we couldn't attribute it
  name       text,                       -- optional, user-supplied
  email      text,                       -- optional, user-supplied
  category   text not null default 'other',
  message    text not null check (length(btrim(message)) between 1 and 4000),
  status     text not null default 'new',   -- new | reviewed
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_idx
  on public.feedback (created_at desc);
create index if not exists feedback_status_idx on public.feedback (status);

alter table public.feedback enable row level security;

-- Signed-in users may submit. There is deliberately no SELECT policy: nobody
-- reads this from the browser, admins go through admin_feedback() below.
-- (To accept feedback from logged-out visitors later, add the same policy
-- `to anon` -- but note that opens the table to anyone holding the anon key.)
create policy feedback_insert_authenticated on public.feedback
  for insert to authenticated with check (true);

-- ---------------------------------------------------------------------------
-- Admin reads
-- ---------------------------------------------------------------------------
create or replace function public.admin_feedback(p_limit integer default 200)
returns table (
  id         uuid,
  created_at timestamptz,
  category   text,
  message    text,
  name       text,
  email      text,
  status     text,
  username   text,
  user_email text
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
  select f.id, f.created_at, f.category, f.message, f.name, f.email, f.status,
         pr.username, u.email::text
    from feedback f
    left join auth.users u  on u.id::text = f.user_id::text
    left join profiles  pr on pr.user_id::text = f.user_id::text
   order by f.created_at desc
   limit greatest(1, least(p_limit, 1000));
end;
$$;

create or replace function public.admin_set_feedback_status(
  p_id uuid,
  p_status text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  if p_status not in ('new', 'reviewed') then
    raise exception 'Invalid status';
  end if;

  update feedback set status = p_status where id = p_id;
end;
$$;

revoke execute on function public.admin_feedback(integer) from public, anon;
revoke execute on function public.admin_set_feedback_status(uuid, text)
  from public, anon;
grant execute on function public.admin_feedback(integer) to authenticated;
grant execute on function public.admin_set_feedback_status(uuid, text)
  to authenticated;
