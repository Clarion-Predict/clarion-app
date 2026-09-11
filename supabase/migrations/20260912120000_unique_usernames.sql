-- Usernames must identify exactly one account.
--
-- Nothing previously stopped two accounts sharing a username: signup only
-- checked it was non-empty. In Gossip comments, on the leaderboard and in
-- notifications, a second "juan" is indistinguishable from the first -- and it
-- weakens the notifications policy, which proves you hold the username you
-- claim. That proof means little when two accounts hold it.
--
-- Case-insensitive, because "Juan" and "juan" read as the same person.

-- Fail early and legibly rather than with a bare unique-violation.
do $$
declare dupes text;
begin
  select string_agg(format('%s (x%s)', lower(username), n), ', ')
    into dupes
    from (
      select lower(username) as username, count(*) as n
        from public.profiles
       group by lower(username)
      having count(*) > 1
    ) d;

  if dupes is not null then
    raise exception
      'Cannot add the unique username index -- these are already duplicated: %. Rename the later accounts, then re-run this migration.', dupes;
  end if;
end $$;

create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

-- Shape rule: lowercase letters, digits and underscore only, 3-20 characters.
-- This is what actually blocks lookalike names -- a Cyrillic "а" is a
-- different character from a Latin "a" and would otherwise pass a uniqueness
-- check while rendering identically. It also rules out zero-width characters
-- and right-to-left overrides.
--
-- NOT VALID so existing accounts are left alone; it applies to every insert
-- and update from here on. Run `alter table public.profiles validate
-- constraint profiles_username_format;` once any legacy names are cleaned up.
alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[a-z0-9_]{3,20}$') not valid;
