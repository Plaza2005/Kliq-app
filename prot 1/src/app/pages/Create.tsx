import { useState } from "react";
import { X, Camera, Image, Video, Wand2, Clock, Layout, Maximize, Sparkles, Music } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { useNavigate } from "react-router";

export function Create() {
  const [filter, setFilter] = useState("Normal");
  const navigate = useNavigate();

  const filters = [
    "Normal",
    "Vivid",
    "Dramatic",
    "Mono",
    "Vintage",
    "Cool",
    "Warm",
    "Bright",
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md z-40">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <button onClick={() => navigate("/home")}>
            <X className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl text-white">Create</h1>
          <button>
            <Music className="w-6 h-6 text-white" />
          </button>
        </div>
      </header>

      {/* Camera View */}
      <div className="relative h-screen bg-gradient-to-br from-purple-900/20 to-pink-900/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Camera className="w-20 h-20 text-white/50 mx-auto" />
            <p className="text-white/70">Camera preview would appear here</p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="absolute top-20 left-0 right-0 flex justify-center gap-6 px-4">
          <button className="flex flex-col items-center gap-1">
            <Clock className="w-6 h-6 text-white" />
            <span className="text-white text-xs">Timer</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <Layout className="w-6 h-6 text-white" />
            <span className="text-white text-xs">Layout</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <Maximize className="w-6 h-6 text-white" />
            <span className="text-white text-xs">Ratio</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <Sparkles className="w-6 h-6 text-white" />
            <span className="text-white text-xs">Beautify</span>
          </button>
        </div>

        {/* Filters */}
        <div className="absolute bottom-32 left-0 right-0">
          <div className="overflow-x-auto px-4">
            <div className="flex gap-4">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex flex-col items-center gap-2 flex-shrink-0 ${
                    filter === f ? "opacity-100" : "opacity-50"
                  }`}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg" />
                  <span className="text-white text-xs">{f}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-8 left-0 right-0 flex items-center justify-between px-8">
          <button className="p-4 bg-gray-800/50 rounded-lg backdrop-blur-md">
            <Image className="w-6 h-6 text-white" />
          </button>

          <button className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/50">
            <div className="w-16 h-16 border-4 border-white rounded-full" />
          </button>

          <button className="p-4 bg-gray-800/50 rounded-lg backdrop-blur-md">
            <Wand2 className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
