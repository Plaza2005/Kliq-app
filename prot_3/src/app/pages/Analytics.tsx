import { useState, useEffect } from "react";
import { Eye, Heart, MessageCircle, Users, Lock, BarChart2, FileText } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router";
import { api } from "../api/client";

const TIME_RANGES = ["24h", "7d", "30d", "90d"];

interface AnalyticsData {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  byDay: { name: string; views: number; likes: number; posts: number }[];
}

function EmptyChartPlaceholder({ label }: { label: string }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 mb-6">
      <h3 className="text-white font-bold mb-4">{label}</h3>
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <BarChart2 size={28} className="text-gray-700 mb-2" />
        <p className="text-gray-600 text-sm">No data yet — keep posting to see trends.</p>
      </div>
    </div>
  );
}

export function Analytics() {
  const [timeRange, setTimeRange] = useState("7d");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const { user } = useAuth();
  const { tier } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    api.get<AnalyticsData>("/analytics/me")
      .then(data => setAnalytics(data))
      .catch(() => {});
  }, []);

  const stats = [
    { label: "Followers",   value: (user?.followerCount ?? 0).toLocaleString(), icon: Users },
    { label: "Posts",       value: (user?.postCount ?? 0).toLocaleString(),      icon: FileText },
    { label: "Total Views", value: analytics ? analytics.totalViews.toLocaleString() : "—", icon: Eye },
    { label: "Total Likes", value: analytics ? analytics.totalLikes.toLocaleString() : "—", icon: Heart },
  ];

  const byDay = analytics?.byDay ?? [];

  const tooltipStyle = {
    contentStyle: { backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "8px" },
    itemStyle: { color: "#fff" },
  };

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${timeRange === r ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" : "text-gray-500 hover:text-gray-300"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Real stats */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <Icon size={18} className="text-gray-500" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-gray-500 text-xs">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Posts per Day (proxy for Follower Growth) */}
        {byDay.length > 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 mb-6">
            <h3 className="text-white font-bold mb-1">Posts per Day</h3>
            <p className="text-gray-500 text-xs mb-4">Your posting activity over time</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Line type="monotone" dataKey="posts" name="Posts" stroke="#a855f7" strokeWidth={2} dot={{ fill: "#a855f7", strokeWidth: 2, r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <EmptyChartPlaceholder label="Posts per Day" />
        )}

        {/* Top Performing Posts — views BarChart */}
        {byDay.length > 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 mb-6">
            <h3 className="text-white font-bold mb-1">Top Performing Posts</h3>
            <p className="text-gray-500 text-xs mb-4">Views by day</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="views" name="Views" fill="#9333ea" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <EmptyChartPlaceholder label="Top Performing Posts" />
        )}

        {/* Audience Demographics — no data available */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 mb-6">
          <h3 className="text-white font-bold mb-4">Audience Demographics</h3>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Users size={28} className="text-gray-700 mb-2" />
            <p className="text-gray-500 text-sm font-medium mb-1">No data yet</p>
            <p className="text-gray-600 text-xs">Audience insights will appear here as you grow your following.</p>
          </div>
        </div>

        {/* Peak Activity — likes BarChart */}
        {byDay.length > 0 ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 mb-6">
            <h3 className="text-white font-bold mb-1">Peak Activity</h3>
            <p className="text-gray-500 text-xs mb-4">Likes received by day</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="likes" name="Likes" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <EmptyChartPlaceholder label="Peak Activity" />
        )}

        {/* Tier gate hint for non-tier-3 */}
        {tier < 3 && (
          <div className="bg-gray-900/50 border border-dashed border-gray-700 rounded-xl p-6 text-center">
            <Lock size={28} className="text-gray-600 mx-auto mb-3" />
            <p className="text-white font-bold mb-1">Advanced Analytics</p>
            <p className="text-gray-500 text-sm mb-4">Revenue breakdown, traffic sources, and customer insights — available on Tier 3 Pro.</p>
            <button
              onClick={() => navigate("/settings")}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition"
            >
              Upgrade to Pro
            </button>
          </div>
        )}

        {/* Notice */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 mb-6 text-center mt-6">
          <MessageCircle size={24} className="text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400 text-sm font-medium mb-1">More analytics coming soon</p>
          <p className="text-gray-600 text-xs">Engagement rates, audience insights, and traffic sources will populate here as you post more content.</p>
        </div>
      </div>
    </div>
  );
}
