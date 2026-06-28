import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Play, X, Loader2 } from "lucide-react";
import { api, resolveMediaUrl } from "../api/client";

interface WatchlistTitle {
  id: string;
  title: string;
  type: "movie" | "series";
  genre: string;
  posterUrl: string | null;
}

export function KliqStreamMyList() {
  const navigate = useNavigate();
  const [titles, setTitles] = useState<WatchlistTitle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<WatchlistTitle[]>("/kliqstream/watchlist")
      .then(setTitles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const remove = async (id: string) => {
    setTitles(prev => prev.filter(t => t.id !== id));
    await api.delete(`/kliqstream/watchlist/${id}`).catch(() => {});
  };

  if (loading) {
    return (
      <div className="min-h-full bg-black flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur-md border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full transition">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <span className="text-white font-bold text-lg">My List</span>
        <span className="text-gray-500 text-sm">({titles.length})</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {titles.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play size={32} className="text-gray-600" />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">Your list is empty</h3>
            <p className="text-gray-500 text-sm mb-6">Add movies and series to watch later by pressing + My List</p>
            <button
              onClick={() => navigate("/kliqstream")}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition"
            >
              Browse KliqStream
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {titles.map(item => (
              <div key={item.id} className="relative group cursor-pointer">
                <div
                  onClick={() => navigate(`/kliqstream/${item.id}`)}
                  className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-900"
                >
                  {item.posterUrl ? (
                    <img
                      src={resolveMediaUrl(item.posterUrl) ?? ""}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-900 to-zinc-900 flex items-center justify-center">
                      <Play size={28} className="text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Play size={20} className="text-white fill-white ml-1" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => remove(item.id)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition opacity-0 group-hover:opacity-100"
                >
                  <X size={14} className="text-white" />
                </button>
                <p className="text-white text-sm font-semibold mt-2 line-clamp-1">{item.title}</p>
                <p className="text-gray-500 text-xs capitalize">{item.type} · {item.genre}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
