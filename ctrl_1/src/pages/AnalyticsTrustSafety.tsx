import { useState, useEffect } from "react";
import { Shield, Ban, AlertTriangle, Users, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { adminApi, resolveMediaUrl } from "../api/client";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  suspendedUsers: number;
}

interface Report {
  id: string;
  reason: string;
  createdAt: string;
  post: { author: { username: string; displayName: string; avatarUrl: string } } | null;
  reporter: { username: string; displayName: string } | null;
}

export function AnalyticsTrustSafety() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.get<{ stats: Stats }>("/admin/stats"),
      adminApi.get<Report[]>("/admin/reports"),
    ])
      .then(([d, r]) => { setStats(d.stats); setReports(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const REASON_LABELS: Record<string, string> = {
    spam:        "Spam",
    hate:        "Hate speech",
    nudity:      "Nudity",
    violence:    "Violence",
    harassment:  "Harassment",
    false_info:  "False information",
    other:       "Other",
  };

  const reasonCounts = reports.reduce<Record<string, number>>((acc, r) => {
    const key = r.reason ?? "other";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const sortedReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trust & Safety</h1>
          <p className="text-gray-500 text-sm mt-0.5">Reports, moderation actions and account health</p>
        </div>
        <button onClick={() => navigate("/analytics")} className="text-gray-400 hover:text-white text-sm transition">← Analytics</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Reports",  value: reports.length,              icon: AlertTriangle, color: "text-yellow-400" },
              { label: "Total Users",    value: stats?.totalUsers ?? 0,      icon: Users,         color: "text-indigo-400" },
              { label: "Banned Users",   value: stats?.bannedUsers ?? 0,     icon: Ban,           color: "text-red-400"    },
              { label: "Suspended",      value: stats?.suspendedUsers ?? 0,  icon: Shield,        color: "text-orange-400" },
            ].map(c => (
              <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <c.icon size={16} className={c.color} />
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{c.label}</p>
                </div>
                <p className={`text-2xl font-black ${c.color}`}>{c.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {sortedReasons.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Reports by Reason</h3>
              <div className="space-y-3">
                {sortedReasons.map(([reason, count]) => {
                  const pct = Math.round((count / reports.length) * 100);
                  return (
                    <div key={reason}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-300 text-sm">{REASON_LABELS[reason] ?? reason}</span>
                        <span className="text-gray-500 text-xs">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">Recent Reports</h3>
            {reports.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-6">No reports filed yet.</p>
            ) : (
              <div className="space-y-3">
                {reports.slice(0, 10).map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                    {r.post?.author ? (
                      <img src={resolveMediaUrl(r.post.author.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.post.author.username}`} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">
                        {r.post?.author ? `@${r.post.author.username}` : "Unknown user"}
                        <span className="text-gray-500 text-xs ml-2">reported by @{r.reporter?.username ?? "?"}</span>
                      </p>
                      <span className="inline-block text-xs bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full mt-0.5">
                        {REASON_LABELS[r.reason] ?? r.reason}
                      </span>
                    </div>
                    <span className="text-gray-600 text-xs flex-shrink-0">
                      {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {stats && stats.totalUsers > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Platform Health</h3>
              <div className="space-y-3">
                {[
                  { label: "Active rate",    value: Math.round(stats.activeUsers    / stats.totalUsers * 100), color: "bg-green-500"  },
                  { label: "Suspended rate", value: Math.round(stats.suspendedUsers / stats.totalUsers * 100), color: "bg-yellow-500" },
                  { label: "Ban rate",       value: Math.round(stats.bannedUsers    / stats.totalUsers * 100), color: "bg-red-500"    },
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-300 text-sm">{m.label}</span>
                      <span className="text-gray-400 text-xs">{m.value}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full ${m.color} rounded-full`} style={{ width: `${Math.min(m.value, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
