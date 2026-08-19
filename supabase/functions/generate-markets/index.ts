// Generates fresh market submissions from current, real web sources.
//
// Admin-only. Claude searches the web for recent reality-TV news, drafts
// policy-compliant yes/no questions grounded in what it found, and returns a
// source URL for each so a reviewer can verify the claim in one click.
//
// Deploy:  supabase functions deploy generate-markets
// Secrets: ANTHROPIC_API_KEY  (sk-ant-...)
//
// Why server-side: the Anthropic key must never reach the browser, the
// existing-market list needed for duplicate detection is server data, and
// only the service role may read the admins table.

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Must match the category ids the app's filter bar uses — a market in any
// other category is only reachable under "All".
const CATEGORIES = [
  "spotlight",
  "dating",
  "competition",
  "housewives",
  "lifestyle",
] as const;

const SYSTEM_PROMPT = `You draft prediction-market questions for Cajuga, a reality-TV prediction market. Everything you propose goes to a human editor for approval, so precision matters more than volume.

Search the web first. Every question must come from something you actually found in a current source — a renewal announcement, a casting report, an air-date confirmation, a trade story. Never draft from memory or assumption: if you did not read it in a source during this session, do not propose it.

WHAT MAKES A GOOD MARKET
- A yes/no question with exactly one unambiguous resolution.
- Resolvable from a public source: a network broadcast, an official show or network account, or a trade publication (Deadline, Variety, THR, TVLine).
- Resolves on a specific future date. Never propose a question whose outcome is already known or whose deadline has passed.
- Genuinely uncertain. If the answer is already reported as settled, skip it.

WHAT CAJUGA WILL NOT LIST (these get rejected)
- Cast members' private relationships, breakups, or pregnancies.
- Health, mental health, addiction, or medical speculation about any individual.
- Any individual's death, arrest, or criminal charges.
- Anything an industry insider could manipulate or knows in advance.
- Unverified tabloid gossip, or anything resolving on fan polls or social-media sentiment.
- Questions about private individuals rather than public figures acting in their public roles.

DUPLICATES AND INVERSIONS — the most important rule
You will be given every question already live or awaiting review. Your proposals must not duplicate any of them, and must not be the LOGICAL INVERSE of any of them. An inverse is any question whose YES is the existing question's NO. These pairs are all forbidden:
- "Will X be renewed?" vs "Will X be cancelled?"
- "Will A win?" vs "Will A lose?" / "Will someone other than A win?"
- "Will X premiere before June 1?" vs "Will X premiere after June 1?" / "Will X be delayed past June 1?"
A market and its inverse let a trader hold both sides and win regardless of the outcome, so treat any question that resolves on the same underlying event as a duplicate — even when the wording is completely different. When in doubt, skip it and draft something on a different event.

OUTPUT
Return ONLY a JSON array, no prose and no code fences. Each element:
{
  "question": "Will ... ?",           // yes/no, <= 140 chars, names the show
  "category": "one of: ${CATEGORIES.join(", ")}",
  "show": "Show name",
  "context": "1-2 sentences on what makes this uncertain, citing what the source reported",
  "endsHint": "Mon D, YYYY",          // the resolution date
  "sourceUrl": "https://...",         // the page you actually read
  "sourceTitle": "Publication — headline"
}
Return an empty array if you cannot find enough current, policy-compliant material. An empty array is a perfectly good answer; padding it with weak or duplicate questions is not.`;

// --- Near-duplicate backstop -------------------------------------------------
// The model does the semantic work; this catches obvious misses. Negation words
// are stripped so a question and its inverse normalize to the same token bag.
const NEGATIONS = new Set([
  "not", "no", "never", "wont", "cant", "cannot", "fail", "fails", "without",
  "cancelled", "canceled", "cancel", "lose", "loses", "lost", "miss", "misses",
  "delayed", "delay", "after", "before", "under", "over", "above", "below",
]);
const STOPWORDS = new Set([
  "will", "the", "a", "an", "be", "is", "are", "was", "were", "to", "of", "in",
  "on", "at", "for", "by", "with", "and", "or", "its", "it", "this", "that",
  "have", "has", "had", "any", "all", "s", "their", "there", "than", "then",
]);

const tokenize = (q: string) =>
  new Set(
    (q || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !STOPWORDS.has(w) && !NEGATIONS.has(w)),
  );

const jaccard = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  a.forEach((w) => {
    if (b.has(w)) shared++;
  });
  return shared / (a.size + b.size - shared);
};

const isNearDuplicate = (question: string, existing: Set<string>[]) => {
  const tokens = tokenize(question);
  return existing.some((e) => jaccard(tokens, e) >= 0.7);
};

// The model is told to return bare JSON, but tolerate code fences or a
// sentence of preamble rather than throwing away a good batch.
const parseMarkets = (text: string) => {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Generation costs real money — admins only.
    const { data: adminRow } = await admin
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!adminRow) return json({ error: "Admins only" }, 403);

    const { count } = await req.json().catch(() => ({ count: 3 }));
    const wanted = Math.min(Math.max(Number(count) || 3, 1), 8);

    // Everything the model must avoid duplicating or inverting.
    const [{ data: marketRows }, { data: pendingRows }] = await Promise.all([
      admin.from("markets").select("question").eq("status", "open"),
      admin.from("submissions").select("question").eq("status", "pending"),
    ]);
    const existingQuestions = [
      ...(marketRows ?? []).map((m) => m.question),
      ...(pendingRows ?? []).map((s) => s.question),
    ].filter(Boolean);

    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });

    const today = new Date().toISOString().slice(0, 10);
    const userPrompt = `Today is ${today}. Search for reality-TV news from the last few weeks and propose ${wanted} market${wanted === 1 ? "" : "s"}.

These questions are already live or awaiting review. Do not duplicate any of them, and do not propose the logical inverse of any of them:
${existingQuestions.length ? existingQuestions.map((q) => `- ${q}`).join("\n") : "(none yet)"}`;

    const params = {
      model: "claude-opus-5",
      max_tokens: 8000,
      // medium keeps the call inside the edge-function wall clock while still
      // handling the duplicate/inversion judgment well. Raise to "high" if
      // proposals get repetitive and your function timeout allows it.
      output_config: { effort: "medium" as const },
      system: SYSTEM_PROMPT,
      tools: [
        { type: "web_search_20260209" as const, name: "web_search", max_uses: 8 },
      ],
      messages: [{ role: "user" as const, content: userPrompt }],
    };

    let response = await anthropic.messages.create(params);

    // Server-side tool loops pause after ~10 iterations; resend to continue.
    let guard = 0;
    const history: any[] = [{ role: "user", content: userPrompt }];
    while (response.stop_reason === "pause_turn" && guard++ < 3) {
      history.push({ role: "assistant", content: response.content });
      response = await anthropic.messages.create({ ...params, messages: history });
    }

    if (response.stop_reason === "refusal") {
      console.error("Model declined:", response.stop_details);
      return json({ error: "The model declined this request." }, 502);
    }

    const text = response.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");

    const drafted = parseMarkets(text);
    if (!drafted) {
      console.error("Unparseable model output:", text.slice(0, 800));
      return json({ error: "Could not parse generated markets." }, 502);
    }

    // Validate and de-duplicate before anything reaches the review queue.
    const existingTokens = existingQuestions.map(tokenize);
    const accepted: any[] = [];
    const skipped: { question: string; reason: string }[] = [];

    for (const m of drafted) {
      const question = String(m?.question ?? "").trim();
      if (!question || !/^will\b/i.test(question) || !question.endsWith("?")) {
        skipped.push({ question, reason: "not a yes/no question" });
        continue;
      }
      if (!CATEGORIES.includes(m?.category)) {
        skipped.push({ question, reason: `unknown category "${m?.category}"` });
        continue;
      }
      if (!/^https?:\/\//i.test(String(m?.sourceUrl ?? ""))) {
        skipped.push({ question, reason: "missing source URL" });
        continue;
      }
      if (isNearDuplicate(question, existingTokens)) {
        skipped.push({ question, reason: "duplicate or inverse of an existing market" });
        continue;
      }
      accepted.push(m);
      // Guard within this batch too, not just against the DB.
      existingTokens.push(tokenize(question));
    }

    // Persist as pending submissions — same review pipeline as community ones.
    const inserted: any[] = [];
    for (const m of accepted) {
      const { data: row, error } = await admin
        .from("submissions")
        .insert({
          user_id: user.id,
          username: "Cajuga AI drafted",
          submitter: "Cajuga AI drafted",
          source: "llm-drafted",
          question: m.question.trim(),
          show: String(m.show ?? "").slice(0, 120),
          category: m.category,
          context: String(m.context ?? "").slice(0, 600),
          ends_hint: String(m.endsHint ?? "").slice(0, 60),
          status: "pending",
          source_url: m.sourceUrl,
          source_title: String(m.sourceTitle ?? "").slice(0, 300),
          auto_checks: {
            publicResolution: true,
            noPerverseIncentive: true,
            dignity: true,
            valuesAligned: true,
          },
        })
        .select()
        .single();
      if (error) {
        console.error("Insert failed:", error);
        continue;
      }
      inserted.push(row);
    }

    return json({
      created: inserted,
      skipped,
      searches: response.usage?.server_tool_use?.web_search_requests ?? 0,
    });
  } catch (err) {
    console.error("generate-markets error:", err);
    return json({ error: "Generation failed. Check the function logs." }, 500);
  }
});
