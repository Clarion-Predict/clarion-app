# Live market generation

Replaces the old hardcoded template list. Admin clicks **Generate** in the admin console → Claude searches the web for current reality-TV news, drafts policy-compliant yes/no questions from what it actually found, and queues them for review with a link to the source it used.

## How it works

1. **Admin console → Submissions → Generate** calls the `generate-markets` edge function with a batch size (1–8).
2. The function verifies the caller is an admin (service-role lookup on `admins`), then loads **every open market question and every pending submission** — the list the model must not duplicate.
3. Claude (`claude-opus-5`, web search enabled) searches for recent news and drafts questions. The system prompt carries Cajuga's markets policy — what we list, what we don't, and the duplicate/inversion rule.
4. Each draft is validated server-side before it reaches the queue:
   - yes/no shape, known category, real `https://` source URL
   - **near-duplicate check** as a backstop to the model's judgment (see below)
5. Survivors are inserted as `pending` submissions with `source: llm-drafted` and their source URL. They flow through the same approve/reject pipeline as community submissions; approving carries the source onto the market, where traders see it as **Source** on the market detail page.

Nothing auto-lists. Every generated market is still a human decision.

## Duplicate and inversion detection

Two layers, because inversions ("will X be renewed" vs "will X be cancelled") can't be caught by string matching:

- **The model** gets the full list of live and pending questions and an explicit rule with worked examples of forbidden pairs. This is the layer that catches semantic inversions — different wording, same underlying event.
- **A server-side backstop** normalizes each question (lowercase, strip punctuation, drop stopwords **and negation words** so a question and its inverse collapse to the same token bag) and rejects anything with ≥0.7 Jaccard overlap against an existing question. It also checks each new draft against the others in the same batch.

Skipped drafts are reported back to the admin console with the reason, so you can see the filter working.

## Setup

**1. Apply the migration** (adds `source_url` / `source_title` to `submissions` and `markets`):

```sh
npx supabase db push
```

**2. Set the Anthropic API key.** Get one from [console.anthropic.com](https://console.anthropic.com) → API keys. In the Supabase dashboard → Edge Functions → Secrets, add:

- Name: `ANTHROPIC_API_KEY`
- Value: `sk-ant-...`
- Tick **"Contains secret values"**

**3. Deploy the function:**

```sh
npx supabase functions deploy generate-markets
```

**4. Try it:** admin console → Submissions → pick a batch size → **Generate**. Takes up to a minute (it's really searching the web). Cards arrive with a blue source link — click it to verify the claim before approving.

## Cost

Each generation is one Claude Opus 5 call plus web searches — roughly **$0.15–0.40 per batch** depending on size and how much it reads. Web search is billed at $10 per 1,000 searches (capped at 8 per call here). This is why the function is admin-gated and why the old "run every 4 seconds" auto-loop is gone: generation now costs money per click.

## Tuning

All in `supabase/functions/generate-markets/index.ts`:

- **`SYSTEM_PROMPT`** — the markets policy. Edit this to change what gets drafted; it's the highest-leverage knob.
- **`output_config.effort`** — currently `medium`, which keeps the call inside the edge-function wall clock. Raise to `high` if proposals get repetitive and your function timeout allows it.
- **`max_uses: 8`** on web search — more searches means fresher/deeper results and higher cost.
- **`CATEGORIES`** — must stay in sync with the category filter bar in `App.tsx`, or generated markets are only reachable under "All".
- **Jaccard threshold `0.7`** in `isNearDuplicate` — lower catches more near-duplicates but risks rejecting legitimately distinct questions about the same show.

## Known limits

- **Screening is still advisory.** The keyword filter and the "Cannot auto-approve" gate run in the browser; an admin can still list a flagged question. Fine while admins are your team — before real-money launch this should move server-side, same as the balance lockdown.
- **The model can misjudge a source.** It cites what it read, but a trade report can itself be wrong or get overtaken. The source link exists so a reviewer checks rather than trusts — that's the workflow, not a formality.
- **Generation is single-shot.** No scheduled/cron generation yet. If you want a nightly batch, the same function can be driven by a Supabase scheduled function or a cron job hitting it with an admin token.
