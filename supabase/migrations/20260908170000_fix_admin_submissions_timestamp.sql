-- Fix: admin_submissions() declared created_at as timestamptz, copied from
-- admin_feedback(). feedback.created_at is timestamptz but
-- submissions.created_at is timestamp WITHOUT time zone, so every call failed
-- at runtime with "structure of query does not match function result type"
-- and the admin console's submissions list came back empty.
--
-- The return type changes, so the function must be dropped rather than
-- replaced -- create or replace cannot alter a function's return type.

drop function if exists public.admin_submissions(integer);

create function public.admin_submissions(p_limit integer default 1000)
returns table (
  id               uuid,
  created_at       timestamp,
  user_id          uuid,
  question         text,
  "show"           text,
  category         text,
  context          text,
  ends_hint        text,
  status           text,
  source           text,
  submitter        text,
  username         text,
  auto_checks      jsonb,
  reject_reason    text,
  source_url       text,
  source_title     text,
  account_username text,
  account_email    text
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
  select s.id, s.created_at, s.user_id, s.question, s."show", s.category,
         s.context, s.ends_hint, s.status, s.source, s.submitter, s.username,
         s.auto_checks, s.reject_reason, s.source_url, s.source_title,
         pr.username, u.email::text
    from submissions s
    left join auth.users u  on u.id::text = s.user_id::text
    left join profiles  pr on pr.user_id::text = s.user_id::text
   order by s.created_at desc
   limit greatest(1, least(p_limit, 2000));
end;
$$;

revoke execute on function public.admin_submissions(integer) from public, anon;
grant execute on function public.admin_submissions(integer) to authenticated;
