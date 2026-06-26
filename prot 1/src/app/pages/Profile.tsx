import { useState } from "react";
import { Menu, UserPlus, Grid, Repeat, Settings } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { ActionPanel } from "../components/ActionPanel";
import { useNavigate } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import logo from "../../imports/Kliq_logo.jpeg";

export function Profile() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "reshares">("posts");
  const navigate = useNavigate();

  const stats = [
    { label: "Following", value: "247" },
    { label: "Followers", value: "12.5K" },
    { label: "Likes", value: "89.3K" },
  ];

  const posts = Array(12).fill(null).map((_, i) => ({
    id: i,
    views: `${Math.floor(Math.random() * 500)}K`,
  }));

  return (
    <div className="min-h-screen bg-black pb-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md z-40 border-b border-gray-800">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <button onClick={() => setIsPanelOpen(true)}>
            <Menu className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl text-white">Profile</h1>
          <button onClick={() => navigate("/settings")}>
            <Settings className="w-6 h-6 text-white" />
          </button>
        </div>
      </header>

      <div className="pt-14">
        {/* Profile Info */}
        <div className="p-6 space-y-4">
          {/* Avatar & Username */}
          <div className="flex flex-col items-center space-y-3">
            <ImageWithFallback
              src={logo}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-2 border-purple-500"
            />
            <div className="text-center">
              <h2 className="text-white text-xl">@yourusername</h2>
              <p className="text-gray-400 text-sm mt-1">
                Content Creator • Digital Artist
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-around py-4 border-y border-gray-800">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-white text-xl">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Bio */}
          <p className="text-white text-center text-sm">
            ✨ Creating amazing content daily<br />
            📧 contact@kliq.com<br />
            🔗 linktr.ee/yourname
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/settings")}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition"
            >
              Edit Profile
            </button>
            <button className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition">
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 py-4 flex items-center justify-center gap-2 ${
              activeTab === "posts"
                ? "text-white border-b-2 border-white"
                : "text-gray-400"
            }`}
          >
            <Grid className="w-5 h-5" />
            Posts
          </button>
          <button
            onClick={() => setActiveTab("reshares")}
            className={`flex-1 py-4 flex items-center justify-center gap-2 ${
              activeTab === "reshares"
                ? "text-white border-b-2 border-white"
                : "text-gray-400"
            }`}
          >
            <Repeat className="w-5 h-5" />
            Reshares
          </button>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-3 gap-1 p-1">
          {posts.map((post) => (
            <div
              key={post.id}
              className="aspect-[9/16] bg-gradient-to-br from-purple-900/30 to-pink-900/30 relative group cursor-pointer"
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                <span className="text-white opacity-0 group-hover:opacity-100 transition">
                  {post.views} views
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
      <ActionPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
    </div>
  );
}
