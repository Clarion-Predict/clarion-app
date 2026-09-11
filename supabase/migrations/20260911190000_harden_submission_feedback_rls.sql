-- Close three policies that grant far more than their names suggest.
--
-- "Admins can read all submissions"  was USING (true)      -- every member
-- "Admins can update submissions"    was USING (true)      -- every member
-- "Anyone can insert submissions"    was WITH CHECK (true) -- any user_id
-- feedback_insert_authenticated      was WITH CHECK (true) -- any user_id
--
-- The two named "Admins can ..." never checked is_admin(), so any signed-in
-- member could read every suggestion or edit its status and reject reason.
-- The two inserts let the browser choose which account a row was attributed
-- to, and the console renders that attribution as a link to a real person --
-- so a member could put words in someone else's mouth.

-- Read: admins see everything. Members see only their own, which is required
-- because insertSubmission does .insert().select() and PostgREST needs SELECT
-- permission to return the row it just wrote.
drop policy if exists "Admins can read all submissions" on public.submissions;
create policy submissions_select_own_or_admin on public.submissions
  for select to authenticated
  using (public.is_admin() or user_id = auth.uid());

-- Approving, rejecting and editing are admin actions.
drop policy if exists "Admins can update submissions" on public.submissions;
create policy submissions_update_admin on public.submissions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A member may only file a suggestion as themselves. Generated markets come
-- from the generate-markets edge function on the service role, which bypasses
-- RLS and is unaffected.
drop policy if exists "Anyone can insert submissions" on public.submissions;
create policy submissions_insert_self on public.submissions
  for insert to authenticated
  with check (user_id = auth.uid());

-- Feedback may be filed anonymously (user_id null, as the modal allows) or as
-- yourself -- never as somebody else.
drop policy if exists feedback_insert_authenticated on public.feedback;
create policy feedback_insert_self_or_anonymous on public.feedback
  for insert to authenticated
  with check (user_id is null or user_id = auth.uid());
