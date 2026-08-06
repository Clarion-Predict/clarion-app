-- Auto-generated market submissions: extra metadata on the submissions table.
-- source       - where the submission came from (community | llm-drafted |
--                event-feed | scheduled-event)
-- submitter    - display name shown in the admin console (auto sources get a
--                label, community rows keep username as fallback)
-- auto_checks  - keyword-screening results {publicResolution, noPerverseIncentive,
--                dignity, valuesAligned}
-- reject_reason - why the auto-screen flagged it, if it did

alter table public.submissions add column if not exists source text not null default 'community';
alter table public.submissions add column if not exists submitter text;
alter table public.submissions add column if not exists auto_checks jsonb;
alter table public.submissions add column if not exists reject_reason text;
