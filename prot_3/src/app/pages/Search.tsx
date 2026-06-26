import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, TrendingUp, Hash, Check, Clock, X, Loader2, Heart } from "lucide-react";
import { useNavigate } from "react-router";
import { useSocial } from "../context/SocialContext";
import { api, resolveMediaUrl } from "../api/client";

interface SearchUser {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string;
  isVerified: boolean;
  followerCount: number;
}

interface SearchPost {
  id: string;
  body: string;
  mediaUrl: string | null;
  likeCount: number;
  commentCount: number;
  author: { username: string; avatarUrl: string };
}

interface TrendingTag {
  tag: string;
  count: number;
}

interface ExplorePost {
  id: string;
  mediaUrl: string;
  body: string;
  likeCount: number;
  commentCount: number;
  author: { username: string };
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

const TEXT_GRADIENTS = [
  "from-purple-800 to-black",
  "from-pink-800 to-black",
  "from-blue-800 to-black",
  "from-indigo-800 to-black",
];

export function Search() {
  const [query, setQuery]                   = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [users, setUsers]                   = useState<SearchUser[]>([]);
  const [posts, setPosts]                   = useState<SearchPost[]>([]);
  const [searching, setSearching]           = useState(false);
  const [trending, setTrending]             = useState<TrendingTag[]>([]);
  const [explore, setExplore]               = useState<ExplorePost[]>([]);
  const [loadingExplore, setLoadingExplore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const { isFollowing, toggleFollow } = useSocial();

  useEffect(() => {
    api.get<TrendingTag[]>("/search/trending").then(setTrending).catch(() => {});
    api.get<ExplorePost[]>("/search/explore")
      .then(setExplore)
      .catch(() => {})
      .finally(() => setLoadingExplore(false));
    try {
      const saved = JSON.parse(localStorage.getItem("kliq_recent_searches") || "[]");
      if (Array.isArray(saved)) setRecentSearches(saved.slice(0, 8));
    } catch { /* ignore */ }
  }, []);

  const doSearch = async (q: string) => {
    if (!q.trim()) { setUsers([]); setPosts([]); return; }
    setSearching(true);
    try {
      const [u, p] = await Promise.all([
        api.get<SearchUser[]>(`/search/users?q=${encodeURIComponent(q)}`),
        api.get<SearchPost[]>(`/search/posts?q=${encodeURIComponent(q)}`),
      ]);
      setUsers(u);
      setPosts(p);
    } catch { /* silent */ } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const submitSearch = (q: string) => {
    setQuery(q);
    const updated = [q, ...recentSearches.filter(r => r !== q)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem("kliq_recent_searches", JSON.stringify(updated));
  };

  const removeRecent = (r: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(x => x !== r);
    setRecentSearches(updated);
    localStorage.setItem("kliq_recent_searches", JSON.stringify(updated));
  };

  const clearAll = () => {
    setRecentSearches([]);
    localStorage.removeItem("kliq_recent_searches");
  };

  const hasResults = users.length > 0 || posts.length > 0;

  return (
    <div className="min-h-full bg-black pb-24">
      {/* Search bar */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md px-4 py-4 border-b border-gray-900">
        <div className="relative">
          <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) submitSearch(query.trim()); }}
            placeholder="Search people, posts, tags..."
            className="w-full bg-gray-900 border border-gray-800 rounded-full pl-10 pr-10 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X size={14} className="text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {query ? (
        <div className="p-4 space-y-8">
          {searching ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-purple-400" />
            </div>
          ) : (
            <>
              {users.length > 0 && (
                <div>
                  <h3 className="text-white font-bold mb-3">Accounts</h3>
                  <div className="space-y-2">
                    {users.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-900/50 transition cursor-pointer"
                        onClick={() => navigate(`/user/${r.username}`)}
                      >
                        <img src={resolveMediaUrl(r.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.username}`} alt={r.username} className="w-12 h-12 rounded-full bg-gray-800 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm">
                            {r.displayName}
                            {r.isVerified && <span className="ml-1 text-blue-400 text-xs">✓</span>}
                          </p>
                          <p className="text-gray-500 text-xs">@{r.username} · {fmtNum(r.followerCount)} followers</p>
                          {r.bio && <p className="text-gray-600 text-xs truncate">{r.bio}</p>}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFollow(r.username); }}
                          className={`flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-full flex-shrink-0 transition ${
                            isFollowing(r.username)
                              ? "bg-gray-800 border border-gray-700 text-gray-300"
                              : "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                          }`}
                        >
                          {isFollowing(r.username) && <Check size={11} />}
                          {isFollowing(r.username) ? "Following" : "Follow"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {posts.length > 0 && (
                <div>
                  <h3 className="text-white font-bold mb-3">Posts</h3>
                  <div className="grid grid-cols-3 gap-1">
                    {posts.map((p, idx) => (
                      <div key={p.id} className="aspect-square bg-gray-800 overflow-hidden group cursor-pointer relative rounded-sm">
                        {p.mediaUrl ? (
                          <img src={p.mediaUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-b ${TEXT_GRADIENTS[idx % TEXT_GRADIENTS.length]} flex items-center justify-center p-2`}>
                            <p className="text-white text-[10px] text-center line-clamp-4">{p.body}</p>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3 text-white text-xs font-bold">
                          <span className="flex items-center gap-1"><Heart size={11} className="fill-white" /> {fmtNum(p.likeCount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!hasResults && !searching && (
                <div className="text-center py-16">
                  <p className="text-gray-600 text-sm">No results for "{query}"</p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="p-4">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-gray-500" />
                  <h3 className="text-white font-bold">Recent</h3>
                </div>
                <button onClick={clearAll} className="text-gray-500 text-xs hover:text-gray-300 transition">Clear all</button>
              </div>
              <div className="space-y-1">
                {recentSearches.map(r => (
                  <div key={r} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-900 transition cursor-pointer group" onClick={() => submitSearch(r)}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                        <Clock size={13} className="text-gray-600" />
                      </div>
                      <span className="text-gray-300 text-sm">{r}</span>
                    </div>
                    <button onClick={(e) => removeRecent(r, e)} className="p-1 text-gray-700 hover:text-gray-400 transition">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trending */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-purple-400" />
              <h3 className="text-white font-bold">Trending</h3>
            </div>
            {trending.length === 0 ? (
              <p className="text-gray-600 text-xs">No trending tags yet — use hashtags when posting.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {trending.map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => submitSearch(tag)}
                    className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 text-gray-300 px-3 py-1.5 rounded-full text-sm hover:border-purple-700 hover:text-white transition"
                  >
                    <Hash size={12} className="text-purple-400" />
                    {tag.slice(1)}
                    {count > 0 && <span className="text-gray-600 text-[10px] ml-0.5">·{fmtNum(count)}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Explore grid */}
          <h3 className="text-white font-bold mb-3">Explore</h3>
          {loadingExplore ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin text-purple-400" />
            </div>
          ) : explore.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-gray-600 text-sm">No posts to explore yet.</p>
              <p className="text-gray-700 text-xs mt-1">Start posting media content to fill the explore grid.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {explore.map((item) => (
                <div key={item.id} className="aspect-square overflow-hidden cursor-pointer group relative rounded-sm bg-gray-900">
                  <img
                    src={item.mediaUrl}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <span className="text-white text-xs font-bold flex items-center gap-1">
                      <Heart size={11} className="fill-white" /> {fmtNum(item.likeCount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
