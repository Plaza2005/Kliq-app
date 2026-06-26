import { useState } from "react";
import { Menu, Search, BarChart3, TrendingUp, DollarSign, Users, Eye, Heart } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { ActionPanel } from "../components/ActionPanel";
import { useNavigate } from "react-router";

const stats = [
  { label: "Total Views", value: "124.5K", icon: Eye, change: "+12%" },
  { label: "Engagement", value: "89.2%", icon: Heart, change: "+5%" },
  { label: "Followers", value: "12.3K", icon: Users, change: "+18%" },
  { label: "Revenue", value: "$2,450", icon: DollarSign, change: "+23%" },
];

const posts = Array(6).fill(null).map((_, i) => ({
  id: i,
  views: `${Math.floor(Math.random() * 500)}K`,
  engagement: `${Math.floor(Math.random() * 20 + 60)}%`,
}));

export function Business() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black pb-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md z-40 border-b border-gray-800">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <button onClick={() => setIsPanelOpen(true)}>
            <Menu className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl text-white">Business Dashboard</h1>
          <button onClick={() => navigate("/search")}>
            <Search className="w-6 h-6 text-white" />
          </button>
        </div>
      </header>

      <div className="pt-14">
        {/* Business Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <h2 className="text-2xl mb-2">Kliq Business</h2>
          <p className="text-white/90">Grow your brand and reach more customers</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 p-4">
          <button
            onClick={() => navigate("/analytics")}
            className="p-4 bg-gradient-to-br from-blue-900/30 to-blue-700/30 rounded-lg hover:from-blue-800/40 hover:to-blue-600/40 transition"
          >
            <BarChart3 className="w-8 h-8 text-blue-400 mb-2" />
            <div className="text-white text-sm">Analytics</div>
          </button>
          <button
            onClick={() => navigate("/amplify")}
            className="p-4 bg-gradient-to-br from-purple-900/30 to-purple-700/30 rounded-lg hover:from-purple-800/40 hover:to-purple-600/40 transition"
          >
            <TrendingUp className="w-8 h-8 text-purple-400 mb-2" />
            <div className="text-white text-sm">Amplify</div>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="p-4 space-y-4">
          <h3 className="text-white text-lg">Performance Overview</h3>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-5 h-5 text-gray-400" />
                    <span className="text-green-400 text-xs">{stat.change}</span>
                  </div>
                  <div className="text-2xl text-white mb-1">{stat.value}</div>
                  <div className="text-gray-400 text-xs">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Business Posts */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white text-lg">Business Posts</h3>
            <button
              onClick={() => navigate("/create")}
              className="text-purple-400 text-sm"
            >
              Create Post
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {posts.map((post) => (
              <div
                key={post.id}
                className="aspect-square bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-lg relative group cursor-pointer"
              >
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition rounded-lg flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="text-white text-sm">{post.views}</div>
                  <div className="text-gray-300 text-xs">{post.engagement}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="p-4 space-y-3">
          <h3 className="text-white text-lg">Insights</h3>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Best posting time</span>
              <span className="text-white">6-8 PM</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Top audience</span>
              <span className="text-white">18-24 years</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Avg. watch time</span>
              <span className="text-white">2m 34s</span>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
      <ActionPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
    </div>
  );
}
