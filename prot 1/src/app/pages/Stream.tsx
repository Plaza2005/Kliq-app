import { useState } from "react";
import { Play, Download, Bell, Search, Settings, Upload } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import logo from "../../imports/Kliq_logo.jpeg";

const categories = ["Movies", "Series", "Sports", "Videos", "Live"];

const content = [
  { id: 1, title: "Featured Content", category: "New" },
  { id: 2, title: "Popular Movies", category: "Trending" },
  { id: 3, title: "Top Series", category: "Popular" },
  { id: 4, title: "Sports Live", category: "Live" },
];

export function Stream() {
  const [selectedCategory, setSelectedCategory] = useState("Movies");

  return (
    <div className="min-h-screen bg-black pb-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent z-40">
        <div className="flex items-center justify-between p-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <ImageWithFallback
              src={logo}
              alt="Kliq Stream"
              className="w-10 h-10 rounded-lg"
            />
            <span className="text-white text-xl font-medium">KLIQ STREAM</span>
          </div>
          <div className="flex items-center gap-4">
            <button>
              <Search className="w-6 h-6 text-white" />
            </button>
            <button>
              <Download className="w-6 h-6 text-white" />
            </button>
            <button>
              <Bell className="w-6 h-6 text-white" />
            </button>
            <button>
              <Upload className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </header>

      <div className="pt-16">
        {/* Hero Section */}
        <div className="relative h-[60vh] bg-gradient-to-br from-purple-900/40 via-pink-900/40 to-blue-900/40">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4 p-8">
              <h1 className="text-5xl text-white">Featured Content</h1>
              <p className="text-gray-300 text-lg max-w-2xl">
                Watch trending movies, series, and live sports
              </p>
              <div className="flex gap-4 justify-center mt-6">
                <button className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition">
                  <Play className="w-5 h-5" />
                  Play
                </button>
                <button className="flex items-center gap-2 px-8 py-3 bg-gray-800/80 text-white rounded-lg hover:bg-gray-700 transition">
                  <Download className="w-5 h-5" />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-4 overflow-x-auto px-4 py-6 border-b border-gray-800">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2 rounded-full whitespace-nowrap transition ${
                selectedCategory === cat
                  ? "bg-white text-black"
                  : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content Rows */}
        <div className="space-y-8 p-4">
          {content.map((section) => (
            <div key={section.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white text-xl">{section.title}</h2>
                <span className="text-purple-400 text-sm">{section.category}</span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {Array(6)
                  .fill(null)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="flex-shrink-0 w-48 aspect-[2/3] bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-lg cursor-pointer hover:scale-105 transition group relative"
                    >
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition rounded-lg flex items-center justify-center">
                        <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}

          {/* Continue Watching */}
          <div className="space-y-4">
            <h2 className="text-white text-xl">Continue Watching</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {Array(4)
                .fill(null)
                .map((_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-64 space-y-2 cursor-pointer group"
                  >
                    <div className="aspect-video bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-lg relative overflow-hidden">
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                        <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                        <div
                          className="h-full bg-purple-500"
                          style={{ width: `${Math.random() * 70 + 10}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-white text-sm">Video Title {i + 1}</div>
                    <div className="text-gray-400 text-xs">
                      {Math.floor(Math.random() * 30 + 10)} min left
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
