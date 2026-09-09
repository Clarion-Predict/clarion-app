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

export {
  FILTER_KEYWORDS,
  autoCheckSubmission,
  insertSubmission,
  mapSubmissionRow,
  communityImpact,
  marketVolume,
  formatVolume,
  Logo,
};
