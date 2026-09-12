import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import StarButton from "./StarButton";
import AdminDocs from "./AdminDocs";
import SuggestMarketModal from "./SuggestMarketModal";
import { FEEDBACK_CATEGORIES } from "./FeedbackModal";
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronRight,
  Edit3,
  Globe,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  Logo,
  communityImpact,
  readFunctionError,
  formatVolume,
  mapSubmissionRow,
  marketVolume,
} from "./shared";

const ADMIN_TABS = [
  "overview",
  "users",
  "markets",
  "submissions",
  "feedback",
  "ledger",
  "pledge",
  "compliance",
  "investor",
  "docs",
];

const FEEDBACK_PRIORITIES = [
  { id: "high", label: "High", chip: "bg-rose-500/15 text-rose-300" },
  { id: "medium", label: "Medium", chip: "bg-amber-500/15 text-amber-300" },
  { id: "low", label: "Low", chip: "bg-stone-500/20 text-stone-300" },
];

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
  const [showSuggest, setShowSuggest] = useState(false);
  const [resolvingMarket, setResolvingMarket] = useState(null);
  const [cutoffTime, setCutoffTime] = useState("");
  const [showCutoff, setShowCutoff] = useState(false);
  const [selectedAdminMarket, setSelectedAdminMarket] = useState(null);
  const [showResolved, setShowResolved] = useState(false);
  const [resolvedMarkets, setResolvedMarkets] = useState([]);
  const [marketBets, setMarketBets] = useState([]);
  const [marketBetsLoading, setMarketBetsLoading] = useState(false);
  const [marketBetsError, setMarketBetsError] = useState("");

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
  const [feedbackCategory, setFeedbackCategory] = useState("all");
  const [feedbackPriority, setFeedbackPriority] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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

  const setFeedbackPriorityValue = async (id, priority) => {
    setFeedback((prev) =>
      prev.map((f) => (f.id === id ? { ...f, priority } : f)),
    );
    const { error } = await supabase.rpc("admin_set_feedback_priority", {
      p_id: id,
      p_priority: priority,
    });
    if (error) {
      console.error("admin_set_feedback_priority:", error);
      loadFeedback();
    }
  };

  const setFeedbackArchived = async (id, archived) => {
    setFeedback((prev) =>
      prev.map((f) => (f.id === id ? { ...f, archived } : f)),
    );
    const { error } = await supabase.rpc("admin_set_feedback_archived", {
      p_id: id,
      p_archived: archived,
    });
    if (error) {
      console.error("admin_set_feedback_archived:", error);
      loadFeedback();
    }
  };

  const deleteFeedback = async (id) => {
    setConfirmDeleteId(null);
    setFeedback((prev) => prev.filter((f) => f.id !== id));
    const { error } = await supabase.rpc("admin_delete_feedback", {
      p_id: id,
    });
    if (error) {
      console.error("admin_delete_feedback:", error);
      // The row is gone from the screen but not the table -- put it back.
      loadFeedback();
    }
  };

  useEffect(() => {
    if (adminTab === "feedback") loadFeedback();
    if (adminTab === "markets") loadResolvedMarkets();
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

  const loadResolvedMarkets = async () => {
    const { data, error } = await supabase
      .from("markets")
      .select("*")
      .eq("status", "resolved")
      .order("resolved_at", { ascending: false, nullsFirst: false });
    if (error) {
      console.error("resolved markets:", error);
      return;
    }
    setResolvedMarkets(data || []);
  };

  const openMarket = async (m) => {
    setSelectedAdminMarket(m);
    setMarketBets([]);
    setMarketBetsError("");
    setMarketBetsLoading(true);
    const { data, error } = await supabase.rpc("admin_market_positions", {
      p_market_id: m.id,
    });
    setMarketBetsLoading(false);
    if (error) {
      console.error("admin_market_positions:", error);
      setMarketBetsError(error.message);
      return;
    }
    setMarketBets(data || []);
  };

  // Usernames anywhere in the console jump to that account's detail view.
  const goToUser = (userId) => {
    const account = adminUsers.find((u) => u.user_id === userId);
    if (!account) return;
    setAdminTab("users");
    openUser(account);
  };

  const loadSubmissions = async () => {
    const { data, error } = await supabase.rpc("admin_submissions", {
      p_limit: 1000,
    });
    if (error) {
      console.error("admin_submissions:", error);
      return;
    }
    setSubmissions((data || []).map(mapSubmissionRow));
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
      const serverError = data?.error ?? (await readFunctionError(error));
      setGenStatus({
        error:
          serverError ||
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
    // All payout/void/stats logic runs server-side in the resolve_market
    // function (admin-gated) — one atomic call instead of client-side loops.
    // resolve_market stamps resolved_at itself; a null cutoff voids nothing.
    const { data: summary, error: resolveError } = await supabase.rpc(
      "resolve_market",
      {
        p_market_id: marketId,
        p_outcome: outcome,
        p_cutoff: cutoffTime ? new Date(cutoffTime).toISOString() : null,
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
        m.id === marketId
          ? {
              ...m,
              status: "resolved",
              outcome,
              resolved_at: new Date().toISOString(),
            }
          : m,
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
    await loadResolvedMarkets();

    setResolvingMarket(null);
    setSelectedAdminMarket(null);
    setCutoffTime("");
    setShowCutoff(false);
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
        submitted_by: sub.userId || null,
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
          created_at: newMarketRow.created_at,
          submitted_by: newMarketRow.submitted_by,
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
  // Trades now write a single 3% fee row, but historical rows split it into
  // 2% fee + 1% pledge, so both still have to be summed for the total to be
  // right across all time.
  const totalFees =
    Number(stats?.fees_collected ?? 0) + Number(stats?.charity_pledged ?? 0);
  const pending = submissions.filter((s) => s.status === "pending").length;
  const marketList = showResolved
    ? resolvedMarkets
    : markets.filter((m) => m.status === "open");
  const archivedCount = feedback.filter((f) => f.archived).length;
  const visibleFeedback = feedback.filter(
    (f) =>
      Boolean(f.archived) === showArchived &&
      (feedbackCategory === "all" || f.category === feedbackCategory) &&
      (feedbackPriority === "all" ||
        (f.priority || "medium") === feedbackPriority),
  );

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
          {ADMIN_TABS.map((t) => (
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
            {ADMIN_TABS.map((t) => (
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                  <div className="p-4 rounded-lg bg-amber-300 border border-amber-400">
                    <div className="text-xs text-amber-700 uppercase mb-1">
                      Fees (3%)
                    </div>
                    <div className="text-2xl font-medium text-amber-900">
                      ${totalFees.toFixed(2)}
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
                <StarButton
                  onClick={() => setShowSuggest(true)}
                  className="mb-4"
                >
                  <Plus className="w-3.5 h-3.5" /> Suggest a market
                </StarButton>

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
                      // Generated rows keep their descriptive submitter
                      // ("Cajuga AI drafted"); community ones show the real
                      // account resolved by admin_submissions().
                      const byline =
                        sub.source === "community"
                          ? sub.accountUsername || sub.submitter
                          : sub.submitter;
                      const account = sub.userId
                        ? adminUsers.find((u) => u.user_id === sub.userId)
                        : null;
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
                            {account ? (
                              <button
                                onClick={() => {
                                  setAdminTab("users");
                                  openUser(account);
                                }}
                                className="text-stone-300 underline underline-offset-2 hover:text-white"
                              >
                                by {byline}
                              </button>
                            ) : (
                              <span className="text-stone-400">
                                by {byline}
                              </span>
                            )}
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
                {selectedAdminMarket ? (
                  (() => {
                    const m = selectedAdminMarket;
                    const submitter = m.submitted_by
                      ? adminUsers.find((u) => u.user_id === m.submitted_by)
                      : null;
                    const staked = marketBets
                      .filter((b) => !b.voided)
                      .reduce((t, b) => t + Number(b.invested || 0), 0);
                    return (
                      <div>
                        <button
                          onClick={() => setSelectedAdminMarket(null)}
                          className="flex items-center gap-2 text-stone-400 mb-4 text-sm hover:text-stone-200"
                        >
                          <ArrowLeft className="w-4 h-4" /> Back to markets
                        </button>

                        <div className="bg-stone-700 rounded-lg border border-stone-600 p-5 mb-4">
                          <div className="flex items-center gap-2 mb-2 flex-wrap text-xs">
                            <span className="capitalize px-2 py-0.5 rounded-full bg-stone-800 text-stone-300">
                              {m.category}
                            </span>
                            {m.show && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
                                {m.show}
                              </span>
                            )}
                            {m.status === "resolved" ? (
                              <span
                                className={`px-2 py-0.5 rounded-full ${m.outcome === "void" ? "bg-stone-500/20 text-stone-300" : "bg-emerald-500/15 text-emerald-300"}`}
                              >
                                {m.outcome === "void"
                                  ? "Voided — no result"
                                  : `Resolved ${m.outcome}`}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
                                Open
                              </span>
                            )}
                            {m.status === "open" && (
                              <button
                                onClick={() => setResolvingMarket(m)}
                                className="ml-auto px-3 py-1.5 rounded-md bg-stone-900 text-white text-xs flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" /> Resolve
                              </button>
                            )}
                          </div>
                          <h1 className="text-lg font-medium text-stone-100 mb-2">
                            {m.question}
                          </h1>
                          {m.context && (
                            <p className="text-sm text-stone-400 mb-3">
                              {m.context}
                            </p>
                          )}
                          {m.source_url && (
                            <a
                              href={m.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-md bg-stone-800 border border-stone-600 text-xs text-stone-300 hover:text-white max-w-full"
                            >
                              <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">
                                {m.source_title || m.source_url}
                              </span>
                            </a>
                          )}
                          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-stone-400">
                            <span>
                              Submitted{" "}
                              <span className="text-stone-200">
                                {m.created_at
                                  ? new Date(m.created_at).toLocaleString()
                                  : "—"}
                              </span>
                            </span>
                            <span>
                              Resolves{" "}
                              <span className="text-stone-200">
                                {m.ends || "TBD"}
                              </span>
                            </span>
                            {m.status === "resolved" && (
                              <span>
                                Resolved{" "}
                                <span className="text-stone-200">
                                  {m.resolved_at
                                    ? new Date(m.resolved_at).toLocaleString()
                                    : "—"}
                                </span>
                              </span>
                            )}
                            <span>
                              Submitted by{" "}
                              {submitter ? (
                                <button
                                  onClick={() => goToUser(m.submitted_by)}
                                  className="text-stone-300 underline underline-offset-2 hover:text-white"
                                >
                                  {submitter.username}
                                </button>
                              ) : (
                                <span className="text-stone-500">unknown</span>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          {[
                            {
                              l: "Total volume",
                              v: formatVolume(marketVolume(m)),
                            },
                            {
                              l: "On Yes",
                              v: formatVolume(Number(m.yes_volume || 0)),
                            },
                            {
                              l: "On No",
                              v: formatVolume(Number(m.no_volume || 0)),
                            },
                            { l: "Bets placed", v: marketBets.length },
                          ].map((c) => (
                            <div
                              key={c.l}
                              className="bg-stone-700 rounded-lg border border-stone-600 p-3"
                            >
                              <div className="text-xs text-stone-400 mb-1">
                                {c.l}
                              </div>
                              <div className="text-lg text-stone-100">
                                {c.v}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between mb-2">
                          <h2 className="text-sm font-medium text-stone-200">
                            Bets on this market
                          </h2>
                          <span className="text-xs text-stone-400">
                            ${staked.toFixed(2)} staked
                          </span>
                        </div>
                        {marketBetsError && (
                          <div className="mb-3 p-3 rounded bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200">
                            {marketBetsError}
                          </div>
                        )}
                        <div className="bg-stone-700 rounded-lg border border-stone-600 overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-stone-800 border-b border-stone-600">
                              <tr className="text-xs uppercase text-stone-400">
                                <th className="text-left px-4 py-3">User</th>
                                <th className="text-left px-4 py-3">Side</th>
                                <th className="text-right px-4 py-3">Shares</th>
                                <th className="text-right px-4 py-3">
                                  Avg price
                                </th>
                                <th className="text-right px-4 py-3">
                                  Invested
                                </th>
                                <th className="text-right px-4 py-3">Payout</th>
                                <th className="text-left px-4 py-3">Placed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {marketBetsLoading && (
                                <tr>
                                  <td
                                    colSpan={7}
                                    className="px-4 py-6 text-center text-xs text-stone-400"
                                  >
                                    Loading bets…
                                  </td>
                                </tr>
                              )}
                              {!marketBetsLoading &&
                                marketBets.length === 0 && (
                                  <tr>
                                    <td
                                      colSpan={7}
                                      className="px-4 py-6 text-center text-xs text-stone-400"
                                    >
                                      No bets on this market yet.
                                    </td>
                                  </tr>
                                )}
                              {marketBets.map((b) => (
                                <tr
                                  key={b.id}
                                  className={`border-b border-stone-600 last:border-0 ${b.voided ? "opacity-50" : ""}`}
                                >
                                  <td className="px-4 py-3">
                                    <button
                                      onClick={() => goToUser(b.user_id)}
                                      className="text-stone-200 underline underline-offset-2 hover:text-white"
                                    >
                                      {b.username || b.email || "—"}
                                    </button>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs uppercase ${b.side === "yes" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}
                                    >
                                      {b.side}
                                    </span>
                                    {b.voided && (
                                      <span className="ml-2 text-xs text-stone-400">
                                        voided
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right text-stone-300">
                                    {b.shares}
                                  </td>
                                  <td className="px-4 py-3 text-right text-stone-300">
                                    {b.avg_price}c
                                  </td>
                                  <td className="px-4 py-3 text-right text-stone-300">
                                    ${Number(b.invested || 0).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {b.resolved ? (
                                      <span
                                        className={
                                          b.won
                                            ? "text-emerald-300"
                                            : "text-stone-500"
                                        }
                                      >
                                        ${Number(b.payout || 0).toFixed(2)}
                                      </span>
                                    ) : (
                                      <span className="text-stone-500">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-stone-400">
                                    {b.created_at
                                      ? new Date(b.created_at).toLocaleString()
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                      <h1 className="text-xl font-medium text-stone-100">
                        {showResolved ? "Resolved markets" : "Markets"}{" "}
                        <span className="text-sm text-stone-400">
                          ({marketList.length})
                        </span>
                      </h1>
                      <button
                        onClick={() => setShowResolved(!showResolved)}
                        className={`px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 border ${
                          showResolved
                            ? "bg-stone-700 border-stone-500 text-white"
                            : "bg-stone-900 border-stone-700 text-stone-300 hover:text-white"
                        }`}
                      >
                        <Archive className="w-3 h-3" />
                        {showResolved
                          ? "Back to open markets"
                          : `Resolved (${resolvedMarkets.length})`}
                      </button>
                    </div>
                    <div className="bg-stone-700 rounded-lg border border-stone-600 overflow-hidden">
                      {marketList.length === 0 && (
                        <div className="p-6 text-center text-sm text-stone-400">
                          {showResolved
                            ? "No resolved markets yet."
                            : "No open markets."}
                        </div>
                      )}
                      {marketList.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => openMarket(m)}
                          className="p-4 border-b border-stone-600 last:border-0 flex items-start gap-4 cursor-pointer hover:bg-stone-600/40"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-stone-400 capitalize">
                                {m.category}
                              </span>
                              {m.status === "resolved" ? (
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${m.outcome === "void" ? "bg-stone-500/20 text-stone-300" : "bg-emerald-500/15 text-emerald-300"}`}
                                >
                                  {m.outcome === "void"
                                    ? "Voided — no result"
                                    : `Resolved ${m.outcome}`}
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
                                  Open
                                </span>
                              )}
                              <span className="text-xs text-stone-500">
                                {formatVolume(marketVolume(m))} volume
                              </span>
                            </div>
                            <h3 className="text-sm font-medium text-stone-100">
                              {m.question}
                            </h3>
                          </div>
                          {m.status === "open" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setResolvingMarket(m);
                              }}
                              className="px-3 py-1.5 rounded-md bg-stone-900 text-white text-xs flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" /> Resolve
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {resolvingMarket && (
                  <div className="fixed inset-0 bg-black/50 z-10 flex items-center justify-center p-4">
                    <div className="bg-stone-700 rounded-lg max-w-md w-full p-6">
                      <h3 className="text-lg font-medium text-stone-100 mb-2">
                        Resolve market
                      </h3>
                      <p className="text-sm text-stone-300 mb-4">
                        {resolvingMarket.question}
                      </p>
                      <p className="text-xs text-stone-400 mb-3">
                        Resolving now — the current time is recorded as the
                        resolution time.{" "}
                        {cutoffTime
                          ? "Positions placed after the cutoff below will be voided and refunded."
                          : "Every open position on this market pays out immediately."}
                      </p>

                      <div className="mb-4">
                        <button
                          onClick={() => {
                            setShowCutoff(!showCutoff);
                            if (showCutoff) setCutoffTime("");
                          }}
                          className="text-xs text-stone-400 underline underline-offset-2 hover:text-stone-200"
                        >
                          {showCutoff
                            ? "Hide advanced options"
                            : "Advanced options"}
                        </button>
                        {showCutoff && (
                          <div className="mt-3 p-3 rounded-md bg-stone-800/60 border border-stone-600">
                            <label className="block text-xs font-medium text-stone-300 mb-1.5">
                              Void bets placed after a time
                            </label>
                            <input
                              type="datetime-local"
                              value={cutoffTime}
                              onChange={(e) => setCutoffTime(e.target.value)}
                              className="w-full px-3 py-2 rounded-md bg-stone-800 border border-stone-600 text-sm focus:outline-none text-stone-100 [color-scheme:dark]"
                            />
                            <p className="text-xs text-stone-400 mt-1.5">
                              Use this when someone bet after the outcome was
                              already public. Leave empty to pay everyone out.
                            </p>
                            {cutoffTime && (
                              <p className="text-xs text-amber-200 mt-1.5 bg-amber-900/40 px-3 py-1.5 rounded">
                                Positions placed after{" "}
                                {new Date(cutoffTime).toLocaleString()} will be
                                voided and their stake refunded.
                              </p>
                            )}

                            <div className="mt-4 pt-3 border-t border-stone-600">
                              <label className="block text-xs font-medium text-stone-300 mb-1">
                                No conclusive outcome
                              </label>
                              <p className="text-xs text-stone-400 mb-2">
                                Voids the market instead of picking a side.
                                Every wager is refunded in full and nobody's
                                accuracy is affected.
                              </p>
                              <button
                                onClick={() =>
                                  resolveMarket(resolvingMarket.id, "void")
                                }
                                className="w-full py-2.5 rounded-md bg-stone-900 border border-stone-500 text-stone-100 text-sm font-medium hover:bg-stone-950"
                              >
                                Resolve as unresolved — refund everyone
                              </button>
                            </div>
                          </div>
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
                          setShowCutoff(false);
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
                <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
                  <h1 className="text-xl font-medium text-stone-100">
                    {showArchived ? "Archived feedback" : "Feedback"}{" "}
                    <span className="text-sm text-stone-400">
                      {showArchived
                        ? `(${archivedCount})`
                        : `(${feedback.filter((f) => !f.archived && f.status === "new").length} new)`}
                    </span>
                  </h1>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowArchived(!showArchived);
                        setConfirmDeleteId(null);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 border ${
                        showArchived
                          ? "bg-stone-700 border-stone-500 text-white"
                          : "bg-stone-900 border-stone-700 text-stone-300 hover:text-white"
                      }`}
                    >
                      <Archive className="w-3 h-3" />
                      {showArchived
                        ? "Back to inbox"
                        : `Archived (${archivedCount})`}
                    </button>
                    <button
                      onClick={loadFeedback}
                      className="px-3 py-1.5 rounded-md bg-stone-900 text-white text-xs flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                  </div>
                </div>
                <p className="text-xs text-stone-400 mb-3">
                  {showArchived
                    ? "Archived items are hidden from the inbox but never deleted until you delete them."
                    : "Default priority = Medium."}
                </p>

                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <select
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value)}
                    className="text-xs bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-stone-200"
                  >
                    <option value="all">All types</option>
                    {FEEDBACK_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={feedbackPriority}
                    onChange={(e) => setFeedbackPriority(e.target.value)}
                    className="text-xs bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-stone-200"
                  >
                    <option value="all">All priorities</option>
                    {FEEDBACK_PRIORITIES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  {(feedbackCategory !== "all" ||
                    feedbackPriority !== "all") && (
                    <button
                      onClick={() => {
                        setFeedbackCategory("all");
                        setFeedbackPriority("all");
                      }}
                      className="text-xs text-stone-400 underline underline-offset-2 hover:text-stone-200"
                    >
                      Clear filters
                    </button>
                  )}
                  <span className="text-xs text-stone-500 ml-auto">
                    {visibleFeedback.length} shown
                  </span>
                </div>

                <div className="space-y-3">
                  {visibleFeedback.length === 0 && (
                    <div className="text-center py-10 text-stone-400 text-sm">
                      {feedback.length === 0
                        ? "No feedback yet."
                        : showArchived
                          ? "Nothing archived."
                          : "Nothing matches these filters."}
                    </div>
                  )}
                  {visibleFeedback.map((f) => {
                    const cat = FEEDBACK_CATEGORIES.find(
                      (c) => c.id === f.category,
                    );
                    const isNew = f.status === "new";
                    const priority = f.priority || "medium";
                    const pri = FEEDBACK_PRIORITIES.find(
                      (x) => x.id === priority,
                    );
                    const confirming = confirmDeleteId === f.id;
                    return (
                      <div
                        key={f.id}
                        className={`bg-stone-700 rounded-lg border p-4 ${
                          isNew && !f.archived
                            ? "border-emerald-500/40"
                            : "border-stone-600"
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
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${pri ? pri.chip : ""}`}
                          >
                            {pri ? pri.label : priority}
                          </span>
                          {isNew && !f.archived && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-medium">
                              new
                            </span>
                          )}
                          {f.archived && (
                            <span className="px-2 py-0.5 rounded-full bg-stone-500/20 text-stone-300 text-xs font-medium">
                              archived
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

                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={priority}
                              onChange={(e) =>
                                setFeedbackPriorityValue(f.id, e.target.value)
                              }
                              className="text-xs bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-stone-200"
                            >
                              {FEEDBACK_PRIORITIES.map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() =>
                                setFeedbackStatus(
                                  f.id,
                                  isNew ? "reviewed" : "new",
                                )
                              }
                              className="px-3 py-1.5 rounded-md bg-stone-800 border border-stone-600 text-stone-200 text-xs hover:bg-stone-900"
                            >
                              {isNew ? "Mark reviewed" : "Mark unread"}
                            </button>
                            <button
                              onClick={() =>
                                setFeedbackArchived(f.id, !f.archived)
                              }
                              className="px-3 py-1.5 rounded-md bg-stone-800 border border-stone-600 text-stone-200 text-xs hover:bg-stone-900 flex items-center gap-1.5"
                            >
                              <Archive className="w-3 h-3" />
                              {f.archived ? "Unarchive" : "Archive"}
                            </button>
                            {confirming ? (
                              <>
                                <button
                                  onClick={() => deleteFeedback(f.id)}
                                  className="px-3 py-1.5 rounded-md bg-rose-600 text-white text-xs font-medium hover:bg-rose-500"
                                >
                                  Delete permanently
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1.5 text-xs text-stone-400 hover:text-stone-200"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(f.id)}
                                className="px-3 py-1.5 rounded-md bg-rose-600/15 border border-rose-500/40 text-rose-300 text-xs hover:bg-rose-600/25 flex items-center gap-1.5"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {adminTab === "docs" && <AdminDocs />}

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
                  &rarr; fee. Trades before September 2026 carry a third
                  &ldquo;pledge&rdquo; row, from when the 1% came out of each
                  trade.
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
      {showSuggest && (
        <SuggestMarketModal
          authUser={authUser}
          onClose={() => {
            setShowSuggest(false);
            // Refetch on close -- a redundant fetch after a cancel is
            // cheaper than leaving the pending list stale.
            loadSubmissions();
          }}
        />
      )}
    </div>
  );
};


export default AdminPanel;
