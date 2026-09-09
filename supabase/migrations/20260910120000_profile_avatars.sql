-- Profile pictures: a public avatars bucket plus the column pointing at it.

alter table public.profiles add column if not exists avatar_url text;

-- Public bucket: avatars are meant to be seen, and public read means the CDN
-- can cache them. Writes are still governed by the policies below -- "public"
-- controls reads only.
--
-- The limits here are the real enforcement. The browser also checks type and
-- size, but only for a friendly error: anyone can call the Storage API
-- directly, so the bucket has to be the thing that says no.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  524288,                                              -- 512 KB, ample post-resize
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public            = excluded.public,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Objects are stored as '{user_id}/{filename}', so the first path segment is
-- the owner. Every write policy checks it, which is what stops one member
-- overwriting another's picture.
drop policy if exists "avatars are publicly readable" on storage.objects;
create policy "avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "users upload their own avatar" on storage.objects;
create policy "users upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users replace their own avatar" on storage.objects;
create policy "users replace their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete their own avatar" on storage.objects;
create policy "users delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
