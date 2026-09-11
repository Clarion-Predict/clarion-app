import React, { useState, useMemo, useEffect, Suspense } from "react";
import { supabase } from "./supabase";
import cajugaLogo from "./cajuga-logo.svg";
import BuyCreditsModal from "./BuyCreditsModal";
import TermsModal from "./TermsModal";
import StarButton from "./StarButton";
import FeedbackModal from "./FeedbackModal";
import SuggestMarketModal from "./SuggestMarketModal";
import AvatarUpload from "./AvatarUpload";
import {
  MIN_PASSWORD_LENGTH,
  checkPassword,
  passwordStrength,
} from "./passwordRules";
import {
  Avatar,
  Logo,
  autoCheckSubmission,
  communityImpact,
  formatVolume,
  insertSubmission,
  mapSubmissionRow,
  marketVolume,
} from "./shared";

// The operator console is a separate product that only admins open, so it
// ships as its own chunk instead of in every visitor's bundle.
const AdminPanel = React.lazy(() => import("./AdminPanel"));
import {
  Activity,
  AlertCircle,
  Archive,
  ArrowLeft,
  ArrowRight,
  AtSign,
  Award,
  BarChart2,
  Bell,
  BookOpen,
  Bookmark,
  Briefcase,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  CreditCard,
  Database,
  DollarSign,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Flame,
  FlaskConical,
  Gift,
  Globe,
  FlagTriangleRight,
  Heart,
  Info,
  Layers,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Terminal,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  Tv,
  Unlock,
  UserCircle,
  Users,
  Vote,
  X,
  Zap,
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
                  {u.totalTrades} trades · {u.accuracy}% of {u.totalResolved}{" "}
                  settled
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
                avatarUrl={profileUser.avatar_url}
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
                { label: "Settled", value: profileUser.totalResolved },
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
                      {p.amount == null
                        ? "Amount hidden"
                        : `$${Number(p.amount).toFixed(2)} wagered`}
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
                {
                  label: "Accuracy rate",
                  value: `${profileUser.accuracy}% of ${profileUser.totalResolved} settled`,
                },
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

// ========== GOSSIP TAB ==========
const EMOJIS = ["💛", "🌼", "⭐️", "🌝", "🧀"];

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
        // Only open markets are loaded, so a bet on a resolved one has
        // nothing to open — it stays plain text rather than a dead link.
        const itemMarket = markets.find((m) => m.id === item.marketId);
        return (
          <div
            key={item.key}
            className="bg-white rounded-2xl border border-stone-100 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <button onClick={() => onViewProfile(item.user)}>
                  <Avatar
                    username={item.user.username}
                    avatarUrl={item.user.avatar_url}
                    size={36}
                  />
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
              {itemMarket ? (
                <button
                  onClick={() => onViewMarket(itemMarket)}
                  className="block text-left text-sm font-serif text-stone-900 leading-snug mb-3 hover:underline underline-offset-2 decoration-stone-300"
                >
                  {item.market}
                </button>
              ) : (
                <p className="text-sm font-serif text-stone-900 leading-snug mb-3">
                  {item.market}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-stone-400 flex-wrap mb-3">
                <span>
                  {item.amount == null
                    ? "Amount hidden"
                    : `$${Number(item.amount).toFixed(2)} wagered`}
                </span>
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
                    <Avatar
                      username={c.username}
                      avatarUrl={
                        communityUsers.find((u) => u.id === c.user_id)
                          ?.avatar_url
                      }
                      size={24}
                    />
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
              <Avatar
                username={authUser?.username}
                avatarUrl={authUser?.avatar_url}
                size={28}
              />
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
                <Avatar
                  username={u.username}
                  avatarUrl={u.avatar_url}
                  size={40}
                />
              </button>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => onViewProfile(u)}
                  className="text-sm font-medium text-stone-900 hover:underline"
                >
                  @{u.username}
                </button>
                <div className="text-xs text-stone-400">
                  {u.totalTrades} trades · {u.accuracy}% of {u.totalResolved}{" "}
                  settled
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
                <Avatar
                  username={u.username}
                  avatarUrl={u.avatar_url}
                  size={40}
                />
              </button>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => onViewProfile(u)}
                  className="text-sm font-medium text-stone-900 hover:underline"
                >
                  @{u.username}
                </button>
                <div className="text-xs text-stone-400">
                  {u.totalTrades} trades · {u.accuracy}% of {u.totalResolved}{" "}
                  settled
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
    if (rank === 1) return <Trophy className="w-4 h-4 text-amber-400" />;
    if (rank === 2) return <Trophy className="w-4 h-4 text-stone-400" />;
    if (rank === 3) return <Trophy className="w-4 h-4 text-amber-700" />;
    return (
      <span className="text-xs font-mono text-stone-400 w-4 text-center">
        #{rank}
      </span>
    );
  };

  return (
    <div>
      {/* <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
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
      </div> */}

      <div className="space-y-2">
        {sorted.map((u, i) => {
          const displayRank = i + 1;
          const isTop3 = displayRank <= 3;
          return (
            <div
              key={u.id}
              className={`flex items-center gap-3 p-3 md:p-4 rounded-2xl ${isTop3 ? "bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100" : "bg-white border border-stone-100"}`}
            >
              <div className="w-6 flex items-center justify-center flex-shrink-0">
                {rankIcon(displayRank)}
              </div>
              <button
                onClick={() => onViewProfile(u)}
                className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
              >
                <Avatar
                  username={u.username}
                  avatarUrl={u.avatar_url}
                  size={36}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-stone-900 truncate">
                    @{u.username}
                  </div>
                  <div className="text-xs text-stone-400">
                    {u.totalTrades} trades · {u.totalResolved} settled
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
          only.
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
  const [amountsPrivate, setAmountsPrivate] = useState(
    userProfile?.amountsPrivate ?? false,
  );
  // useState only reads its initial value once. If the profile arrives after
  // this mounts, a privacy toggle showing the wrong state would invite someone
  // to "turn it on" and actually turn it off.
  useEffect(() => {
    setAmountsPrivate(userProfile?.amountsPrivate ?? false);
  }, [userProfile?.amountsPrivate]);
  const [editingBio, setEditingBio] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [bio, setBio] = useState(userProfile?.bio || "");
  const username = demoUser.username || demoUser.email?.split("@")[0] || "you";

  const onAvatarChanged = (url) =>
    setUserProfile((prev) => ({ ...prev, avatarUrl: url }));

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
            {demoUser?.id ? (
              <AvatarUpload
                userId={demoUser.id}
                username={username}
                avatarUrl={userProfile?.avatarUrl}
                size={56}
                onUploaded={onAvatarChanged}
              />
            ) : (
              <Avatar
                username={username}
                avatarUrl={userProfile?.avatarUrl}
                size={56}
                className="border-2 border-white"
              />
            )}
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
            1% of our annual revenue goes to your chosen cause.
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
              toggle: () => {
                const next = !amountsPrivate;
                setAmountsPrivate(next);
                setUserProfile((prev) => ({ ...prev, amountsPrivate: next }));
                if (demoUser?.id) {
                  supabase
                    .from("profiles")
                    .update({ amounts_private: next })
                    .eq("user_id", demoUser.id)
                    .then(({ error }) => {
                      if (error) console.error("amounts_private:", error);
                    });
                }
              },
            },
            ...(SHOW_PLEDGE
              ? [
                  {
                    label: "Hide cause donation",
                    sub: "Your chosen cause will not appear on your profile or in Gossip",
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
                role="switch"
                aria-checked={s.state}
                aria-label={s.label}
                className={`relative flex-shrink-0 h-[22px] w-10 rounded-full transition-colors ${s.state ? "bg-stone-900" : "bg-stone-200"}`}
              >
                {/* 22px track, 16px knob -> 3px inset centres it, and the
                    travel is 40 - 16 - (3 * 2) = 18px. */}
                <div
                  className={`absolute left-[3px] top-[3px] w-4 h-4 rounded-full bg-white transition-transform ${s.state ? "translate-x-[18px]" : "translate-x-0"}`}
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
                    desc: "1% of annual revenue supports women's health, mental health, economic empowerment, and reproductive rights.",
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
    // Only enforced on signup: existing members may hold a password that
    // predates this rule, and locking them out of sign-in would be worse than
    // the weak password.
    if (view === "signup") {
      const pwError = checkPassword(password, [username, email]);
      if (pwError) {
        setError(pwError);
        return;
      }
    }
    if (view === "signup") {
      const handle = username.trim().toLowerCase();
      if (!handle) {
        setError("Please choose a username.");
        return;
      }
      // Same rule the database and the signup function enforce.
      if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
        setError(
          "Usernames can use lowercase letters, numbers and underscores, and must be 3-20 characters.",
        );
        return;
      }
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
          {view === "signup" && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex gap-1 flex-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${
                      passwordStrength(password).score > i
                        ? "bg-emerald-500"
                        : "bg-stone-200"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-stone-400 w-16 text-right">
                {password ? passwordStrength(password).label : ""}
              </span>
            </div>
          )}
          {view === "signup" && !password && (
            <p className="text-xs text-stone-400 mt-1">
              At least {MIN_PASSWORD_LENGTH} characters. A few words together
              beats a short complicated one.
            </p>
          )}
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
    const pwError = checkPassword(pw, [email]);
    if (pwError) {
      setError(pwError);
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
              1% of our annual revenue goes to a cause you choose. Pick yours.
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
    avatarUrl: string | null;
    amountsPrivate: boolean;
  }>({
    bio: "",
    cause: "",
    accuracy: 0,
    totalResolved: 0,
    avatarUrl: null,
    amountsPrivate: false,
  });

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
      "markets",
      "gossip",
      "following",
      "leaderboard",
      "positions",
      "profile",
      "impact",
      "about",
    ];
    return validTabs.includes(hash) ? hash : "markets";
  });
  const navigateTo = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = tab === "markets" ? "" : tab;
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
              created_at: m.created_at,
              submitted_by: m.submitted_by,
              resolved_at: m.resolved_at,
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
            avatar_url: profile?.avatar_url || null,
            returning: true,
          });
          if (profile) {
            setUserProfile({
              bio: profile.bio || "",
              cause: profile.cause || "",
              avatarUrl: profile.avatar_url || null,
              amountsPrivate: profile.amounts_private ?? false,
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
            const { data: submissionRows, error: submissionsError } =
              await supabase.rpc("admin_submissions", { p_limit: 1000 });

            if (submissionsError) {
              console.error("admin_submissions:", submissionsError);
            }
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
          avatar_url: profile?.avatar_url || null,
          returning: true,
        });
        if (profile) {
          setUserProfile({
            bio: profile.bio || "",
            cause: profile.cause || "",
            avatarUrl: profile.avatar_url || null,
            amountsPrivate: profile.amounts_private ?? false,
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
        "user_id, username, bio, cause, accuracy, wins, total_resolved, impact_score, avatar_url",
      );
    if (profileRows && profileRows.length > 0) {
      const { data: tradeCounts } = await supabase.rpc("trade_counts");
      const countMap = {};
      if (tradeCounts) {
        tradeCounts.forEach((row) => {
          countMap[row.user_id] = Number(row.trades) || 0;
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
        const { data: followedPositions, error: posError } = await supabase.rpc(
          "feed_positions",
          { p_user_ids: Array.from(followingIds) },
        );
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
      // Rank is derived here rather than stored. The old profiles.leaderboard_rank
      // column was only refreshed when a market resolved, had no tie-break, and
      // defaulted to 0 — which sorted brand new accounts straight to the top.
      const ranked = profileRows
        .filter((p) => p.username)
        .sort((a, b) => {
          // Anyone with a settled bet outranks anyone without one, so a new
          // account can't lead on a 0% record it never actually earned.
          const aSettled = (a.total_resolved || 0) > 0;
          const bSettled = (b.total_resolved || 0) > 0;
          if (aSettled !== bSettled) return aSettled ? -1 : 1;
          // Then accuracy, then volume of settled bets, so 100% from ten
          // resolved markets beats 100% from one.
          if ((b.accuracy || 0) !== (a.accuracy || 0))
            return (b.accuracy || 0) - (a.accuracy || 0);
          if ((b.total_resolved || 0) !== (a.total_resolved || 0))
            return (b.total_resolved || 0) - (a.total_resolved || 0);
          if ((b.wins || 0) !== (a.wins || 0))
            return (b.wins || 0) - (a.wins || 0);
          // Alphabetical last, so equal records keep a stable order between
          // loads rather than shuffling.
          return (a.username || "").localeCompare(b.username || "");
        });

      setCommunityUsers(
        ranked.map((p, i) => ({
          id: p.user_id,
          username: p.username,
          name: p.username,
          accuracy: p.accuracy || 0,
          totalTrades: countMap[p.user_id] || 0,
          // Accuracy and rank are both based on settled bets, not on every
          // bet placed, so the two counts have to be shown separately.
          totalResolved: p.total_resolved || 0,
          impactScore: p.impact_score || 0,
          leaderboardRank: i + 1,
          following: followingIds.has(p.user_id),
          followsMe: followerIds.has(p.user_id),
          cause: p.cause || "",
          causePrivate: false,
          avatar_url: p.avatar_url || null,
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
    navigateTo("markets");
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
      // Load their positions for the gossip tab
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
    // Charged on top of the stake, and must round the same way place_trade
    // does or "total cost" won't match what actually leaves the balance.
    const fee = Math.round(cost * 0.03 * 100) / 100;
    const totalCost = cost + fee;
    const insufficient = totalCost > balance;
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
                    ${fee.toFixed(2)}
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
                    {formatVolume(Number(selectedMarket.yes_volume || 0))} on
                    Yes
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
                  1 percent of annual revenue supports{" "}
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
    "markets",
    "gossip",
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
        {/* <button
          onClick={() => setShowWaitlist(true)}
          className="underline font-medium ml-1"
        >
          Real-money waitlist ({waitlist.length})
        </button> */}
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
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-stone-950 z-50 flex items-center justify-center text-stone-400 text-sm">
              Loading console…
            </div>
          }
        >
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
        </Suspense>
      )}
      {showSuggestMarket && (
        <SuggestMarketModal
          onClose={() => setShowSuggestMarket(false)}
          authUser={authUser}
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
                              {/* A win has no actor — the market resolved —
                                  so it gets a trophy instead of an avatar. */}
                              {n.type === "win" ? (
                                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                  <Trophy className="w-3.5 h-3.5 text-emerald-700" />
                                </div>
                              ) : (
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
                              )}
                              <button
                                className="flex-1 min-w-0 text-left"
                                onClick={() => {
                                  setShowNotifications(false);
                                  navigateTo(
                                    n.type === "win" ? "positions" : "gossip",
                                  );
                                }}
                              >
                                <p className="text-xs text-stone-700 leading-snug">
                                  {n.type === "win" ? (
                                    <>
                                      <span className="font-medium text-emerald-700">
                                        You won
                                        {n.amount != null
                                          ? ` $${Number(n.amount).toFixed(2)}`
                                          : ""}
                                      </span>{" "}
                                      on this market
                                    </>
                                  ) : (
                                    <>
                                      <span className="font-medium">
                                        @{n.actor_username}
                                      </span>
                                      {n.type === "comment"
                                        ? " commented on your trade"
                                        : ` reacted ${n.emoji} to your trade`}
                                    </>
                                  )}
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
                  <Avatar
                    username={user.username || user.email}
                    avatarUrl={user.avatar_url}
                    size={32}
                  />
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
                {t === "gossip" && <Users className="w-3 h-3" />}
                {t === "leaderboard" && <Trophy className="w-3 h-3" />}
                {t === "profile" && <UserCircle className="w-3 h-3" />}
                {t === "markets" && <ChartNoAxesCombined className="w-3 h-3" />}
                {t === "positions" && <FlagTriangleRight className="w-3 h-3" />}
                {t === "about" && <Info className="w-3 h-3" />}
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {activeTab === "markets" && (
          <div>
            {/* <div className="mb-5 p-5 md:p-8 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-amber-300/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-rose-300/15 rounded-full blur-3xl" /> */}
            {/* <div className="relative">
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
              </div> */}
            {/* </div> */}
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
            <StarButton
              onClick={() => setShowSuggestMarket(true)}
              className="mb-5"
            >
              <Plus className="w-3.5 h-3.5" /> Suggest a market
            </StarButton>
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

        {activeTab === "gossip" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-xl md:text-2xl font-serif text-stone-900">
                  Gossip
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
                it. 1 percent of annual revenue goes to causes that matter.
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
            <br />
            <h2 className="text-lg font-serif text-stone-900 mb-3">
              Disclaimer
            </h2>
            <p className="text-sm text-stone-700 leading-relaxed mb-3">
              This market and these products have not been endorsed by Bravo,
              Peacock, CBS, ABC, Paramount+, Netflix, Hulu, MTV, Max, or any
              other network or streaming platform. Any references to these
              networks and platforms, or any associated marks, are descriptive
              only and do not indicate an endorsement of this product or any
              affiliation between these networks and platforms and Cajuga.
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
