import { useState, useRef, useEffect, useCallback } from "react";
import { Heart, MessageCircle, Share2, MoreHorizontal, Music2, Plus, Check, Radio, Eye, Loader2, Volume2, VolumeX, Users, Repeat2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { useSocial } from "../context/SocialContext";
import { useRealtime } from "../context/RealtimeContext";
import { useAuth } from "../context/AuthContext";
import { CommentSheet } from "../components/CommentSheet";
import { ShareSheet } from "../components/ShareSheet";
import { MoreMenuSheet } from "../components/MoreMenuSheet";
import { StoryCreate } from "../components/StoryCreate";
import { api, resolveAvatarUrl, resolveMediaUrl } from "../api/client";
import { toast } from "sonner";
import { MediaImg } from "../components/media/MediaImg";
import { MediaVideo } from "../components/media/MediaVideo";

interface FeedPost {
  id: string;
  body: string;
  mediaUrl: string | null;
  mediaType: string | null;
  thumbUrl: string | null;
  postType: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  liked: boolean;
  reposted?: boolean;
  bookmarked?: boolean;
  stitchOfId?: string | null;
  carouselMedia?: string[] | null;
  author: {
    username: string;
    displayName: string;
    avatarUrl: string;
    isVerified: boolean;
  };
}

interface StoryFeedItem {
  userId: string;
  author: { username: string; displayName: string; avatarUrl: string };
  stories: unknown[];
  hasViewed: boolean;
}

const TABS = ["Following", "For You", "Live"];
type SheetType = "comments" | "share" | "more" | null;

interface LiveStreamItem {
  id: string;
  title: string;
  category: string;
  thumbnailUrl: string | null;
  viewerCount: number;
  startedAt: string;
  user: { username: string; displayName: string; avatarUrl: string };
}

interface FloatingHeart { id: string; x: number; y: number }

const TEXT_CARD_GRADIENTS = [
  "from-purple-900 via-indigo-900 to-black",
  "from-pink-900 via-rose-900 to-black",
  "from-indigo-900 via-blue-900 to-black",
  "from-emerald-900 via-teal-900 to-black",
  "from-orange-900 via-red-900 to-black",
];

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function CarouselSlider({ media }: { media: string[] }) {
  const [idx, setIdx] = useState(0);
  const startX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = startX.current - e.changedTouches[0].clientX;
    if (diff > 40 && idx < media.length - 1) setIdx(i => i + 1);
    else if (diff < -40 && idx > 0) setIdx(i => i - 1);
  };
  return (
    <div className="absolute inset-0" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <MediaImg src={resolveMediaUrl(media[idx]) ?? media[idx]} alt={`Slide ${idx + 1}`} className="w-full h-full object-contain" context="Home/carousel" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 pointer-events-none" />
      {/* Dots */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {media.map((_, i) => (
          <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
            className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-white scale-125" : "bg-white/40"}`} />
        ))}
      </div>
      {/* Arrow buttons (desktop) */}
      {idx > 0 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition z-10">
          ‹
        </button>
      )}
      {idx < media.length - 1 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition z-10">
          ›
        </button>
      )}
      <span className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full z-10">{idx + 1}/{media.length}</span>
    </div>
  );
}

export function Home() {
  const [activeTab, setActiveTab] = useState("For You");
  const [posts, setPosts]         = useState<FeedPost[]>([]);
  const [likedSet, setLikedSet]       = useState<Set<string>>(new Set());
  const [repostedSet, setRepostedSet] = useState<Set<string>>(new Set());
  const [bookmarkedSet, setBookmarkedSet] = useState<Set<string>>(new Set());
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);
  const [loading, setLoading]     = useState(true);

  const [suggestedUsers, setSuggestedUsers] = useState<{ username: string; avatarUrl: string; displayName: string }[]>([]);
  const [storiesFeed, setStoriesFeed] = useState<StoryFeedItem[]>([]);
  const [showStoryCreate, setShowStoryCreate] = useState(false);

  const [liveStreams, setLiveStreams] = useState<LiveStreamItem[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);

  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [sheetType, setSheetType]       = useState<SheetType>(null);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [feedMuted, setFeedMuted]       = useState(false);
  const lastTapRef = useRef<{ id: string; time: number }>({ id: "", time: 0 });

  const navigate = useNavigate();
  const location = useLocation();
  const { isFollowing, toggleFollow } = useSocial();
  const { subscribe, connected } = useRealtime();
  const { user } = useAuth();
  const [visibleItemId, setVisibleItemId] = useState<string | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());
  const observersRef = useRef<Map<string, IntersectionObserver>>(new Map());
  const visibleObsRef = useRef<Map<string, IntersectionObserver>>(new Map());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const completedRef = useRef<Set<string>>(new Set());
  const likingRef = useRef<Set<string>>(new Set());

  const fetchFeed = useCallback(async (tab: string, p: number, reset = false) => {
    try {
      setLoading(true);
      const tabParam = tab === "Following" ? "following" : "for_you";
      const data = await api.get<{ posts: FeedPost[]; page: number; hasMore: boolean }>(
        `/posts/feed?tab=${tabParam}&page=${p}`
      );
      setPosts(prev => reset ? data.posts : [...prev, ...data.posts]);
      setHasMore(data.hasMore);
      setPage(p);

      const initialLiked = new Set<string>();
      const initialReposted = new Set<string>();
      const initialBookmarked = new Set<string>();
      data.posts.forEach(post => {
        if (post.liked)     initialLiked.add(post.id);
        if (post.reposted)  initialReposted.add(post.id);
        if (post.bookmarked) initialBookmarked.add(post.id);
      });
      if (reset) {
        setLikedSet(initialLiked);
        setRepostedSet(initialReposted);
        setBookmarkedSet(initialBookmarked);
      } else {
        setLikedSet(prev => new Set([...prev, ...initialLiked]));
        setRepostedSet(prev => new Set([...prev, ...initialReposted]));
        setBookmarkedSet(prev => new Set([...prev, ...initialBookmarked]));
      }
    } catch (err) {
      console.error("Feed error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(activeTab, 1, true);
  }, [activeTab, fetchFeed]);

  // Refresh feed whenever Home is navigated to
  const prevPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevPathRef.current !== null && prevPathRef.current !== location.pathname && location.pathname === "/") {
      fetchFeed(activeTab, 1, true);
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  // Fetch suggested users to follow on mount
  useEffect(() => {
    api.get<{ users: { username: string; avatarUrl: string; displayName: string }[] } | { username: string; avatarUrl: string; displayName: string }[]>("/search/users?q=")
      .then(data => {
        const list = Array.isArray(data) ? data : (data as { users: { username: string; avatarUrl: string; displayName: string }[] }).users ?? [];
        setSuggestedUsers(list.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  // Fetch stories feed on mount
  useEffect(() => {
    api.get<StoryFeedItem[]>("/stories/feed")
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setStoriesFeed(data);
      })
      .catch(() => {
        // Hide strip on error
      });
  }, []);

  // Fetch live streams when Live tab is active
  useEffect(() => {
    if (activeTab !== "Live") return;
    setLoadingLive(true);
    const fetchLive = () =>
      api.get<LiveStreamItem[]>("/live/streams").then(setLiveStreams).catch(() => {});
    fetchLive().finally(() => setLoadingLive(false));
    const interval = setInterval(fetchLive, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Cleanup visibility observers on unmount
  useEffect(() => {
    return () => {
      visibleObsRef.current.forEach(obs => obs.disconnect());
    };
  }, []);

  // Play only the visible video, pause everything else
  useEffect(() => {
    videoRefs.current.forEach((video, id) => {
      if (id === visibleItemId) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [visibleItemId]);

  // Poll for new posts every 10 seconds when on page 1
  useEffect(() => {
    const interval = setInterval(() => {
      if (page === 1 && !loading) {
        const tabParam = activeTab === "Following" ? "following" : "for_you";
        api.get<{ posts: FeedPost[] }>(`/posts/feed?tab=${tabParam}&page=1`)
          .then(data => {
            setPosts(prev => {
              if (data.posts.length === 0) return prev;
              const existingIds = new Set(prev.map(p => p.id));
              const newPosts = data.posts.filter(p => !existingIds.has(p.id));
              if (newPosts.length === 0) return prev;
              setLikedSet(ls => {
                const n = new Set(ls);
                newPosts.forEach(p => { if (p.liked) n.add(p.id); });
                return n;
              });
              return [...newPosts, ...prev];
            });
          })
          .catch(() => {});
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [activeTab, page, loading]);

  // Real-time: update like/comment counts from WebSocket broadcasts
  useEffect(() => {
    return subscribe(event => {
      if (event.type === "post:like") {
        setPosts(prev => prev.map(p =>
          p.id === event.postId ? { ...p, likeCount: event.likeCount } : p
        ));
        // Sync liked heart state for multi-device (when another tab/device of the same user acts)
        if (user?.id && event.likedBy === user.id) {
          setLikedSet(prev => {
            const n = new Set(prev);
            event.isLiked ? n.add(event.postId) : n.delete(event.postId);
            return n;
          });
        }
      } else if (event.type === "post:comment") {
        setPosts(prev => prev.map(p =>
          p.id === event.postId ? { ...p, commentCount: event.commentCount } : p
        ));
      }
    });
  }, [subscribe, user?.id]);

  const toggleLike = async (postId: string) => {
    // Debounce: prevent double-tap like→unlike cycles
    if (likingRef.current.has(postId)) return;
    likingRef.current.add(postId);

    const isLiked = likedSet.has(postId);
    // Optimistic update
    setLikedSet(prev => { const n = new Set(prev); isLiked ? n.delete(postId) : n.add(postId); return n; });
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likeCount: p.likeCount + (isLiked ? -1 : 1) } : p));
    try {
      const resp = await (isLiked
        ? api.delete<{ liked: boolean; likeCount: number }>(`/posts/${postId}/like`)
        : api.post<{ liked: boolean; likeCount: number }>(`/posts/${postId}/like`, {}));
      // Sync authoritative count from server response
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likeCount: resp.likeCount } : p));
    } catch {
      // Revert on error
      setLikedSet(prev => { const n = new Set(prev); isLiked ? n.add(postId) : n.delete(postId); return n; });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likeCount: p.likeCount + (isLiked ? 1 : -1) } : p));
    } finally {
      likingRef.current.delete(postId);
    }
  };

  const handleTap = (e: React.MouseEvent<HTMLDivElement>, postId: string) => {
    const now = Date.now();
    const last = lastTapRef.current;
    if (last.id === postId && now - last.time < 350) {
      if (!likedSet.has(postId)) toggleLike(postId);
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const heartId = `${postId}-${now}`;
      setFloatingHearts(prev => [...prev, { id: heartId, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
      setTimeout(() => setFloatingHearts(prev => prev.filter(h => h.id !== heartId)), 900);
      lastTapRef.current = { id: "", time: 0 };
    } else {
      lastTapRef.current = { id: postId, time: now };
    }
  };

  const toggleBookmark = async (postId: string) => {
    const was = bookmarkedSet.has(postId);
    setBookmarkedSet(prev => { const n = new Set(prev); was ? n.delete(postId) : n.add(postId); return n; });
    try {
      if (was) await api.delete(`/bookmarks/${postId}`);
      else await api.post(`/bookmarks/${postId}`, {});
    } catch {
      setBookmarkedSet(prev => { const n = new Set(prev); was ? n.add(postId) : n.delete(postId); return n; });
    }
  };

  const handleRepost = async (item: FeedPost) => {
    const wasReposted = repostedSet.has(item.id);
    setRepostedSet(prev => { const n = new Set(prev); wasReposted ? n.delete(item.id) : n.add(item.id); return n; });
    try {
      const { reposted } = await api.post<{ reposted: boolean }>(`/posts/${item.id}/repost`, {});
      setRepostedSet(prev => { const n = new Set(prev); reposted ? n.add(item.id) : n.delete(item.id); return n; });
      toast(reposted ? "Added to your reposts" : "Removed from reposts");
    } catch {
      setRepostedSet(prev => { const n = new Set(prev); wasReposted ? n.add(item.id) : n.delete(item.id); return n; });
      toast("Failed to repost");
    }
  };

  const openSheet = (id: string, type: SheetType) => { setActiveItemId(id); setSheetType(type); };
  const closeSheet = () => { setSheetType(null); setActiveItemId(null); };
  const activePost = posts.find(p => p.id === activeItemId);

  if (loading && posts.length === 0) {
    return (
      <div className="h-full bg-black flex items-center justify-center">
        <Loader2 size={32} className="text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full bg-black relative flex flex-col overflow-hidden">
      {/* Tab header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-center gap-8 pt-3 pb-6 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pointer-events-auto text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === tab ? "text-white border-b-2 border-white pb-0.5" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab === "Live" && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
            {tab}
          </button>
        ))}
        {connected && (
          <span className="pointer-events-none absolute right-4 top-3.5 flex items-center gap-1 text-[10px] text-green-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Stories bar — only shown when there is feed data */}
      {storiesFeed.length > 0 && (
        <div className="absolute top-12 left-0 right-0 z-10 pointer-events-none">
          <div className="overflow-x-auto flex gap-3 px-3 py-2 pointer-events-auto">
            {/* Your Story button */}
            <button
              onClick={() => setShowStoryCreate(true)}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <div className="relative w-14 h-14 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={resolveMediaUrl(user.avatarUrl) ?? ""} alt="You" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-700" />
                )}
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center border-2 border-black">
                  <Plus size={10} className="text-white" />
                </div>
              </div>
              <span className="text-[10px] text-gray-300 truncate w-14 text-center">Your story</span>
            </button>

            {/* Other stories */}
            {storiesFeed.map(item => (
              <button
                key={item.userId}
                onClick={() => navigate(`/story/${item.author.username}`)}
                className="flex flex-col items-center gap-1 flex-shrink-0"
              >
                <div className={`w-14 h-14 rounded-full p-0.5 ${item.hasViewed ? "bg-gray-600" : "bg-gradient-to-tr from-purple-600 to-pink-500"}`}>
                  <img
                    src={resolveAvatarUrl(item.author.avatarUrl)}
                    alt={item.author.username}
                    className="w-full h-full rounded-full object-cover border-2 border-black"
                  />
                </div>
                <span className="text-[10px] text-gray-300 truncate w-14 text-center">{item.author.username}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Story create modal */}
      {showStoryCreate && (
        <StoryCreate
          onClose={() => setShowStoryCreate(false)}
          onCreated={() => {
            setShowStoryCreate(false);
            // Refresh stories feed
            api.get<StoryFeedItem[]>("/stories/feed")
              .then(data => { if (Array.isArray(data) && data.length > 0) setStoriesFeed(data); })
              .catch(() => {});
          }}
        />
      )}

      {/* Live tab content */}
      {activeTab === "Live" && (
        <div className="flex-1 overflow-y-auto mt-12">
          <div className="pb-24">
            {/* Go Live button */}
            <div className="px-4 pt-4 pb-2">
              <button
                onClick={() => navigate("/go-live")}
                className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-base shadow-lg shadow-red-900/30"
              >
                <Radio size={20} /> Go Live
              </button>
            </div>

            {loadingLive ? (
              <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-red-400" /></div>
            ) : liveStreams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-8">
                <Radio size={40} className="text-gray-700" />
                <p className="text-gray-500 font-medium">No one is live right now</p>
                <p className="text-gray-700 text-sm">Be the first to go live!</p>
              </div>
            ) : (
              <div className="px-4 space-y-3 pt-2">
                {liveStreams.map(stream => (
                  <div key={stream.id} onClick={() => navigate(`/live/${stream.user.username}`)}
                    className="flex gap-3 items-center bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden cursor-pointer hover:border-gray-700 transition p-3">
                    <div className="w-20 h-14 rounded-xl bg-gray-800 flex-shrink-0 overflow-hidden relative">
                      {stream.thumbnailUrl
                        ? <img src={stream.thumbnailUrl} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gradient-to-br from-red-900 to-pink-900 flex items-center justify-center"><Radio size={20} className="text-red-400" /></div>}
                      <span className="absolute top-1 left-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">LIVE</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{stream.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <img src={resolveMediaUrl(stream.user.avatarUrl) ?? ""} className="w-4 h-4 rounded-full" />
                        <span className="text-gray-400 text-xs">{stream.user.displayName}</span>
                        <span className="text-gray-600 text-xs">· {stream.category}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Users size={11} className="text-gray-500" />
                        <span className="text-gray-500 text-xs">{(stream.viewerCount ?? 0).toLocaleString()} watching</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feed */}
      {activeTab !== "Live" && (
      <div className="flex-1 snap-y snap-mandatory overflow-y-auto">
        {posts.length === 0 && !loading ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            {activeTab === "Following" ? "Follow people to see their posts here" : "No posts yet"}
          </div>
        ) : (
          posts.map((item, idx) => {
            const isLiked = likedSet.has(item.id);
            const showSuggestions = idx === 3 && activeTab === "For You" && suggestedUsers.length > 0;

            return (
              <div key={item.id} className="h-[calc(100vh-56px)] w-full snap-start relative flex justify-center items-center"
                ref={el => {
                  if (!el) return;

                  // One-shot view-count observer
                  if (!observersRef.current.has(item.id)) {
                    const obs = new IntersectionObserver(entries => {
                      if (entries[0].isIntersecting && !viewedRef.current.has(item.id)) {
                        viewedRef.current.add(item.id);
                        obs.disconnect();
                        observersRef.current.delete(item.id);
                        api.post(`/posts/${item.id}/view`).catch(() => {});
                      }
                    }, { threshold: 0.5 });
                    observersRef.current.set(item.id, obs);
                    obs.observe(el);
                  }

                  // Persistent visibility observer — tracks which item is on screen
                  if (!visibleObsRef.current.has(item.id)) {
                    const vobs = new IntersectionObserver(entries => {
                      if (entries[0].isIntersecting) setVisibleItemId(item.id);
                    }, { threshold: 0.6 });
                    visibleObsRef.current.set(item.id, vobs);
                    vobs.observe(el);
                  }
                }}
              >
                <div
                  className="relative w-full max-w-[450px] h-full md:h-[90%] md:rounded-2xl overflow-hidden bg-gray-900 group"
                  onClick={(e) => handleTap(e, item.id)}
                >
                  {/* Stitch attribution badge */}
                  {item.stitchOfId && (
                    <div className="absolute top-12 left-3 z-20 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 border border-white/10">
                      <span className="text-purple-400 text-xs font-bold">✂</span>
                      <span className="text-white text-xs font-semibold">Stitch</span>
                    </div>
                  )}

                  {/* Carousel */}
                  {item.carouselMedia && item.carouselMedia.length > 0 ? (
                    <CarouselSlider media={item.carouselMedia} />
                  ) : item.mediaUrl ? (
                    <>
                      {item.mediaType === "video" ? (
                        <MediaVideo
                          ref={el => { if (el) videoRefs.current.set(item.id, el); else videoRefs.current.delete(item.id); }}
                          src={resolveMediaUrl(item.mediaUrl) ?? ""}
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                          muted={feedMuted || item.id !== visibleItemId}
                          loop
                          playsInline
                          preload="metadata"
                          context={`Home/feed/post:${item.id}`}
                          onClick={e => e.stopPropagation()}
                          onTimeUpdate={e => {
                            const v = e.currentTarget;
                            if (!v.duration || completedRef.current.has(item.id)) return;
                            if (v.currentTime / v.duration >= 0.8) {
                              completedRef.current.add(item.id);
                              api.post(`/posts/${item.id}/complete`, {}).catch(() => {});
                            }
                          }}
                        />
                      ) : (
                        <MediaImg
                          src={resolveMediaUrl(item.mediaUrl) ?? ""}
                          alt="Post"
                          className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                          context={`Home/feed/post:${item.id}`}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 pointer-events-none" />
                      {item.mediaType === "video" && (
                        <button
                          onClick={e => { e.stopPropagation(); setFeedMuted(m => !m); }}
                          className="absolute top-3 right-3 z-20 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 hover:bg-black/70 transition"
                        >
                          {feedMuted
                            ? <VolumeX size={16} className="text-white" />
                            : <Volume2 size={16} className="text-white" />}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-b ${TEXT_CARD_GRADIENTS[idx % TEXT_CARD_GRADIENTS.length]} flex items-center justify-center p-8`}>
                      <p className="text-white text-xl font-semibold text-center leading-relaxed line-clamp-6">{item.body}</p>
                    </div>
                  )}

                  {floatingHearts.map((h) => (
                    <div key={h.id} className="absolute pointer-events-none select-none z-30"
                      style={{ left: h.x - 24, top: h.y - 24, animation: "floatUp 0.9s ease-out forwards" }}>
                      <Heart size={48} className="fill-pink-500 text-pink-500 drop-shadow-lg" />
                    </div>
                  ))}

                  {/* Bottom content */}
                  <div className="absolute bottom-20 left-0 right-16 p-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/user/${item.author.username}`); }}
                      className="font-bold text-base mb-1 text-left hover:text-purple-300 transition text-white block"
                    >
                      @{item.author.username}
                      {item.author.isVerified && <span className="ml-1 text-blue-400 text-xs">✓</span>}
                    </button>
                    {item.mediaUrl && (
                      <p className="text-sm text-gray-200 line-clamp-2 mb-2">{item.body}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-300">
                      <Music2 size={12} />
                      <span className="truncate max-w-[200px]">Original Sound · {item.author.displayName}</span>
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="absolute bottom-20 right-2 flex flex-col items-center gap-5">
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/user/${item.author.username}`); }}
                        className="w-11 h-11 rounded-full border-2 border-white overflow-hidden block"
                      >
                        <img src={resolveAvatarUrl(item.author.avatarUrl)} alt={item.author.username} className="w-full h-full bg-gray-800 object-cover" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFollow(item.author.username); }}
                        className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center border-2 border-black text-[9px] font-bold transition ${
                          isFollowing(item.author.username) ? "bg-green-500" : "bg-gradient-to-r from-purple-600 to-pink-600"
                        }`}
                      >
                        {isFollowing(item.author.username) ? <Check size={10} className="text-white" /> : <Plus size={10} className="text-white" />}
                      </button>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); toggleLike(item.id); }}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className={`p-2.5 rounded-full backdrop-blur-sm transition-colors ${isLiked ? "bg-pink-600/60" : "bg-gray-800/60 hover:bg-gray-700/60"}`}>
                        <Heart size={22} className={isLiked ? "text-white fill-white" : "text-white"} />
                      </div>
                      <span className="text-xs font-semibold text-white">{formatCount(item.likeCount)}</span>
                    </button>

                    <button onClick={(e) => { e.stopPropagation(); openSheet(item.id, "comments"); }} className="flex flex-col items-center gap-1">
                      <div className="p-2.5 bg-gray-800/60 rounded-full hover:bg-gray-700/60 backdrop-blur-sm transition-colors">
                        <MessageCircle size={22} className="text-white" />
                      </div>
                      <span className="text-xs font-semibold text-white">{formatCount(item.commentCount)}</span>
                    </button>

                    <button onClick={(e) => { e.stopPropagation(); openSheet(item.id, "share"); }} className="flex flex-col items-center gap-1">
                      <div className="p-2.5 bg-gray-800/60 rounded-full hover:bg-gray-700/60 backdrop-blur-sm transition-colors">
                        <Share2 size={22} className="text-white" />
                      </div>
                      <span className="text-xs font-semibold text-white">{formatCount(item.shareCount)}</span>
                    </button>

                    <button onClick={(e) => { e.stopPropagation(); openSheet(item.id, "more"); }} className="p-2">
                      <MoreHorizontal size={22} className="text-white" />
                    </button>
                  </div>
                </div>

                {/* Who to follow suggestion strip */}
                {showSuggestions && (
                  <div className="absolute top-14 left-0 right-0 z-10 px-3">
                    <div className="bg-gray-950/90 border border-gray-800 rounded-2xl p-3 backdrop-blur-md">
                      <p className="text-white text-sm font-bold mb-3">People you might like</p>
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {suggestedUsers.map(u => (
                          <div key={u.username} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16">
                            <img
                              src={resolveAvatarUrl(u.avatarUrl)}
                              alt={u.username}
                              className="w-12 h-12 rounded-full bg-gray-800 object-cover border border-gray-700"
                            />
                            <span className="text-[10px] text-gray-300 truncate w-full text-center">@{u.username}</span>
                            <button
                              onClick={e => { e.stopPropagation(); toggleFollow(u.username); }}
                              className={`w-full text-[10px] font-bold py-1 rounded-full transition ${
                                isFollowing(u.username)
                                  ? "bg-gray-700 text-gray-300"
                                  : "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                              }`}
                            >
                              {isFollowing(u.username) ? "Following" : "Follow"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Load more trigger */}
                {idx === posts.length - 2 && hasMore && !loading && (
                  <div className="absolute bottom-0 w-px h-px"
                    ref={el => {
                      if (!el) return;
                      const obs = new IntersectionObserver(entries => {
                        if (entries[0].isIntersecting) {
                          obs.disconnect();
                          fetchFeed(activeTab, page + 1);
                        }
                      });
                      obs.observe(el);
                    }}
                  />
                )}
              </div>
            );
          })
        )}

        {loading && posts.length > 0 && (
          <div className="h-24 flex items-center justify-center">
            <Loader2 size={24} className="text-purple-400 animate-spin" />
          </div>
        )}
      </div>
      )}

      <style>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: scale(0.5); }
          40%  { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(1) translateY(-80px); }
        }
      `}</style>

      <CommentSheet
        isOpen={sheetType === "comments"}
        onClose={closeSheet}
        count={String(activePost?.commentCount ?? 0)}
        postId={activeItemId ?? undefined}
      />
      <ShareSheet
        isOpen={sheetType === "share"}
        onClose={closeSheet}
        url={`https://kliq.app/watch/${activeItemId}`}
        onRepost={activePost ? () => { handleRepost(activePost); closeSheet(); } : undefined}
      />
      <MoreMenuSheet
        isOpen={sheetType === "more"}
        onClose={closeSheet}
        postId={activeItemId ?? undefined}
        authorUsername={activePost?.author.username}
        isOwnPost={activePost?.author.username === user?.username}
        isSaved={activePost ? bookmarkedSet.has(activePost.id) : false}
        isPinned={!!(activePost as unknown as { pinnedAt: string | null } | null)?.pinnedAt}
        onSave={activePost ? () => toggleBookmark(activePost.id) : undefined}
        onStitch={activePost && activePost.author.username !== user?.username
          ? () => { closeSheet(); navigate("/create", { state: { stitchOfId: activePost.id, stitchCaption: activePost.body } }); }
          : undefined}
      />
    </div>
  );
}
