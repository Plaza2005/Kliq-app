import { useState } from "react";
import { Search as SearchIcon, TrendingUp, Menu } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { ActionPanel } from "../components/ActionPanel";

const trending = [
  { tag: "#innovation", views: "2.5M" },
  { tag: "#fitness", views: "1.8M" },
  { tag: "#cooking", views: "3.2M" },
  { tag: "#travel", views: "1.5M" },
  { tag: "#music", views: "4.1M" },
];

const categories = [
  "All",
  "Trending",
  "Music",
  "Gaming",
  "Sports",
  "Food",
  "Fashion",
  "Art",
  "Tech",
];

const videos = Array(20).fill(null).map((_, i) => ({
  id: i,
  views: `${Math.floor(Math.random() * 900) + 100}K`,
}));

export function Search() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-black pb-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md z-40 border-b border-gray-800">
        <div className="p-4 max-w-lg mx-auto space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsPanelOpen(true)}>
              <Menu className="w-6 h-6 text-white" />
            </button>
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users, videos, sounds..."
                className="w-full bg-gray-800 text-white placeholder-gray-400 pl-10 pr-4 py-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="pt-24">
        {!searchQuery ? (
          <>
            {/* Trending Section */}
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <h2 className="text-white text-lg">Trending Now</h2>
              </div>
              <div className="space-y-2">
                {trending.map((item) => (
                  <div
                    key={item.tag}
                    className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg hover:bg-gray-900/50 transition cursor-pointer"
                  >
                    <div>
                      <div className="text-white">{item.tag}</div>
                      <div className="text-gray-400 text-sm">{item.views} views</div>
                    </div>
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                  </div>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="overflow-x-auto px-4 pb-4">
              <div className="flex gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Grid */}
            <div className="grid grid-cols-2 gap-2 p-2">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="aspect-[9/16] bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-lg relative cursor-pointer overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition" />
                  <div className="absolute bottom-2 left-2 text-white text-sm font-medium">
                    {video.views}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-4">
            <p className="text-gray-400 text-center py-8">
              Search results for "{searchQuery}"
            </p>
          </div>
        )}
      </div>

      <BottomNav />
      <ActionPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
    </div>
  );
}
