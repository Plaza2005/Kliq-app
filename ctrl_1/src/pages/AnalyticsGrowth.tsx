import { useState, useEffect } from "react";
import { Users, TrendingUp, FileText, Activity, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { adminApi } from "../api/client";

const TOOLTIP_STYLE = { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#fff", fontSize: 12 };
const TICK_STYLE    = { fill: "#64748b", fontSize: 11 };

interface Stats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  suspendedUsers: number;
  totalPosts: number;
  postsToday: number;
}
interface Tiers { free: number; plus: number; pro: number }
interface ChartPoint { day: string; users: number }

export function AnalyticsGrowth() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tiers, setTiers] = useState<Tiers | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get<{ stats: Stats; tiers: Tiers; userChart: ChartPoint[] }>("/admin/stats")
      .then(d => { setStats(d.stats); setTiers(d.tiers); setChart(d.userChart); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Growth Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">User signups, retention and tier distribution</p>
        </div>
        <button onClick={() => navigate("/analytics")} className="text-gray-400 hover:text-white text-sm transition">← Analytics</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-cyan-400" /></div>
      ) : !stats ? (
        <div className="text-center py-20 text-gray-500">Failed to load growth data.</div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Users",  value: stats.totalUsers.toLocaleString(),  icon: Users,      color: "text-cyan-400" },
              { label: "Active Users", value: stats.activeUsers.toLocaleString(), icon: Activity,   color: "text-green-400"  },
              { label: "Total Posts",  value: stats.totalPosts.toLocaleString(),  icon: FileText,   color: "text-purple-400" },
              { label: "Posts Today",  value: stats.postsToday.toLocaleString(),  icon: TrendingUp, color: "text-yellow-400" },
            ].map(c => (
              <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <c.icon size={16} className={c.color} />
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{c.label}</p>
                </div>
                <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-1">New Signups — Last 7 Days</h3>
            <p className="text-gray-500 text-xs mb-4">Daily new user registrations</p>
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

          {tiers && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Tier Distribution</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[
                  { name: "Free",  count: tiers.free  },
                  { name: "Plus",  count: tiers.plus  },
                  { name: "Pro",   count: tiers.pro   },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Users">
                    <Cell fill="#6b7280" />
                    <Cell fill="#3b82f6" />
                    <Cell fill="#a855f7" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-6 mt-3 justify-center">
                {[
                  { label: "Free",  count: tiers.free,  color: "bg-gray-500"   },
                  { label: "Plus",  count: tiers.plus,  color: "bg-cyan-500"   },
                  { label: "Pro",   count: tiers.pro,   color: "bg-purple-500" },
                ].map(t => (
                  <div key={t.label} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                    <span className="text-gray-400 text-xs">{t.label}: <strong className="text-white">{t.count.toLocaleString()}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">Account Status</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Active",    value: stats.activeUsers,              color: "text-green-400 bg-green-500/10"  },
                { label: "Suspended", value: stats.suspendedUsers,           color: "text-yellow-400 bg-yellow-500/10" },
                { label: "Banned",    value: stats.bannedUsers,              color: "text-red-400 bg-red-500/10"      },
              ].map(s => (
                <div key={s.label} className={`rounded-xl p-4 ${s.color.split(" ")[1]}`}>
                  <p className={`text-2xl font-black ${s.color.split(" ")[0]}`}>{s.value.toLocaleString()}</p>
                  <p className="text-gray-400 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
