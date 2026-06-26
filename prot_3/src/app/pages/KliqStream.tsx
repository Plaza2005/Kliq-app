import { useState, useEffect, useRef } from "react";
import { Play, Info, Lock, Search, Loader2 } from "lucide-react";
import kliqLogo from "../../imports/Kliq_logo.jpeg";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import { api, resolveMediaUrl } from "../api/client";

interface Episode {
  id: string;
  number: number;
  title: string;
  synopsis: string | null;
  mediaUrl: string;
  duration: number | null;
  thumbUrl: string | null;
}

interface KliqTitle {
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
  minTier: string;
  locked: boolean;
  isFeatured: boolean;
  author: { username: string; displayName: string; avatarUrl: string };
  seasons?: { id: string; number: number; episodes: Episode[] }[];
}

interface BrowseResponse {
  featured: KliqTitle[];
  genres: { name: string; titles: KliqTitle[] }[];
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-36 md:w-44">
      <div className="aspect-[2/3] rounded-lg bg-gray-800 animate-pulse mb-2" />
      <div className="h-3 bg-gray-800 rounded animate-pulse w-3/4 mb-1" />
      <div className="h-3 bg-gray-800 rounded animate-pulse w-1/2" />
    </div>
  );
}

function TitleCard({ title, onClick }: { title: KliqTitle; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      className="flex-shrink-0 w-36 md:w-44 text-left relative group"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 mb-2 relative transition-transform duration-200 group-hover:scale-105">
        {title.posterUrl ? (
          <img
            src={resolveMediaUrl(title.posterUrl) ?? ""}
            alt={title.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-900 via-gray-900 to-black flex items-center justify-center">
            <Play size={28} className="text-white/40" />
          </div>
        )}
        {/* Age rating badge */}
        <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/20">
          {title.ageRating}
        </span>
        {/* Tier lock overlay */}
        {title.locked && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1">
            <Lock size={20} className="text-white" />
            <span className="text-white text-[10px] font-bold">Plus</span>
          </div>
        )}
        {/* Hover quick info */}
        {hovered && !title.locked && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-end justify-end p-3 gap-2">
            <p className="text-white text-xs line-clamp-3 self-start">{title.synopsis ?? ""}</p>
            <button
              onClick={e => { e.stopPropagation(); onClick(); }}
              className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-1.5 rounded flex items-center justify-center gap-1 transition"
            >
              <Play size={12} fill="currentColor" /> Play
            </button>
          </div>
        )}
      </div>
      <p className="text-gray-200 text-xs font-semibold line-clamp-2 leading-snug">{title.title}</p>
      <p className="text-gray-500 text-[10px] mt-0.5">{title.genre}</p>
    </button>
  );
}

export function KliqStream() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier } = useUser();

  const [data, setData] = useState<BrowseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const rotateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    api.get<BrowseResponse>("/kliqstream/browse")
      .then(d => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get<{ id: string }[]>("/kliqstream/watchlist").then(items => setWatchlist(items.map(i => i.id))).catch(() => {});
  }, []);

  const toggleWatchlist = async (titleId: string) => {
    const inList = watchlist.includes(titleId);
    setWatchlist(prev => inList ? prev.filter(id => id !== titleId) : [...prev, titleId]);
    if (inList) await api.delete(`/kliqstream/watchlist/${titleId}`).catch(() => {});
    else await api.post(`/kliqstream/watchlist/${titleId}`, {}).catch(() => {});
  };

  // Auto-rotate hero every 8 seconds
  useEffect(() => {
    if (!data?.featured?.length) return;
    rotateRef.current = setInterval(() => {
      setHeroIndex(i => (i + 1) % data.featured.length);
    }, 8000);
    return () => { if (rotateRef.current) clearInterval(rotateRef.current); };
  }, [data?.featured?.length]);

  const featured = data?.featured ?? [];
  const hero = featured[heroIndex] ?? null;

  // Filter by search
  const filteredGenres = (data?.genres ?? []).map(g => ({
    ...g,
    titles: g.titles.filter(t =>
      !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(g => g.titles.length > 0);

  return (
    <div className="min-h-full bg-black pb-24">
      {/* Sticky top nav */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-black to-transparent pb-4">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          {/* KliqStream logo */}
          <div className="flex items-center gap-2 mr-auto">
            <img src={kliqLogo} alt="KLIQ" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-white font-extrabold text-lg tracking-tight hidden sm:block">KliqStream</span>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search titles..."
              className="bg-gray-900/80 backdrop-blur border border-gray-700 rounded-full pl-8 pr-3 py-1.5 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-red-500 w-32 sm:w-48 transition"
            />
          </div>
          {/* My List */}
          <button
            onClick={() => navigate("/stream/mylist")}
            className="text-gray-300 hover:text-white text-xs font-semibold transition whitespace-nowrap"
          >
            My List
          </button>
          {/* Tier badge */}
          {user && (
            <span className="text-[10px] font-extrabold px-2 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 whitespace-nowrap">
              {user.tier.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Tier gate banner */}
      {tier < 2 && (
        <div className="mx-4 mb-4 -mt-2 bg-gradient-to-r from-red-900/40 to-red-800/40 border border-red-700/50 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-xs font-medium">Upgrade to Plus to unlock exclusive KliqStream content</p>
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="flex-shrink-0 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
          >
            Upgrade
          </button>
        </div>
      )}

      {loading ? (
        /* Loading skeleton */
        <div className="px-4">
          {/* Hero skeleton */}
          <div className="w-full h-[50vh] rounded-2xl bg-gray-900 animate-pulse mb-8" />
          {[1, 2, 3].map(i => (
            <div key={i} className="mb-8">
              <div className="h-5 bg-gray-800 rounded animate-pulse w-32 mb-4" />
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 5 }).map((_, j) => <SkeletonCard key={j} />)}
              </div>
            </div>
          ))}
        </div>
      ) : error || !data ? (
        /* Error / empty state */
        <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-4 border border-gray-800">
            <Play size={28} className="text-gray-600" />
          </div>
          <h3 className="text-white font-bold text-xl mb-2">No content yet</h3>
          <p className="text-gray-500 text-sm max-w-xs">No content yet — check back soon</p>
        </div>
      ) : (
        <>
          {/* Hero Banner */}
          {hero && (
            <div className="relative w-full h-[55vh] md:h-[65vh] bg-gray-950 -mt-16 mb-8">
              <div className="absolute inset-0">
                {hero.posterUrl ? (
                  <img
                    src={resolveMediaUrl(hero.posterUrl) ?? ""}
                    alt={hero.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-red-950 via-gray-900 to-black" />
                )}
                {/* Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
              </div>

              {/* Hero dots */}
              {featured.length > 1 && (
                <div className="absolute top-4 right-4 flex gap-1.5 z-10">
                  {featured.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setHeroIndex(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === heroIndex ? "bg-white w-4" : "bg-white/40"}`}
                    />
                  ))}
                </div>
              )}

              {/* Hero content */}
              <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full md:w-3/5 z-10">
                <span className="text-red-500 text-[10px] font-extrabold tracking-widest uppercase mb-2 block">Featured</span>
                <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2 leading-tight">{hero.title}</h1>
                {hero.synopsis && (
                  <p className="text-gray-300 text-sm md:text-base mb-4 line-clamp-3 leading-relaxed max-w-lg">{hero.synopsis}</p>
                )}
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-gray-400 text-xs capitalize">{hero.type}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-600" />
                  <span className="text-gray-400 text-xs">{hero.genre}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-600" />
                  <span className="bg-gray-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{hero.ageRating}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => hero.locked ? navigate("/settings") : navigate(`/kliqstream/watch/${hero.id}?type=${hero.type}`)}
                    className="bg-white text-black px-7 py-2.5 rounded-md font-bold flex items-center gap-2 hover:bg-gray-200 transition text-sm"
                  >
                    <Play size={16} fill="currentColor" /> Play
                  </button>
                  <button
                    onClick={() => navigate(`/kliqstream/${hero.id}`)}
                    className="bg-gray-700/60 backdrop-blur-sm text-white px-6 py-2.5 rounded-md font-bold flex items-center gap-2 hover:bg-gray-600/60 transition text-sm"
                  >
                    <Info size={16} /> More Info
                  </button>
                  {featured.length > 0 && (
                    <button onClick={() => toggleWatchlist(featured[heroIndex]?.id)}
                      className="flex items-center gap-2 bg-white/20 backdrop-blur hover:bg-white/30 text-white font-semibold px-5 py-2.5 rounded-full transition text-sm">
                      {watchlist.includes(featured[heroIndex]?.id) ? "✓ In My List" : "+ My List"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Genre rows */}
          {filteredGenres.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm px-4">
              No titles match your search.
            </div>
          ) : (
            <div className="space-y-8 px-4">
              {filteredGenres.map(genre => (
                <div key={genre.name}>
                  <h2 className="text-white font-bold text-lg mb-3">{genre.name}</h2>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {genre.titles.map(title => (
                      <TitleCard
                        key={title.id}
                        title={title}
                        onClick={() => navigate(`/kliqstream/${title.id}`)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
