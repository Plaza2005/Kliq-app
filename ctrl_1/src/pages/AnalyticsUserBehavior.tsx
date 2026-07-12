import { useState, useEffect } from "react";
import { Clock, Activity, Users, Zap, Loader2, BarChart2 } from "lucide-react";
import { useNavigate } from "react-router";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { adminApi } from "../api/client";

const TOOLTIP_STYLE = { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#fff", fontSize: 12 };
const TICK_STYLE    = { fill: "#64748b", fontSize: 11 };

interface SessionStats {
  avgDurationS: number;
  totalSessions: number;
  activeSessions: number;
  dau7: number;
  dailyAvg: { date: string; avgDurationS: number; sessions: number }[];
}

function fmtDuration(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return `${m}m ${r}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function AnalyticsUserBehavior() {
  const navigate = useNavigate();
  const [data, setData] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get<SessionStats>("/admin/analytics/sessions")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Behavior</h1>
          <p className="text-gray-500 text-sm mt-0.5">Session and engagement metrics</p>
        </div>
        <button onClick={() => navigate("/analytics")} className="text-gray-400 hover:text-white text-sm transition">← Analytics</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-cyan-400" /></div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-500">Failed to load session data.</div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Avg Session", value: fmtDuration(data.avgDurationS), icon: Clock,    color: "text-cyan-400"   },
              { label: "Total Sessions", value: data.totalSessions.toLocaleString(), icon: Activity, color: "text-cyan-400" },
              { label: "Active Now",    value: String(data.activeSessions),           icon: Zap,      color: "text-green-400"  },
              { label: "7-Day Users",  value: String(data.dau7),                     icon: Users,    color: "text-purple-400" },
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
            <h3 className="text-white font-semibold mb-1">Avg Session Duration — Last 30 Days</h3>
            <p className="text-gray-500 text-xs mb-4">Daily average time users spend in the app</p>
            {data.dailyAvg.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[220px] text-gray-600">
                <BarChart2 size={32} className="mb-2 opacity-30" />
                <p className="text-sm">No completed sessions yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.dailyAvg.map(d => ({
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
                    formatter={(_: number, __: string, props: { payload?: { avgDurationS?: number; sessions?: number } }) => {
                      const s = props.payload?.avgDurationS ?? 0;
                      const count = props.payload?.sessions ?? 0;
                      return [`${fmtDuration(s)} avg · ${count} sessions`, "Duration"];
                    }}
                  />
                  <Line type="monotone" dataKey="avgMin" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 3 }} name="Avg duration" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-2">Daily Session Volume — Last 30 Days</h3>
            <p className="text-gray-500 text-xs mb-4">How many sessions were completed each day</p>
            {data.dailyAvg.length === 0 ? (
              <div className="flex items-center justify-center h-[160px] text-gray-600 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data.dailyAvg.map(d => ({
                  date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  sessions: d.sessions,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="sessions" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 3 }} name="Sessions" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
