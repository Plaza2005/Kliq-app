import { useState, useEffect, useCallback } from "react";
import {
  Loader2, DollarSign, TrendingUp, Hash, Users, Inbox,
  Coins, Activity, BarChart2, Zap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { adminApi, resolveAvatarUrl, resolveMediaUrl } from "../api/client";

/* ------------------------------------------------------------------ */
/*  Existing revenue types                                              */
/* ------------------------------------------------------------------ */
interface RevenueSummary {
  totalRevenue: number;
  thisMonth: number;
  transactions: number;
  avgPerUser: number;
}

interface Transaction {
  id: string;
  user: string;
  type: "Top-up" | "Withdrawal" | "Transfer";
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed";
}

/* ------------------------------------------------------------------ */
/*  Token economy types                                                 */
/* ------------------------------------------------------------------ */
interface TokenSummary {
  totalIssued: number;
  totalSpent: number;
  inCirculation: number;
  totalCampaigns: number;
  totalUsers: number;
  toppedUpUsers: number;
}

interface BreakdownEntry {
  name: string;
  value: number;
}

interface TopSpender {
  userId: string;
  username: string;
  avatarUrl: string;
  tier: string;
  tokensSpent: number;
  campaignsRun: number;
  revenueContributed: number;
  isMostActive?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                            */
/* ------------------------------------------------------------------ */
const DEFAULT_SUMMARY: RevenueSummary = {
  totalRevenue: 0,
  thisMonth: 0,
  transactions: 0,
  avgPerUser: 0,
};

const DEFAULT_TOKEN_SUMMARY: TokenSummary = {
  totalIssued: 0,
  totalSpent: 0,
  inCirculation: 0,
  totalCampaigns: 0,
  totalUsers: 0,
  toppedUpUsers: 0,
};

const DEFAULT_BREAKDOWN: BreakdownEntry[] = [
  { name: "Amplify", value: 0 },
  { name: "Transfers", value: 0 },
  { name: "Other", value: 0 },
];

const DUMMY_CHART = [
  { day: "Mon", revenue: 0 },
  { day: "Tue", revenue: 0 },
  { day: "Wed", revenue: 0 },
  { day: "Thu", revenue: 0 },
  { day: "Fri", revenue: 0 },
  { day: "Sat", revenue: 0 },
  { day: "Sun", revenue: 0 },
];

/* ------------------------------------------------------------------ */
/*  Style constants                                                     */
/* ------------------------------------------------------------------ */
const TOOLTIP_STYLE = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#fff",
  fontSize: 12,
};
const TICK_STYLE = { fill: "#64748b", fontSize: 11 };

const STATUS_COLOR: Record<string, string> = {
  completed: "text-green-400 bg-green-500/10",
  pending:   "text-yellow-400 bg-yellow-500/10",
  failed:    "text-red-400 bg-red-500/10",
};

const PIE_COLORS = ["#a855f7", "#ec4899", "#6366f1"];

const TYPE_FILTERS = ["All", "Top-up", "Withdrawal", "Transfer"] as const;
type TypeFilter = typeof TYPE_FILTERS[number];

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function fmtMoney(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTokens(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const TIER_BADGE: Record<string, string> = {
  pro:  "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  plus: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  free: "bg-gray-700 text-gray-400",
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */
export function RevenueDashboard() {
  // -- Existing state --
  const [summary, setSummary]               = useState<RevenueSummary>(DEFAULT_SUMMARY);
  const [transactions, setTransactions]     = useState<Transaction[]>([]);
  const [chartData, setChartData]           = useState(DUMMY_CHART);
  const [txLoading, setTxLoading]           = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [filter, setFilter]                 = useState<TypeFilter>("All");
  const [toast, setToast]                   = useState<string | null>(null);

  // -- Token economy state --
  const [tokenSummary, setTokenSummary]     = useState<TokenSummary>(DEFAULT_TOKEN_SUMMARY);
  const [tokenSummaryLoading, setTokenSummaryLoading] = useState(true);
  const [breakdown, setBreakdown]           = useState<BreakdownEntry[]>(DEFAULT_BREAKDOWN);
  const [breakdownLoading, setBreakdownLoading]       = useState(true);
  const [topSpenders, setTopSpenders]       = useState<TopSpender[]>([]);
  const [spendersLoading, setSpendersLoading]         = useState(true);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  /* -- Loaders -- */
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await adminApi.get<RevenueSummary>("/admin/revenue/summary");
      setSummary(data);
    } catch {
      setSummary(DEFAULT_SUMMARY);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const data = await adminApi.get<{ transactions: Transaction[]; chart?: typeof DUMMY_CHART }>(
        "/admin/revenue/transactions?limit=50"
      );
      setTransactions(data.transactions ?? []);
      if (data.chart && data.chart.length > 0) setChartData(data.chart);
    } catch {
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  }, []);

  const loadTokenSummary = useCallback(async () => {
    setTokenSummaryLoading(true);
    try {
      const data = await adminApi.get<TokenSummary>("/admin/revenue/token-summary");
      setTokenSummary(data);
    } catch {
      setTokenSummary(DEFAULT_TOKEN_SUMMARY);
    } finally {
      setTokenSummaryLoading(false);
    }
  }, []);

  const loadBreakdown = useCallback(async () => {
    setBreakdownLoading(true);
    try {
      const data = await adminApi.get<BreakdownEntry[]>("/admin/revenue/token-breakdown");
      setBreakdown(data.length > 0 ? data : DEFAULT_BREAKDOWN);
    } catch {
      setBreakdown(DEFAULT_BREAKDOWN);
    } finally {
      setBreakdownLoading(false);
    }
  }, []);

  const loadTopSpenders = useCallback(async () => {
    setSpendersLoading(true);
    try {
      const data = await adminApi.get<TopSpender[]>("/admin/revenue/top-spenders");
      setTopSpenders(data ?? []);
    } catch {
      setTopSpenders([]);
    } finally {
      setSpendersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    loadTransactions();
    loadTokenSummary();
    loadBreakdown();
    loadTopSpenders();
  }, []);

  /* -- Derived values for Revenue Insights -- */
  const revPerToken = 0.009;
  const avgCampaignBudget =
    tokenSummary.totalCampaigns > 0
      ? tokenSummary.totalSpent / tokenSummary.totalCampaigns
      : 0;
  const conversionRate =
    tokenSummary.totalUsers > 0
      ? ((tokenSummary.toppedUpUsers / tokenSummary.totalUsers) * 100).toFixed(1)
      : "0.0";

  const filtered = filter === "All" ? transactions : transactions.filter(t => t.type === filter);

  /* -- Summary cards (existing) -- */
  const SUMMARY_CARDS = [
    {
      label: "Total Revenue",
      value: summaryLoading ? "—" : fmtMoney(summary.totalRevenue),
      icon: DollarSign,
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    },
    {
      label: "This Month",
      value: summaryLoading ? "—" : fmtMoney(summary.thisMonth),
      icon: TrendingUp,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Transactions",
      value: summaryLoading ? "—" : summary.transactions.toLocaleString(),
      icon: Hash,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      label: "Avg per User",
      value: summaryLoading ? "—" : fmtMoney(summary.avgPerUser),
      icon: Users,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
    },
  ];

  /* -- Token overview cards -- */
  const TOKEN_CARDS = [
    {
      label: "Tokens Issued",
      value: tokenSummaryLoading ? "—" : fmtTokens(tokenSummary.totalIssued),
      icon: Coins,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      label: "Tokens Spent",
      value: tokenSummaryLoading ? "—" : fmtTokens(tokenSummary.totalSpent),
      icon: Activity,
      color: "text-pink-400",
      bg: "bg-pink-500/10",
      border: "border-pink-500/20",
    },
    {
      label: "In Circulation",
      value: tokenSummaryLoading ? "—" : fmtTokens(tokenSummary.inCirculation),
      icon: BarChart2,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
    },
    {
      label: "Campaigns Run",
      value: tokenSummaryLoading ? "—" : tokenSummary.totalCampaigns.toLocaleString(),
      icon: Zap,
      color: "text-fuchsia-400",
      bg: "bg-fuchsia-500/10",
      border: "border-fuchsia-500/20",
    },
  ];

  /* -- Custom pie legend -- */
  const PieLegend = () => (
    <div className="flex items-center justify-center gap-6 mt-4">
      {breakdown.map((entry, i) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
          />
          <span className="text-gray-400 text-xs">{entry.name}</span>
          <span className="text-white text-xs font-semibold">{fmtTokens(entry.value)}</span>
        </div>
      ))}
    </div>
  );

  /* ================================================================= */
  return (
    <div className="space-y-6 max-w-7xl">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Monetization overview and transaction history</p>
        </div>
        <button
          onClick={() => showToast("Export as CSV — coming soon")}
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition"
        >
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SUMMARY_CARDS.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-5`}>
              <div className="flex items-center gap-3 mb-3">
                <Icon size={18} className={s.color} />
              </div>
              <p className="text-white text-2xl font-bold">{s.value}</p>
              <p className="text-gray-500 text-xs mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Revenue — Last 7 Days</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData}>
            <XAxis dataKey="day" tick={TICK_STYLE} axisLine={false} tickLine={false} />
            <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} tickFormatter={v => "$" + v} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [fmtMoney(v), "Revenue"]} />
            <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Transaction table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">Recent Transactions</h3>
          <div className="flex gap-2">
            {TYPE_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {txLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Inbox size={32} className="text-gray-600" />
            <p className="text-gray-500 text-sm">No transactions found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {["User", "Type", "Amount", "Date", "Status"].map(h => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 first:pl-5 last:pr-5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-800/40 transition">
                  <td className="px-4 py-3 pl-5 text-gray-300 text-sm font-medium">{tx.user}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        tx.type === "Top-up"
                          ? "text-green-400 bg-green-500/10"
                          : tx.type === "Withdrawal"
                          ? "text-red-400 bg-red-500/10"
                          : "text-blue-400 bg-blue-500/10"
                      }`}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white text-sm font-semibold">{fmtMoney(tx.amount)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(tx.date)}</td>
                  <td className="px-4 py-3 pr-5">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                        STATUS_COLOR[tx.status] ?? "text-gray-400 bg-gray-700"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ============================================================ */}
      {/*  TOKEN ECONOMY                                               */}
      {/* ============================================================ */}

      {/* Section divider */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex-1 h-px bg-gray-800" />
        <span className="text-gray-500 text-xs font-semibold uppercase tracking-widest">Token Economy</span>
        <div className="flex-1 h-px bg-gray-800" />
      </div>

      {/* Section 1 — Token Economy Overview */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Token Economy Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {TOKEN_CARDS.map(c => {
            const Icon = c.icon;
            return (
              <div key={c.label} className={`${c.bg} border ${c.border} rounded-2xl p-5`}>
                <div className="flex items-center gap-3 mb-3">
                  <Icon size={18} className={c.color} />
                </div>
                <p className="text-white text-2xl font-bold">{c.value}</p>
                <p className="text-gray-500 text-xs mt-1">{c.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2 — Token Usage Breakdown (pie chart) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-1">Token Usage Breakdown</h2>
        <p className="text-gray-500 text-xs mb-4">Where tokens are being used across the platform</p>

        {breakdownLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 size={24} className="animate-spin text-purple-400" />
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={breakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {breakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [fmtTokens(v) + " tokens", ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            <PieLegend />
          </>
        )}
      </div>

      {/* Section 3 — Top Token Spenders */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Top Token Spenders</h2>
          <p className="text-gray-500 text-xs mt-0.5">Top 10 users by lifetime token spend</p>
        </div>

        {spendersLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 size={24} className="animate-spin text-purple-400" />
          </div>
        ) : topSpenders.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Inbox size={32} className="text-gray-600" />
            <p className="text-gray-500 text-sm">No data yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {["User", "Tier", "Tokens Spent", "Campaigns", "Revenue", "Status"].map(h => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 first:pl-5 last:pr-5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {topSpenders.map(s => (
                <tr key={s.userId} className="hover:bg-gray-800/40 transition">
                  {/* Avatar + username */}
                  <td className="px-4 py-3 pl-5">
                    <div className="flex items-center gap-3">
                      <img
                        src={resolveAvatarUrl(s.avatarUrl)}
                        alt={s.username}
                        className="w-8 h-8 rounded-full object-cover bg-gray-700"
                      />
                      <span className="text-gray-200 text-sm font-medium">@{s.username}</span>
                    </div>
                  </td>
                  {/* Tier */}
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                        TIER_BADGE[s.tier] ?? TIER_BADGE.free
                      }`}
                    >
                      {s.tier}
                    </span>
                  </td>
                  {/* Tokens spent */}
                  <td className="px-4 py-3 text-white text-sm font-semibold">
                    {fmtTokens(s.tokensSpent)}
                  </td>
                  {/* Campaigns */}
                  <td className="px-4 py-3 text-gray-400 text-sm">{s.campaignsRun}</td>
                  {/* Revenue */}
                  <td className="px-4 py-3 text-green-400 text-sm font-medium">
                    {fmtMoney(s.revenueContributed)}
                  </td>
                  {/* Status badge */}
                  <td className="px-4 py-3 pr-5">
                    {s.isMostActive ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Most Active
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Section 4 — Revenue Insights */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Revenue Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Revenue per Token */}
          <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/30 border border-purple-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={16} className="text-purple-400" />
              <span className="text-purple-300 text-xs font-semibold uppercase tracking-wider">
                Revenue per Token
              </span>
            </div>
            <p className="text-white text-3xl font-bold">$0.009</p>
            <p className="text-gray-500 text-xs mt-2">
              1 token = $0.01 / 1.1 — based on top-up conversion rate
            </p>
          </div>

          {/* Avg Campaign Budget */}
          <div className="bg-gradient-to-br from-pink-900/40 to-rose-900/30 border border-pink-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-pink-400" />
              <span className="text-pink-300 text-xs font-semibold uppercase tracking-wider">
                Avg Campaign Budget
              </span>
            </div>
            <p className="text-white text-3xl font-bold">
              {tokenSummaryLoading ? "—" : fmtTokens(avgCampaignBudget)}
            </p>
            <p className="text-gray-500 text-xs mt-2">
              tokens per campaign &bull;{" "}
              {tokenSummaryLoading
                ? "—"
                : fmtMoney(avgCampaignBudget * revPerToken)}{" "}
              USD equivalent
            </p>
          </div>

          {/* Conversion Rate */}
          <div className="bg-gradient-to-br from-indigo-900/40 to-blue-900/30 border border-indigo-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-indigo-400" />
              <span className="text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                Conversion Rate
              </span>
            </div>
            <p className="text-white text-3xl font-bold">
              {tokenSummaryLoading ? "—" : conversionRate + "%"}
            </p>
            <p className="text-gray-500 text-xs mt-2">
              {tokenSummaryLoading
                ? "—"
                : `${tokenSummary.toppedUpUsers.toLocaleString()} of ${tokenSummary.totalUsers.toLocaleString()} users`}{" "}
              have topped up
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
