import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Eye, Heart, MessageCircle, Share2, Users, FileText, TrendingUp, Loader2, RefreshCw, Clock, ChevronDown, ChevronUp } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { adminApi, resolveAvatarUrl, resolveMediaUrl } from "../api/client";

interface UserAnalytics {
  user: {
    id: string; username: string; email: string; displayName: string;
    avatarUrl: string; tier: string; status: string; isVerified: boolean;
    followerCount: number; followingCount: number; postCount: number;
    bio: string; createdAt: string; phone: string | null;
  };
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalPosts: number;
  byDay: { name: string; views: number; likes: number; posts: number }[];
  topPosts: { id: string; body: string; postType: string; mediaUrl: string | null; viewCount: number; likeCount: number; commentCount: number }[];
  byType: { Social: number; KliqTube: number; Stream: number; Marketplace: number };
}

const TYPE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b"];

interface SessionEntry {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationS: number | null;
  platform: string;
}
interface UserSessionHistory {
  avgDurationS: number;
  totalSessions: number;
  sessions: SessionEntry[];
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

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

const TIER_COLOR: Record<string, string> = {
  free: "text-gray-400 bg-gray-800",
  plus: "text-blue-400 bg-blue-500/10",
  pro:  "text-purple-400 bg-purple-500/10",
};
const STATUS_COLOR: Record<string, string> = {
  active:    "text-green-400 bg-green-500/10",
  suspended: "text-yellow-400 bg-yellow-500/10",
  banned:    "text-red-400 bg-red-500/10",
};

export function UserAnalytics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData]     = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [sessionHistory, setSessionHistory] = useState<UserSessionHistory | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      const res = await adminApi.get<UserAnalytics>(`/admin/users/${id}/analytics`);
      setData(res);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  // Auto-refresh every 30 seconds for live stats
  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [id]);

  const toggleSessions = async () => {
    if (!sessionOpen && !sessionHistory && id) {
      setSessionLoading(true);
      try {
        const res = await adminApi.get<UserSessionHistory>(`/admin/users/${id}/sessions?limit=10`);
        setSessionHistory(res);
      } catch (err) {
        console.error(err);
      } finally {
        setSessionLoading(false);
      }
    }
    setSessionOpen(prev => !prev);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">User not found.</p>
        <button onClick={() => navigate("/users")} className="text-indigo-400 hover:text-indigo-300 text-sm">
          ? Back to Users
        </button>
      </div>
    );
  }

  const { user, byDay, topPosts, byType, totalViews, totalLikes, totalComments, totalShares, totalPosts } = data;

  const pieData = Object.entries(byType)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const engagementRate = totalViews > 0
    ? ((totalLikes + totalComments) / totalViews * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6 max-w-7xl pb-8">
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/users")}
          className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">User Analytics</h1>
          <p className="text-gray-500 text-xs mt-0.5">
            Last updated {lastRefresh.toLocaleTimeString()} · auto-refreshes every 30s
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); load(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* User profile card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-start gap-5">
        <img src={resolveAvatarUrl(user.avatarUrl)} alt={user.username} className="w-16 h-16 rounded-full bg-gray-700 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-white font-bold text-lg">@{user.username}</h2>
            {user.isVerified && <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">VERIFIED</span>}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[user.status] ?? "text-gray-400 bg-gray-800"}`}>{user.status}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${TIER_COLOR[user.tier] ?? "text-gray-400 bg-gray-800"}`}>{user.tier}</span>
          </div>
          <p className="text-gray-300 text-sm font-medium">{user.displayName}</p>
          {user.bio && <p className="text-gray-500 text-xs mt-1 line-clamp-2">{user.bio}</p>}
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
            <span>{user.email}</span>
            {user.phone && <span>{user.phone}</span>}
            <span>Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
          </div>
        </div>
        <div className="flex gap-6 text-center flex-shrink-0">
          <div>
            <p className="text-white font-bold text-lg">{fmtNum(user.followerCount)}</p>
            <p className="text-gray-500 text-xs">Followers</p>
          </div>
          <div>
            <p className="text-white font-bold text-lg">{fmtNum(user.followingCount)}</p>
            <p className="text-gray-500 text-xs">Following</p>
          </div>
          <div>
            <p className="text-white font-bold text-lg">{totalPosts}</p>
            <p className="text-gray-500 text-xs">Posts</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={<Eye size={14} />}            label="Total Views"    value={fmtNum(totalViews)}    sub="across all posts" />
        <StatCard icon={<Heart size={14} />}          label="Total Likes"    value={fmtNum(totalLikes)}    sub="received" />
        <StatCard icon={<MessageCircle size={14} />}  label="Comments"       value={fmtNum(totalComments)} sub="received" />
        <StatCard icon={<Share2 size={14} />}         label="Shares"         value={fmtNum(totalShares)}   sub="received" />
        <StatCard icon={<TrendingUp size={14} />}     label="Engagement"     value={`${engagementRate}%`}  sub="(likes+comments)/views" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 7-day views + likes */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4">7-Day Activity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={byDay} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="uvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="likGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#fff", fontSize: 12 }} />
              <Area type="monotone" dataKey="views" stroke="#6366f1" fill="url(#uvGrad)" strokeWidth={2} dot={false} name="Views" />
              <Area type="monotone" dataKey="likes" stroke="#ec4899" fill="url(#likGrad)" strokeWidth={2} dot={false} name="Likes" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Content by type */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4">Content Breakdown</h3>
          {totalPosts === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-gray-600 text-sm">No posts yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Posts per day */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Posts Per Day (last 7 days)</h3>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={byDay} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#fff", fontSize: 12 }} />
            <Bar dataKey="posts" fill="#6366f1" radius={[4, 4, 0, 0]} name="Posts" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Session History */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <button
          onClick={toggleSessions}
          className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-800 hover:bg-gray-800/40 transition"
        >
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-blue-400" />
            <h3 className="text-white font-semibold text-sm">Session History</h3>
          </div>
          {sessionLoading
            ? <Loader2 size={14} className="animate-spin text-indigo-400" />
            : sessionOpen ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />
          }
        </button>

        {sessionOpen && sessionHistory && (
          <div className="p-5 space-y-4">
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-0.5">Avg Session</p>
                <p className="text-white font-bold">{fmtDuration(sessionHistory.avgDurationS)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-0.5">Total Sessions</p>
                <p className="text-white font-bold">{sessionHistory.totalSessions.toLocaleString()}</p>
              </div>
            </div>

            {sessionHistory.sessions.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">No sessions recorded yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {["Date", "Duration", "Platform", "Ended"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 first:pl-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {sessionHistory.sessions.map(s => (
                    <tr key={s.id} className="hover:bg-gray-800/30 transition">
                      <td className="py-2.5 text-gray-300 text-xs">
                        {new Date(s.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {" "}
                        <span className="text-gray-600">{new Date(s.startedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                      </td>
                      <td className="py-2.5 text-gray-300 text-xs">
                        {s.durationS !== null ? fmtDuration(s.durationS) : <span className="text-green-400 text-[10px] font-bold">ACTIVE</span>}
                      </td>
                      <td className="py-2.5">
                        <span className="text-[10px] font-semibold uppercase bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{s.platform}</span>
                      </td>
                      <td className="py-2.5 text-gray-500 text-xs">
                        {s.endedAt
                          ? new Date(s.endedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                          : <span className="text-green-400 text-[10px]">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {sessionOpen && !sessionHistory && !sessionLoading && (
          <div className="py-8 text-center text-gray-600 text-sm">Failed to load sessions.</div>
        )}
      </div>

      {/* Top posts */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold text-sm">Top Posts by Views</h3>
        </div>
        {topPosts.length === 0 ? (
          <div className="py-12 text-center text-gray-600 text-sm">No posts yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {["Content", "Type", "Views", "Likes", "Comments"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {topPosts.map((p, i) => (
                <tr key={p.id} className="hover:bg-gray-800/40 transition">
                  <td className="px-4 py-3 pl-5">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 text-xs font-mono w-4">#{i + 1}</span>
                      <p className="text-gray-300 text-sm line-clamp-1 max-w-xs">{p.body || "(media post)"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-400 bg-gray-800 px-2 py-0.5 rounded capitalize">{p.postType}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{fmtNum(p.viewCount)}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{fmtNum(p.likeCount)}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{fmtNum(p.commentCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
