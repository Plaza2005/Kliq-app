import { useState, useEffect } from "react";
import { Eye, Heart, MessageCircle, FileText, Users, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { adminApi, resolveMediaUrl } from "../api/client";

interface AdminOverview {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalPosts: number;
  topCreators: { username: string; displayName: string; avatarUrl: string; followerCount: number; postCount: number; tier: string }[];
  topPosts: { id: string; body: string; postType: string; viewCount: number; likeCount: number; commentCount: number; author: { username: string; avatarUrl: string } }[];
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export function AnalyticsEngagement() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get<AdminOverview>("/analytics/admin/overview")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const engagementRate = data && data.totalViews > 0
    ? ((data.totalLikes + data.totalComments) / data.totalViews * 100).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Engagement Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">Likes, comments, views and top content</p>
        </div>
        <button onClick={() => navigate("/analytics")} className="text-gray-400 hover:text-white text-sm transition">← Analytics</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-indigo-400" /></div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-500">Failed to load engagement data.</div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Views",     value: fmtNum(data.totalViews),    icon: Eye,           color: "text-blue-400"   },
              { label: "Total Likes",     value: fmtNum(data.totalLikes),    icon: Heart,         color: "text-pink-400"   },
              { label: "Total Comments",  value: fmtNum(data.totalComments), icon: MessageCircle, color: "text-purple-400" },
              { label: "Engagement Rate", value: engagementRate + "%",       icon: FileText,      color: "text-yellow-400" },
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
            <h3 className="text-white font-semibold mb-4">Top Posts by Views</h3>
            <div className="space-y-3">
              {data.topPosts.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-6">No posts yet.</p>
              ) : data.topPosts.map((post, i) => (
                <div key={post.id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                  <span className="text-gray-500 text-xs font-bold w-5 text-center">#{i + 1}</span>
                  <img src={resolveMediaUrl(post.author.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author.username}`} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
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
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">Top Creators by Followers</h3>
            <div className="space-y-3">
              {data.topCreators.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-6">No creators yet.</p>
              ) : data.topCreators.map((c, i) => (
                <div key={c.username} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                  <span className="text-gray-500 text-xs font-bold w-5 text-center">#{i + 1}</span>
                  <img src={resolveMediaUrl(c.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.username}`} alt="" className="w-9 h-9 rounded-full flex-shrink-0" />
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
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
