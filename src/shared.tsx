import React from "react";
import { supabase } from "./supabase";
import cajugaLogo from "./cajuga-logo.svg";

// Helpers and small pieces used by both the consumer app and the admin
// console. They live here so the console can sit in its own lazily-loaded
// chunk without the two importing each other.

// Keyword screening applied to every submission (community or generated).
// A failed check blocks one-click approval in the admin console.
const FILTER_KEYWORDS = {
  perverseIncentive: [
    "die",
    "death",
    "killed",
    "resign",
    "arrested",
    "overdose",
    "hospitalized",
  ],
  dignity: [
    "cheat",
    "cheating",
    "affair",
    "pregnant",
    "miscarriage",
    "rehab",
    "eating disorder",
    "breakdown",
    "suicidal",
  ],
  prohibited: ["minor", "underage", "child", "suicide"],
};

const autoCheckSubmission = (q) => {
  const t = q.toLowerCase();
  const checks = {
    publicResolution: true,
    noPerverseIncentive: true,
    dignity: true,
    valuesAligned: true,
  };
  let r = null;
  if (FILTER_KEYWORDS.perverseIncentive.find((w) => t.includes(w))) {
    checks.noPerverseIncentive = false;
    r = "Markets on mortality, removal, or arrest create perverse incentives.";
  }
  if (FILTER_KEYWORDS.dignity.find((w) => t.includes(w))) {
    checks.dignity = false;
    r =
      "Markets on private relationships, health, or personal struggles are out of scope.";
  }
  if (FILTER_KEYWORDS.prohibited.find((w) => t.includes(w))) {
    checks.dignity = false;
    checks.valuesAligned = false;
    r = "Not permitted on Cajuga.";
  }
  if (t.length < 20) {
    checks.publicResolution = false;
    r = "Question is too vague for clear resolution.";
  }
  return { checks, rejectReason: r };
};

// Insert a submission row, falling back to the base columns if the
// submission_automation migration hasn't been applied to this database yet.
const insertSubmission = async (payload) => {
  let { data, error } = await supabase
    .from("submissions")
    .insert(payload)
    .select()
    .single();
  if (error && /column|schema/i.test(error.message || "")) {
    const base = { ...payload };
    ["source", "submitter", "auto_checks", "reject_reason"].forEach(
      (k) => delete base[k],
    );
    ({ data, error } = await supabase
      .from("submissions")
      .insert(base)
      .select()
      .single());
  }
  return { data, error };
};

// DB row -> the shape the admin UI renders. Rows predating the automation
// migration have no stored checks, so re-screen those on the way in.
const mapSubmissionRow = (s) => ({
  id: s.id,
  submitter: s.submitter || s.username || "Anonymous",
  // Resolved by admin_submissions() from user_id — trustworthy, unlike the
  // submitter/username strings the browser sent at insert time.
  accountUsername: s.account_username || null,
  userId: s.user_id || null,
  source: s.source || "community",
  time: new Date(s.created_at).toLocaleString(),
  category: s.category,
  question: s.question,
  show: s.show,
  context: s.context,
  endsHint: s.ends_hint,
  sourceUrl: s.source_url,
  sourceTitle: s.source_title,
  autoChecks: s.auto_checks || autoCheckSubmission(s.question || "").checks,
  rejectReason:
    s.reject_reason ?? autoCheckSubmission(s.question || "").rejectReason,
  status: s.status,
  supabaseId: s.id,
});

const communityImpact = {
  totalGiven: 482193,
  contributors: 12847,
  byArea: [
    { cause: "Women's health research", amount: 120548, pct: 25 },
    { cause: "Mental health initiatives", amount: 120548, pct: 25 },
    { cause: "Economic empowerment", amount: 120548, pct: 25 },
    {
      cause: "Reproductive rights & healthcare access",
      amount: 120548,
      pct: 25,
    },
  ],
};

// Total staked on a market, from the columns place_trade actually maintains.
// The legacy `volume` text column is written once at approval ("$0") and never
// updated, so anything reading it shows $0 forever.
const marketVolume = (m) =>
  Number(m?.yes_volume || 0) + Number(m?.no_volume || 0);

const formatVolume = (n) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`;

// ========== LOGO ==========
const Logo = ({ size = 32 }) => (
  <img
    src={cajugaLogo}
    alt="Cajuga"
    width={size}
    height={size}
    style={{ display: "block" }}
  />
);

// ========== AVATAR ==========

// Falls back to the initial when there is no picture, so every call site can
// pass avatarUrl unconditionally.
const Avatar = ({
  username,
  avatarUrl,
  size = 36,
  className = "",
}: {
  username?: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) => {
  const colors = [
    "bg-amber-200",
    "bg-rose-200",
    "bg-emerald-200",
    "bg-sky-200",
    "bg-violet-200",
    "bg-orange-200",
  ];
  const colorIdx = username ? username.charCodeAt(0) % colors.length : 0;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username ? `${username}'s profile picture` : "Profile picture"}
        width={size}
        height={size}
        loading="lazy"
        className={`rounded-full object-cover flex-shrink-0 bg-stone-100 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`${colors[colorIdx]} rounded-full flex items-center justify-center font-medium text-stone-800 flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {username ? username[0].toUpperCase() : "?"}
    </div>
  );
};

// Pulls the JSON body out of a failed functions.invoke call. supabase-js wraps
// a non-2xx response in a FunctionsHttpError and leaves `data` null, so the
// message the function actually returned is only reachable through context.
// Without this, every server-side rejection collapses into a generic string.
const readFunctionError = async (err: any): Promise<string | null> => {
  if (!err) return null;
  try {
    const body = await err.context?.json?.();
    if (body?.error) return String(body.error);
  } catch {
    // Body already consumed or not JSON -- fall back to the generic message.
  }
  return null;
};

export {
  readFunctionError,
  Avatar,
  FILTER_KEYWORDS,
  autoCheckSubmission,
  insertSubmission,
  mapSubmissionRow,
  communityImpact,
  marketVolume,
  formatVolume,
  Logo,
};
