import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Users, Eye, TrendingUp, DollarSign, AlertTriangle, CheckCircle, Clock, Activity, ArrowUpRight, ExternalLink, X, Loader2, Database, Trash2 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { adminApi } from "../api/client";

const KLIQ_APP_URL = "http://localhost:8080";
const TOOLTIP = { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#fff", fontSize: 12 };
const TICK = { fill: "#64748b", fontSize: 11 };

const QUICK_LINKS = [
  { label: "Home Feed",    path: "/",            desc: "Main app feed" },
  { label: "KliqTube",    path: "/klixtube",    desc: "Video platform" },
  { label: "Marketplace", path: "/marketplace", desc: "Creator shop" },
  { label: "Community",   path: "/community",   desc: "Forums" },
  { label: "Analytics",   path: "/analytics",   desc: "Creator stats" },
  { label: "Settings",    path: "/settings",    desc: "Platform config" },
];

interface StatsData {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  suspendedUsers: number;
  totalPosts: number;
  postsToday: number;
  totalNotifs: number;
}
interface TiersData { free: number; plus: number; pro: number; }
interface ChartPoint { day: string; users: number; cumulative: number; }
interface ActivityEntry {
  id: string;
  action: string;
  target: string | null;
  createdAt: string;
  actor: { username: string; displayName: string } | null;
}
interface SystemStatusData {
  api:       { ok: boolean };
  database:  { ok: boolean; latencyMs: number | null };
  websocket: { ok: boolean; connections: number };
  storage:   { ok: boolean; mode: string };
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function actionLabel(action: string): string {
  const map: Record<string, string> = {
    "admin.ban":            "Banned user",
    "admin.suspend":        "Suspended user",
    "admin.unban":          "Reinstated user",
    "admin.verify":         "Verified user",
    "admin.delete_user":    "Deleted user",
    "admin.tier":           "Changed user tier",
    "admin.remove_content": "Removed content",
    "admin.load_demo_data":  "Loaded demo data",
    "admin.clear_demo_data": "Cleared demo data",
  };
  return map[action] ?? action;
}

function summarize(summary: Record<string, number>): string {
  const parts = Object.entries(summary)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${v} ${k}`);
  return parts.length > 0 ? parts.join(", ") : "nothing to change";
}

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats]           = useState<StatsData | null>(null);
  const [tiers, setTiers]           = useState<TiersData | null>(null);
  const [chartData, setChartData]   = useState<ChartPoint[]>([]);
  const [activity, setActivity]     = useState<ActivityEntry[]>([]);
  const [system, setSystem]         = useState<SystemStatusData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState<string | null>(null);
  const [drilldown, setDrilldown]   = useState<string | null>(null);
  const [demoBusy, setDemoBusy]         = useState<"load" | "clear" | null>(null);
  const [confirmAction, setConfirmAction] = useState<"load" | "clear" | null>(null);

  const showToast = (msg: string, ms = 2500) => { setToast(msg); setTimeout(() => setToast(null), ms); };

  const runDemoAction = async (action: "load" | "clear") => {
    setConfirmAction(null);
    setDemoBusy(action);
    try {
      const res = await adminApi.post<{ ok: boolean; summary: Record<string, number> }>(
        action === "load" ? "/admin/load-demo-data" : "/admin/clear-demo-data"
      );
      showToast(
        action === "load"
          ? `Demo data loaded: ${summarize(res.summary)}`
          : `Demo data cleared: ${summarize(res.summary)}`,
        6000
      );
      loadData();
    } catch (err) {
      showToast(`Failed to ${action} demo data: ${err instanceof Error ? err.message : "unknown error"}`, 5000);
    } finally {
      setDemoBusy(null);
    }
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([
      adminApi.get<{ stats: StatsData; tiers: TiersData; userChart: ChartPoint[] }>("/admin/stats"),
      adminApi.get<ActivityEntry[]>("/admin/activity"),
    ]).then(([statsResp, actResp]) => {
      setStats(statsResp.stats);
      setTiers(statsResp.tiers);
      setChartData(statsResp.userChart);
      setActivity(actResp.slice(0, 6));
    }).catch(console.error).finally(() => setLoading(false));
    adminApi.get<SystemStatusData>("/admin/status").then(setSystem).catch(() => setSystem(null));
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const STATS = stats ? [
    { key: "users",   label: "Total Users",   value: fmtNum(stats.totalUsers),  icon: Users,      color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/20" },
    { key: "active",  label: "Active Users",  value: fmtNum(stats.activeUsers), icon: Activity,   color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20" },
    { key: "content", label: "Total Posts",   value: fmtNum(stats.totalPosts),  icon: Eye,        color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    { key: "notifs",  label: "Notifications", value: fmtNum(stats.totalNotifs), icon: DollarSign, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  ] : [];

  const DRILLDOWN: Record<string, { title: string; subtitle: string; metrics: { label: string; value: string; color: string }[]; chart?: { data: { name: string; value: number; color?: string }[]; type: "bar" | "pie" } }> = stats && tiers ? {
    users: {
      title:    `Total Users — ${fmtNum(stats.totalUsers)}`,
      subtitle: "Breakdown by tier and account status",
      metrics: [
        { label: "Free (Basic)",  value: fmtNum(tiers.free),           color: "text-gray-300"  },
        { label: "Plus",          value: fmtNum(tiers.plus),           color: "text-cyan-400"   },
        { label: "Pro",           value: fmtNum(tiers.pro),            color: "text-purple-400" },
        { label: "Active",        value: fmtNum(stats.activeUsers),    color: "text-green-400"  },
        { label: "Suspended",     value: fmtNum(stats.suspendedUsers), color: "text-yellow-400" },
        { label: "Banned",        value: fmtNum(stats.bannedUsers),    color: "text-red-400"    },
      ],
      chart: {
        type: "pie",
        data: [
          { name: "Free",  value: tiers.free, color: "#64748b" },
          { name: "Plus",  value: tiers.plus, color: "#6366f1" },
          { name: "Pro",   value: tiers.pro,  color: "#a855f7" },
        ],
      },
    },
    active: {
      title:    `Active Users — ${fmtNum(stats.activeUsers)}`,
      subtitle: "Users with active account status",
      metrics: [
        { label: "Active",    value: fmtNum(stats.activeUsers),                                color: "text-green-400"  },
        { label: "Suspended", value: fmtNum(stats.suspendedUsers),                             color: "text-yellow-400" },
        { label: "Banned",    value: fmtNum(stats.bannedUsers),                                color: "text-red-400"    },
        { label: "Total",     value: fmtNum(stats.totalUsers),                                 color: "text-gray-300"  },
        { label: "Active %",  value: ((stats.activeUsers / Math.max(stats.totalUsers, 1)) * 100).toFixed(1) + "%", color: "text-cyan-400" },
      ],
    },
    content: {
      title:    `Total Posts — ${fmtNum(stats.totalPosts)}`,
      subtitle: "All posts and reels in the system",
      metrics: [
        { label: "Total Posts", value: fmtNum(stats.totalPosts),  color: "text-cyan-400"   },
        { label: "Today",       value: fmtNum(stats.postsToday),  color: "text-green-400"  },
        { label: "Older",       value: fmtNum(stats.totalPosts - stats.postsToday), color: "text-gray-400" },
      ],
      chart: {
        type: "bar",
        data: [
          { name: "Today",  value: stats.postsToday },
          { name: "All",    value: stats.totalPosts },
        ],
      },
    },
    notifs: {
      title:    `Notifications — ${fmtNum(stats.totalNotifs)}`,
      subtitle: "Total notifications sent across the platform",
      metrics: [
        { label: "Total", value: fmtNum(stats.totalNotifs), color: "text-yellow-400" },
      ],
    },
  } : {};

  const drill = DRILLDOWN[drilldown ?? ""];

  return (
    <div className="space-y-6 max-w-7xl">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Demo-data confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setConfirmAction(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${confirmAction === "load" ? "bg-cyan-500/10" : "bg-red-500/10"}`}>
                  {confirmAction === "load"
                    ? <Database size={16} className="text-cyan-400" />
                    : <AlertTriangle size={16} className="text-red-400" />}
                </div>
                <h3 className="text-white font-bold text-lg">
                  {confirmAction === "load" ? "Load demo data?" : "Clear demo data?"}
                </h3>
              </div>
              <button onClick={() => setConfirmAction(null)} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {confirmAction === "load" ? (
                <p className="text-gray-400 text-sm leading-relaxed">
                  This fills the platform with rich test data — demo users, posts, comments,
                  communities, marketplace listings, KliqStream titles, wallets and more.
                  Existing demo data is replaced; real accounts are untouched. Safe to run more than once.
                </p>
              ) : (
                <>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    This permanently deletes <span className="text-white font-semibold">all demo/test data</span> —
                    every demo account and everything attached to it (posts, comments, products,
                    communities, wallets, messages...).
                  </p>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-start gap-2.5">
                    <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-300 text-xs leading-relaxed">
                      This cannot be undone. Admin accounts and real users are never removed,
                      but all seeded demo content will be gone.
                    </p>
                  </div>
                </>
              )}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => runDemoAction(confirmAction)}
                  className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition ${
                    confirmAction === "load"
                      ? "bg-cyan-600 hover:bg-cyan-500"
                      : "bg-red-600 hover:bg-red-500"
                  }`}
                >
                  {confirmAction === "load" ? "Load Demo Data" : "Yes, Clear Everything"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drill-down modal */}
      {drilldown && drill && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setDrilldown(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div>
                <h3 className="text-white font-bold text-lg">{drill.title}</h3>
                <p className="text-gray-500 text-xs mt-0.5">{drill.subtitle}</p>
              </div>
              <button onClick={() => setDrilldown(null)} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {drill.chart && (
                <div className="bg-gray-800 rounded-xl p-4">
                  {drill.chart.type === "pie" ? (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width={130} height={130}>
                        <PieChart>
                          <Pie data={drill.chart.data} dataKey="value" innerRadius={35} outerRadius={60} strokeWidth={0}>
                            {drill.chart.data.map(e => <Cell key={e.name} fill={e.color ?? "#6366f1"} />)}
                          </Pie>
                          <Tooltip contentStyle={TOOLTIP} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 flex-1">
                        {drill.chart.data.map(d => (
                          <div key={d.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                              <span className="text-gray-300 text-xs">{d.name}</span>
                            </div>
                            <span className="text-gray-400 text-xs font-semibold">{d.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={drill.chart.data}>
                        <XAxis dataKey="name" tick={TICK} axisLine={false} tickLine={false} />
                        <YAxis tick={TICK} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={TOOLTIP} />
                        <Bar dataKey="value" fill="#6366f1" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {drill.metrics.map(m => (
                  <div key={m.label} className="bg-gray-800 rounded-xl px-4 py-3">
                    <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Platform overview · Live data</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfirmAction("load")}
            disabled={demoBusy !== null}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            {demoBusy === "load" ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
            {demoBusy === "load" ? "Loading..." : "Load Data"}
          </button>
          <button
            onClick={() => setConfirmAction("clear")}
            disabled={demoBusy !== null}
            className="flex items-center gap-2 bg-gray-800 hover:bg-red-900/40 border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            {demoBusy === "clear" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {demoBusy === "clear" ? "Clearing..." : "Clear Data"}
          </button>
          <button
            onClick={() => { loadData(); showToast("Refreshing data..."); }}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-cyan-400" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => setDrilldown(s.key)}
                  className={`${s.bg} border ${s.border} rounded-2xl p-5 text-left hover:brightness-110 transition group cursor-pointer`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <Icon size={20} className={s.color} />
                  </div>
                  <p className="text-white text-2xl font-bold">{s.value}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-gray-500 text-xs">{s.label}</p>
                    <ArrowUpRight size={12} className="text-gray-600 group-hover:text-gray-400 transition" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User growth chart */}
            <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">New Users — Past 7 Days</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <XAxis dataKey="day" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP} />
                  <Line type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* System status — live from /admin/status */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">System Status</h3>
              <div className="space-y-3">
                {(system ? [
                  { name: "API Server",    ok: system.api.ok,       status: system.api.ok ? "Operational" : "Down" },
                  { name: "Database",      ok: system.database.ok,  status: system.database.ok ? `Operational · ${system.database.latencyMs}ms` : "Down" },
                  { name: "WebSocket Hub", ok: system.websocket.ok, status: `${system.websocket.connections} connected` },
                  { name: "Media Storage", ok: system.storage.ok,   status: system.storage.ok ? "Operational" : "Down" },
                ] : [
                  { name: "API Server", ok: false, status: "Unreachable" },
                ]).map(s => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${s.ok ? "bg-green-400" : "bg-red-400"}`} />
                      <span className="text-gray-300 text-sm">{s.name}</span>
                    </div>
                    <span className={`text-xs font-medium ${s.ok ? "text-green-400" : "text-red-400"}`}>{s.status}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate("/status")}
                className="w-full mt-4 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 text-xs py-2 rounded-lg transition font-medium"
              >
                Full Status Page
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent activity */}
            <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {activity.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-8">No recent activity</p>
                ) : activity.map((a, i) => {
                  const ICONS = [Activity, AlertTriangle, TrendingUp, CheckCircle, Clock, DollarSign];
                  const COLORS = ["text-cyan-400", "text-red-400", "text-green-400", "text-purple-400", "text-gray-400", "text-yellow-400"];
                  const Icon = ICONS[i % ICONS.length];
                  return (
                    <div key={a.id} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                      <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Icon size={14} className={COLORS[i % COLORS.length]} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-300 text-sm">
                          <span className="font-medium">{a.actor?.displayName ?? "Admin"}</span>
                          {" "}{actionLabel(a.action)}
                          {a.target ? <span className="text-gray-500"> · {a.target}</span> : null}
                        </p>
                      </div>
                      <span className="text-gray-600 text-xs flex-shrink-0">{timeAgo(a.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-white font-semibold">Quick Open in App</h3>
                <ExternalLink size={14} className="text-gray-500" />
              </div>
              <div className="space-y-2">
                {QUICK_LINKS.map(l => (
                  <a
                    key={l.path}
                    href={`${KLIQ_APP_URL}${l.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition group"
                  >
                    <div>
                      <p className="text-white text-sm font-medium group-hover:text-cyan-300 transition">{l.label}</p>
                      <p className="text-gray-500 text-xs">{l.desc}</p>
                    </div>
                    <ArrowUpRight size={14} className="text-gray-600 group-hover:text-cyan-400 transition" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
