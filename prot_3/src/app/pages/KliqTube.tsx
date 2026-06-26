import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router";
import { api, resolveMediaUrl } from "../api/client";

function useVideoFirstFrame(videoUrl: string | null): string | null {
  const [frame, setFrame] = useState<string | null>(null);
  useEffect(() => {
    if (!videoUrl) return;
    let cancelled = false;
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.src = videoUrl;
    const onSeeked = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const url = canvas.toDataURL("image/jpeg", 0.75);
          if (url && url !== "data:,") setFrame(url);
        } catch { /* CORS blocked */ }
      }
      video.src = "";
    };
    const onMeta = () => { video.currentTime = 0.5; };
    video.addEventListener("loadedmetadata", onMeta, { once: true });
    video.addEventListener("seeked", onSeeked, { once: true });
    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("seeked", onSeeked);
      video.src = "";
    };
  }, [videoUrl]);
  return frame;
}

const CATEGORIES = ["All", "Music", "Gaming", "Education", "Comedy", "Tech", "Sports", "News", "Cooking"];

interface TubePost {
  id: string;
  body: string;
  title?: string;
  mediaUrl: string | null;
  thumbUrl?: string | null;
  duration?: number | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string; isVerified?: boolean };
}

function fmtDuration(seconds: number): string {
  const s = seconds % 60;
  const totalMin = Math.floor(seconds / 60);
  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60);
    return `${h}:${String(totalMin % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${totalMin}:${String(s).padStart(2, "0")}`;
}

function fmtViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function getFallbackThumb(post: TubePost): string {
  return `https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=640&q=80&sig=${post.id}`;
}

function TubeCard({ post }: { post: TubePost }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const resolvedVideoUrl = post.mediaUrl ? (resolveMediaUrl(post.mediaUrl) ?? post.mediaUrl) : null;
  const autoFrame = useVideoFirstFrame(!post.thumbUrl ? resolvedVideoUrl : null);

  const playPreview = () => {
    if (videoRef.current && post.mediaUrl) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setHovered(true);
    }
  };

  const stopPreview = () => {
    videoRef.current?.pause();
    setHovered(false);
  };

  // Mobile: play when card enters viewport (70% visible)
  useEffect(() => {
    if (!videoRef.current || !post.mediaUrl) return;
    const isMobile = window.matchMedia("(pointer: coarse)").matches;
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
          videoRef.current?.play().catch(() => {});
          setHovered(true);
        } else {
          videoRef.current?.pause();
          setHovered(false);
        }
      },
      { threshold: 0.7 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [post.mediaUrl]);

  const thumbSrc = post.thumbUrl
    ? (resolveMediaUrl(post.thumbUrl) ?? post.thumbUrl)
    : (autoFrame ?? getFallbackThumb(post));

  return (
    <div
      ref={cardRef}
      className="cursor-pointer group"
      onMouseEnter={playPreview}
      onMouseLeave={stopPreview}
      onClick={() => navigate(`/klixtube/watch/${post.id}`)}
    >
      {/* 16:9 thumbnail/preview container */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-900 mb-3">
        {/* Thumbnail image */}
        <img
          src={thumbSrc}
          alt={post.title ?? post.body}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${hovered ? "opacity-0" : "opacity-100"}`}
        />
        {/* Video preview */}
        {post.mediaUrl && (
          <video
            ref={videoRef}
            src={resolveMediaUrl(post.mediaUrl) ?? ""}
            muted
            playsInline
            preload="none"
            loop
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${hovered ? "opacity-100" : "opacity-0"}`}
          />
        )}
        {/* Duration badge */}
        {post.duration != null && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
            {fmtDuration(post.duration)}
          </span>
        )}
      </div>

      {/* Video info row */}
      <div className="flex gap-3 px-1">
        {/* Channel avatar */}
        <img
          src={resolveMediaUrl(post.author.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author.username}`}
          alt={post.author.displayName}
          className="w-9 h-9 rounded-full object-cover bg-gray-800 flex-shrink-0 mt-0.5 cursor-pointer"
          onClick={e => { e.stopPropagation(); navigate(`/klixtube/channel/${post.author.username}`); }}
        />
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="text-white font-semibold text-sm leading-snug line-clamp-2 mb-1">
            {post.title ?? post.body ?? "Untitled"}
          </p>
          {/* Channel name */}
          <p
            className="text-gray-400 text-xs hover:text-gray-200 transition cursor-pointer"
            onClick={e => { e.stopPropagation(); navigate(`/klixtube/channel/${post.author.username}`); }}
          >
            {post.author.displayName}
            {post.author.isVerified && <span className="ml-1 text-gray-500">✓</span>}
          </p>
          {/* Views · time */}
          <p className="text-gray-500 text-xs">
            {fmtViews(post.viewCount)} views · {timeAgo(post.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function KliqTube() {
  const [posts, setPosts] = useState<TubePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    api
      .get<TubePost[]>("/posts/tube")
      .then(data => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = posts.filter(p => {
    const matchesSearch = search
      ? (p.body + (p.title ?? "")).toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesCategory = activeCategory === "All"
      ? true
      : (p.body + (p.title ?? "")).toLowerCase().includes(activeCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-full bg-[#0f0f0f] pb-24">
      {/* YouTube-style top bar */}
      <div className="sticky top-0 z-10 bg-[#0f0f0f]/95 backdrop-blur px-4 py-3 border-b border-gray-900 flex items-center gap-3">
        {/* KliqTube logo */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-white font-black text-lg tracking-tight">Kliq</span>
          <span className="text-purple-400 font-bold text-xs bg-purple-500/20 px-1.5 py-0.5 rounded-md">Tube</span>
        </div>
        {/* Search */}
        <div className="flex-1 flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full px-4 py-2">
          <Search size={14} className="text-gray-500 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search videos"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-600"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
              activeCategory === cat
                ? "bg-white text-black"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-gray-800 rounded-xl mb-3" />
              <div className="flex gap-3">
                <div className="w-9 h-9 bg-gray-800 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-800 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-14 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
            <span className="text-gray-600 text-xl">▶</span>
          </div>
          <p className="text-gray-500 font-medium">No videos yet</p>
          <p className="text-gray-700 text-sm text-center px-8">Be the first to upload a KliqTube video</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {filtered.map(post => (
            <TubeCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
