-- Lock down who can create a notification.
--
-- The old policy was `for insert to authenticated with check (true)`, which let
-- any signed-in user write any row in this table: a notification addressed to
-- anyone, attributed to anyone, of any type. A member could forge
-- "You won $500" against another account, or post a comment notification in
-- someone else's name.
--
-- Three constraints now apply to browser inserts:
--   * only comment/reaction types -- 'win' is written by resolve_market, which
--     is security definer and bypasses RLS, so it needs no client permission
--   * actor_username must be the inserter's own username, so nobody can be
--     impersonated
--   * the recipient must own the trade being commented on. trade_key is
--     '<user uuid>_<market uuid>' and uuids contain no underscore, so the
--     segment before the first underscore is the trade owner.

drop policy if exists "Anyone can insert notifications" on public.notifications;

create policy notifications_insert_own_actions on public.notifications
  for insert to authenticated
  with check (
    type in ('comment', 'reaction')
    and actor_username = (
      select p.username from public.profiles p where p.user_id = auth.uid()
    )
    and user_id::text = split_part(trade_key, '_', 1)
  );
