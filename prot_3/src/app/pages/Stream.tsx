import { useState, useEffect } from "react";
import { Play, Plus, Check, Info, X, Tv, Lock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useUser } from "../context/UserContext";
import { api, resolveMediaUrl } from "../api/client";

interface StreamTitle {
  id: string;
  type: "movie" | "series";
  title: string;
  synopsis: string | null;
  genre: string;
  ageRating: string;
  posterUrl: string | null;
  trailerUrl: string | null;
  mediaUrl: string | null;
  duration: number | null;
  isFeatured: boolean;
  minTier: string;
  locked: boolean;
  author: { id: string; username: string; displayName: string; avatarUrl: string };
}

interface BrowseResponse {
  featured: StreamTitle[];
  genres: { name: string; titles: StreamTitle[] }[];
  trending: StreamTitle[];
  newReleases: StreamTitle[];
  top10: StreamTitle[];
  recommended: StreamTitle[];
}

const BASE_TABS = ["All", "Movies", "Series"] as const;

export function Stream() {
  const navigate = useNavigate();
  const { tier } = useUser();

  const [titles, setTitles]         = useState<StreamTitle[]>([]);
  const [genres, setGenres]         = useState<string[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState<string>("All");
  const [showInfo, setShowInfo]     = useState(false);
  const [heroTitle, setHeroTitle]   = useState<StreamTitle | null>(null);
  const [watchlist, setWatchlist]   = useState<string[]>([]);

  useEffect(() => {
    api.get<BrowseResponse>("/kliqstream/browse")
      .then(data => {
        // Flatten the genre rows into a single de-duplicated catalogue
        const seen = new Map<string, StreamTitle>();
        for (const g of data.genres ?? []) {
          for (const t of g.titles) seen.set(t.id, t);
        }
        const all = Array.from(seen.values());
        setTitles(all);
        setGenres((data.genres ?? []).map(g => g.name));
        setHeroTitle(data.featured?.[0] ?? all[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get<{ id: string }[]>("/kliqstream/watchlist")
      .then(items => setWatchlist(items.map(i => i.id)))
      .catch(() => {});
  }, []);

  const toggleWatchlist = async (titleId: string) => {
    const inList = watchlist.includes(titleId);
    setWatchlist(prev => inList ? prev.filter(id => id !== titleId) : [...prev, titleId]);
    if (inList) await api.delete(`/kliqstream/watchlist/${titleId}`).catch(() => {});
    else await api.post(`/kliqstream/watchlist/${titleId}`, {}).catch(() => {});
  };

  const openTitle = (t: StreamTitle) => {
    if (t.locked) { navigate("/settings"); return; }
    navigate(`/kliqstream/${t.id}`);
  };

  const playTitle = (t: StreamTitle) => {
    if (t.locked) { navigate("/settings"); return; }
    if (t.type === "movie") navigate(`/kliqstream/watch/${t.id}?type=movie`);
    else navigate(`/kliqstream/${t.id}`);
  };

  const tabs: string[] = [...BASE_TABS, ...genres];

  const filtered = titles.filter(t => {
    if (activeTab === "All")    return true;
    if (activeTab === "Movies") return t.type === "movie";
    if (activeTab === "Series") return t.type === "series";
    return t.genre === activeTab;
  });

  if (tier < 2) {
    return (
      <div className="min-h-full bg-black flex items-center justify-center p-6">
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-700/50 rounded-full flex items-center justify-center mx-auto mb-5">
            <Lock size={28} className="text-purple-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">KliqStream</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Movies, series, sports & more — available on Tier 2 Plus and above.
          </p>
          <div className="space-y-3">
            <button onClick={() => navigate("/settings")}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition">
              Upgrade to Tier 2
            </button>
            <button onClick={() => navigate(-1)}
              className="w-full bg-gray-900 border border-gray-800 text-gray-400 font-medium py-3 rounded-xl hover:bg-gray-800 transition">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-black min-h-full">
      {/* Info Modal */}
      {showInfo && heroTitle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="relative h-48">
              {heroTitle.posterUrl ? (
                <img src={resolveMediaUrl(heroTitle.posterUrl) ?? ""} alt={heroTitle.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 to-transparent" />
              <button onClick={() => setShowInfo(false)} className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center">
                <X size={16} className="text-white" />
              </button>
            </div>
            <div className="p-5">
              <h2 className="text-white font-extrabold text-xl mb-1 line-clamp-2">{heroTitle.title}</h2>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-400 text-xs capitalize">{heroTitle.type}</span>
                <span className="w-1 h-1 rounded-full bg-gray-600" />
                <span className="text-gray-400 text-xs">{heroTitle.genre}</span>
                <span className="w-1 h-1 rounded-full bg-gray-600" />
                <span className="bg-gray-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{heroTitle.ageRating}</span>
              </div>
              {heroTitle.synopsis && (
                <p className="text-gray-400 text-xs mb-3 line-clamp-3">{heroTitle.synopsis}</p>
              )}
              <p className="text-gray-500 text-xs mb-3">by @{heroTitle.author.username}</p>
              <div className="flex gap-3">
                <button onClick={() => { setShowInfo(false); playTitle(heroTitle); }}
                  className="flex-1 bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition">
                  <Play size={18} fill="currentColor" /> Play
                </button>
                <button onClick={() => { toggleWatchlist(heroTitle.id); setShowInfo(false); }}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-700 transition">
                  {watchlist.includes(heroTitle.id) ? <Check size={18} /> : <Plus size={18} />} My List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header with tabs */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-gray-800">
        <div className="flex items-center px-4 py-3 gap-3">
          <Tv size={20} className="text-purple-400 flex-shrink-0" />
          <span className="font-extrabold text-white text-lg mr-auto">KliqStream</span>
          <button onClick={() => navigate("/stream/mylist")}
            className="bg-gray-900 border border-gray-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition">
            My List
          </button>
        </div>
        <div className="flex border-t border-gray-900 px-2 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-2.5 text-sm font-semibold transition border-b-2 ${
                activeTab === tab ? "border-white text-white" : "border-transparent text-gray-500 hover:text-gray-300"
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-32">
          <Loader2 size={28} className="animate-spin text-purple-400" />
        </div>
      ) : titles.length === 0 ? (
        /* Empty state — nothing in the catalogue yet */
        <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gray-900 flex items-center justify-center mb-5 border border-gray-800">
            <Tv size={32} className="text-gray-600" />
          </div>
          <h3 className="text-white font-bold text-xl mb-2">No content yet</h3>
          <p className="text-gray-500 text-sm max-w-xs">
            The KliqStream catalogue is empty right now.
          </p>
        </div>
      ) : (
        <>
          {/* Hero Banner */}
          {heroTitle && (
            <div className="relative w-full h-[50vh] md:h-[60vh] bg-gray-900">
              <div className="absolute inset-0">
                {heroTitle.posterUrl ? (
                  <img src={resolveMediaUrl(heroTitle.posterUrl) ?? ""} alt={heroTitle.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-950 via-indigo-900 to-black" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full md:w-2/3">
                <p className="text-purple-400 font-bold tracking-widest text-xs mb-2 uppercase">
                  {heroTitle.isFeatured ? "Featured" : "Now Streaming"}
                </p>
                <h1 className="text-3xl md:text-5xl font-extrabold mb-2 text-white line-clamp-2">{heroTitle.title}</h1>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-gray-400 text-sm capitalize">{heroTitle.type}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-600" />
                  <span className="text-gray-400 text-sm">{heroTitle.genre}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-600" />
                  <span className="bg-gray-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{heroTitle.ageRating}</span>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => playTitle(heroTitle)}
                    className="bg-white text-black px-6 py-2.5 rounded-md font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
                    <Play size={18} fill="currentColor" /> Play
                  </button>
                  <button onClick={() => setShowInfo(true)}
                    className="bg-gray-700/60 text-white px-5 py-2.5 rounded-md font-bold flex items-center gap-2 hover:bg-gray-600/60 transition-colors backdrop-blur-md">
                    <Info size={18} /> More Info
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content grid */}
          <div className="mt-8 px-4 md:px-8">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">No {activeTab.toLowerCase()} content yet.</div>
            ) : (
              <>
                <h3 className="text-white font-bold text-lg mb-4">
                  {activeTab === "All" ? "All Content" : activeTab}
                  <span className="text-gray-500 text-sm font-normal ml-2">{filtered.length} titles</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filtered.map(t => (
                    <button key={t.id} onClick={() => openTitle(t)} className="group text-left">
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 mb-2 group-hover:scale-105 transition-transform duration-300 relative">
                        {t.posterUrl ? (
                          <img src={resolveMediaUrl(t.posterUrl) ?? ""} alt={t.title}
                            className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center">
                            <Play size={24} className="text-white/60" />
                          </div>
                        )}
                        {/* Age rating badge */}
                        <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/20">
                          {t.ageRating}
                        </span>
                        {t.locked ? (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1">
                            <Lock size={20} className="text-white" />
                            <span className="text-white text-[10px] font-bold capitalize">{t.minTier}</span>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <Play size={28} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" />
                          </div>
                        )}
                      </div>
                      <p className="text-gray-300 text-xs font-medium line-clamp-2 group-hover:text-white transition">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-gray-600 text-[10px]">
                        <span className="capitalize">{t.type}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-gray-700" />
                        <span className="truncate">{t.genre}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
