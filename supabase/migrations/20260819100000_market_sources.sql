-- Source attribution for generated markets.
--
-- Generated submissions cite the page they were drafted from so a reviewer can
-- verify the claim in one click; approving a submission carries the citation
-- onto the market, where traders see it as "Source" on the market detail page.

alter table public.submissions add column if not exists source_url text;
alter table public.submissions add column if not exists source_title text;

alter table public.markets add column if not exists source_url text;
alter table public.markets add column if not exists source_title text;
