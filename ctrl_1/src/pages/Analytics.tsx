import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, Users, FileText, Activity, BarChart2, Loader2,
  Eye, Heart, MessageCircle, Globe, Youtube, Tv, Store,
  Clock, Zap,
} from "lucide-react";
import { adminApi, resolveAvatarUrl, resolveMediaUrl } from "../api/client";

const TOOLTIP_STYLE = { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#fff", fontSize: 12 };
const TICK_STYLE    = { fill: "#64748b", fontSize: 11 };

type Tab = "Overview" | "Engagement" | "Content" | "Growth" | "Sessions";
const TABS: Tab[] = ["Overview", "Engagement", "Content", "Growth", "Sessions"];

interface Stats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  suspendedUsers: number;
  totalPosts: number;
  postsToday: number;
  totalNotifs: number;
}
interface ChartPoint { day: string; users: number; cumulative: number }
interface Tiers { free: number; plus: number; pro: number }

interface DailyAvgPoint { date: string; avgDurationS: number; sessions: number }
interface SessionStats {
  avgDurationS: number;
  totalSessions: number;
  activeSessions: number;
  dau7: number;
  dailyAvg: DailyAvgPoint[];
}

function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

interface AdminOverview {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalPosts: number;
  byType: { Social: number; KliqTube: number; Stream: number; Marketplace: number };
  postsChart: { name: string; posts: number }[];
  topCreators: { username: string; displayName: string; avatarUrl: string; followerCount: number; postCount: number; tier: string }[];
  topPosts: { id: string; body: string; postType: string; viewCount: number; likeCount: number; commentCount: number; author: { username: string; displayName: string; avatarUrl: string } }[];
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: typeof Users; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className={color} />
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

const PIE_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981"];

export function Analytics() {
  const [tab, setTab]             = useState<Tab>("Overview");
  const [stats, setStats]         = useState<Stats | null>(null);
  const [chart, setChart]         = useState<ChartPoint[]>([]);
  const [tiers, setTiers]         = useState<Tiers | null>(null);
  const [overview, setOverview]   = useState<AdminOverview | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.get<{ stats: Stats; tiers: Tiers; userChart: ChartPoint[] }>("/admin/stats"),
      adminApi.get<AdminOverview>("/analytics/admin/overview"),
      adminApi.get<SessionStats>("/admin/analytics/sessions"),
    ])
      .then(([d, ov, sess]) => {
        setStats(d.stats);
        setTiers(d.tiers);
        setChart(d.userChart);
        setOverview(ov);
        setSessionStats(sess);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const reload = () => {
    Promise.all([
      adminApi.get<{ stats: Stats; tiers: Tiers; userChart: ChartPoint[] }>("/admin/stats"),
      adminApi.get<AdminOverview>("/analytics/admin/overview"),
      adminApi.get<SessionStats>("/admin/analytics/sessions"),
    ])
      .then(([d, ov, sess]) => { setStats(d.stats); setTiers(d.tiers); setChart(d.userChart); setOverview(ov); setSessionStats(sess); setLoading(false); })
      .catch(() => {});
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const t = setInterval(reload, 30_000);
    return () => clearInterval(t);
  }, []);

  const pieData = overview ? [
    { name: "Social",      value: overview.byType.Social      },
    { name: "KliqTube",   value: overview.byType.KliqTube    },
    { name: "Stream",      value: overview.byType.Stream      },
    { name: "Marketplace", value: overview.byType.Marketplace },
  ] : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 text-sm mt-0.5">Platform-wide metrics and insights</p>
        </div>
        <button onClick={reload} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl text-sm hover:bg-gray-700 transition disabled:opacity-50">
          <Activity size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap mb-6 bg-gray-900/50 p-1 rounded-xl w-fit border border-gray-800">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              tab === t ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* -- OVERVIEW ---------------------------------------------- */}
      {tab === "Overview" && (
        loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        ) : stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Users"    value={stats.totalUsers.toLocaleString()}  icon={Users}      color="text-indigo-400" />
              <StatCard label="Active Users"   value={stats.activeUsers.toLocaleString()} icon={Activity}   color="text-green-400"  />
              <StatCard label="Total Posts"    value={stats.totalPosts.toLocaleString()}  icon={FileText}   color="text-purple-400" />
              <StatCard label="Posts Today"    value={stats.postsToday.toLocaleString()}  icon={TrendingUp} color="text-yellow-400" />
            </div>

            {/* Engagement overview */}
            {overview && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3"><Eye size={14} className="text-blue-400" /><p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Views</p></div>
                  <p className="text-2xl font-black text-blue-400">{fmtNum(overview.totalViews)}</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3"><Heart size={14} className="text-pink-400" /><p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Likes</p></div>
                  <p className="text-2xl font-black text-pink-400">{fmtNum(overview.totalLikes)}</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3"><MessageCircle size={14} className="text-purple-400" /><p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Comments</p></div>
                  <p className="text-2xl font-black text-purple-400">{fmtNum(overview.totalComments)}</p>
                </div>
              </div>
            )}

            {tiers && (
              <div className="grid grid-cols-3 gap-4">
                {([
                  { label: "Free",  key: "free",  value: tiers.free,  color: "text-gray-300" },
                  { label: "Plus",  key: "plus",  value: tiers.plus,  color: "text-blue-400"  },
                  { label: "Pro",   key: "pro",   value: tiers.pro,   color: "text-purple-400"},
                ] as const).map(t => (
                  <div key={t.key} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">{t.label} tier</p>
                    <p className={`text-3xl font-black ${t.color}`}>{t.value.toLocaleString()}</p>
                    <p className="text-gray-600 text-xs mt-1">
                      {stats.totalUsers > 0 ? Math.round((t.value / stats.totalUsers) * 100) : 0}% of users
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-1">New User Signups — Last 7 Days</h3>
              <p className="text-gray-500 text-xs mb-4">Daily new registrations</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day"   tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="users" stroke="#6366f1" fill="url(#signupGrad)" strokeWidth={2} name="New users" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Account Status Breakdown</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={[
                  { name: "Active",    count: stats.activeUsers    },
                  { name: "Banned",    count: stats.bannedUsers    },
                  { name: "Suspended", count: stats.suspendedUsers },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Users" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">Failed to load stats.</div>
        )
      )}

      {/* -- ENGAGEMENT ---------------------------------------------- */}
      {tab === "Engagement" && (
        loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        ) : overview ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2"><Eye size={14} className="text-blue-400" /><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Views</p></div>
                <p className="text-3xl font-black text-blue-400">{fmtNum(overview.totalViews)}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2"><Heart size={14} className="text-pink-400" /><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Likes</p></div>
                <p className="text-3xl font-black text-pink-400">{fmtNum(overview.totalLikes)}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2"><MessageCircle size={14} className="text-purple-400" /><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Comments</p></div>
                <p className="text-3xl font-black text-purple-400">{fmtNum(overview.totalComments)}</p>
              </div>
            </div>

            {/* Top posts */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Top Posts by Views</h3>
              <div className="space-y-3">
                {overview.topPosts.length === 0
                  ? <p className="text-gray-500 text-sm text-center py-4">No posts yet.</p>
                  : overview.topPosts.map((post, i) => (
                    <div key={post.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                      <span className="text-gray-500 text-xs font-bold w-5 text-center">#{i + 1}</span>
                      <img src={resolveAvatarUrl(post.author.avatarUrl)} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{post.body || "(No caption)"}</p>
                        <p className="text-gray-500 text-xs">@{post.author.username} · <span className="capitalize text-gray-400">{post.postType}</span></p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0">
                        <span className="flex items-center gap-1"><Eye size={11} className="text-blue-400" /> {fmtNum(post.viewCount)}</span>
                        <span className="flex items-center gap-1"><Heart size={11} className="text-pink-400" /> {fmtNum(post.likeCount)}</span>
                        <span className="flex items-center gap-1"><MessageCircle size={11} className="text-purple-400" /> {fmtNum(post.commentCount)}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Top creators */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Top Creators by Followers</h3>
              <div className="space-y-3">
                {overview.topCreators.length === 0
                  ? <p className="text-gray-500 text-sm text-center py-4">No creators yet.</p>
                  : overview.topCreators.map((c, i) => (
                    <div key={c.username} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                      <span className="text-gray-500 text-xs font-bold w-5 text-center">#{i + 1}</span>
                      <img src={resolveAvatarUrl(c.avatarUrl)} alt="" className="w-9 h-9 rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{c.displayName}</p>
                        <p className="text-gray-500 text-xs">@{c.username}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-shrink-0">
                        <span className="text-gray-300"><Users size={11} className="inline mr-1 text-indigo-400" />{fmtNum(c.followerCount)}</span>
                        <span className="text-gray-300"><FileText size={11} className="inline mr-1 text-purple-400" />{c.postCount}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${c.tier === "pro" ? "bg-purple-900/50 text-purple-300" : c.tier === "plus" ? "bg-blue-900/50 text-blue-300" : "bg-gray-700 text-gray-400"}`}>{c.tier}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        ) : <div className="text-center py-20 text-gray-500">Failed to load engagement data.</div>
      )}

      {/* -- CONTENT ---------------------------------------------- */}
      {tab === "Content" && (
        loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        ) : overview ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {([
                { label: "Social",      icon: Globe,    color: "text-blue-400",   count: overview.byType.Social      },
                { label: "KliqTube",   icon: Youtube,  color: "text-red-400",    count: overview.byType.KliqTube    },
                { label: "Stream",      icon: Tv,       color: "text-pink-400",   count: overview.byType.Stream      },
                { label: "Marketplace", icon: Store,    color: "text-yellow-400", count: overview.byType.Marketplace },
              ] as const).map(p => (
                <div key={p.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2"><p.icon size={14} className={p.color} /><p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{p.label}</p></div>
                  <p className={`text-3xl font-black ${p.color}`}>{p.count.toLocaleString()}</p>
                  <p className="text-gray-600 text-xs mt-1">posts</p>
                </div>
              ))}
            </div>

            {/* Posts over time */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-1">New Posts — Last 7 Days</h3>
              <p className="text-gray-500 text-xs mb-4">All post types combined</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={overview.postsChart}>
                  <defs>
                    <linearGradient id="postsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="posts" stroke="#a855f7" fill="url(#postsGrad)" strokeWidth={2} name="Posts" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Platform distribution pie */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Content by Platform</h3>
              <div className="flex items-center gap-6 flex-wrap">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2.5">
                  {pieData.map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-300 text-sm">{entry.name}</span>
                      <span className="text-gray-500 text-xs ml-auto pl-4">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : <div className="text-center py-20 text-gray-500">Failed to load content data.</div>
      )}

      {/* -- SESSIONS ---------------------------------------------- */}
      {tab === "Sessions" && (
        loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        ) : sessionStats ? (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-blue-400" />
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Avg Session Duration</p>
                </div>
                <p className="text-2xl font-black text-blue-400">{fmtDuration(sessionStats.avgDurationS)}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={16} className="text-indigo-400" />
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Sessions</p>
                </div>
                <p className="text-2xl font-black text-indigo-400">{sessionStats.totalSessions.toLocaleString()}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={16} className="text-green-400" />
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Active Now</p>
                </div>
                <p className="text-2xl font-black text-green-400">{sessionStats.activeSessions}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={16} className="text-purple-400" />
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">7-Day Unique Users</p>
                </div>
                <p className="text-2xl font-black text-purple-400">{sessionStats.dau7}</p>
              </div>
            </div>

            {/* Line chart: daily avg session duration */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-1">Avg Session Duration — Last 30 Days</h3>
              <p className="text-gray-500 text-xs mb-4">Daily average time spent in app (minutes)</p>
              {sessionStats.dailyAvg.length === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-gray-600 text-sm">No completed sessions yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={sessionStats.dailyAvg.map(d => ({
                    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    avgMin: parseFloat((d.avgDurationS / 60).toFixed(2)),
                    sessions: d.sessions,
                    avgDurationS: d.avgDurationS,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                    <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} unit="m" />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value: number, _name: string, props: { payload?: { avgDurationS?: number; sessions?: number } }) => {
                        const s = props.payload?.avgDurationS ?? 0;
                        const count = props.payload?.sessions ?? 0;
                        return [`${fmtDuration(s)} avg · ${count} sessions`, "Duration"];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgMin"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ fill: "#6366f1", r: 3 }}
                      name="Avg duration"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        ) : <div className="text-center py-20 text-gray-500">Failed to load session data.</div>
      )}

      {/* -- GROWTH ---------------------------------------------- */}
      {tab === "Growth" && (
        loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        ) : (stats && overview) ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Users</p>
                <p className="text-4xl font-black text-indigo-400">{stats.totalUsers.toLocaleString()}</p>
                <p className="text-gray-500 text-xs mt-1">+{stats.totalUsers - stats.bannedUsers - stats.suspendedUsers} active</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Content</p>
                <p className="text-4xl font-black text-purple-400">{overview.totalPosts.toLocaleString()}</p>
                <p className="text-gray-500 text-xs mt-1">+{stats.postsToday} today</p>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-1">User Growth — Last 7 Days</h3>
              <p className="text-gray-500 text-xs mb-4">Daily new signups</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day"   tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 3 }} name="New users" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-1">Post Creation — Last 7 Days</h3>
              <p className="text-gray-500 text-xs mb-4">New posts published per day</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={overview.postsChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="posts" fill="#a855f7" radius={[4, 4, 0, 0]} name="Posts" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : <div className="text-center py-20 text-gray-500">Failed to load growth data.</div>
      )}
    </div>
  );
}
