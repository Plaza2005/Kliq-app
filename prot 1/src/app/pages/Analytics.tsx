import { Menu, TrendingUp, Eye, Heart, MessageCircle, Share2 } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { ActionPanel } from "../components/ActionPanel";
import { useState } from "react";

const stats = [
  { label: "Total Views", value: "124.5K", change: "+12%", icon: Eye },
  { label: "Likes", value: "89.2K", change: "+8%", icon: Heart },
  { label: "Comments", value: "5.3K", change: "+15%", icon: MessageCircle },
  { label: "Shares", value: "12.1K", change: "+20%", icon: Share2 },
];

const topPosts = [
  { id: 1, title: "Amazing sunset...", views: "45.2K", engagement: "18.5%" },
  { id: 2, title: "Daily vlog #23", views: "32.1K", engagement: "15.2%" },
  { id: 3, title: "Tutorial: How to...", views: "28.7K", engagement: "12.8%" },
];

export function Analytics() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [timeRange, setTimeRange] = useState("7d");

  return (
    <div className="min-h-screen bg-black pb-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md z-40 border-b border-gray-800">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <button onClick={() => setIsPanelOpen(true)}>
            <Menu className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl text-white">Analytics</h1>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none"
          >
            <option value="24h">24h</option>
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
          </select>
        </div>
      </header>

      <div className="pt-14">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-3 p-4">
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

        {/* Growth Chart */}
        <div className="p-4 space-y-3">
          <h3 className="text-white text-lg">Follower Growth</h3>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 h-48 flex items-end justify-between gap-2">
            {[40, 65, 45, 80, 60, 90, 75].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end">
                <div
                  className="bg-gradient-to-t from-purple-600 to-pink-600 rounded-t"
                  style={{ height: `${height}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-gray-500 text-xs">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </div>

        {/* Top Performing Posts */}
        <div className="p-4 space-y-3">
          <h3 className="text-white text-lg">Top Performing Posts</h3>
          {topPosts.map((post, index) => (
            <div
              key={post.id}
              className="flex items-center gap-3 p-4 bg-gray-900/30 border border-gray-800 rounded-lg"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full text-white text-sm">
                {index + 1}
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded" />
              <div className="flex-1">
                <div className="text-white text-sm mb-1">{post.title}</div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-400">{post.views} views</span>
                  <span className="text-purple-400">{post.engagement} engagement</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Audience Demographics */}
        <div className="p-4 space-y-3">
          <h3 className="text-white text-lg">Audience Demographics</h3>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-300">Age 18-24</span>
                <span className="text-white">35%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 w-[35%]" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-300">Age 25-34</span>
                <span className="text-white">45%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 w-[45%]" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-300">Age 35+</span>
                <span className="text-white">20%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 w-[20%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Peak Activity Times */}
        <div className="p-4 space-y-3">
          <h3 className="text-white text-lg">Peak Activity Times</h3>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <span className="text-gray-300">Best posting time</span>
              <span className="text-white">6-8 PM</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <span className="text-gray-300">Most active day</span>
              <span className="text-white">Saturday</span>
            </div>
            <div className="flex items-center justify-between py-2">
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
