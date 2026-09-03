import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";
import cajugaLogo from "./cajuga-logo.svg";
import BuyCreditsModal from "./BuyCreditsModal";
import TermsModal from "./TermsModal";
import FeedbackModal, { FEEDBACK_CATEGORIES } from "./FeedbackModal";
import {
  Search,
  TrendingUp,
  Users,
  MessageCircle,
  Bookmark,
  Share2,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Heart,
  Briefcase,
  Vote,
  Tv,
  ShoppingBag,
  Activity,
  X,
  Check,
  Mail,
  Shield,
  CreditCard,
  AlertCircle,
  LogOut,
  Plus,
  Bell,
  TrendingDown,
  Zap,
  Globe,
  Copy,
  Award,
  Trophy,
  Star,
  Flame,
  Settings,
  Database,
  FileText,
  Terminal,
  Play,
  RefreshCw,
  FlaskConical,
  BookOpen,
  Layers,
  ArrowRight,
  DollarSign,
  Edit3,
  Gift,
  UserCircle,
  BarChart2,
  Eye,
  EyeOff,
  AtSign,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Medal,
} from "lucide-react";

const Beaker = FlaskConical;
const HandHeart = Heart;
const BadgeCheck = Award;

// ========== FEATURE FLAGS ==========
const SHOW_PLEDGE = false; // Set to true when real money launches

// Credit purchases are paused for the friends-and-family launch. Nothing about
// the Stripe integration is deleted -- this only hides the entry point, so
// re-enabling is this flag plus clearing the PAYMENTS_ENABLED secret in
// Supabase. Move both together: a visible button that 403s is worse than no
// button at all.
const PAYMENTS_ENABLED = false;

// Captured at module load, BEFORE supabase-js consumes and strips the
// recovery hash from the URL — tells us the user arrived via a password
// reset email link.
const OPENED_FROM_RECOVERY_LINK =
  window.location.hash.includes("type=recovery");

// ========== DATA ==========
const categories = [
  { id: "all", name: "All", icon: Sparkles },
  { id: "spotlight", name: "Spotlight", icon: Flame },
  { id: "dating", name: "Dating & Love", icon: Heart },
  { id: "competition", name: "Competition", icon: Trophy },
  { id: "housewives", name: "Housewives & Bravo", icon: Star },
  { id: "lifestyle", name: "Family & Lifestyle", icon: Tv },
];

const causesByCategory = {
  spotlight: {
    name: "Mental health initiatives",
    org: "Policy Center for Maternal Mental Health, NAMI",
  },
  dating: {
    name: "Mental health initiatives",
    org: "Policy Center for Maternal Mental Health, NAMI",
  },
  competition: {
    name: "Economic empowerment",
    org: "Ellevate Foundation, Kiva",
  },
  housewives: {
    name: "Women's health research",
    org: "Society for Women's Health Research",
  },
  lifestyle: {
    name: "Reproductive rights & healthcare access",
    org: "Center for Reproductive Rights",
  },
};

const causeOptions = [
  {
    id: "womens_health",
    name: "Women's health research",
    org: "Society for Women's Health Research",
  },
  {
    id: "mental_health",
    name: "Mental health initiatives",
    org: "Policy Center for Maternal Mental Health, NAMI",
  },
  {
    id: "economic",
    name: "Economic empowerment",
    org: "Ellevate Foundation, Kiva",
  },
  {
    id: "reproductive",
    name: "Reproductive rights & healthcare access",
    org: "Center for Reproductive Rights",
  },
];

const initialMarkets = [];

// ========== MOCK COMMUNITY USERS ==========
const initialCommunityUsers = []; // real rows load from Supabase

const initialWaitlist = []; // real rows load from Supabase

const initialSubmissions = []; // real rows load from Supabase

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
const Avatar = ({ username, size = 36, className = "" }) => {
  const colors = [
    "bg-amber-200",
    "bg-rose-200",
    "bg-emerald-200",
    "bg-sky-200",
    "bg-violet-200",
    "bg-orange-200",
  ];
  const colorIdx = username ? username.charCodeAt(0) % colors.length : 0;
  return (
    <div
      className={`${colors[colorIdx]} rounded-full flex items-center justify-center font-medium text-stone-800 flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {username ? username[0].toUpperCase() : "?"}
    </div>
  );
};

// ========== SUGGEST MARKET MODAL ==========
const SuggestMarketModal = ({ onClose, authUser, onSubmitted }) => {
  const [question, setQuestion] = useState("");
  const [show, setShow] = useState("");
  const [category, setCategory] = useState("");
  const [context, setContext] = useState("");
  const [endsHint, setEndsHint] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }
    if (!category) {
      setError("Please select a category.");
      return;
    }
    if (!show.trim()) {
      setError("Please enter the show name.");
      return;
    }
    setLoading(true);
    const { checks, rejectReason } = autoCheckSubmission(question.trim());
    const { error: submitError } = await insertSubmission({
      user_id: authUser.id,
      username: authUser.username,
      question: question.trim(),
      show: show.trim(),
      category,
      context: context.trim(),
      ends_hint: endsHint.trim(),
      status: "pending",
      source: "community",
      submitter: authUser.username,
      auto_checks: checks,
      reject_reason: rejectReason,
    });
    setLoading(false);
    if (submitError) {
      setError("Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400"
        >
          <X className="w-5 h-5" />
        </button>
        {submitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-serif text-stone-900 mb-2">
              Market submitted!
            </h2>
            <p className="text-sm text-stone-500 mb-6">
              We'll review your suggestion and list it if it meets our content
              standards. Thanks for contributing!
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full bg-stone-900 text-white text-sm"
            >
              Back to Cajuga
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Logo size={28} />
              <span className="font-serif text-stone-900">
                Suggest a market
              </span>
            </div>
            <p className="text-sm text-stone-500 mb-6">
              Got a question worth trading on? Submit it and we'll review it for
              listing.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  The question <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Will Jenny get a rose tonight?"
                  className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900"
                />
                <p className="text-xs text-stone-400 mt-1">
                  Must be a yes/no question with a clear public resolution.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  Show <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={show}
                  onChange={(e) => setShow(e.target.value)}
                  placeholder="The Bachelor"
                  className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  Category <span className="text-rose-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900"
                >
                  <option value="">Select a category</option>
                  <option value="spotlight">Spotlight</option>
                  <option value="dating">Dating & Love</option>
                  <option value="competition">Competition</option>
                  <option value="housewives">Housewives & Bravo</option>
                  <option value="lifestyle">Family & Lifestyle</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  Context{" "}
                  <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="A sentence or two explaining why this is worth trading on..."
                  className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 resize-none text-stone-900"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  Resolution date{" "}
                  <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={endsHint}
                  onChange={(e) => setEndsHint(e.target.value)}
                  placeholder="e.g. Jun 10, 2026"
                  className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900"
                />
              </div>
            </div>
            {error && <p className="text-xs text-rose-600 mt-3">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-stone-900 text-white text-sm font-medium mt-6 disabled:opacity-60"
            >
              {loading ? "Submitting…" : "Submit for review"}
            </button>
            <p className="text-xs text-stone-400 text-center mt-3">
              All submissions are manually reviewed before listing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ========== SEARCH MODAL ==========
const SearchModal = ({
  onClose,
  communityUsers,
  onFollowToggle,
  onViewProfile,
  authUser,
}) => {
  const [query, setQuery] = useState("");
  const results =
    query.trim().length > 0
      ? communityUsers.filter(
          (u) =>
            u.username?.toLowerCase().includes(query.toLowerCase()) &&
            u.id !== authUser?.id,
        )
      : [];

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <Search className="w-4 h-4 text-stone-400 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username..."
              className="flex-1 text-sm bg-transparent focus:outline-none text-stone-900 placeholder-stone-400"
            />
            <button onClick={onClose} className="text-stone-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {query.trim().length === 0 && (
            <div className="p-6 text-center text-sm text-stone-400">
              Type a username to search
            </div>
          )}
          {query.trim().length > 0 && results.length === 0 && (
            <div className="p-6 text-center text-sm text-stone-400">
              No users found for "{query}"
            </div>
          )}
          {results.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 border-b border-stone-50 last:border-0"
            >
              <div
                className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-200 to-rose-200 flex items-center justify-center text-stone-800 font-medium text-sm cursor-pointer flex-shrink-0"
                onClick={() => {
                  onViewProfile(u);
                  onClose();
                }}
              >
                {u.username?.[0]?.toUpperCase() || "?"}
              </div>
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => {
                  onViewProfile(u);
                  onClose();
                }}
              >
                <div className="text-sm font-medium text-stone-900">
                  @{u.username}
                </div>
                <div className="text-xs text-stone-400">
                  {u.totalTrades} trades · {u.accuracy}% accuracy
                </div>
              </div>
              <button
                onClick={() => onFollowToggle(u.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 ${u.following ? "bg-stone-100 text-stone-600" : "bg-stone-900 text-white"}`}
              >
                {u.following ? "Following" : "Follow"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ========== WAITLIST MODAL ==========
const WaitlistModal = ({ onClose, waitlist, setWaitlist }) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [position, setPosition] = useState(null);
  const handleSubmit = () => {
    if (!email.includes("@")) return;
    const newPosition = waitlist.length + 1;
    setWaitlist([
      ...waitlist,
      { position: newPosition, email, joined: "just now" },
    ]);
    setPosition(newPosition);
    setSubmitted(true);
  };
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-stone-400"
        >
          <X className="w-5 h-5" />
        </button>
        {!submitted ? (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-200 to-rose-200 flex items-center justify-center mb-5">
              <Sparkles className="w-7 h-7 text-stone-800" />
            </div>
            <h2 className="text-2xl font-serif text-stone-900 mb-2">
              Real-money early access
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed mb-5">
              Cajuga is in practice mode while we complete CFTC registration.
              Join the waitlist.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none mb-3"
            />
            <button
              onClick={handleSubmit}
              className="w-full py-3 rounded-2xl bg-stone-900 text-white text-sm font-medium"
            >
              Join waitlist
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-serif text-stone-900 mb-2">
              You are on the list
            </h2>
            <div className="inline-block px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-sm mb-4">
              <span className="text-amber-900">Position </span>
              <span className="font-serif text-amber-900">#{position}</span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full bg-stone-900 text-white text-sm"
            >
              Back to Cajuga
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ========== USER PROFILE VIEW ==========
const UserProfileView = ({
  profileUser,
  onClose,
  onFollowToggle,
  myPositions,
  markets,
  onViewMarket,
}) => {
  const [tab, setTab] = useState("bets");
  const causeInfo = causeOptions.find((c) => c.id === profileUser.cause);
  return (
    <div className="min-h-screen bg-amber-50/40 pb-20">
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-stone-600 mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="bg-white rounded-3xl border border-stone-100 overflow-hidden mb-4">
          <div className="h-16 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100" />
          <div className="px-5 pb-5">
            <div className="flex items-end justify-between -mt-8 mb-4">
              <Avatar
                username={profileUser.username}
                size={56}
                className="border-2 border-white"
              />
              <button
                onClick={() => onFollowToggle(profileUser.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium ${profileUser.following ? "bg-stone-100 text-stone-700" : "bg-stone-900 text-white"}`}
              >
                {profileUser.following ? "Following" : "Follow"}
              </button>
            </div>
            <div className="mb-1">
              <span className="text-lg font-serif text-stone-900">
                {profileUser.name}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-stone-500 mb-4">
              <AtSign className="w-3.5 h-3.5" />
              {profileUser.username}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Accuracy",
                  value: profileUser.accuracy + "%",
                  highlight: profileUser.accuracy >= 65,
                },
                { label: "Total trades", value: profileUser.totalTrades },
              ].map((s, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-2xl text-center ${s.highlight ? "bg-emerald-50 border border-emerald-100" : "bg-stone-50"}`}
                >
                  <div
                    className={`text-xl font-serif ${s.highlight ? "text-emerald-700" : "text-stone-900"}`}
                  >
                    {s.value}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            {SHOW_PLEDGE && !profileUser.causePrivate && causeInfo && (
              <div className="mt-4 flex items-center gap-2 text-xs text-stone-500">
                <HandHeart className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  Supports{" "}
                  <span className="text-stone-700 font-medium">
                    {causeInfo.name}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {["bets", "stats"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm capitalize ${tab === t ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-stone-200"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "bets" && (
          <div className="space-y-3">
            {profileUser.positions.length === 0 && (
              <div className="text-center py-10 text-stone-400 text-sm">
                No bets yet.
              </div>
            )}
            {profileUser.positions.map((p, i) => {
              const market = markets.find((m) => m.id === p.marketId);
              return (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-stone-100 p-4"
                >
                  <div className="flex items-center gap-2 mb-2 text-xs text-stone-500">
                    <span className="capitalize">{p.category}</span>
                    <span>·</span>
                    <span>{p.ts}</span>
                  </div>
                  <p className="text-sm font-serif text-stone-900 mb-2 leading-snug">
                    {p.market}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.side === "yes" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                    >
                      {p.side.toUpperCase()}
                    </span>
                    <span className="text-xs text-stone-500">
                      ${p.amount} wagered
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "stats" && (
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <h3 className="text-sm font-medium text-stone-900 mb-4">
              Performance breakdown
            </h3>
            <div className="space-y-3">
              {[
                {
                  label: "Leaderboard rank",
                  value: "#" + profileUser.leaderboardRank,
                },
                { label: "Accuracy rate", value: profileUser.accuracy + "%" },
                {
                  label: "Total trades placed",
                  value: profileUser.totalTrades,
                },
                ...(SHOW_PLEDGE
                  ? [{ label: "Impact score", value: profileUser.impactScore }]
                  : []),
              ].map((row, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-2 border-b border-stone-50 last:border-0"
                >
                  <span className="text-sm text-stone-500">{row.label}</span>
                  <span className="text-sm font-medium text-stone-900">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ========== ACTIVITY FEED TAB ==========
const EMOJIS = ["🔥", "💯", "👀", "😮", "💀"];

const ActivityFeed = ({
  communityUsers,
  markets,
  onViewProfile,
  onViewMarket,
  authUser,
  onNewNotification,
}) => {
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [reactions, setReactions] = useState<
    Record<string, Record<string, string[]>>
  >({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const followed = communityUsers.filter((u) => u.following);
  const feedItems = followed
    .flatMap((u) =>
      (u.positions || []).map((p) => ({
        ...p,
        user: u,
        key: u.id + "_" + p.marketId,
      })),
    )
    .sort((a, b) => (a.ts > b.ts ? -1 : 1));

  console.log(
    "followed users:",
    followed.map((u) => ({
      username: u.username,
      positions: u.positions?.length,
    })),
  );
  console.log("feedItems:", feedItems.length);

  // Load comments and reactions from Supabase
  useEffect(() => {
    if (feedItems.length === 0) {
      setLoading(false);
      return;
    }
    const keys = feedItems.map((i) => i.key);

    const loadData = async () => {
      const [{ data: commentRows }, { data: reactionRows }] = await Promise.all(
        [
          supabase
            .from("comments")
            .select("*")
            .in("trade_key", keys)
            .order("created_at", { ascending: true }),
          supabase.from("reactions").select("*").in("trade_key", keys),
        ],
      );

      if (commentRows) {
        const grouped: Record<string, any[]> = {};
        commentRows.forEach((c) => {
          if (!grouped[c.trade_key]) grouped[c.trade_key] = [];
          grouped[c.trade_key].push(c);
        });
        setComments(grouped);
      }

      if (reactionRows) {
        const grouped: Record<string, Record<string, string[]>> = {};
        reactionRows.forEach((r) => {
          if (!grouped[r.trade_key]) grouped[r.trade_key] = {};
          if (!grouped[r.trade_key][r.emoji])
            grouped[r.trade_key][r.emoji] = [];
          grouped[r.trade_key][r.emoji].push(r.user_id);
        });
        setReactions(grouped);
      }
      setLoading(false);
    };
    loadData();
  }, [followed.length]);

  const submitComment = async (key, market) => {
    const text = (commentText[key] || "").trim();
    if (!text || !authUser) return;
    const { data: newComment } = await supabase
      .from("comments")
      .insert({
        user_id: authUser.id,
        username: authUser.username,
        trade_key: key,
        text,
      })
      .select()
      .single();
    if (newComment) {
      setComments((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), newComment],
      }));
    }
    setCommentText((prev) => ({ ...prev, [key]: "" }));
    // Notify trade owner (extract user_id from trade_key: format is userId_marketId)
    const ownerId = key.split("_")[0];
    if (ownerId && ownerId !== authUser.id) {
      await supabase.from("notifications").insert({
        user_id: ownerId,
        actor_username: authUser.username,
        type: "comment",
        trade_key: key,
        market,
        emoji: null,
      });
      if (onNewNotification) onNewNotification();
    }
  };

  const toggleReaction = async (key, emoji, market) => {
    if (!authUser) return;
    const existing = reactions[key]?.[emoji] || [];
    const hasReacted = existing.includes(authUser.id);
    if (hasReacted) {
      await supabase
        .from("reactions")
        .delete()
        .eq("user_id", authUser.id)
        .eq("trade_key", key)
        .eq("emoji", emoji);
      setReactions((prev) => ({
        ...prev,
        [key]: {
          ...(prev[key] || {}),
          [emoji]: (prev[key]?.[emoji] || []).filter(
            (id) => id !== authUser.id,
          ),
        },
      }));
    } else {
      await supabase
        .from("reactions")
        .insert({ user_id: authUser.id, trade_key: key, emoji });
      setReactions((prev) => ({
        ...prev,
        [key]: {
          ...(prev[key] || {}),
          [emoji]: [...(prev[key]?.[emoji] || []), authUser.id],
        },
      }));
      // Notify trade owner
      const ownerId = key.split("_")[0];
      if (ownerId && ownerId !== authUser.id) {
        await supabase.from("notifications").insert({
          user_id: ownerId,
          actor_username: authUser.username,
          type: "reaction",
          trade_key: key,
          market,
          emoji,
        });
        if (onNewNotification) onNewNotification();
      }
    }
  };

  if (followed.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="w-10 h-10 text-stone-200 mx-auto mb-3" />
        <h3 className="text-lg font-serif text-stone-900 mb-2">
          No one followed yet
        </h3>
        <p className="text-sm text-stone-500 mb-5">
          Follow other traders to see their activity here.
        </p>
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <div className="text-center py-16">
        <Activity className="w-10 h-10 text-stone-200 mx-auto mb-3" />
        <h3 className="text-lg font-serif text-stone-900 mb-2">
          No activity yet
        </h3>
        <p className="text-sm text-stone-500">
          When the people you follow place trades, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedItems.map((item) => {
        const itemComments = comments[item.key] || [];
        const itemReactions = reactions[item.key] || {};
        const causeInfo = !item.user.causePrivate
          ? causeOptions.find((c) => c.id === item.user.cause)
          : null;
        return (
          <div
            key={item.key}
            className="bg-white rounded-2xl border border-stone-100 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <button onClick={() => onViewProfile(item.user)}>
                  <Avatar username={item.user.username} size={36} />
                </button>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => onViewProfile(item.user)}
                    className="font-medium text-stone-900 text-sm hover:underline"
                  >
                    @{item.user.username}
                  </button>
                  <div className="text-xs text-stone-400">{item.ts}</div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${item.side === "yes" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                >
                  {item.side?.toUpperCase()}
                </span>
              </div>
              <p className="text-sm font-serif text-stone-900 leading-snug mb-3">
                {item.market}
              </p>
              <div className="flex items-center gap-3 text-xs text-stone-400 flex-wrap mb-3">
                <span>${item.amount?.toFixed(2)} wagered</span>
                {item.resolved && (
                  <span
                    className={`px-2 py-0.5 rounded-full font-medium ${item.voided ? "bg-stone-100 text-stone-400" : item.won ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}
                  >
                    {item.voided ? "Voided" : item.won ? "Won" : "Lost"}
                  </span>
                )}
                {SHOW_PLEDGE && causeInfo && (
                  <span className="flex items-center gap-1">
                    <HandHeart className="w-3 h-3 text-amber-500" />
                    <span>1% → {causeInfo.name}</span>
                  </span>
                )}
              </div>

              {/* Reactions */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {EMOJIS.map((emoji) => {
                  const count = itemReactions[emoji]?.length || 0;
                  const reacted = itemReactions[emoji]?.includes(authUser?.id);
                  return (
                    <button
                      key={emoji}
                      onClick={() =>
                        toggleReaction(item.key, emoji, item.market)
                      }
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all ${reacted ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-stone-50 border-stone-200 text-stone-500 hover:border-stone-300"}`}
                    >
                      <span>{emoji}</span>
                      {count > 0 && (
                        <span className="font-medium">{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comments */}
            {itemComments.length > 0 && (
              <div className="border-t border-stone-50 px-4 py-3 space-y-3">
                {itemComments.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar username={c.username} size={24} />
                    <div className="flex-1 bg-stone-50 rounded-xl px-3 py-2">
                      <span className="text-xs font-medium text-stone-700">
                        @{c.username}{" "}
                      </span>
                      <span className="text-xs text-stone-600">{c.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comment input */}
            <div className="border-t border-stone-50 px-4 py-3 flex gap-2">
              <Avatar username={authUser?.username} size={28} />
              <div className="flex-1 relative">
                <input
                  type="text"
                  maxLength={280}
                  value={commentText[item.key] || ""}
                  onChange={(e) =>
                    setCommentText((prev) => ({
                      ...prev,
                      [item.key]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" && submitComment(item.key, item.market)
                  }
                  placeholder="Add a comment…"
                  className="w-full bg-stone-50 rounded-xl px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none pr-16"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {(commentText[item.key] || "").length > 0 && (
                    <span className="text-xs text-stone-400">
                      {280 - (commentText[item.key] || "").length}
                    </span>
                  )}
                  <button
                    onClick={() => submitComment(item.key, item.market)}
                    className="text-stone-400 hover:text-stone-700"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ========== FOLLOWING TAB ==========
const FollowingTab = ({
  communityUsers,
  onFollowToggle,
  onViewProfile,
  authUser,
}) => {
  const [view, setView] = useState<"following" | "followers">("following");
  const following = communityUsers.filter((u) => u.following);
  const followers = communityUsers.filter((u) => u.followsMe);

  return (
    <div>
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setView("following")}
          className={`px-4 py-2 rounded-full text-sm font-medium ${view === "following" ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-stone-200"}`}
        >
          Following ({following.length})
        </button>
        <button
          onClick={() => setView("followers")}
          className={`px-4 py-2 rounded-full text-sm font-medium ${view === "followers" ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-stone-200"}`}
        >
          Followers ({followers.length})
        </button>
      </div>

      {view === "following" && (
        <div className="space-y-2">
          {following.length === 0 && (
            <div className="text-center py-10 text-stone-400 text-sm">
              You aren't following anyone yet.
            </div>
          )}
          {following.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-stone-100"
            >
              <button onClick={() => onViewProfile(u)}>
                <Avatar username={u.username} size={40} />
              </button>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => onViewProfile(u)}
                  className="text-sm font-medium text-stone-900 hover:underline"
                >
                  @{u.username}
                </button>
                <div className="text-xs text-stone-400">
                  {u.totalTrades} trades · {u.accuracy}% accuracy
                </div>
              </div>
              <button
                onClick={() => onFollowToggle(u.id)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600"
              >
                Unfollow
              </button>
            </div>
          ))}
        </div>
      )}

      {view === "followers" && (
        <div className="space-y-2">
          {followers.length === 0 && (
            <div className="text-center py-10 text-stone-400 text-sm">
              No one is following you yet.
            </div>
          )}
          {followers.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-stone-100"
            >
              <button onClick={() => onViewProfile(u)}>
                <Avatar username={u.username} size={40} />
              </button>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => onViewProfile(u)}
                  className="text-sm font-medium text-stone-900 hover:underline"
                >
                  @{u.username}
                </button>
                <div className="text-xs text-stone-400">
                  {u.totalTrades} trades · {u.accuracy}% accuracy
                </div>
              </div>
              <button
                onClick={() => onFollowToggle(u.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${u.following ? "bg-stone-100 text-stone-600" : "bg-stone-900 text-white"}`}
              >
                {u.following ? "Following" : "Follow back"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ========== LEADERBOARD TAB ==========
const LeaderboardTab = ({
  communityUsers,
  setCommunityUsers,
  onViewProfile,
  onFollowToggle,
}) => {
  const [sortBy, setSortBy] = useState("rank");
  const sorted = [...communityUsers].sort((a, b) => {
    if (sortBy === "rank") return a.leaderboardRank - b.leaderboardRank;
    if (sortBy === "accuracy") return b.accuracy - a.accuracy;
    if (sortBy === "impact") return b.impactScore - a.impactScore;
    return 0;
  });

  const rankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-amber-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-stone-400" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-700" />;
    return (
      <span className="text-xs font-mono text-stone-400 w-4 text-center">
        #{rank}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {[
          ["rank", "Overall rank"],
          ["accuracy", "Accuracy"],
          ...(SHOW_PLEDGE ? [["impact", "Impact score"]] : []),
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${sortBy === key ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-stone-200"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {sorted.map((u, i) => {
          const isTop3 = u.leaderboardRank <= 3;
          return (
            <div
              key={u.id}
              className={`flex items-center gap-3 p-3 md:p-4 rounded-2xl ${isTop3 ? "bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100" : "bg-white border border-stone-100"}`}
            >
              <div className="w-6 flex items-center justify-center flex-shrink-0">
                {rankIcon(u.leaderboardRank)}
              </div>
              <button
                onClick={() => onViewProfile(u)}
                className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
              >
                <Avatar username={u.username} size={36} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-stone-900 truncate">
                    @{u.username}
                  </div>
                  <div className="text-xs text-stone-400">
                    {u.totalTrades} trades
                  </div>
                </div>
              </button>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-serif text-stone-900">
                  {u.accuracy}%
                </div>
                <div className="text-xs text-stone-400">accuracy</div>
              </div>
              {SHOW_PLEDGE && (
                <div className="text-right flex-shrink-0 hidden md:block">
                  <div className="text-sm font-serif text-amber-700">
                    {u.impactScore}
                  </div>
                  <div className="text-xs text-stone-400">impact</div>
                </div>
              )}
              <button
                onClick={() => onFollowToggle(u.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 ${u.following ? "bg-stone-100 text-stone-600" : "bg-stone-900 text-white"}`}
              >
                {u.following ? "Following" : "Follow"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-stone-50 border border-stone-100 text-center">
        <p className="text-xs text-stone-500 leading-relaxed">
          Rankings update daily. Accuracy is calculated on resolved markets
          only. Impact score reflects total pledge contributions.
        </p>
      </div>
    </div>
  );
};

// ========== MY PROFILE TAB ==========
const MyProfileTab = ({
  balance,
  positions,
  markets,
  demoUser,
  userProfile,
  setUserProfile,
  onLogout,
}) => {
  const [selectedCause, setSelectedCause] = useState(userProfile?.cause || "");
  const [causePrivate, setCausePrivate] = useState(false);
  const [amountsPrivate, setAmountsPrivate] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [bio, setBio] = useState(userProfile?.bio || "");
  const totalPledged = positions.reduce((s, p) => s + p.invested * 0.01, 0);
  const username = demoUser.username || demoUser.email?.split("@")[0] || "you";

  const saveBio = async () => {
    setUserProfile((prev) => ({ ...prev, bio }));
    setEditingBio(false);
    if (demoUser?.id) {
      await supabase
        .from("profiles")
        .update({ bio })
        .eq("user_id", demoUser.id);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-3xl border border-stone-100 overflow-hidden mb-4">
        <div className="h-16 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100" />
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between -mt-8 mb-4">
            <Avatar
              username={username}
              size={56}
              className="border-2 border-white"
            />
            <span className="text-xs text-stone-400 flex items-center gap-1">
              <Beaker className="w-3 h-3" /> Practice account
            </span>
          </div>
          <div className="text-lg font-serif text-stone-900 mb-0.5">
            {demoUser.name || username}
          </div>
          <div className="flex items-center gap-1 text-sm text-stone-400 mb-3">
            <AtSign className="w-3.5 h-3.5" />
            {username}
          </div>
          {editingBio ? (
            <div className="mb-3">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:outline-none resize-none text-stone-900"
                rows={3}
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-stone-400">
                  {160 - bio.length} chars left
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingBio(false)}
                    className="text-xs text-stone-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveBio}
                    className="text-xs font-medium text-stone-900"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-3 flex items-start gap-2">
              <p className="text-sm text-stone-600 flex-1">
                {bio || (
                  <span className="text-stone-400 italic">No bio yet</span>
                )}
              </p>
              <button
                onClick={() => setEditingBio(true)}
                className="text-xs text-stone-400 hover:text-stone-700 flex-shrink-0 flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Practice balance", value: "$" + balance.toFixed(2) },
              {
                label: "Accuracy",
                value:
                  userProfile?.totalResolved > 0
                    ? userProfile.accuracy + "%"
                    : "—",
              },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-2xl bg-stone-50 text-center">
                <div className="text-lg font-serif text-stone-900">
                  {s.value}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {SHOW_PLEDGE && (
        <div className="bg-white rounded-2xl border border-stone-100 p-5 mb-4">
          <h3 className="text-sm font-medium text-stone-900 mb-1">
            The Cajuga Pledge
          </h3>
          <p className="text-xs text-stone-500 mb-4">
            1% of every trade you place goes to your chosen cause.
          </p>
          <div className="space-y-2 mb-4">
            {causeOptions.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCause(c.id);
                  setUserProfile((p) => ({ ...p, cause: c.id }));
                  if (demoUser?.id) {
                    supabase
                      .from("profiles")
                      .update({ cause: c.id })
                      .eq("user_id", demoUser.id)
                      .then(() => {});
                  }
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left ${selectedCause === c.id ? "border-amber-300 bg-amber-50" : "border-stone-100 bg-stone-50"}`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedCause === c.id ? "border-amber-500 bg-amber-500" : "border-stone-300"}`}
                >
                  {selectedCause === c.id && (
                    <Check
                      className="w-2.5 h-2.5 text-white"
                      style={{ marginTop: "1px" }}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-stone-900 font-medium">
                    {c.name}
                  </div>
                  <div className="text-xs text-stone-400 truncate">{c.org}</div>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setCausePrivate(!causePrivate)}
            className="flex items-center gap-2 text-xs text-stone-500 hover:text-stone-700"
          >
            {causePrivate ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            {causePrivate
              ? "Cause is private — tap to make public"
              : "Cause is public — tap to make private"}
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-100 p-5 mb-4">
        <h3 className="text-sm font-medium text-stone-900 mb-4">
          Privacy settings
        </h3>
        <div className="space-y-3">
          {[
            {
              label: "Hide bet amounts",
              sub: "Others see your direction (YES/NO) but not how much you wagered",
              state: amountsPrivate,
              toggle: () => setAmountsPrivate(!amountsPrivate),
            },
            ...(SHOW_PLEDGE
              ? [
                  {
                    label: "Hide cause donation",
                    sub: "Your chosen cause will not appear on your profile or activity feed",
                    state: causePrivate,
                    toggle: () => setCausePrivate(!causePrivate),
                  },
                ]
              : []),
          ].map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-2 border-b border-stone-50 last:border-0"
            >
              <div className="flex-1">
                <div className="text-sm text-stone-900">{s.label}</div>
                <div className="text-xs text-stone-400 mt-0.5">{s.sub}</div>
              </div>
              <button
                onClick={s.toggle}
                className={`w-10 rounded-full transition-colors relative flex-shrink-0 ${s.state ? "bg-stone-900" : "bg-stone-200"}`}
                style={{ height: "22px", width: "40px" }}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${s.state ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {showChangePassword && (
        <SetPasswordModal
          onClose={() => setShowChangePassword(false)}
          email={demoUser.email}
          allowEmailFallback={true}
        />
      )}

      <button
        onClick={() => setShowChangePassword(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-stone-200 text-stone-700 text-sm hover:bg-stone-50 mb-3"
      >
        <Lock className="w-4 h-4" /> Change password
      </button>

      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-rose-100 text-rose-600 text-sm hover:bg-rose-50"
      >
        <LogOut className="w-4 h-4" /> Sign out
      </button>
    </div>
  );
};

// ========== ADMIN PANEL ==========
// Shared by the Ledger tab and the per-user drill-down so the two can't drift.
const LEDGER_TYPE_STYLE = {
  deposit: "bg-emerald-500/15 text-emerald-300",
  payout: "bg-emerald-500/15 text-emerald-300",
  trade: "bg-blue-500/15 text-blue-300",
  pledge: "bg-amber-500/15 text-amber-300",
  fee: "bg-purple-500/15 text-purple-300",
  refund: "bg-sky-500/15 text-sky-300",
};

const LedgerTable = ({
  rows,
  showUser = true,
  emptyText = "No entries yet.",
}) => (
  <div className="bg-stone-700 rounded-lg border border-stone-600 overflow-x-auto">
    <table className="w-full text-sm font-mono">
      <thead className="bg-stone-800 border-b border-stone-600">
        <tr className="text-xs uppercase text-stone-400 font-sans">
          <th className="text-left px-3 py-2">When</th>
          {showUser && <th className="text-left px-3 py-2">User</th>}
          <th className="text-left px-3 py-2">Type</th>
          <th className="text-right px-3 py-2">Amount</th>
          <th className="text-right px-3 py-2">Balance after</th>
          <th className="text-left px-3 py-2 hidden md:table-cell">
            Description
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-600">
        {rows.length === 0 && (
          <tr>
            <td
              colSpan={showUser ? 6 : 5}
              className="px-3 py-8 text-center text-stone-400 text-sm font-sans"
            >
              {emptyText}
            </td>
          </tr>
        )}
        {rows.map((e) => (
          <tr key={e.id} className="text-xs">
            <td className="px-3 py-2 text-stone-400 whitespace-nowrap">
              {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
            </td>
            {showUser && (
              <td className="px-3 py-2 text-stone-200">
                {e.username || e.email || "—"}
              </td>
            )}
            <td className="px-3 py-2">
              <span
                className={`px-1.5 py-0.5 rounded text-xs ${LEDGER_TYPE_STYLE[e.type] || "bg-stone-800 text-stone-200"}`}
              >
                {e.type}
              </span>
            </td>
            <td
              className={`px-3 py-2 text-right ${Number(e.amount) >= 0 ? "text-emerald-700" : "text-rose-700"}`}
            >
              {Number(e.amount) >= 0 ? "+" : ""}
              {Number(e.amount).toFixed(2)}
            </td>
            <td className="px-3 py-2 text-right text-stone-200">
              {e.balance_after === null || e.balance_after === undefined
                ? "—"
                : Number(e.balance_after).toFixed(2)}
            </td>
            <td className="px-3 py-2 text-stone-300 hidden md:table-cell">
              {e.description}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const AdminPanel = ({
  onClose,
  markets,
  setMarkets,
  submissions,
  setSubmissions,
  waitlist,
  authUser,
  setBalance,
  setPositions,
  loadLeaderboard,
  setUserProfile,
}) => {
  const [adminTab, setAdminTab] = useState("overview");
  const [resolvingMarket, setResolvingMarket] = useState(null);
  const [cutoffTime, setCutoffTime] = useState("");

  // Real data, read through the admin_* security-definer functions. The client
  // can't query balances or ledger directly -- RLS restricts those to the
  // owning user, which is deliberate.
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLedger, setAdminLedger] = useState([]);
  const [stats, setStats] = useState(null);
  const [dataError, setDataError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userLedger, setUserLedger] = useState([]);
  const [userLedgerLoading, setUserLedgerLoading] = useState(false);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [granting, setGranting] = useState(false);
  const [grantError, setGrantError] = useState("");
  const [grantOk, setGrantOk] = useState("");
  const [feedback, setFeedback] = useState([]);

  const loadFeedback = async () => {
    const { data, error } = await supabase.rpc("admin_feedback", {
      p_limit: 200,
    });
    if (error) {
      console.error("admin_feedback:", error);
      setDataError(error.message);
      return;
    }
    setFeedback(data || []);
  };

  const setFeedbackStatus = async (id, status) => {
    // Optimistic: the row is already on screen and this is a one-field flip.
    setFeedback((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status } : f)),
    );
    const { error } = await supabase.rpc("admin_set_feedback_status", {
      p_id: id,
      p_status: status,
    });
    if (error) {
      console.error("admin_set_feedback_status:", error);
      loadFeedback();
    }
  };

  useEffect(() => {
    if (adminTab === "feedback") loadFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminTab]);

  // admin_grant_credits updates balance, practice_credits, and the ledger in
  // one transaction -- the three things that have to stay in step.
  const grantCredits = async () => {
    const amount = Number(grantAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setGrantError("Enter an amount greater than zero.");
      return;
    }
    setGranting(true);
    setGrantError("");
    setGrantOk("");
    const { error } = await supabase.rpc("admin_grant_credits", {
      p_user_id: selectedUser.user_id,
      p_amount: amount,
      p_note: grantNote.trim() || null,
    });
    if (error) {
      setGranting(false);
      setGrantError(error.message);
      return;
    }

    // Re-read rather than patching local state, so the numbers on screen are
    // the database's, not our guess at them.
    const [{ data: users }, { data: rows }] = await Promise.all([
      supabase.rpc("admin_user_overview"),
      supabase.rpc("admin_ledger", {
        p_limit: 500,
        p_user_id: selectedUser.user_id,
      }),
    ]);
    if (users) {
      setAdminUsers(users);
      const updated = users.find((u) => u.user_id === selectedUser.user_id);
      if (updated) setSelectedUser(updated);
    }
    setUserLedger(rows || []);
    setGranting(false);
    setGrantAmount("");
    setGrantNote("");
    setGrantOk(`Granted $${amount.toFixed(2)}.`);
    setTimeout(() => setGrantOk(""), 4000);
  };

  // Same function as the Ledger tab, filtered to one account.
  const openUser = async (u) => {
    setSelectedUser(u);
    setUserLedger([]);
    setGrantAmount("");
    setGrantNote("");
    setGrantError("");
    setGrantOk("");
    setUserLedgerLoading(true);
    const { data, error } = await supabase.rpc("admin_ledger", {
      p_limit: 500,
      p_user_id: u.user_id,
    });
    setUserLedgerLoading(false);
    if (error) {
      console.error("admin_ledger (user):", error);
      setDataError(error.message);
      return;
    }
    setUserLedger(data || []);
  };

  const loadAdminData = async () => {
    const [usersRes, ledgerRes, statsRes] = await Promise.all([
      supabase.rpc("admin_user_overview"),
      supabase.rpc("admin_ledger", { p_limit: 200 }),
      supabase.rpc("admin_stats"),
    ]);
    // Report each call separately -- collapsing them made one broken
    // function look like all three were down.
    const failures = [
      { name: "users", error: usersRes.error },
      { name: "ledger", error: ledgerRes.error },
      { name: "stats", error: statsRes.error },
    ].filter((r) => r.error);

    if (failures.length) {
      failures.forEach((r) => console.error(`admin ${r.name}:`, r.error));
      const missing = failures.some((r) =>
        /function|does not exist/i.test(r.error?.message || ""),
      );
      setDataError(
        missing
          ? "Admin functions are missing or outdated — run `npx supabase db push`."
          : failures.map((r) => `${r.name}: ${r.error?.message}`).join(" · "),
      );
    } else {
      setDataError("");
    }

    // Show whatever did succeed rather than blanking every tab.
    setAdminUsers(usersRes.data || []);
    setAdminLedger(ledgerRes.data || []);
    setStats(statsRes.data || null);
  };

  useEffect(() => {
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [generating, setGenerating] = useState(false);
  const [genCount, setGenCount] = useState(3);
  const [genStatus, setGenStatus] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);

  // Ask the generate-markets function for fresh, source-backed questions.
  // It searches the web, screens against every live and pending question for
  // duplicates and logical inverses, and returns what survived.
  const generateMarkets = async () => {
    setGenerating(true);
    setGenStatus(null);
    const { data, error } = await supabase.functions.invoke(
      "generate-markets",
      { body: { count: genCount } },
    );
    setGenerating(false);
    if (error || !data || data.error) {
      console.error("Generation failed:", error || data?.error);
      setGenStatus({
        error:
          data?.error ||
          "Generation failed — check the generate-markets function logs.",
      });
      return;
    }
    const created = (data.created || []).map(mapSubmissionRow);
    setSubmissions((prev) => [...created, ...prev]);
    if (created.length) {
      setLastGenerated(created[0].id);
      setTimeout(() => setLastGenerated(null), 4000);
    }
    setGenStatus({ created: created.length, skipped: data.skipped || [] });
  };

  const resolveMarket = async (marketId, outcome) => {
    const cutoffDate = cutoffTime ? new Date(cutoffTime) : null;

    // All payout/void/stats logic runs server-side in the resolve_market
    // function (admin-gated) — one atomic call instead of client-side loops.
    const { data: summary, error: resolveError } = await supabase.rpc(
      "resolve_market",
      {
        p_market_id: marketId,
        p_outcome: outcome,
        p_cutoff: cutoffDate ? cutoffDate.toISOString() : null,
      },
    );
    if (resolveError) {
      console.error("Market resolution error:", resolveError);
      alert("Failed to resolve market: " + resolveError.message);
      return;
    }
    console.log("resolve_market summary:", summary);

    setMarkets((prev) =>
      prev.map((m) =>
        m.id === marketId ? { ...m, status: "resolved", outcome } : m,
      ),
    );

    // Refresh my own profile stats (accuracy may have changed)
    if (authUser) {
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("accuracy, total_resolved")
        .eq("user_id", authUser.id)
        .single();
      if (myProfile) {
        setUserProfile((prev) => ({
          ...prev,
          accuracy: myProfile.accuracy || 0,
          totalResolved: myProfile.total_resolved || 0,
        }));
      }
    }

    // Reload leaderboard
    await loadLeaderboard();

    // 6. Reload positions from Supabase — source of truth for resolved/voided status
    if (authUser) {
      const { data: freshPositions } = await supabase
        .from("positions")
        .select(
          "id, user_id, market_id, market, category, side, shares, avg_price, invested, resolved, won, payout, voided, created_at",
        )
        .eq("user_id", authUser.id);
      if (freshPositions) {
        setPositions(
          freshPositions.map((p) => ({
            id: p.id,
            marketId: p.market_id,
            market: p.market,
            category: p.category,
            side: p.side,
            shares: p.shares,
            avgPrice: p.avg_price,
            invested: p.invested,
            resolved: p.resolved === true,
            won: p.won === true,
            payout: p.payout || 0,
            voided: (p as any).voided === true,
            createdAt: (p as any).created_at,
          })),
        );
      }

      // Also reload balance from Supabase
      const { data: freshBalance } = await supabase
        .from("balances")
        .select("balance")
        .eq("user_id", authUser.id)
        .single();
      if (freshBalance) setBalance(freshBalance.balance);
    }

    // resolve_market wrote the real payout/refund rows; pull them in.
    await loadAdminData();

    setResolvingMarket(null);
    setCutoffTime("");
  };

  const approveSubmission = async (subId) => {
    const sub = submissions.find((s) => s.id === subId);
    if (!sub) return;
    // Save to Supabase markets table
    const { data: newMarketRow, error } = await supabase
      .from("markets")
      .insert({
        category: sub.category,
        show: sub.show || "",
        question: sub.question,
        context: sub.context || "",
        yes: 50,
        no: 50,
        volume: "$0",
        traders: 0,
        comments: 0,
        ends: sub.endsHint || "TBD",
        status: "open",
        trending: false,
        source_url: sub.sourceUrl || null,
        source_title: sub.sourceTitle || null,
      })
      .select()
      .single();
    if (error) {
      alert("Failed to save market: " + error.message);
      return;
    }
    // Add to local state
    if (newMarketRow) {
      setMarkets((prev) => [
        ...prev,
        {
          id: newMarketRow.id,
          category: newMarketRow.category,
          show: newMarketRow.show,
          question: newMarketRow.question,
          context: newMarketRow.context,
          yes: newMarketRow.yes,
          no: newMarketRow.no,
          volume: newMarketRow.volume,
          traders: newMarketRow.traders,
          comments: newMarketRow.comments,
          trending: newMarketRow.trending,
          ends: newMarketRow.ends,
          status: newMarketRow.status,
          source_url: newMarketRow.source_url,
          source_title: newMarketRow.source_title,
        },
      ]);
    }
    setSubmissions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, status: "approved" } : s)),
    );
    if (sub.supabaseId) {
      await supabase
        .from("submissions")
        .update({ status: "approved" })
        .eq("id", sub.supabaseId);
    }
  };

  const rejectSubmission = async (subId) => {
    const sub = submissions.find((s) => s.id === subId);
    setSubmissions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, status: "rejected" } : s)),
    );
    if (sub?.supabaseId) {
      await supabase
        .from("submissions")
        .update({ status: "rejected" })
        .eq("id", sub.supabaseId);
    }
  };

  const totalDeposits = Number(stats?.deposits ?? 0);
  const totalFees = Number(stats?.fees_collected ?? 0);
  const totalPledge = Number(stats?.charity_pledged ?? 0);
  const pending = submissions.filter((s) => s.status === "pending").length;

  return (
    <div className="fixed inset-0 bg-stone-950 z-50 flex flex-col overflow-hidden">
      <div className="bg-stone-900 border-b border-stone-700 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 rounded bg-rose-600 text-white text-xs font-medium uppercase">
            Admin
          </div>
          <span className="text-md font-medium font-mono uppercase text-amber-300 tracking-wide">
            Cajuga Operator Console
          </span>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-md bg-stone-800 text-xs flex items-center gap-1.5"
        >
          <X className="w-3.5 h-3.5" /> Exit
        </button>
      </div>
      <div className="flex flex-1 min-h-0">
        <nav className="w-48 bg-stone-900 border-r border-stone-800 p-3 hidden md:block">
          {[
            "overview",
            "users",
            "markets",
            "submissions",
            "feedback",
            "ledger",
            "pledge",
            "compliance",
            "investor",
          ].map((t) => (
            <button
              key={t}
              onClick={() => setAdminTab(t)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs ${adminTab === t ? "bg-stone-800 text-white" : "text-stone-400"}`}
            >
              <span className="capitalize">{t}</span>
              {t === "submissions" && pending > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-stone-100 text-xs font-medium">
                  {pending}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="flex-1 bg-stone-800 overflow-y-auto">
          <div className="md:hidden p-2 bg-stone-900 border-b border-stone-800 flex gap-1 overflow-x-auto">
            {[
              "overview",
              "users",
              "markets",
              "submissions",
              "feedback",
              "ledger",
              "pledge",
              "compliance",
              "investor",
            ].map((t) => (
              <button
                key={t}
                onClick={() => setAdminTab(t)}
                className={`px-3 py-1.5 rounded text-xs whitespace-nowrap ${adminTab === t ? "bg-stone-800 text-white" : "text-stone-400"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="p-4 md:p-6">
            {adminTab === "overview" && (
              <div>
                <h1 className="text-xl font-medium text-stone-100 mb-1">
                  Platform overview
                </h1>
                <p className="text-xs text-stone-400 mb-5">Live data</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 rounded-lg bg-stone-700 border border-stone-600">
                    <div className="text-xs text-amber-100 uppercase mb-1">
                      Users
                    </div>
                    <div className="text-2xl font-medium text-amber-300">
                      {stats?.users ?? adminUsers.length}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-stone-700 border border-stone-600">
                    <div className="text-xs text-amber-100 uppercase mb-1">
                      Deposits
                    </div>
                    <div className="text-2xl font-medium text-amber-300">
                      ${totalDeposits.toFixed(0)}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-stone-700 border border-stone-600">
                    <div className="text-xs text-amber-100 uppercase mb-1">
                      Fees
                    </div>
                    <div className="text-2xl font-medium text-amber-300">
                      ${totalFees.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-300 border border-amber-400">
                    <div className="text-xs text-amber-700 uppercase mb-1">
                      Pledged
                    </div>
                    <div className="text-2xl font-medium text-amber-900">
                      ${totalPledge.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {adminTab === "submissions" && (
              <div>
                <h1 className="text-xl font-medium text-stone-100 mb-1">
                  Market submissions
                </h1>
                <p className="text-xs text-stone-400 mb-4">
                  {pending} pending review
                </p>
                <div className="mb-4 p-4 rounded-lg bg-stone-900 text-stone-200">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className={`w-2 h-2 rounded-full ${generating ? "bg-emerald-400 animate-pulse" : "bg-stone-500"}`}
                      />
                      <span className="text-xs font-mono">
                        market generation
                      </span>
                      <span className="text-xs text-stone-400">
                        {generating
                          ? "searching the web and drafting…"
                          : "idle"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={genCount}
                        onChange={(e) => setGenCount(Number(e.target.value))}
                        disabled={generating}
                        className="text-xs bg-stone-800 border border-stone-700 rounded px-2 py-1"
                      >
                        <option value="1">1 market</option>
                        <option value="3">3 markets</option>
                        <option value="5">5 markets</option>
                        <option value="8">8 markets</option>
                      </select>
                      <button
                        onClick={generateMarkets}
                        disabled={generating}
                        className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs flex items-center gap-1.5 font-medium disabled:opacity-60"
                      >
                        {generating ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        {generating ? "Generating…" : "Generate"}
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-stone-400 mt-2">
                    Questions are drafted from current web sources, screened
                    against every live and pending market for duplicates and
                    logical inverses, and queued for review below. Takes up to a
                    minute.
                  </div>
                  {genStatus?.error && (
                    <div className="mt-2 text-xs text-rose-300">
                      {genStatus.error}
                    </div>
                  )}
                  {genStatus && !genStatus.error && (
                    <div className="mt-2 text-xs">
                      <span className="text-emerald-400">
                        {genStatus.created} added.
                      </span>
                      {genStatus.skipped.length > 0 && (
                        <span className="text-stone-400">
                          {" "}
                          {genStatus.skipped.length} skipped —{" "}
                          {genStatus.skipped
                            .map((s) => s.reason)
                            .filter((r, i, a) => a.indexOf(r) === i)
                            .join(", ")}
                          .
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {pending === 0 && (
                    <div className="text-center py-10 text-stone-400 text-sm">
                      No pending submissions.
                    </div>
                  )}
                  {submissions
                    .filter((s) => s.status === "pending")
                    .map((sub) => {
                      const c = sub.autoChecks || {
                        publicResolution: true,
                        noPerverseIncentive: true,
                        dignity: true,
                        valuesAligned: true,
                      };
                      const ok =
                        c.publicResolution &&
                        c.noPerverseIncentive &&
                        c.dignity &&
                        c.valuesAligned;
                      const isNew = lastGenerated === sub.id;
                      const scol =
                        sub.source === "event-feed" ||
                        sub.source === "scheduled-event"
                          ? "bg-blue-500/15 text-blue-300"
                          : sub.source === "llm-drafted"
                            ? "bg-purple-500/15 text-purple-300"
                            : "bg-amber-500/15 text-amber-300";
                      return (
                        <div
                          key={sub.id}
                          className={`bg-stone-700 rounded-lg border p-4 transition-all ${isNew ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-stone-600"}`}
                        >
                          <div className="flex items-center gap-2 mb-2 text-xs flex-wrap">
                            <span className="capitalize px-2 py-0.5 rounded-full bg-stone-800 text-stone-300">
                              {sub.category}
                            </span>
                            {sub.source && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${scol}`}
                              >
                                {sub.source}
                              </span>
                            )}
                            {sub.show && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
                                {sub.show}
                              </span>
                            )}
                            <span className="text-stone-400">
                              by {sub.submitter}
                            </span>
                            <span className="text-stone-400">{sub.time}</span>
                            {isNew && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-medium">
                                NEW
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-medium text-stone-100 mb-2">
                            {sub.question}
                          </h3>
                          {sub.context && (
                            <p className="text-xs text-stone-400 mb-3">
                              {sub.context}
                            </p>
                          )}
                          {sub.endsHint && (
                            <p className="text-xs text-stone-400 mb-3">
                              Resolves: {sub.endsHint}
                            </p>
                          )}
                          {sub.sourceUrl && (
                            <a
                              href={sub.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 mb-3 px-2 py-1 rounded bg-sky-500/15 border border-sky-500/40 text-xs text-sky-200 hover:bg-sky-500/25 max-w-full"
                            >
                              <Globe className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">
                                {sub.sourceTitle || sub.sourceUrl}
                              </span>
                            </a>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                            {[
                              { k: "publicResolution", l: "Public resolution" },
                              {
                                k: "noPerverseIncentive",
                                l: "No perverse incentive",
                              },
                              { k: "dignity", l: "Dignity" },
                              { k: "valuesAligned", l: "Values aligned" },
                            ].map((ck) => (
                              <div
                                key={ck.k}
                                className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs ${c[ck.k] ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border border-rose-500/30"}`}
                              >
                                {c[ck.k] ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                                <span className="truncate">{ck.l}</span>
                              </div>
                            ))}
                          </div>
                          {sub.rejectReason && (
                            <div className="p-3 rounded bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 mb-3">
                              <span className="font-medium">Auto-flag:</span>{" "}
                              {sub.rejectReason}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => approveSubmission(sub.id)}
                              disabled={!ok}
                              className={`flex-1 py-2 rounded-md text-sm font-medium ${ok ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-stone-800 border border-stone-600 text-stone-500 cursor-not-allowed"}`}
                            >
                              {ok ? "Approve and list" : "Cannot auto-approve"}
                            </button>
                            <button
                              onClick={() => rejectSubmission(sub.id)}
                              className="flex-1 py-2 rounded-md bg-stone-800 border border-stone-600 text-stone-200 text-sm font-medium hover:bg-stone-900"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            {adminTab === "users" && selectedUser && (
              <div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex items-center gap-2 text-stone-300 mb-4 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> All users
                </button>

                <div className="bg-stone-700 rounded-lg border border-stone-600 p-5 mb-4">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h1 className="text-xl font-medium text-stone-100">
                      {selectedUser.username || "—"}
                    </h1>
                    {selectedUser.is_admin && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300">
                        admin
                      </span>
                    )}
                    {Number(selectedUser.practice_credits) > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">
                        practice
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-stone-400 mb-4">
                    {selectedUser.email} · joined{" "}
                    {selectedUser.joined_at
                      ? new Date(selectedUser.joined_at).toLocaleDateString()
                      : "—"}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                    {[
                      {
                        l: "Balance",
                        v: `$${Number(selectedUser.balance).toFixed(2)}`,
                      },
                      {
                        l: "Practice credits",
                        v: `$${Number(selectedUser.practice_credits).toFixed(2)}`,
                      },
                      { l: "Open bets", v: selectedUser.open_positions },
                      {
                        l: "At risk",
                        v: `$${Number(selectedUser.total_staked).toFixed(2)}`,
                      },
                      {
                        l: "Payouts + refunds",
                        v: `$${Number(selectedUser.net_payouts).toFixed(2)}`,
                      },
                    ].map((s) => (
                      <div key={s.l} className="p-2 rounded bg-stone-800">
                        <div className="text-stone-400">{s.l}</div>
                        <div className="text-base font-medium text-stone-100">
                          {s.v}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-stone-600">
                    <div className="text-xs text-stone-400 mb-2">
                      Grant practice credits
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 px-3 py-2 rounded-md bg-stone-800 border border-stone-600 focus-within:border-stone-400">
                        <span className="text-sm text-stone-400">$</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="1"
                          step="1"
                          value={grantAmount}
                          onChange={(e) => {
                            setGrantAmount(e.target.value);
                            setGrantError("");
                          }}
                          placeholder="100"
                          className="w-20 bg-transparent text-sm text-stone-100 focus:outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        value={grantNote}
                        onChange={(e) => setGrantNote(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && grantCredits()}
                        placeholder="Reason (optional)"
                        className="flex-1 min-w-[10rem] px-3 py-2 rounded-md bg-stone-800 border border-stone-600 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-stone-400"
                      />
                      <button
                        onClick={grantCredits}
                        disabled={granting}
                        className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-60"
                      >
                        {granting ? "Granting…" : "Grant"}
                      </button>
                    </div>
                    {grantError && (
                      <p className="text-xs text-rose-300 mt-2">{grantError}</p>
                    )}
                    {grantOk && (
                      <p className="text-xs text-emerald-300 mt-2">{grantOk}</p>
                    )}
                    <p className="text-xs text-stone-500 mt-2">Max $10k</p>
                  </div>
                </div>

                <p className="text-xs text-stone-400 mb-2">
                  {userLedgerLoading
                    ? "Loading transactions…"
                    : `${userLedger.length} transaction${userLedger.length === 1 ? "" : "s"}, newest first`}
                </p>
                <LedgerTable
                  rows={userLedger}
                  showUser={false}
                  emptyText="No transactions for this account yet."
                />
              </div>
            )}

            {adminTab === "users" && !selectedUser && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-xl font-medium text-stone-100">
                    Users{" "}
                    <span className="text-sm text-stone-400">
                      ({adminUsers.length})
                    </span>
                  </h1>
                  <button
                    onClick={loadAdminData}
                    className="px-3 py-1.5 rounded-md bg-stone-900 text-white text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>
                {dataError && (
                  <div className="mb-3 p-3 rounded bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200">
                    {dataError}
                  </div>
                )}
                <div className="bg-stone-700 rounded-lg border border-stone-600 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-800 border-b border-stone-600">
                      <tr className="text-xs uppercase text-stone-400">
                        <th className="text-left px-4 py-3">User</th>
                        <th className="text-left px-4 py-3">Joined</th>
                        <th className="text-right px-4 py-3">Open bets</th>
                        <th className="text-right px-4 py-3">At risk</th>
                        <th className="text-right px-4 py-3">Balance</th>
                        <th className="px-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-600">
                      {adminUsers.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-stone-400 text-sm"
                          >
                            No users yet.
                          </td>
                        </tr>
                      )}
                      {adminUsers.map((u) => (
                        <tr
                          key={u.user_id}
                          onClick={() => openUser(u)}
                          className="cursor-pointer hover:bg-stone-800"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-stone-100 flex items-center gap-2">
                              {u.username || "—"}
                              {u.is_admin && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300">
                                  admin
                                </span>
                              )}
                              {Number(u.practice_credits) > 0 && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">
                                  practice
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-stone-400">
                              {u.email}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-stone-400">
                            {u.joined_at
                              ? new Date(u.joined_at).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-stone-200">
                            {u.open_positions}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-stone-200">
                            ${Number(u.total_staked).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-stone-100">
                            ${Number(u.balance).toFixed(2)}
                          </td>
                          <td className="px-2 text-stone-300">
                            <ChevronRight className="w-4 h-4" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {adminTab === "markets" && (
              <div>
                <h1 className="text-xl font-medium text-stone-100 mb-4">
                  Markets
                </h1>
                <div className="bg-stone-700 rounded-lg border border-stone-600 overflow-hidden">
                  {markets.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 border-b border-stone-600 last:border-0 flex items-start gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-stone-400 capitalize">
                            {m.category}
                          </span>
                          {m.status === "resolved" ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                              Resolved {m.outcome}
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
                              Open
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-medium text-stone-100">
                          {m.question}
                        </h3>
                      </div>
                      {m.status === "open" && (
                        <button
                          onClick={() => setResolvingMarket(m)}
                          className="px-3 py-1.5 rounded-md bg-stone-900 text-white text-xs flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" /> Resolve
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {resolvingMarket && (
                  <div className="fixed inset-0 bg-black/50 z-10 flex items-center justify-center p-4">
                    <div className="bg-stone-700 rounded-lg max-w-md w-full p-6">
                      <h3 className="text-lg font-medium text-stone-100 mb-2">
                        Resolve market
                      </h3>
                      <p className="text-sm text-stone-300 mb-4">
                        {resolvingMarket.question}
                      </p>
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-stone-300 mb-1.5">
                          Cutoff time{" "}
                          <span className="text-stone-400 font-normal">
                            (optional — bets after this time will be voided)
                          </span>
                        </label>
                        <input
                          type="datetime-local"
                          value={cutoffTime}
                          onChange={(e) => setCutoffTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-md bg-stone-800 border border-stone-600 text-sm focus:outline-none text-stone-100 [color-scheme:dark]"
                        />
                        {cutoffTime && (
                          <p className="text-xs text-amber-200 mt-1.5 bg-amber-900/40 px-3 py-1.5 rounded">
                            Positions placed after{" "}
                            {new Date(cutoffTime).toLocaleString()} will be
                            voided.
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            resolveMarket(resolvingMarket.id, "yes")
                          }
                          className="flex-1 py-2.5 rounded-md bg-emerald-600 text-white text-sm font-medium"
                        >
                          Resolve YES
                        </button>
                        <button
                          onClick={() =>
                            resolveMarket(resolvingMarket.id, "no")
                          }
                          className="flex-1 py-2.5 rounded-md bg-rose-600 text-white text-sm font-medium"
                        >
                          Resolve NO
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setResolvingMarket(null);
                          setCutoffTime("");
                        }}
                        className="w-full mt-2 py-2 text-sm text-stone-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {adminTab === "feedback" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h1 className="text-xl font-medium text-stone-100">
                    Feedback{" "}
                    <span className="text-sm text-stone-400">
                      ({feedback.filter((f) => f.status === "new").length} new)
                    </span>
                  </h1>
                  <button
                    onClick={loadFeedback}
                    className="px-3 py-1.5 rounded-md bg-stone-900 text-white text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>
                <p className="text-xs text-stone-400 mb-4">
                  Newest first. Name and email are optional, so many will be
                  blank — the account is shown when we could attribute it.
                </p>
                <div className="space-y-3">
                  {feedback.length === 0 && (
                    <div className="text-center py-10 text-stone-400 text-sm">
                      No feedback yet.
                    </div>
                  )}
                  {feedback.map((f) => {
                    const cat = FEEDBACK_CATEGORIES.find(
                      (c) => c.id === f.category,
                    );
                    const isNew = f.status === "new";
                    return (
                      <div
                        key={f.id}
                        className={`bg-stone-700 rounded-lg border p-4 ${
                          isNew ? "border-emerald-500/40" : "border-stone-600"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2 text-xs flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              f.category === "bug"
                                ? "bg-rose-500/15 text-rose-300"
                                : f.category === "idea"
                                  ? "bg-purple-500/15 text-purple-300"
                                  : f.category === "market"
                                    ? "bg-blue-500/15 text-blue-300"
                                    : "bg-stone-500/20 text-stone-300"
                            }`}
                          >
                            {cat ? cat.label : f.category}
                          </span>
                          {isNew && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-medium">
                              new
                            </span>
                          )}
                          <span className="text-stone-400">
                            {f.created_at
                              ? new Date(f.created_at).toLocaleString()
                              : "—"}
                          </span>
                        </div>

                        <p className="text-sm text-stone-100 whitespace-pre-wrap mb-3">
                          {f.message}
                        </p>

                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="text-xs text-stone-400">
                            {f.name || f.email ? (
                              <>
                                {f.name || "—"}
                                {f.email && (
                                  <>
                                    {" · "}
                                    <a
                                      href={`mailto:${f.email}`}
                                      className="underline hover:text-stone-200"
                                    >
                                      {f.email}
                                    </a>
                                  </>
                                )}
                              </>
                            ) : (
                              <span className="text-stone-500">
                                No contact details left
                              </span>
                            )}
                            {f.username && (
                              <span className="text-stone-500">
                                {" "}
                                (account: {f.username})
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              setFeedbackStatus(f.id, isNew ? "reviewed" : "new")
                            }
                            className="px-3 py-1.5 rounded-md bg-stone-800 border border-stone-600 text-stone-200 text-xs hover:bg-stone-900"
                          >
                            {isNew ? "Mark reviewed" : "Mark unread"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {adminTab === "ledger" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h1 className="text-xl font-medium text-stone-100">Ledger</h1>
                  <button
                    onClick={loadAdminData}
                    className="px-3 py-1.5 rounded-md bg-stone-900 text-white text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>
                <p className="text-xs text-stone-400 mb-4">
                  {adminLedger.length} most recent entries, newest first. Every
                  row shows the balance it left behind, so a trade reads stake
                  &rarr; fee &rarr; pledge.
                </p>
                {dataError && (
                  <div className="mb-3 p-3 rounded bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200">
                    {dataError}
                  </div>
                )}
                <LedgerTable rows={adminLedger} />
              </div>
            )}
            {adminTab === "pledge" && (
              <div>
                <h1 className="text-xl font-medium text-stone-100 mb-1">
                  The Cajuga Pledge
                </h1>
                <p className="text-xs text-stone-400 mb-5">
                  Cause allocation, four-way split
                </p>
                <div className="grid md:grid-cols-2 gap-3 mb-6">
                  <div className="p-5 rounded-lg bg-stone-700 border border-stone-600">
                    <div className="text-xs uppercase text-stone-400 mb-2">
                      Platform commitment
                    </div>
                    <div className="text-3xl font-serif text-stone-100 mb-1">
                      1%
                    </div>
                    <div className="text-xs text-stone-300">
                      of gross revenue, in perpetuity
                    </div>
                  </div>
                  <div className="p-5 rounded-lg bg-stone-700 border border-stone-600">
                    <div className="text-xs uppercase text-stone-400 mb-2">
                      Founder pledge
                    </div>
                    <div className="text-3xl font-serif text-stone-100 mb-1">
                      1%
                    </div>
                    <div className="text-xs text-stone-300">
                      of equity, vests on liquidity event
                    </div>
                  </div>
                </div>
                <div className="bg-stone-700 rounded-lg border border-stone-600 overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-600">
                    <h3 className="text-sm font-medium text-stone-100">
                      Cause allocation
                    </h3>
                  </div>
                  <div className="divide-y divide-stone-600">
                    {communityImpact.byArea.map((c, i) => (
                      <div
                        key={i}
                        className="px-4 py-3 flex items-center gap-3"
                      >
                        <div className="w-10 text-xs text-stone-400">
                          {c.pct}%
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-stone-100">
                            {c.cause}
                          </div>
                          <div className="mt-1 h-1 rounded-full bg-stone-800 overflow-hidden">
                            <div
                              className="h-full bg-amber-400"
                              style={{ width: c.pct * 4 + "%" }}
                            />
                          </div>
                        </div>
                        <div className="text-sm font-mono text-stone-200">
                          ${c.amount.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {adminTab === "compliance" && (
              <div>
                <h1 className="text-xl font-medium text-stone-100 mb-4">
                  Compliance controls
                </h1>
                <div className="space-y-3">
                  {[
                    {
                      label: "CFTC registration as Designated Contract Market",
                      status: "in_progress",
                    },
                    {
                      label: "KYC provider integration (Persona)",
                      status: "ok",
                    },
                    {
                      label: "OFAC sanctions screening on deposits",
                      status: "ok",
                    },
                    {
                      label: "FBO segregated account (Evolve Bank)",
                      status: "ok",
                    },
                    {
                      label:
                        "1 percent revenue pledge, charter amendment filed",
                      status: "ok",
                    },
                    { label: "SOC 2 Type II audit", status: "in_progress" },
                  ].map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-4 rounded-lg bg-stone-700 border border-stone-600"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${c.status === "ok" ? "bg-emerald-500" : "bg-amber-500"}`}
                      />
                      <div className="flex-1 text-sm text-stone-100">
                        {c.label}
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${c.status === "ok" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}
                      >
                        {c.status === "ok" ? "OK" : "In progress"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {adminTab === "investor" && (
              <div>
                <h1 className="text-xl font-medium text-stone-100 mb-1">
                  Investor materials
                </h1>
                <p className="text-xs text-stone-400 mb-5">
                  Pitch deck outline and one-pager
                </p>
                <div className="p-6 rounded-lg bg-stone-700 border border-stone-600">
                  <h3 className="text-sm font-medium text-stone-100 mb-3">
                    One-pager preview
                  </h3>
                  <div className="border border-stone-600 rounded bg-stone-800 p-6 text-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Logo size={24} />
                      <span className="brand-font text-stone-100">Cajuga</span>
                      <span className="ml-auto text-xs text-stone-400">
                        Seed round
                      </span>
                    </div>
                    <h4 className="text-base font-serif text-stone-100 mb-2">
                      The prediction market for the conversations that matter.
                    </h4>
                    <p className="text-xs text-stone-200 mb-3">
                      Curated markets across health, policy, culture, career,
                      and science.
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-stone-400 uppercase mb-1">
                          Opportunity
                        </div>
                        <p className="text-stone-200">
                          $3.7B raised in category in 2025. One demographic
                          served.
                        </p>
                      </div>
                      <div>
                        <div className="text-stone-400 uppercase mb-1">
                          Moat
                        </div>
                        <p className="text-stone-200">
                          Curation plus the Cajuga Pledge plus analyst network.
                        </p>
                      </div>
                    </div>
                    <div className="pt-3 mt-3 border-t border-stone-600 text-xs text-stone-200">
                      <span className="text-stone-400">Raising:</span>{" "}
                      <span className="font-medium">$4M seed</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== LANDING PAGE ==========
const LandingPage = ({ onLogin, onSignup, markets, categories }) => {
  const trending = markets
    .filter((m) => m.trending && m.status === "open")
    .slice(0, 3);
  const preview = markets.filter((m) => m.status === "open").slice(0, 6);
  return (
    <div className="min-h-screen bg-amber-50/40">
      <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-xs text-amber-900">
        <Beaker className="w-3.5 h-3.5" />
        <span className="font-medium">Practice mode</span>
        <span className="hidden md:inline">
          — no real money, founding cohort only
        </span>
      </div>
      <header className="bg-white/80 backdrop-blur border-b border-amber-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={42} />
            <span className="text-3xl brand-font text-stone-900">Cajuga</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onLogin}
              className="px-4 py-2 rounded-full text-sm text-stone-700 hover:bg-stone-100"
            >
              Sign in
            </button>
            <button
              onClick={onSignup}
              className="px-4 py-2 rounded-full bg-stone-900 text-white text-sm font-medium"
            >
              Join
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-16">
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-200 text-xs text-amber-800 font-medium mb-5">
            <Flame className="w-3 h-3" /> Founding cohort — practice mode open
            now
          </div>
          <h1 className="text-4xl md:text-6xl font-serif text-stone-900 leading-tight mb-5">
            Back your reality TV takes with something real.
          </h1>
          <p className="text-lg text-stone-600 leading-relaxed mb-8">
            Cajuga is a prediction market for reality TV fans. Trade on Bachelor
            rose ceremonies, Survivor tribal councils, Housewives reunions, and
            more.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onSignup}
              className="px-6 py-3 rounded-full bg-stone-900 text-white font-medium flex items-center gap-2"
            >
              Join the founding cohort <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onLogin}
              className="px-6 py-3 rounded-full border border-stone-200 text-stone-700 text-sm"
            >
              Already have an account
            </button>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-stone-700 uppercase tracking-wide">
            Live markets — sign in to trade
          </span>
        </div>
        <div className="grid md:grid-cols-2 gap-3 mb-10">
          {preview.map((m) => {
            const Cat = categories.find((c) => c.id === m.category);
            const CatIcon = Cat ? Cat.icon : null;
            return (
              <div
                key={m.id}
                className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50 border border-amber-100 relative"
              >
                <div className="flex items-center gap-2 mb-2 text-xs text-stone-500">
                  {CatIcon && <CatIcon className="w-3 h-3" />}
                  <span className="capitalize">{m.category}</span>
                  {m.show && (
                    <>
                      <span className="text-stone-300">·</span>
                      <span className="font-medium text-stone-600">
                        {m.show}
                      </span>
                    </>
                  )}
                </div>
                <h3 className="text-base font-serif text-stone-900 leading-snug mb-3">
                  {m.question}
                </h3>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="text-sm font-medium text-emerald-700 px-2.5 py-0.5 rounded-full bg-emerald-100/80">
                    Yes {m.yes} cents
                  </span>
                  <span className="text-sm font-medium text-rose-700 px-2.5 py-0.5 rounded-full bg-rose-100/80">
                    No {m.no} cents
                  </span>
                </div>
                <button
                  onClick={onSignup}
                  className="text-xs text-stone-500 flex items-center gap-1 hover:text-stone-800"
                >
                  <Lock className="w-3 h-3" /> Sign in to trade
                </button>
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-16">
          {[
            {
              icon: Tv,
              title: "Reality TV markets",
              desc: "Bachelor, Survivor, Traitors, Housewives, Love Island and more — markets that resolve weekly.",
            },
            {
              icon: Trophy,
              title: "Leaderboard & profiles",
              desc: "Track your accuracy, follow other traders, see who called it right before anyone else.",
            },
            ...(SHOW_PLEDGE
              ? [
                  {
                    icon: HandHeart,
                    title: "The Cajuga Pledge",
                    desc: "1% of every trade supports women's health, mental health, economic empowerment, and reproductive rights.",
                  },
                ]
              : []),
          ].map((f, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white border border-stone-100"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
                <f.icon className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="text-sm font-medium text-stone-900 mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm text-stone-400">
            Cajuga is in practice mode — no real money. Founding cohort only.
          </p>
        </div>
      </div>
    </div>
  );
};

// ========== AUTH MODAL ==========
const AuthModal = ({ mode, onClose, onAuth }) => {
  const [view, setView] = useState(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (view === "signup" && !username.trim()) {
      setError("Please choose a username.");
      return;
    }
    if (view === "signup" && !inviteCode.trim()) {
      setError("An invite code is required while Cajuga is in private beta.");
      return;
    }
    setLoading(true);
    const result = await onAuth({
      mode: view,
      email,
      password,
      username,
      inviteCode: inviteCode.trim(),
    });
    setLoading(false);
    // onAuth returns an error string when signup/sign-in is rejected so the
    // message lands in the form instead of an alert().
    if (result?.error) setError(result.error);
  };

  const [resetSent, setResetSent] = useState(false);
  const handleForgot = async () => {
    if (!email.includes("@")) {
      setError("Enter your email above first, then tap Forgot password.");
      return;
    }
    setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: window.location.origin },
    );
    if (resetError) setError(resetError.message);
    else setResetSent(true);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400"
        >
          <X className="w-5 h-5" />
        </button>
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
        <div className="flex items-center gap-2 mb-6">
          <Logo size={28} />
          <span className="brand-font text-stone-900">Cajuga</span>
        </div>
        <h2 className="text-2xl font-serif text-stone-900 mb-1">
          {view === "login" ? "Welcome back" : "Join the founding cohort"}
        </h2>
        <p className="text-sm text-stone-500 mb-6">
          {view === "login"
            ? "Sign in to your account"
            : "Practice mode · No real money"}
        </p>

        {view === "signup" && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              Invite code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="CAJUGA-XXXX"
              className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900 tracking-wide"
            />
            <p className="text-xs text-stone-400 mt-1">
              Cajuga is invite-only during the private beta.
            </p>
          </div>
        )}

        {view === "signup" && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              Username
            </label>
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 focus-within:border-stone-400">
              <AtSign className="w-4 h-4 text-stone-400 flex-shrink-0" />
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))
                }
                placeholder="yourname"
                className="bg-transparent text-sm focus:outline-none flex-1 text-stone-900"
              />
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-medium text-stone-600 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900"
          />
        </div>

        <div className="mb-2">
          <label className="block text-xs font-medium text-stone-600 mb-1.5">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900"
          />
        </div>

        {view === "login" && (
          <div className="text-right mb-2">
            <button
              onClick={handleForgot}
              className="text-xs text-stone-500 underline hover:text-stone-700"
            >
              Forgot password?
            </button>
          </div>
        )}

        {view === "signup" && (
          <p className="text-xs text-stone-500 leading-relaxed mb-3">
            By creating an account you agree to Cajuga's{" "}
            <button
              onClick={() => setShowTerms(true)}
              className="text-stone-900 font-medium underline"
            >
              Terms of Use and User Agreement
            </button>
            .
          </p>
        )}

        {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}
        {resetSent && (
          <p className="text-xs text-emerald-700 mb-3">
            Reset link sent — check your email.
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-stone-900 text-white text-sm font-medium mt-4 disabled:opacity-60"
        >
          {loading
            ? "Just a moment…"
            : view === "login"
              ? "Sign in"
              : "Create account"}
        </button>

        <p className="text-center text-xs text-stone-500 mt-4">
          {view === "login"
            ? "Don't have an account? "
            : "Already have an account? "}
          <button
            onClick={() => {
              setView(view === "login" ? "signup" : "login");
              setError("");
            }}
            className="text-stone-900 font-medium underline"
          >
            {view === "login" ? "Join" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

// ========== SET PASSWORD MODAL ==========
// Shared by: recovery-link flow, and "Change password" in profile settings.
const SetPasswordModal = ({ onClose, email, allowEmailFallback }) => {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const save = async () => {
    if (pw.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (pw !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: pw,
    });
    setLoading(false);
    if (updateError) {
      setError(
        /session|auth|jwt/i.test(updateError.message)
          ? "Your reset link may have expired. Request a new one from the sign-in screen."
          : updateError.message,
      );
      return;
    }
    setDone(true);
  };

  const sendLink = async () => {
    setError("");
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: window.location.origin },
    );
    if (sendError) setError(sendError.message);
    else setLinkSent(true);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400"
        >
          <X className="w-5 h-5" />
        </button>
        {done ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-serif text-stone-900 mb-2">
              Password updated
            </h2>
            <p className="text-sm text-stone-500 mb-6">
              You're signed in and ready to go.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full bg-stone-900 text-white text-sm"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-200 to-rose-200 flex items-center justify-center mb-5">
              <Lock className="w-6 h-6 text-stone-800" />
            </div>
            <h2 className="text-2xl font-serif text-stone-900 mb-1">
              Set a new password
            </h2>
            <p className="text-sm text-stone-500 mb-6">
              Pick something you haven't used elsewhere.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-stone-600 mb-1.5">
                New password
              </label>
              <input
                type="password"
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  setError("");
                }}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900"
              />
            </div>
            <div className="mb-2">
              <label className="block text-xs font-medium text-stone-600 mb-1.5">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:border-stone-400 text-stone-900"
              />
            </div>
            {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}
            {linkSent && (
              <p className="text-xs text-emerald-700 mb-2">
                Reset link sent to {email} — check your inbox.
              </p>
            )}
            <button
              onClick={save}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-stone-900 text-white text-sm font-medium mt-3 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save new password"}
            </button>
            {allowEmailFallback && email && (
              <button
                onClick={sendLink}
                className="w-full py-2.5 text-xs text-stone-500 underline mt-2"
              >
                Email me a reset link instead
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ========== ONBOARDING ==========
const Onboarding = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [bio, setBio] = useState("");
  const [selectedCause, setSelectedCause] = useState("");
  const totalSteps = SHOW_PLEDGE ? 2 : 1;

  return (
    <div className="min-h-screen bg-amber-50/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <Logo size={28} />
          <span className="brand-font text-stone-900">Cajuga</span>
          {SHOW_PLEDGE && (
            <span className="ml-auto text-xs text-stone-400">
              Step {step} of {totalSteps}
            </span>
          )}
        </div>

        {SHOW_PLEDGE && (
          <div className="flex gap-1 mb-8">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${s <= step ? "bg-stone-900" : "bg-stone-100"}`}
              />
            ))}
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-serif text-stone-900 mb-1">
              Welcome, @{user.username} 👋
            </h2>
            <p className="text-sm text-stone-500 mb-6">
              Tell us a little about yourself.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-stone-600 mb-1.5">
                Bio{" "}
                <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                placeholder="Reality TV obsessive, Survivor superfan, bad at keeping spoilers to myself…"
                className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm focus:outline-none resize-none text-stone-900"
                rows={3}
              />
              <div className="text-right text-xs text-stone-400 mt-1">
                {160 - bio.length}
              </div>
            </div>
            {SHOW_PLEDGE ? (
              <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 rounded-2xl bg-stone-900 text-white text-sm font-medium"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={() => onComplete({ bio, cause: "" })}
                className="w-full py-3.5 rounded-2xl bg-stone-900 text-white text-sm font-medium"
              >
                Start trading
              </button>
            )}
          </div>
        )}

        {SHOW_PLEDGE && step === 2 && (
          <div>
            <h2 className="text-2xl font-serif text-stone-900 mb-1">
              The Cajuga Pledge
            </h2>
            <p className="text-sm text-stone-500 mb-6">
              1% of every trade you place goes to a cause you choose. Pick
              yours.
            </p>
            <div className="space-y-2 mb-6">
              {causeOptions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCause(c.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${selectedCause === c.id ? "border-amber-300 bg-amber-50" : "border-stone-100 bg-stone-50 hover:border-stone-200"}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedCause === c.id ? "border-amber-500 bg-amber-500" : "border-stone-300"}`}
                  >
                    {selectedCause === c.id && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-stone-900">
                      {c.name}
                    </div>
                    <div className="text-xs text-stone-400 truncate">
                      {c.org}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => onComplete({ bio, cause: selectedCause })}
              disabled={!selectedCause}
              className="w-full py-3.5 rounded-2xl bg-stone-900 text-white text-sm font-medium disabled:opacity-40"
            >
              Start trading
            </button>
            <button
              onClick={() => onComplete({ bio, cause: "" })}
              className="w-full py-2 text-xs text-stone-400 mt-2"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ========== MAIN APP ==========
export default function Cajuga() {
  // Auth state
  const [authUser, setAuthUser] = useState(null); // null = logged out
  const [authScreen, setAuthScreen] = useState(null); // 'login' | 'signup' | null
  const [onboarding, setOnboarding] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    bio: string;
    cause: string;
    accuracy: number;
    totalResolved: number;
  }>({ bio: "", cause: "", accuracy: 0, totalResolved: 0 });

  const [markets, setMarkets] = useState(initialMarkets);
  const [waitlist, setWaitlist] = useState(initialWaitlist);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [communityUsers, setCommunityUsers] = useState(initialCommunityUsers);

  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [tradeSide, setTradeSide] = useState(null);
  const [tradeAmount, setTradeAmount] = useState(10);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    const validTabs = [
      "home",
      "markets",
      "feed",
      "following",
      "leaderboard",
      "positions",
      "profile",
      "impact",
      "about",
    ];
    return validTabs.includes(hash) ? hash : "home";
  });
  const navigateTo = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = tab === "home" ? "" : tab;
  };
  const [balance, setBalance] = useState(50);
  const [positions, setPositions] = useState([]);
  // True when the user arrived via a password-reset email link.
  const [showSetPassword, setShowSetPassword] = useState(
    OPENED_FROM_RECOVERY_LINK,
  );
  const [showTerms, setShowTerms] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  // Set when the user comes back from Stripe Checkout (?checkout=success|cancelled)
  const [pendingCheckout, setPendingCheckout] = useState(() =>
    new URLSearchParams(window.location.search).get("checkout"),
  );
  const [checkoutBanner, setCheckoutBanner] = useState(null);

  // Belt-and-braces with OPENED_FROM_RECOVERY_LINK: supabase-js also fires
  // PASSWORD_RECOVERY when it consumes a reset link's tokens.
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setShowSetPassword(true);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  // Clean the ?checkout= param off the URL and surface a cancelled banner
  // immediately. The success path waits for auth below.
  useEffect(() => {
    if (!pendingCheckout) return;
    window.history.replaceState(
      {},
      "",
      window.location.pathname + window.location.hash,
    );
    if (pendingCheckout === "cancelled") {
      setCheckoutBanner("cancelled");
      setPendingCheckout(null);
    }
  }, [pendingCheckout]);

  // After a successful checkout, the credit lands via the Stripe webhook a
  // moment after redirect — poll the balance briefly so the UI catches up.
  useEffect(() => {
    if (pendingCheckout !== "success" || !authUser?.id) return;
    setPendingCheckout(null);
    setCheckoutBanner("success");
    let stopped = false;
    let attempts = 0;
    const poll = async () => {
      attempts++;
      const { data } = await supabase
        .from("balances")
        .select("balance")
        .eq("user_id", authUser.id)
        .single();
      if (stopped) return;
      if (data) setBalance(data.balance);
      if (attempts < 8) setTimeout(poll, 2500);
    };
    setTimeout(poll, 1500);
    return () => {
      stopped = true;
    };
  }, [pendingCheckout, authUser?.id]);

  const [showWaitlist, setShowWaitlist] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSuggestMarket, setShowSuggestMarket] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Load markets from Supabase for everyone (not just logged-in users)
    supabase
      .from("markets")
      .select("*")
      .eq("status", "open")
      .then(({ data: marketRows }) => {
        if (marketRows && marketRows.length > 0) {
          setMarkets(
            marketRows.map((m) => ({
              id: m.id,
              category: m.category,
              show: m.show,
              question: m.question,
              context: m.context,
              yes: m.yes,
              no: m.no,
              volume: m.volume,
              traders: m.traders,
              comments: m.comments,
              trending: m.trending,
              ends: m.ends,
              status: m.status,
              yes_volume: m.yes_volume || 0,
              no_volume: m.no_volume || 0,
              source_url: m.source_url,
              source_title: m.source_title,
            })),
          );
        }
      });

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .single();
          const { data: balanceRow } = await supabase
            .from("balances")
            .select("balance")
            .eq("user_id", session.user.id)
            .single();
          const { data: positionRows } = await supabase
            .from("positions")
            .select(
              "id, user_id, market_id, market, category, side, shares, avg_price, invested, resolved, won, payout",
            )
            .eq("user_id", session.user.id);
          setAuthUser({
            id: session.user.id,
            email: session.user.email,
            username: profile?.username || session.user.email.split("@")[0],
            returning: true,
          });
          if (profile) {
            setUserProfile({
              bio: profile.bio || "",
              cause: profile.cause || "",
              accuracy: profile.accuracy || 0,
              totalResolved: profile.total_resolved || 0,
            });
          }
          // Balance + Monday refill: claim_weekly_refill is server-enforced,
          // creates the row if missing, and returns the current balance.
          const { data: balanceData } = await supabase.rpc(
            "claim_weekly_refill",
          );
          if (balanceData) {
            setBalance(balanceData.balance);
          } else if (balanceRow) {
            setBalance(balanceRow.balance);
          }
          if (positionRows) {
            console.log(
              "positions from supabase:",
              positionRows.map((p) => ({
                id: p.id,
                market: p.market,
                resolved: p.resolved,
                won: p.won,
                payout: p.payout,
              })),
            );
            setPositions(
              positionRows.map((p) => ({
                id: p.id,
                marketId: p.market_id,
                market: p.market,
                category: p.category,
                side: p.side,
                shares: p.shares,
                avgPrice: p.avg_price,
                invested: p.invested,
                resolved: p.resolved === true,
                won: p.won === true,
                payout: p.payout || 0,
                voided: (p as any).voided === true,
                createdAt: (p as any).created_at,
              })),
            );
          }
          const { data: adminRow } = await supabase
            .from("admins")
            .select("user_id")
            .eq("user_id", session.user.id)
            .maybeSingle();
          console.log("adminRow:", adminRow);
          console.log("isAdmin:", !!adminRow);
          setIsAdmin(!!adminRow);

          if (adminRow) {
            const { data: submissionRows } = await supabase
              .from("submissions")
              .select("*");

            if (submissionRows) {
              setSubmissions(submissionRows.map(mapSubmissionRow));
            }
          }
          await loadLeaderboard(session.user.id);
          await loadNotifications(session.user.id);
        } else {
          // No session — still load the leaderboard for logged-out visitors
          await loadLeaderboard();
        }
        setAuthLoading(false);
      })
      .catch((err) => {
        // Never strand the app on the loading screen. If session restore fails
        // -- expired or invalidated token, network blip, a hand-edited
        // auth.users row -- log it and render logged-out instead of hanging.
        console.error("Session restore failed:", err);
        setAuthLoading(false);
      });
  }, []);

  const handleAuth = async (userData) => {
    if (userData.mode === "signup") {
      // Signup runs server-side: the edge function checks the invite code,
      // creates the account, and grants the starting credits. Public signup is
      // disabled in Supabase, so this is the only way in.
      const { data: signupData, error: signupError } =
        await supabase.functions.invoke("signup-with-invite", {
          body: {
            email: userData.email,
            password: userData.password,
            username: userData.username,
            code: userData.inviteCode,
          },
        });
      if (signupError || !signupData || signupData.error) {
        return {
          error:
            signupData?.error ||
            "Could not create your account. Check your invite code and try again.",
        };
      }
      // The function created the account but not a session — sign in for one.
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password,
      });
      if (error || !data.user) {
        return {
          error: "Account created. Please sign in with your new password.",
        };
      }
      setAuthUser({
        id: data.user.id,
        email: userData.email,
        username: userData.username,
      });
      setBalance(signupData.granted ?? 200);
      setAuthScreen(null);
      setOnboarding(true);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password,
      });
      if (error) {
        return { error: error.message };
      }
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", data.user.id)
          .single();
        const { data: balanceRow } = await supabase
          .from("balances")
          .select("balance")
          .eq("user_id", data.user.id)
          .single();
        const { data: positionRows } = await supabase
          .from("positions")
          .select(
            "id, user_id, market_id, market, category, side, shares, avg_price, invested, resolved, won, payout",
          )
          .eq("user_id", data.user.id);
        setAuthUser({
          id: data.user.id,
          email: userData.email,
          username: profile?.username || userData.email.split("@")[0],
          returning: true,
        });
        if (profile) {
          setUserProfile({
            bio: profile.bio || "",
            cause: profile.cause || "",
            accuracy: profile.accuracy || 0,
            totalResolved: profile.total_resolved || 0,
          });
        }
        if (balanceRow) {
          setBalance(balanceRow.balance);
        } else {
          // No balance row yet (e.g. account predates the balances table) —
          // create it server-side.
          const { data: ensured } = await supabase.rpc("ensure_balance");
          if (ensured) setBalance(ensured.balance);
        }
        if (positionRows) {
          setPositions(
            positionRows.map((p) => ({
              id: p.id,
              marketId: p.market_id,
              market: p.market,
              category: p.category,
              side: p.side,
              shares: p.shares,
              avgPrice: p.avg_price,
              invested: p.invested,
              resolved: p.resolved === true,
              won: p.won === true,
              payout: p.payout || 0,
              voided: (p as any).voided === true,
              createdAt: (p as any).created_at,
            })),
          );
        }
        const { data: adminRow } = await supabase
          .from("admins")
          .select("user_id")
          .eq("user_id", data.user.id)
          .maybeSingle();
        setIsAdmin(!!adminRow);
        await loadNotifications(data.user.id);
        setAuthScreen(null);
      }
    }
  };

  const handleOnboardingComplete = async (profileData) => {
    setUserProfile(profileData);
    setOnboarding(false);
    if (authUser) {
      await supabase
        .from("profiles")
        .update({
          bio: profileData.bio,
          cause: profileData.cause,
        })
        .eq("user_id", authUser.id);
    }
  };

  const loadLeaderboard = async (currentUserId?: string) => {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select(
        "user_id, username, bio, cause, accuracy, wins, total_resolved, impact_score, leaderboard_rank",
      )
      .order("leaderboard_rank", { ascending: true });
    if (profileRows && profileRows.length > 0) {
      const { data: tradeCounts } = await supabase
        .from("positions")
        .select("user_id");
      const countMap = {};
      if (tradeCounts) {
        tradeCounts.forEach((p) => {
          countMap[p.user_id] = (countMap[p.user_id] || 0) + 1;
        });
      }
      // Load follows for current user
      const userId = currentUserId || authUser?.id;
      let followingIds = new Set();
      if (userId) {
        const { data: followRows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", userId);
        if (followRows) {
          followRows.forEach((f) => followingIds.add(f.following_id));
        }
      }
      // Load who follows current user
      let followerIds = new Set();
      if (userId) {
        const { data: followerRows } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", userId);
        if (followerRows) {
          followerRows.forEach((f) => followerIds.add(f.follower_id));
        }
      }

      // Load positions for followed users
      let followedPositionsMap = {};
      if (followingIds.size > 0) {
        const { data: followedPositions, error: posError } = await supabase
          .from("positions")
          .select("*")
          .in("user_id", Array.from(followingIds))
          .order("created_at", { ascending: false });
        console.log(
          "followedPositions:",
          followedPositions,
          "posError:",
          posError,
        );
        if (followedPositions) {
          followedPositions.forEach((p) => {
            if (!followedPositionsMap[p.user_id])
              followedPositionsMap[p.user_id] = [];
            followedPositionsMap[p.user_id].push({
              marketId: p.market_id,
              market: p.market,
              category: p.category,
              side: p.side,
              amount: p.invested,
              ts: new Date(p.created_at).toLocaleDateString(),
              resolved: p.resolved,
              won: p.won,
            });
          });
        }
      }
      setCommunityUsers(
        profileRows
          .filter((p) => p.username)
          .map((p, i) => ({
            id: p.user_id,
            username: p.username,
            name: p.username,
            accuracy: p.accuracy || 0,
            totalTrades: countMap[p.user_id] || 0,
            impactScore: p.impact_score || 0,
            leaderboardRank: p.leaderboard_rank || i + 1,
            following: followingIds.has(p.user_id),
            followsMe: followerIds.has(p.user_id),
            cause: p.cause || "",
            causePrivate: false,
            positions: followedPositionsMap[p.user_id] || [],
          })),
      );
    }
  };

  const loadNotifications = async (userId: string) => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setNotifications(data);
  };

  const markAllRead = async () => {
    if (!authUser) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", authUser.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setActiveTab("home");
    setSelectedMarket(null);
    setTradeSide(null);
    setPositions([]);
    setBalance(50);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-amber-50/40 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Logo size={72} />
          <span className="text-2xl brand-font text-stone-900">Cajuga</span>
        </div>
      </div>
    );
  }

  // Show landing page if not logged in
  if (!authUser) {
    return (
      <>
        <LandingPage
          onLogin={() => setAuthScreen("login")}
          onSignup={() => setAuthScreen("signup")}
          markets={markets}
          categories={categories}
        />
        {authScreen && (
          <AuthModal
            mode={authScreen}
            onClose={() => setAuthScreen(null)}
            onAuth={handleAuth}
          />
        )}
      </>
    );
  }

  // Show onboarding for new users
  if (onboarding) {
    return <Onboarding user={authUser} onComplete={handleOnboardingComplete} />;
  }

  const user = authUser;

  const handleFollowToggle = async (userId) => {
    const user = communityUsers.find((u) => u.id === userId);
    if (!user || !authUser) return;
    if (user.following) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", authUser.id)
        .eq("following_id", userId);
      setCommunityUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, following: false } : u)),
      );
    } else {
      await supabase.from("follows").insert({
        follower_id: authUser.id,
        following_id: userId,
      });
      // Load their positions for the feed
      const { data: posRows } = await supabase
        .from("positions")
        .select(
          "market_id, market, category, side, invested, created_at, resolved, won",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      const userPositions = posRows
        ? posRows.map((p) => ({
            marketId: p.market_id,
            market: p.market,
            category: p.category,
            side: p.side,
            amount: p.invested,
            ts: new Date(p.created_at).toLocaleDateString(),
            resolved: p.resolved,
            won: p.won,
          }))
        : [];
      setCommunityUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, following: true, positions: userPositions }
            : u,
        ),
      );
    }
  };

  const handleTrade = async () => {
    const price = tradeSide === "yes" ? selectedMarket.yes : selectedMarket.no;
    const cost = tradeAmount;

    if (authUser) {
      // Server is the source of truth: place_trade validates the balance,
      // deducts it, records the position/ledger and moves prices atomically.
      const { data, error } = await supabase.rpc("place_trade", {
        p_market_id: selectedMarket.id,
        p_side: tradeSide,
        p_amount: cost,
      });
      if (error || !data) {
        console.error("Trade failed:", error);
        alert("Trade failed: " + (error?.message || "please try again"));
        return;
      }
      setShowConfirm(true);
      setBalance(data.new_balance);
      setMarkets((prev) =>
        prev.map((m) =>
          m.id === selectedMarket.id
            ? {
                ...m,
                yes: data.yes,
                no: data.no,
                yes_volume: data.yes_volume,
                no_volume: data.no_volume,
              }
            : m,
        ),
      );
      const sp = data.position;
      setPositions((p) => [
        ...p,
        {
          id: sp.id,
          marketId: sp.market_id,
          market: sp.market,
          category: sp.category,
          side: sp.side,
          shares: sp.shares,
          avgPrice: sp.avg_price,
          invested: sp.invested,
        },
      ]);
    } else {
      // Logged-out demo mode: purely local, nothing is persisted.
      setShowConfirm(true);
      const shares = Math.floor(tradeAmount / (price / 100));
      const LIQUIDITY_SEED = 50;
      const newYesVolume =
        (selectedMarket.yes_volume || 0) + (tradeSide === "yes" ? cost : 0);
      const newNoVolume =
        (selectedMarket.no_volume || 0) + (tradeSide === "no" ? cost : 0);
      const totalVolume =
        newYesVolume + LIQUIDITY_SEED + (newNoVolume + LIQUIDITY_SEED);
      const newYesPrice = Math.round(
        ((newYesVolume + LIQUIDITY_SEED) / totalVolume) * 100,
      );
      const newNoPrice = 100 - newYesPrice;

      // Mirror the server's fee-on-top math so the logged-out demo behaves
      // like a real account.
      const demoFees =
        Math.round(cost * 0.02 * 100) / 100 +
        Math.round(cost * 0.01 * 100) / 100;
      setBalance(Math.max(0, balance - cost - demoFees));
      setMarkets((prev) =>
        prev.map((m) =>
          m.id === selectedMarket.id
            ? {
                ...m,
                yes: newYesPrice,
                no: newNoPrice,
                yes_volume: newYesVolume,
                no_volume: newNoVolume,
              }
            : m,
        ),
      );
      setPositions((p) => [
        ...p,
        {
          id: "p" + Date.now(),
          marketId: selectedMarket.id,
          market: selectedMarket.question,
          category: selectedMarket.category,
          side: tradeSide,
          shares,
          avgPrice: price,
          invested: cost,
        },
      ]);
    }

    setTimeout(() => {
      setShowConfirm(false);
      setTradeSide(null);
      setSelectedMarket(null);
    }, 1800);
  };

  // Profile view
  if (viewingProfile) {
    return (
      <UserProfileView
        profileUser={viewingProfile}
        onClose={() => setViewingProfile(null)}
        onFollowToggle={handleFollowToggle}
        myPositions={positions}
        markets={markets}
        onViewMarket={setSelectedMarket}
      />
    );
  }

  // Trade modal
  if (selectedMarket && tradeSide) {
    const price = tradeSide === "yes" ? selectedMarket.yes : selectedMarket.no;
    const shares = Math.floor(tradeAmount / (price / 100));
    const cost = tradeAmount;
    // Fees are charged on top of the stake and must round the same way
    // place_trade does, or "balance after" won't match what actually happens.
    const platformFee = Math.round(cost * 0.02 * 100) / 100;
    const pledgeAmount = Math.round(cost * 0.01 * 100) / 100;
    const totalCost = cost + platformFee + pledgeAmount;
    const insufficient = totalCost > balance;
    const cause = causesByCategory[selectedMarket.category];
    return (
      <div className="min-h-screen bg-amber-50/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-xs uppercase text-amber-900 font-medium flex items-center gap-1">
            <Beaker className="w-3 h-3" /> Practice mode
          </div>
          {showConfirm ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-serif text-stone-900 mb-2">
                Position opened
              </h3>
              <p className="text-stone-600 text-sm mb-3">
                {shares} shares of {tradeSide.toUpperCase()} at {price} cents
              </p>
              {SHOW_PLEDGE && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <HandHeart className="w-3 h-3" />
                  <span>1 percent pledged to {cause.name}</span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6 mt-2">
                <button onClick={() => setTradeSide(null)}>
                  <ArrowLeft className="w-5 h-5 text-stone-400" />
                </button>
                <button
                  onClick={() => {
                    setTradeSide(null);
                    setSelectedMarket(null);
                  }}
                >
                  <X className="w-5 h-5 text-stone-400" />
                </button>
              </div>
              <p className="text-xs uppercase text-stone-500 mb-2">
                Placing trade
              </p>
              <h3 className="text-lg font-serif text-stone-900 mb-6 leading-snug">
                {selectedMarket.question}
              </h3>
              <div
                className={`rounded-2xl p-4 mb-4 ${tradeSide === "yes" ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`}
              >
                <div className="flex justify-between items-baseline">
                  <span
                    className={`font-medium ${tradeSide === "yes" ? "text-emerald-700" : "text-rose-700"}`}
                  >
                    {tradeSide.toUpperCase()}
                  </span>
                  <span
                    className={`text-2xl font-serif ${tradeSide === "yes" ? "text-emerald-700" : "text-rose-700"}`}
                  >
                    {price} cents
                  </span>
                </div>
              </div>
              <label className="block text-xs uppercase text-stone-500 mb-2">
                Amount
              </label>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl font-serif text-stone-900">$</span>
                <input
                  type="number"
                  value={tradeAmount || ""}
                  onChange={(e) =>
                    setTradeAmount(parseInt(e.target.value) || 0)
                  }
                  className="text-3xl font-serif text-stone-900 bg-transparent border-b border-stone-200 w-full focus:outline-none pb-1"
                />
              </div>
              <div className="flex gap-2 mb-4">
                {[5, 10, 25, 50].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTradeAmount(amt)}
                    className="px-3 py-1 text-xs rounded-full bg-stone-100 text-stone-700"
                  >
                    ${amt}
                  </button>
                ))}
              </div>
              <div className="bg-stone-50 rounded-2xl p-4 mb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Shares</span>
                  <span className="text-stone-900 font-medium">{shares}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">If right</span>
                  <span className="text-emerald-600 font-medium">
                    +${shares - tradeAmount}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-200">
                  <span className="text-stone-500">Stake</span>
                  <span className="text-stone-900 font-medium">
                    ${cost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Fees (3%)</span>
                  <span className="text-stone-900 font-medium">
                    ${(platformFee + pledgeAmount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Total cost</span>
                  <span className="text-stone-900 font-medium">
                    ${totalCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-200">
                  <span className="text-stone-500">Balance after</span>
                  <span
                    className={`font-medium ${insufficient ? "text-rose-600" : "text-stone-900"}`}
                  >
                    ${(balance - totalCost).toFixed(2)}
                  </span>
                </div>
              </div>
              {SHOW_PLEDGE && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-100 mb-5">
                  <HandHeart className="w-4 h-4 text-amber-700" />
                  <div className="flex-1 text-xs text-amber-900 leading-snug">
                    <span className="font-medium">
                      1 percent of this trade (${pledgeAmount.toFixed(2)})
                    </span>{" "}
                    supports {cause.name}
                  </div>
                </div>
              )}
              <p className="text-xs text-stone-400 text-center mb-3">
                Bets placed after an outcome is known may be voided at
                resolution.
              </p>
              <button
                onClick={handleTrade}
                disabled={insufficient}
                className={`w-full py-4 rounded-2xl font-medium text-white disabled:opacity-60 ${tradeSide === "yes" ? "bg-emerald-600" : "bg-rose-600"}`}
              >
                {insufficient
                  ? "Insufficient balance"
                  : `Confirm — $${totalCost.toFixed(2)}`}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Market detail
  if (selectedMarket) {
    const Cat = categories.find((c) => c.id === selectedMarket.category);
    const CatIcon = Cat ? Cat.icon : null;
    return (
      <div className="min-h-screen bg-amber-50/40 pb-20 md:pb-6">
        <div className="max-w-3xl mx-auto p-4 md:p-6">
          <button
            onClick={() => setSelectedMarket(null)}
            className="flex items-center gap-2 text-stone-600 mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50 rounded-3xl p-5 md:p-8 shadow-sm border border-amber-100 mb-4 relative">
            <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-xs uppercase text-amber-800 font-medium flex items-center gap-1">
              <Beaker className="w-3 h-3" /> Practice
            </div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-xs text-stone-700">
                {CatIcon && <CatIcon className="w-3 h-3" />}
                <span className="capitalize">{selectedMarket.category}</span>
              </div>
              {selectedMarket.show && (
                <div className="px-3 py-1 rounded-full bg-amber-100 text-xs font-medium text-amber-800">
                  {selectedMarket.show}
                </div>
              )}
              <span className="text-xs text-stone-400">
                Resolves {selectedMarket.ends}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif text-stone-900 leading-tight mb-4">
              {selectedMarket.question}
            </h1>
            <p className="text-stone-600 leading-relaxed mb-4 text-sm md:text-base">
              {selectedMarket.context}
            </p>
            {selectedMarket.source_url && (
              <a
                href={selectedMarket.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mb-6 px-3 py-2 rounded-xl bg-white/70 border border-stone-200 text-xs text-stone-700 hover:bg-white max-w-full"
              >
                <Globe className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
                <span className="truncate">
                  Source:{" "}
                  {selectedMarket.source_title || selectedMarket.source_url}
                </span>
              </a>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-xs text-stone-500">
              <span>
                <span className="text-stone-900 font-medium">
                  {formatVolume(marketVolume(selectedMarket))}
                </span>{" "}
                total volume
              </span>
              {marketVolume(selectedMarket) > 0 && (
                <>
                  <span className="text-emerald-700">
                    {formatVolume(Number(selectedMarket.yes_volume || 0))} on Yes
                  </span>
                  <span className="text-rose-700">
                    {formatVolume(Number(selectedMarket.no_volume || 0))} on No
                  </span>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setTradeSide("yes")}
                className="p-4 md:p-5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-left"
              >
                <div className="text-xs uppercase text-emerald-700 mb-1">
                  Yes
                </div>
                <div className="text-2xl md:text-3xl font-serif text-emerald-800">
                  {selectedMarket.yes} cents
                </div>
              </button>
              <button
                onClick={() => setTradeSide("no")}
                className="p-4 md:p-5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-left"
              >
                <div className="text-xs uppercase text-rose-700 mb-1">No</div>
                <div className="text-2xl md:text-3xl font-serif text-rose-800">
                  {selectedMarket.no} cents
                </div>
              </button>
            </div>
            {SHOW_PLEDGE && (
              <div className="pt-4 border-t border-stone-100 flex items-center gap-2 text-xs text-stone-500">
                <HandHeart className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  1 percent of every trade supports{" "}
                  {causesByCategory[selectedMarket.category].name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const filtered = markets.filter(
    (m) =>
      (activeCategory === "all" || m.category === activeCategory) &&
      m.status === "open",
  );
  const trending = markets
    .filter((m) => m.trending && m.status === "open")
    .slice(0, 3);

  const tabs = [
    "home",
    "markets",
    "feed",
    "following",
    "leaderboard",
    "positions",
    "profile",
    "about",
  ];

  return (
    <div className="min-h-screen bg-amber-50/40 pb-24 md:pb-6">
      <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-xs text-amber-900">
        <Beaker className="w-3.5 h-3.5" />
        <span className="font-medium">Practice mode</span>
        <span className="hidden md:inline">— no real money</span>
        <button
          onClick={() => setShowWaitlist(true)}
          className="underline font-medium ml-1"
        >
          Real-money waitlist ({waitlist.length})
        </button>
      </div>

      {checkoutBanner && (
        <div
          className={`px-4 py-2 flex items-center justify-center gap-2 text-xs border-b ${
            checkoutBanner === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-stone-100 border-stone-200 text-stone-600"
          }`}
        >
          {checkoutBanner === "success" ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span className="font-medium">Payment received!</span>
              <span>Your credits will appear in your balance shortly.</span>
            </>
          ) : (
            <span>Checkout cancelled — no charge was made.</span>
          )}
          <button
            onClick={() => setCheckoutBanner(null)}
            className="ml-2 underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}

      {showFeedback && (
        <FeedbackModal
          onClose={() => setShowFeedback(false)}
          authUser={authUser}
        />
      )}

      {showBuyCredits && authUser && PAYMENTS_ENABLED && (
        <BuyCreditsModal onClose={() => setShowBuyCredits(false)} />
      )}

      {showSetPassword && (
        <SetPasswordModal
          onClose={() => setShowSetPassword(false)}
          email={authUser?.email}
          allowEmailFallback={false}
        />
      )}

      {showWaitlist && (
        <WaitlistModal
          onClose={() => setShowWaitlist(false)}
          waitlist={waitlist}
          setWaitlist={setWaitlist}
        />
      )}
      {showAdmin && (
        <AdminPanel
          onClose={() => setShowAdmin(false)}
          markets={markets}
          setMarkets={setMarkets}
          submissions={submissions}
          setSubmissions={setSubmissions}
          waitlist={waitlist}
          authUser={authUser}
          setBalance={setBalance}
          setPositions={setPositions}
          loadLeaderboard={loadLeaderboard}
          setUserProfile={setUserProfile}
        />
      )}
      {showSuggestMarket && (
        <SuggestMarketModal
          onClose={() => setShowSuggestMarket(false)}
          authUser={authUser}
          onSubmitted={() => setShowSuggestMarket(false)}
        />
      )}
      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          communityUsers={communityUsers}
          onFollowToggle={handleFollowToggle}
          onViewProfile={setViewingProfile}
          authUser={authUser}
        />
      )}

      <header className="bg-white/80 backdrop-blur border-b border-amber-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="flex items-center gap-2">
              <Logo size={42} />
              <span className="text-3xl brand-font text-stone-900">Cajuga</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFeedback(true)}
                title="Send feedback"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Feedback</span>
              </button>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 text-sm">
                <span className="text-xs text-stone-500 hidden md:inline">
                  Practice $
                </span>
                <span className="font-medium text-stone-900">
                  ${balance.toFixed(2)}
                </span>
                {authUser && PAYMENTS_ENABLED && (
                  <button
                    onClick={() => setShowBuyCredits(true)}
                    title="Add credits"
                    className="w-5 h-5 -mr-1 flex items-center justify-center rounded-full bg-stone-900 text-white hover:bg-stone-700"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications) markAllRead();
                  }}
                  className="relative w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.filter((n) => !n.read).length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-medium">
                      {notifications.filter((n) => !n.read).length > 9
                        ? "9+"
                        : notifications.filter((n) => !n.read).length}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-2xl border border-stone-100 z-30 overflow-hidden">
                      <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                        <span className="text-sm font-medium text-stone-900">
                          Notifications
                        </span>
                        {notifications.length > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs text-stone-400 hover:text-stone-600"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 && (
                          <div className="p-6 text-center text-sm text-stone-400">
                            No notifications yet
                          </div>
                        )}
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`px-4 py-3 border-b border-stone-50 last:border-0 ${!n.read ? "bg-amber-50/50" : ""}`}
                          >
                            <div className="flex items-start gap-2">
                              <button
                                onClick={() => {
                                  const actor = communityUsers.find(
                                    (u) => u.username === n.actor_username,
                                  );
                                  if (actor) setViewingProfile(actor);
                                  setShowNotifications(false);
                                }}
                                className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-200 to-rose-200 flex items-center justify-center text-xs font-medium text-stone-800 flex-shrink-0 hover:opacity-80"
                              >
                                {n.actor_username?.[0]?.toUpperCase()}
                              </button>
                              <button
                                className="flex-1 min-w-0 text-left"
                                onClick={() => {
                                  setShowNotifications(false);
                                  navigateTo("feed");
                                }}
                              >
                                <p className="text-xs text-stone-700 leading-snug">
                                  <span className="font-medium">
                                    @{n.actor_username}
                                  </span>
                                  {n.type === "comment"
                                    ? " commented on your trade"
                                    : ` reacted ${n.emoji} to your trade`}
                                </p>
                                <p className="text-xs text-stone-400 mt-0.5 truncate">
                                  {n.market}
                                </p>
                              </button>
                              {!n.read && (
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowDevMenu(!showDevMenu)}
                  className="flex items-center gap-2"
                >
                  <Avatar username={user.username || user.email} size={32} />
                </button>
                {showDevMenu && (
                  <div>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowDevMenu(false)}
                    />
                    <div className="absolute right-0 top-10 w-60 bg-stone-900 text-white rounded-xl p-2 z-30 shadow-2xl">
                      <div className="px-3 py-2 text-xs text-stone-400 border-b border-stone-800 mb-1">
                        <div className="font-medium text-white">
                          @{user.username || user.email.split("@")[0]}
                        </div>
                        <div className="text-stone-500">{user.email}</div>
                      </div>
                      <button
                        onClick={() => {
                          navigateTo("profile");
                          setShowDevMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-stone-800 text-sm text-left"
                      >
                        <UserCircle className="w-4 h-4" /> My profile
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setShowAdmin(true);
                            setShowDevMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-stone-800 text-sm text-left"
                        >
                          <Settings className="w-4 h-4" /> Admin console
                        </button>
                      )}{" "}
                      <div className="border-t border-stone-800 mt-1 pt-1">
                        <button
                          onClick={() => {
                            handleLogout();
                            setShowDevMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-stone-800 text-sm text-left text-rose-400"
                        >
                          <LogOut className="w-4 h-4" /> Sign out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1 text-sm overflow-x-auto pb-0.5">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => navigateTo(t)}
                className={`px-3 md:px-4 py-2 rounded-full whitespace-nowrap capitalize flex items-center gap-1.5 ${activeTab === t ? "bg-stone-900 text-white" : "text-stone-600"}`}
              >
                {t === "feed" && <Users className="w-3 h-3" />}
                {t === "leaderboard" && <Trophy className="w-3 h-3" />}
                {t === "profile" && <UserCircle className="w-3 h-3" />}
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {activeTab === "home" && (
          <div>
            <div className="mb-5 p-5 md:p-8 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-amber-300/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-rose-300/15 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-4 h-4 text-amber-200" />
                  <span className="text-xs uppercase text-amber-200">
                    Trending today
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-serif mb-4 leading-snug">
                  {trending[0] ? trending[0].question : ""}
                </h2>
                <button
                  onClick={() => setSelectedMarket(trending[0])}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-200 text-stone-900 text-sm font-medium"
                >
                  Make a prediction <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            {SHOW_PLEDGE && (
              <div className="mb-6 p-5 rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50 border border-amber-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-200 to-rose-200 flex items-center justify-center flex-shrink-0">
                    <HandHeart className="w-6 h-6 text-stone-800" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-serif text-stone-900 mb-1">
                      The Cajuga Pledge
                    </h3>
                    <p className="text-sm text-stone-700 mb-3 leading-relaxed">
                      1 percent of every trade supports women's health, mental
                      health, economic empowerment, and reproductive rights.
                      Community total:{" "}
                      <span className="font-medium text-stone-900">
                        ${communityImpact.totalGiven.toLocaleString()}
                      </span>
                      .
                    </p>
                    <button
                      onClick={() => navigateTo("impact")}
                      className="text-xs font-medium text-stone-900 hover:underline"
                    >
                      See the impact →
                    </button>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowSuggestMarket(true)}
              className="w-full flex items-center justify-between p-4 md:p-5 rounded-2xl bg-white border border-stone-100 hover:border-stone-200 mb-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-stone-600" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-stone-900">
                    Suggest a market
                  </div>
                  <div className="text-xs text-stone-400">
                    Got a question worth trading on?
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </button>
            <h2 className="text-sm font-medium text-stone-900 uppercase mb-3">
              All markets
            </h2>
            <div className="space-y-3">
              {markets
                .filter((m) => m.status === "open")
                .map((m) => {
                  const Cat = categories.find((c) => c.id === m.category);
                  const CatIcon = Cat ? Cat.icon : null;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMarket(m)}
                      className="w-full text-left p-4 md:p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50 hover:from-amber-100 border border-amber-100"
                    >
                      <div className="flex items-center gap-2 mb-2 text-xs text-stone-600">
                        {CatIcon && <CatIcon className="w-3 h-3" />}
                        <span className="capitalize">{m.category}</span>
                        {m.show && (
                          <>
                            <span className="text-stone-300">·</span>
                            <span className="font-medium text-stone-700">
                              {m.show}
                            </span>
                          </>
                        )}
                        <span className="text-stone-300">·</span>
                        <span>{formatVolume(marketVolume(m))} volume</span>
                      </div>
                      <h3 className="text-base md:text-lg font-serif text-stone-900 leading-snug mb-3">
                        {m.question}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-emerald-700 px-2.5 py-0.5 rounded-full bg-emerald-100/80">
                          Yes {m.yes} cents
                        </span>
                        <span className="text-sm font-medium text-rose-700 px-2.5 py-0.5 rounded-full bg-rose-100/80">
                          No {m.no} cents
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {activeTab === "markets" && (
          <div>
            <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
              {categories.map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap ${activeCategory === c.id ? "bg-stone-900 text-white" : "bg-white text-stone-700 border border-stone-200"}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {c.name}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowSuggestMarket(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 mb-5"
            >
              <Plus className="w-3.5 h-3.5" /> Suggest a market
            </button>
            <div className="space-y-3">
              {filtered.map((m) => {
                const Cat = categories.find((c) => c.id === m.category);
                const CatIcon = Cat ? Cat.icon : null;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMarket(m)}
                    className="w-full text-left p-4 md:p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50 border border-amber-100"
                  >
                    <div className="flex items-center gap-2 mb-2 text-xs text-stone-600">
                      {CatIcon && <CatIcon className="w-3 h-3" />}
                      <span className="capitalize">{m.category}</span>
                      {m.show && (
                        <>
                          <span className="text-stone-300">·</span>
                          <span className="font-medium text-stone-700">
                            {m.show}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="text-base md:text-lg font-serif text-stone-900 leading-snug mb-3">
                      {m.question}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-emerald-700 px-2.5 py-0.5 rounded-full bg-emerald-100/80">
                        Yes {m.yes} cents
                      </span>
                      <span className="text-sm font-medium text-rose-700 px-2.5 py-0.5 rounded-full bg-rose-100/80">
                        No {m.no} cents
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "feed" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-xl md:text-2xl font-serif text-stone-900">
                  Activity feed
                </h1>
                <p className="text-sm text-stone-500">
                  People you follow · 280 char comments
                </p>
              </div>
              <button
                onClick={() => setShowSearch(true)}
                className="text-xs text-stone-500 underline"
              >
                Find traders
              </button>
            </div>
            <ActivityFeed
              communityUsers={communityUsers}
              markets={markets}
              onViewProfile={setViewingProfile}
              onViewMarket={setSelectedMarket}
              authUser={authUser}
              onNewNotification={() => loadNotifications(authUser?.id)}
            />
          </div>
        )}

        {activeTab === "following" && (
          <div>
            <h1 className="text-xl md:text-2xl font-serif text-stone-900 mb-5">
              Following
            </h1>
            <FollowingTab
              communityUsers={communityUsers}
              onFollowToggle={handleFollowToggle}
              onViewProfile={setViewingProfile}
              authUser={authUser}
            />
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div>
            <div className="mb-5">
              <h1 className="text-xl md:text-2xl font-serif text-stone-900">
                Leaderboard
              </h1>
              <p className="text-sm text-stone-500">
                Ranked by accuracy on resolved markets
              </p>
            </div>
            <LeaderboardTab
              communityUsers={communityUsers}
              setCommunityUsers={setCommunityUsers}
              onViewProfile={setViewingProfile}
              onFollowToggle={handleFollowToggle}
            />
          </div>
        )}

        {activeTab === "positions" && (
          <div>
            <h1 className="text-xl md:text-2xl font-serif text-stone-900 mb-1">
              Your positions
            </h1>
            <p className="text-sm text-stone-500 mb-4">
              {positions.filter((p) => !p.resolved).length} open ·{" "}
              {positions.filter((p) => p.resolved).length} resolved
            </p>
            {positions.length > 0 ? (
              <div className="space-y-3">
                {positions.map((p) => (
                  <div
                    key={p.id}
                    className={`p-4 md:p-5 rounded-2xl border ${p.resolved ? (p.voided ? "bg-stone-50 border-stone-100" : p.won ? "bg-emerald-50 border-emerald-100" : "bg-stone-50 border-stone-100") : "bg-white border-stone-100"}`}
                  >
                    <h3 className="text-sm font-serif text-stone-900 mb-2">
                      {p.market}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${p.side === "yes" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                        >
                          {p.side?.toUpperCase()}
                        </span>
                        {p.resolved && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.voided ? "bg-stone-200 text-stone-500" : p.won ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}
                          >
                            {p.voided
                              ? `Voided — $${Number(p.payout).toFixed(2)} refunded`
                              : p.won
                                ? `+$${p.payout} won`
                                : "Lost"}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-stone-500">
                        {p.shares} shares at {p.avgPrice} cents
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-stone-100 text-center">
                <h3 className="text-lg font-serif text-stone-900 mb-2">
                  No positions yet
                </h3>
                <button
                  onClick={() => navigateTo("markets")}
                  className="px-6 py-2 rounded-full bg-stone-900 text-white text-sm"
                >
                  Browse markets
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div>
            <h1 className="text-xl md:text-2xl font-serif text-stone-900 mb-5">
              My profile
            </h1>
            <MyProfileTab
              balance={balance}
              positions={positions}
              markets={markets}
              demoUser={user}
              userProfile={userProfile}
              setUserProfile={setUserProfile}
              onLogout={handleLogout}
            />
          </div>
        )}

        {activeTab === "impact" && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-200 to-rose-200 flex items-center justify-center">
                <HandHeart className="w-6 h-6 text-stone-800" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-serif text-stone-900">
                  Your impact
                </h1>
                <p className="text-sm text-stone-500">The Cajuga Pledge</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5 mb-5">
              <div className="p-4 rounded-2xl bg-white border border-stone-100">
                <div className="text-xs uppercase text-stone-500 mb-1">
                  You have given
                </div>
                <div className="text-2xl font-serif text-stone-900">$0.00</div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-stone-100">
                <div className="text-xs uppercase text-stone-500 mb-1">
                  Cajuga matched
                </div>
                <div className="text-2xl font-serif text-emerald-700">
                  +$0.00
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50 border border-amber-200 col-span-2 md:col-span-1">
                <div className="text-xs uppercase text-amber-800 mb-1">
                  Community total
                </div>
                <div className="text-2xl font-serif text-amber-900">
                  ${communityImpact.totalGiven.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-stone-100 overflow-hidden">
              <div className="p-5 border-b border-stone-100">
                <h3 className="text-sm font-medium text-stone-900 uppercase">
                  Cause allocation
                </h3>
              </div>
              <div className="divide-y divide-stone-100">
                {communityImpact.byArea.map((c, i) => (
                  <div key={i} className="p-4 flex items-center gap-3">
                    <div className="w-10 text-right text-sm font-serif text-stone-900">
                      {c.pct}%
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-stone-900 mb-1">
                        {c.cause}
                      </div>
                      <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-rose-400"
                          style={{ width: c.pct * 4 + "%" }}
                        />
                      </div>
                    </div>
                    <div className="text-sm font-medium text-stone-900">
                      ${c.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "about" && (
          <div className="max-w-2xl">
            <div className="mb-6 p-8 rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50 border border-amber-200">
              <h1 className="text-3xl md:text-4xl font-serif text-stone-900 leading-tight mb-3">
                The prediction market for reality TV.
              </h1>
              <p className="text-base text-stone-700 leading-relaxed">
                Curated markets across Bachelor Nation, Bravo, Survivor,
                Netflix, and more. You already know who's going home — now back
                it. 1 percent of every trade goes to causes that matter.
              </p>
            </div>
            <h2 className="text-lg font-serif text-stone-900 mb-3">
              How we decide what to list
            </h2>
            <p className="text-sm text-stone-700 leading-relaxed mb-5">
              Reality TV prediction markets work when the questions resolve
              cleanly and publicly. We only list markets where the outcome is
              unambiguous — broadcast results, confirmed cast decisions, and
              publicly verifiable events. No gossip, no speculation about
              private lives.
            </p>
            <div className="grid md:grid-cols-2 gap-3 mb-8">
              <div className="p-5 rounded-2xl bg-white border border-stone-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                  </div>
                  <h3 className="text-sm font-medium text-stone-900">
                    We list
                  </h3>
                </div>
                <ul className="space-y-2 text-sm text-stone-700">
                  <li>· Episode eliminations and rose ceremonies</li>
                  <li>· Finale outcomes and engagements</li>
                  <li>· Tribal council votes</li>
                  <li>· Reunion appearances</li>
                  <li>· Season renewals</li>
                  <li>· Cast-wide milestones</li>
                </ul>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-stone-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center">
                    <X className="w-3.5 h-3.5 text-rose-700" />
                  </div>
                  <h3 className="text-sm font-medium text-stone-900">
                    We do not list
                  </h3>
                </div>
                <ul className="space-y-2 text-sm text-stone-700">
                  <li>· Markets based on unverified spoilers</li>
                  <li>· Private relationships off-camera</li>
                  <li>· Anything production crew could manipulate</li>
                  <li>· Personal health or legal situations</li>
                  <li>· Unconfirmed casting rumors</li>
                  <li>· Markets that reward insider knowledge</li>
                </ul>
              </div>
            </div>
            <h2 className="text-lg font-serif text-stone-900 mb-3">
              On insider trading
            </h2>
            <p className="text-sm text-stone-700 leading-relaxed mb-3">
              Production crews, network employees, and post-production staff are
              required to disclose their employment at signup. Matched users are
              blocked from trading on shows they have access to. Weekly markets
              close one hour before air. Finale markets close 48 hours before
              broadcast.
            </p>
            <p className="text-sm text-stone-700 leading-relaxed">
              We'd rather run fewer markets cleanly than more markets badly.
            </p>
            <div className="mt-8 pt-5 border-t border-stone-200">
              <button
                onClick={() => setShowTerms(true)}
                className="text-sm text-stone-600 underline hover:text-stone-900"
              >
                Terms of Use and User Agreement
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
