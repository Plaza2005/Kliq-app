import { useState, useEffect } from "react";
import { Globe, Youtube, Tv, Store, FileText, Eye, Heart, MessageCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { adminApi, resolveMediaUrl } from "../api/client";

const TOOLTIP_STYLE = { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#fff", fontSize: 12 };
const PIE_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981"];

interface AdminOverview {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalPosts: number;
  byType: { Social: number; KliqTube: number; Stream: number; Marketplace: number };
  topCreators: { username: string; displayName: string; avatarUrl: string; followerCount: number; postCount: number; tier: string }[];
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export function AnalyticsContentHealth() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get<AdminOverview>("/analytics/admin/overview")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pieData = data ? [
    { name: "Social",      value: data.byType.Social      },
    { name: "KliqTube",   value: data.byType.KliqTube    },
    { name: "Stream",      value: data.byType.Stream      },
    { name: "Marketplace", value: data.byType.Marketplace },
  ] : [];

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Health</h1>
          <p className="text-gray-500 text-sm mt-0.5">Content distribution, volume and creator activity</p>
        </div>
        <button onClick={() => navigate("/analytics")} className="text-gray-400 hover:text-white text-sm transition">← Analytics</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-500">Failed to load content data.</div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Posts",    value: fmtNum(data.totalPosts),    icon: FileText,      color: "text-indigo-400" },
              { label: "Total Views",    value: fmtNum(data.totalViews),    icon: Eye,           color: "text-blue-400"   },
              { label: "Total Likes",    value: fmtNum(data.totalLikes),    icon: Heart,         color: "text-pink-400"   },
              { label: "Total Comments", value: fmtNum(data.totalComments), icon: MessageCircle, color: "text-purple-400" },
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

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Social",      icon: Globe,    color: "text-blue-400",   count: data.byType.Social      },
              { label: "KliqTube",   icon: Youtube,  color: "text-red-400",    count: data.byType.KliqTube    },
              { label: "Stream",      icon: Tv,       color: "text-pink-400",   count: data.byType.Stream      },
              { label: "Marketplace", icon: Store,    color: "text-yellow-400", count: data.byType.Marketplace },
            ].map(p => (
              <div key={p.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <p.icon size={14} className={p.color} />
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{p.label}</p>
                </div>
                <p className={`text-3xl font-black ${p.color}`}>{p.count.toLocaleString()}</p>
                <p className="text-gray-600 text-xs mt-1">posts</p>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">Content Distribution by Platform</h3>
            <div className="flex items-center gap-8 flex-wrap">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {pieData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-gray-300 text-sm">{entry.name}</span>
                    <span className="text-gray-500 text-xs ml-auto pl-4">
                      {entry.value.toLocaleString()} ({data.totalPosts > 0 ? Math.round(entry.value / data.totalPosts * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {data.topCreators.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Most Active Creators</h3>
              <div className="space-y-3">
                {data.topCreators.map((c, i) => (
                  <div key={c.username} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                    <span className="text-gray-500 text-xs font-bold w-5 text-center">#{i + 1}</span>
                    <img src={resolveMediaUrl(c.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.username}`} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold">{c.displayName}</p>
                      <p className="text-gray-500 text-xs">@{c.username}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-white font-semibold">{c.postCount} posts</p>
                      <p className="text-gray-500">{fmtNum(c.followerCount)} followers</p>
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
