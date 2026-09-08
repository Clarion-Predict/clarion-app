-- Feedback triage: priority, archiving, and hard delete.

alter table public.feedback
  add column if not exists priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high'));

-- Archived is deliberately separate from status rather than a third status
-- value, so an item can be both reviewed and archived.
alter table public.feedback
  add column if not exists archived boolean not null default false;

create index if not exists feedback_archived_idx on public.feedback (archived);

-- ---------------------------------------------------------------------------
-- admin_feedback gains priority + archived. The return type changes, so the
-- function has to be dropped first -- create or replace cannot alter it.
-- Archived rows are returned too; the console filters them client-side.
-- ---------------------------------------------------------------------------
drop function if exists public.admin_feedback(integer);

create function public.admin_feedback(p_limit integer default 200)
returns table (
  id         uuid,
  created_at timestamptz,
  category   text,
  message    text,
  name       text,
  email      text,
  status     text,
  priority   text,
  archived   boolean,
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
         f.priority, f.archived, pr.username, u.email::text
    from feedback f
    left join auth.users u  on u.id::text = f.user_id::text
    left join profiles  pr on pr.user_id::text = f.user_id::text
   order by f.created_at desc
   limit greatest(1, least(p_limit, 1000));
end;
$$;

create or replace function public.admin_set_feedback_priority(
  p_id uuid,
  p_priority text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  if p_priority not in ('low', 'medium', 'high') then
    raise exception 'Invalid priority';
  end if;

  update feedback set priority = p_priority where id = p_id;
end;
$$;

create or replace function public.admin_set_feedback_archived(
  p_id uuid,
  p_archived boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  update feedback set archived = p_archived where id = p_id;
end;
$$;

-- Hard delete. There is no undo, so the console confirms before calling this.
create or replace function public.admin_delete_feedback(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  delete from feedback where id = p_id;
end;
$$;

revoke execute on function public.admin_feedback(integer) from public, anon;
revoke execute on function public.admin_set_feedback_priority(uuid, text)
  from public, anon;
revoke execute on function public.admin_set_feedback_archived(uuid, boolean)
  from public, anon;
revoke execute on function public.admin_delete_feedback(uuid) from public, anon;

grant execute on function public.admin_feedback(integer) to authenticated;
grant execute on function public.admin_set_feedback_priority(uuid, text)
  to authenticated;
grant execute on function public.admin_set_feedback_archived(uuid, boolean)
  to authenticated;
grant execute on function public.admin_delete_feedback(uuid) to authenticated;
