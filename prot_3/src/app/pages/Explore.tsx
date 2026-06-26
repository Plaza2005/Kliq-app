import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2, ChevronRight, Check, Hash, TrendingUp, Heart, Music } from "lucide-react";
import { useNavigate } from "react-router";
import { api, resolveMediaUrl } from "../api/client";
import { useSocial } from "../context/SocialContext";

// ── Types ──────────────────────────────────────────────────────────────────────

interface UserResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string | null;
  isVerified: boolean;
  followerCount: number;
  tier: string;
}

interface PostResult {
  id: string;
  body: string;
  mediaUrl: string | null;
  thumbUrl: string | null;
  postType: string;
  likeCount: number;
  viewCount: number;
  author: { username: string; displayName: string; avatarUrl: string };
}

interface HashtagResult {
  id: string;
  name: string;
  postCount: number;
}

// The existing /search/trending returns { tag: string; count: number }[]
interface TrendingTag { tag: string; count: number; }

interface SearchResults {
  users: UserResult[];
  posts: PostResult[];
  hashtags: HashtagResult[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function tierStars(tier: string): string {
  if (tier === "pro") return "★★★";
  if (tier === "plus") return "★★";
  return "★";
}

// ── FollowBtn ──────────────────────────────────────────────────────────────────

function FollowBtn({ username }: { username: string }) {
  const { isFollowing, toggleFollow } = useSocial();
  const following = isFollowing(username);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggleFollow(username); }}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition flex-shrink-0 flex items-center gap-1 ${
        following
          ? "border-gray-600 text-gray-400"
          : "border-purple-500 text-purple-400 bg-purple-500/10"
      }`}
    >
      {following && <Check size={11} />}
      {following ? "Following" : "Follow"}
    </button>
  );
}

// ── Tab bar ────────────────────────────────────────────────────────────────────

type Tab = "top" | "users" | "posts" | "hashtags";

const TABS: { key: Tab; label: string }[] = [
  { key: "top", label: "Top" },
  { key: "users", label: "People" },
  { key: "posts", label: "Posts" },
  { key: "hashtags", label: "Tags" },
];

const TEXT_GRADIENTS = [
  "from-purple-800 to-black",
  "from-pink-800 to-black",
  "from-blue-800 to-black",
  "from-indigo-800 to-black",
];

// ── Main component ─────────────────────────────────────────────────────────────

export function Explore() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("top");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserResult[]>([]);
  const [explorePosts, setExplorePosts] = useState<PostResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  // Load trending / suggested on mount
  useEffect(() => {
    Promise.all([
      api.get<TrendingTag[]>("/search/trending").catch(() => [] as TrendingTag[]),
      api.get<UserResult[]>("/users/suggested").catch(() => [] as UserResult[]),
      api.get<PostResult[]>("/search/explore").catch(() => [] as PostResult[]),
    ]).then(([tags, users, posts]) => {
      setTrendingTags(tags);
      setSuggestedUsers(users);
      setExplorePosts(posts);
    }).finally(() => setLoadingTrending(false));
  }, []);

  // Search with debounce
  const searchAll = async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const [users, posts, tags] = await Promise.all([
        api.get<UserResult[]>(`/search/users?q=${encodeURIComponent(q)}`).catch(() => [] as UserResult[]),
        api.get<PostResult[]>(`/search/posts?q=${encodeURIComponent(q)}`).catch(() => [] as PostResult[]),
        // Filter trending tags client-side for hashtag results
        Promise.resolve(
          trendingTags
            .filter((t) => t.tag.toLowerCase().includes(q.toLowerCase()))
            .map((t) => ({
              id: t.tag,
              name: t.tag.replace(/^#/, ""),
              postCount: t.count,
            }))
        ),
      ]);
      setResults({ users, posts, hashtags: tags });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAll(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // ── Render helpers ──────────────────────────────────────────────────────────

  const renderUserRow = (u: UserResult) => (
    <div
      key={u.id}
      onClick={() => navigate(`/user/${u.username}`)}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-950 transition"
    >
      <img
        src={resolveMediaUrl(u.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
        alt={u.username}
        className="w-11 h-11 rounded-full object-cover bg-gray-800 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-white font-semibold text-sm truncate">{u.displayName}</span>
          {u.isVerified && <span className="text-blue-400 text-xs flex-shrink-0">✓</span>}
          <span className="text-yellow-400 text-xs ml-1 flex-shrink-0">{tierStars(u.tier)}</span>
        </div>
        <p className="text-gray-500 text-xs">
          @{u.username} · {fmtNum(u.followerCount)} followers
        </p>
      </div>
      <FollowBtn username={u.username} />
    </div>
  );

  const renderPostGrid = (posts: PostResult[]) => (
    <div className="grid grid-cols-3 gap-0.5 p-0.5">
      {posts.map((p, idx) => (
        <div
          key={p.id}
          onClick={() => navigate(`/post/${p.id}`)}
          className="aspect-square bg-gray-900 cursor-pointer relative overflow-hidden group"
        >
          {(p.thumbUrl ?? p.mediaUrl) ? (
            <img
              src={resolveMediaUrl(p.thumbUrl ?? p.mediaUrl) ?? ""}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-b ${TEXT_GRADIENTS[idx % TEXT_GRADIENTS.length]} flex items-center justify-center p-2`}
            >
              <p className="text-white text-[10px] text-center line-clamp-4">{p.body}</p>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <span className="text-white text-xs font-bold flex items-center gap-1">
              <Heart size={11} className="fill-white" /> {fmtNum(p.likeCount)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderHashtagList = (tags: HashtagResult[]) => (
    <div className="divide-y divide-gray-900">
      {tags.map((ht) => (
        <button
          key={ht.id}
          onClick={() => navigate(`/hashtag/${ht.name}`)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-950 transition text-left"
        >
          <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
            <Hash size={18} className="text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">#{ht.name}</p>
            <p className="text-gray-500 text-xs">{fmtNum(ht.postCount)} posts</p>
          </div>
          <ChevronRight size={16} className="text-gray-700 flex-shrink-0" />
        </button>
      ))}
    </div>
  );

  // ── Search results view ─────────────────────────────────────────────────────

  const renderResults = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-purple-400" />
        </div>
      );
    }
    if (!results) return null;

    const { users, posts, hashtags } = results;
    const hasAny = users.length > 0 || posts.length > 0 || hashtags.length > 0;

    if (!hasAny) {
      return (
        <div className="text-center py-20">
          <p className="text-gray-500 text-sm">No results for "{query}"</p>
        </div>
      );
    }

    if (tab === "top") {
      return (
        <div>
          {users.length > 0 && (
            <section className="mb-2">
              <h3 className="text-white font-bold text-sm px-4 py-2">People</h3>
              <div className="divide-y divide-gray-900">
                {users.slice(0, 3).map(renderUserRow)}
              </div>
            </section>
          )}
          {hashtags.length > 0 && (
            <section className="mb-2">
              <h3 className="text-white font-bold text-sm px-4 py-2">Hashtags</h3>
              {renderHashtagList(hashtags.slice(0, 3))}
            </section>
          )}
          {posts.length > 0 && (
            <section>
              <h3 className="text-white font-bold text-sm px-4 py-2">Posts</h3>
              {renderPostGrid(posts.slice(0, 9))}
            </section>
          )}
        </div>
      );
    }

    if (tab === "users") {
      return users.length > 0 ? (
        <div className="divide-y divide-gray-900">{users.map(renderUserRow)}</div>
      ) : (
        <div className="text-center py-16 text-gray-500 text-sm">No people found</div>
      );
    }

    if (tab === "posts") {
      return posts.length > 0 ? (
        renderPostGrid(posts)
      ) : (
        <div className="text-center py-16 text-gray-500 text-sm">No posts found</div>
      );
    }

    if (tab === "hashtags") {
      return hashtags.length > 0 ? (
        renderHashtagList(hashtags)
      ) : (
        <div className="text-center py-16 text-gray-500 text-sm">No hashtags found</div>
      );
    }

    return null;
  };

  // ── Empty / trending state ──────────────────────────────────────────────────

  const renderTrending = () => {
    if (loadingTrending) {
      return (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-purple-400" />
        </div>
      );
    }
    return (
      <div className="px-4 pt-4 space-y-6">
        {/* Trending hashtags */}
        {trendingTags.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-purple-400" />
              <h2 className="text-white font-bold text-base">Trending</h2>
            </div>
            <div className="space-y-0">
              {trendingTags.slice(0, 8).map((ht, i) => {
                const name = ht.tag.replace(/^#/, "");
                return (
                  <button
                    key={ht.tag}
                    onClick={() => navigate(`/hashtag/${name}`)}
                    className="w-full flex items-center justify-between px-0 py-3 border-b border-gray-900 hover:bg-gray-950 transition"
                  >
                    <div className="text-left">
                      <p className="text-gray-500 text-xs">#{i + 1} Trending</p>
                      <p className="text-white font-semibold">{ht.tag}</p>
                      {ht.count > 0 && (
                        <p className="text-gray-500 text-xs">{fmtNum(ht.count)} posts</p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-gray-700 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Trending Sounds link */}
        <section>
          <button onClick={() => navigate("/sounds")} className="flex items-center justify-between w-full py-3 border-b border-gray-900">
            <div className="flex items-center gap-3">
              <Music size={18} className="text-purple-400" />
              <span className="text-white font-medium">Trending Sounds</span>
            </div>
            <ChevronRight size={16} className="text-gray-700" />
          </button>
        </section>

        {/* Suggested people */}
        {suggestedUsers.length > 0 && (
          <section>
            <h2 className="text-white font-bold text-base mb-3">People to follow</h2>
            <div className="space-y-0 divide-y divide-gray-900">
              {suggestedUsers.map(renderUserRow)}
            </div>
          </section>
        )}

        {/* Explore grid */}
        {explorePosts.length > 0 && (
          <section>
            <h2 className="text-white font-bold text-base mb-3">Explore</h2>
          </section>
        )}
        {explorePosts.length > 0 && renderPostGrid(explorePosts)}
      </div>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-black pb-24">
      {/* Sticky search bar */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-gray-900">
        <div className="px-4 py-3">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Kliq..."
              className="w-full bg-gray-900 border border-gray-800 rounded-full pl-10 pr-10 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setResults(null); }}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                <X size={14} className="text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Tab row — only when query is active */}
        {query && (
          <div className="flex border-t border-gray-900 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2.5 text-xs font-semibold whitespace-nowrap transition border-b-2 ${
                  tab === t.key
                    ? "text-white border-purple-500"
                    : "text-gray-500 border-transparent hover:text-gray-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {query ? renderResults() : renderTrending()}
    </div>
  );
}
