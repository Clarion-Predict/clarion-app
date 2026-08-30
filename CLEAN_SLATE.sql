-- ============================================================================
-- Fresh start: clear all test trading data, keep accounts.
--
-- Run these blocks ONE AT A TIME in the Supabase SQL editor, top to bottom.
-- This is IRREVERSIBLE -- Postgres has no undo. Take a backup first:
--   Supabase dashboard -> Database -> Backups
--
-- What this keeps:   user accounts, profiles, admins, invite codes
-- What this deletes: every market, position, ledger row, submission, and the
--                    social data attached to them (comments, reactions,
--                    notifications). Balances are reset to a clean $200 grant.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- STEP 1 -- PREVIEW. Run this alone first and read the numbers.
-- Nothing is deleted by this block.
-- ----------------------------------------------------------------------------
select 'markets'       as table_name, count(*) as rows_to_delete from markets
union all select 'positions',     count(*) from positions
union all select 'ledger',        count(*) from ledger
union all select 'submissions',   count(*) from submissions
union all select 'comments',      count(*) from comments
union all select 'reactions',     count(*) from reactions
union all select 'notifications', count(*) from notifications
union all select '--- KEPT: profiles',  count(*) from profiles
union all select '--- KEPT: balances',  count(*) from balances
union all select '--- KEPT: admins',    count(*) from admins
order by 1;


-- ----------------------------------------------------------------------------
-- STEP 2 -- Delete trading data, child rows first.
-- Order matters: rows that reference a market go before the markets do.
-- ----------------------------------------------------------------------------
delete from ledger;
delete from positions;
delete from markets;
delete from submissions;


-- ----------------------------------------------------------------------------
-- STEP 3 -- Delete social data tied to the trades that no longer exist.
-- (Skip this block if you want to keep any of it -- nothing above depends on it.)
-- ----------------------------------------------------------------------------
delete from comments;
delete from reactions;
delete from notifications;


-- ----------------------------------------------------------------------------
-- STEP 4 -- Reset every account to a clean $200 practice grant, and write the
-- one ledger row that accounts for it, so the books tie out from row one.
-- ----------------------------------------------------------------------------
update balances
   set balance = 200,
       practice_credits = 200,
       last_refill = null;

insert into ledger (user_id, type, amount, ref, description, balance_after)
select user_id, 'deposit', 200, 'reset', 'Starting practice credits', 200
  from balances;


-- ----------------------------------------------------------------------------
-- STEP 5 -- Clear stale profile stats left over from resolved test markets
-- (accuracy and leaderboard rank were computed from bets that no longer exist).
-- ----------------------------------------------------------------------------
update profiles
   set accuracy = 0,
       total_resolved = 0,
       impact_score = 0,
       leaderboard_rank = null;


-- ----------------------------------------------------------------------------
-- STEP 6 -- VERIFY. Everything should read 0 except balances/profiles/ledger.
-- ----------------------------------------------------------------------------
select 'markets' as table_name, count(*) from markets
union all select 'positions',   count(*) from positions
union all select 'submissions', count(*) from submissions
union all select 'ledger (1 per user)', count(*) from ledger
union all select 'balances',    count(*) from balances
order by 1;

select u.email, b.balance, b.practice_credits
  from balances b
  join auth.users u on u.id = b.user_id
 order by u.email;
