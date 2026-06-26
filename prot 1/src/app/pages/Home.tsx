import { useState } from "react";
import { Search, Menu, Heart, MessageCircle, Share2, Bookmark, Music } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { ActionPanel } from "../components/ActionPanel";
import { useNavigate } from "react-router";

// Mock video data
const videos = [
  {
    id: 1,
    username: "@creativestudio",
    description: "Amazing new product launch 🚀 #tech #innovation",
    likes: "124.5K",
    comments: "2.3K",
    shares: "8.9K",
    sound: "Original Sound - creativestudio",
  },
  {
    id: 2,
    username: "@fitnessguru",
    description: "Morning workout routine 💪 Follow for more! #fitness #motivation",
    likes: "89.2K",
    comments: "1.5K",
    shares: "4.2K",
    sound: "Workout Beats - DJ Fitness",
  },
  {
    id: 3,
    username: "@foodlover",
    description: "Best pasta recipe ever! 🍝 Try this at home #cooking #foodie",
    likes: "201.3K",
    comments: "5.7K",
    shares: "12.1K",
    sound: "Cooking Vibes - Chef Music",
  },
];

export function Home() {
  const [activeTab, setActiveTab] = useState<"foryou" | "following" | "live">("foryou");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(0);
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const navigate = useNavigate();

  const handleLike = (videoId: number) => {
    setLiked((prev) => ({ ...prev, [videoId]: !prev[videoId] }));
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md z-40 border-b border-gray-800">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <button onClick={() => setIsPanelOpen(true)}>
            <Menu className="w-6 h-6 text-white" />
          </button>

          {/* Tabs */}
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("following")}
              className={`text-sm ${
                activeTab === "following" ? "text-white" : "text-gray-400"
              }`}
            >
              Following
            </button>
            <button
              onClick={() => setActiveTab("foryou")}
              className={`text-sm relative ${
                activeTab === "foryou" ? "text-white" : "text-gray-400"
              }`}
            >
              For You
              {activeTab === "foryou" && (
                <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("live")}
              className={`text-sm flex items-center gap-1 ${
                activeTab === "live" ? "text-white" : "text-gray-400"
              }`}
            >
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              LIVE
            </button>
          </div>

          <button onClick={() => navigate("/search")}>
            <Search className="w-6 h-6 text-white" />
          </button>
        </div>
      </header>

      {/* Video Feed */}
      <div className="pt-14 pb-16">
        {videos.map((video, index) => (
          <div
            key={video.id}
            className="relative h-[calc(100vh-7.5rem)] bg-gradient-to-br from-purple-900/20 to-pink-900/20 snap-start"
          >
            {/* Video Background Placeholder */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-pink-900/30 to-blue-900/30" />

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-6">
              <div className="flex items-end justify-between">
                {/* Left Side - Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full" />
                    <span className="text-white">{video.username}</span>
                    <button className="px-4 py-1 bg-red-500 text-white text-sm rounded-md">
                      Follow
                    </button>
                  </div>
                  <p className="text-white text-sm">{video.description}</p>
                  <div className="flex items-center gap-2 text-white text-sm">
                    <Music className="w-4 h-4" />
                    <span className="truncate">{video.sound}</span>
                  </div>
                </div>

                {/* Right Side - Actions */}
                <div className="flex flex-col items-center gap-6 ml-4">
                  <button
                    onClick={() => handleLike(video.id)}
                    className="flex flex-col items-center gap-1"
                  >
                    <Heart
                      className={`w-8 h-8 ${
                        liked[video.id]
                          ? "fill-red-500 text-red-500"
                          : "text-white"
                      }`}
                    />
                    <span className="text-white text-xs">{video.likes}</span>
                  </button>

                  <button className="flex flex-col items-center gap-1">
                    <MessageCircle className="w-8 h-8 text-white" />
                    <span className="text-white text-xs">{video.comments}</span>
                  </button>

                  <button className="flex flex-col items-center gap-1">
                    <Bookmark className="w-8 h-8 text-white" />
                    <span className="text-white text-xs">Save</span>
                  </button>

                  <button className="flex flex-col items-center gap-1">
                    <Share2 className="w-8 h-8 text-white" />
                    <span className="text-white text-xs">{video.shares}</span>
                  </button>

                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg animate-spin-slow" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
      <ActionPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
    </div>
  );
}
