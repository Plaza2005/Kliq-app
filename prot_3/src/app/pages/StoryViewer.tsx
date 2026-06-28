import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { X, Heart, Send, Upload, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useSocial } from "../context/SocialContext";
import { api, resolveAvatarUrl, resolveMediaUrl } from "../api/client";

interface StorySlide {
  id: string;
  mediaUrl: string;
  mediaType: string; // "image" | "video"
  body: string | null;
  createdAt: string;
  expiresAt: string;
  viewCount: number;
}

interface StoryUser {
  userId: string;
  author: { id: string; username: string; displayName: string; avatarUrl: string };
  stories: StorySlide[];
  hasViewed: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function StoryViewer() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { isFollowing, toggleFollow } = useSocial();

  const [storyFeed, setStoryFeed] = useState<StoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [currentUser, setCurrentUser] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [reply, setReply] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartY = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());

  // Fetch stories feed on mount
  useEffect(() => {
    api.get<StoryUser[]>("/stories/feed")
      .then(feed => {
        setStoryFeed(feed);
        // Find the starting user index based on username param
        const idx = feed.findIndex(u => u.author.username === username);
        setCurrentUser(idx >= 0 ? idx : 0);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [username]);

  const storyData = storyFeed[currentUser];
  const slides = storyData?.stories ?? [];
  const slide = slides[currentSlide];

  // Record view (fire and forget)
  const recordView = useCallback((storyId: string) => {
    if (viewedRef.current.has(storyId)) return;
    viewedRef.current.add(storyId);
    api.post(`/stories/${storyId}/view`).catch(() => {});
  }, []);

  // Record view when slide changes
  useEffect(() => {
    if (slide?.id) recordView(slide.id);
  }, [slide?.id, recordView]);

  // Auto-advance progress timer
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // goNext via ref so the interval timer always sees the latest state
  const goNextRef = useRef<() => void>(() => {});
  goNextRef.current = () => {
    const curSlides = storyFeed[currentUser]?.stories ?? [];
    if (currentSlide < curSlides.length - 1) {
      setCurrentSlide(i => i + 1);
      setProgress(0);
    } else if (currentUser < storyFeed.length - 1) {
      setCurrentUser(u => u + 1);
      setCurrentSlide(0);
      setProgress(0);
    } else {
      navigate(-1);
    }
  };

  const goNext = useCallback(() => goNextRef.current(), []);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(i => i - 1);
      setProgress(0);
    } else if (currentUser > 0) {
      setCurrentUser(u => u - 1);
      setCurrentSlide(0);
      setProgress(0);
    }
  }, [currentSlide, currentUser]);

  // Start progress timer for current slide (images only — 5s auto-advance)
  useEffect(() => {
    setProgress(0);
    setLiked(false);
    clearTimer();

    if (!slide) return;

    const isImage = !slide.mediaType?.startsWith("video");
    if (!isImage) return; // video handles auto-advance via onEnded

    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearTimer();
          goNextRef.current();
          return 100;
        }
        return prev + 2; // 50 steps × 100ms = 5s
      });
    }, 100);

    return clearTimer;
  }, [currentSlide, currentUser, slide?.id, clearTimer]); // eslint-disable-line react-hooks/exhaustive-deps

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dy = Math.max(0, e.touches[0].clientY - touchStartY.current);
    setDragY(dy);
  };

  const onTouchEnd = () => {
    setDragging(false);
    if (dragY > 120) {
      navigate(-1);
    } else {
      setDragY(0);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <Loader2 size={32} className="animate-spin text-purple-400" />
      </div>
    );
  }

  if (error || storyFeed.length === 0 || !storyData) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 gap-4">
        <p className="text-white text-lg font-semibold">No stories available</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-full hover:bg-gray-800 transition"
        >
          <ChevronLeft size={18} /> Go back
        </button>
      </div>
    );
  }

  const isOwn = false; // adjust if you have a "Your Story" concept
  const avatarUrl = resolveMediaUrl(storyData.author.avatarUrl)
    ?? "/avatar-default.svg";

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col z-50"
      style={{
        transform: dragY > 0 ? `translateY(${dragY}px) scale(${1 - dragY / 2000})` : "none",
        transition: dragging ? "none" : "transform 0.3s ease",
        borderRadius: dragY > 20 ? `${Math.min(dragY / 4, 24)}px` : "0",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* User story dots at top */}
      <div className="absolute top-0 left-0 right-0 z-20 px-3 pt-3 space-y-1">
        {/* User avatars strip */}
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {storyFeed.map((u, i) => (
            <button
              key={u.author.username}
              onClick={(e) => { e.stopPropagation(); setCurrentUser(i); setCurrentSlide(0); setProgress(0); }}
              className={`flex-shrink-0 w-8 h-8 rounded-full border-2 transition ${i === currentUser ? "border-white scale-110" : "border-white/40 opacity-60"}`}
            >
              <img
                src={resolveAvatarUrl(u.author.avatarUrl)}
                alt={u.author.username}
                className="w-full h-full rounded-full bg-gray-800 object-cover"
              />
            </button>
          ))}
        </div>

        {/* Slide progress bars */}
        <div className="flex gap-1">
          {slides.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{ width: i < currentSlide ? "100%" : i === currentSlide ? `${progress}%` : "0%" }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-14 left-0 right-0 z-20 flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <img
            src={avatarUrl}
            alt={storyData.author.username}
            className="w-9 h-9 rounded-full bg-gray-800 border-2 border-white object-cover"
          />
          <div>
            <p className="text-white font-semibold text-sm">{storyData.author.username}</p>
            <p className="text-white/60 text-xs">{slide ? timeAgo(slide.createdAt) : ""}</p>
          </div>
          {!isOwn && (
            <button
              onClick={() => toggleFollow(storyData.author.username)}
              className={`text-xs font-bold px-3 py-1 rounded-full transition ${isFollowing(storyData.author.username)
                ? "bg-white/20 text-white"
                : "bg-white text-black"}`}
            >
              {isFollowing(storyData.author.username) ? "Following" : "Follow"}
            </button>
          )}
        </div>
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition">
          <X size={22} className="text-white" />
        </button>
      </div>

      {/* Story media */}
      <div className="flex-1 relative" onClick={goNext}>
        {slide?.mediaType?.startsWith("video") ? (
          <video
            key={slide.id}
            src={resolveMediaUrl(slide.mediaUrl) ?? ""}
            autoPlay
            playsInline
            muted={false}
            className="w-full h-full object-cover"
            onEnded={goNext}
            onTimeUpdate={(e) => {
              const vid = e.currentTarget;
              if (vid.duration > 0) {
                setProgress((vid.currentTime / vid.duration) * 100);
              }
            }}
          />
        ) : (
          <img
            src={resolveMediaUrl(slide?.mediaUrl) ?? ""}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

        {/* Tap zones */}
        <button className="absolute left-0 top-0 bottom-0 w-1/3" onClick={e => { e.stopPropagation(); goPrev(); }} />
        <button className="absolute right-0 top-0 bottom-0 w-1/3" onClick={e => { e.stopPropagation(); goNext(); }} />

        {/* Navigation arrows (desktop) */}
        <button onClick={e => { e.stopPropagation(); goPrev(); }}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full items-center justify-center transition">
          <ChevronLeft size={20} className="text-white" />
        </button>
        <button onClick={e => { e.stopPropagation(); goNext(); }}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full items-center justify-center transition">
          <ChevronRight size={20} className="text-white" />
        </button>

        {/* Caption / body */}
        {slide?.body && (
          <div className="absolute bottom-24 left-4 right-4">
            <p className="text-white font-semibold text-lg drop-shadow-lg">{slide.body}</p>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {isOwn ? (
        <div className="p-4 flex gap-3">
          <button
            onClick={() => setShowUpload(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold py-3 rounded-2xl hover:bg-white/20 transition"
          >
            <Upload size={18} /> Upload Private Story
          </button>
        </div>
      ) : (
        <div className="p-4 flex items-center gap-3">
          <div className="flex-1 flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2.5 gap-2">
            <input
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder={`Reply to ${storyData.author.username}...`}
              className="flex-1 bg-transparent text-white text-sm placeholder-white/50 focus:outline-none"
            />
          </div>
          <button onClick={() => setLiked(p => !p)} className="p-3 hover:bg-white/10 rounded-full transition">
            <Heart size={24} className={liked ? "fill-pink-500 text-pink-500" : "text-white"} />
          </button>
          <button className="p-3 hover:bg-white/10 rounded-full transition">
            <Send size={24} className="text-white" />
          </button>
        </div>
      )}

      {/* Upload dialog */}
      {showUpload && (
        <div className="absolute inset-0 bg-black/80 flex items-end z-30">
          <div className="w-full bg-gray-950 border-t border-gray-800 rounded-t-3xl p-6">
            <h3 className="text-white font-bold text-lg mb-4">Upload Private Story</h3>
            <p className="text-gray-400 text-sm mb-4">This content is only visible to mutual followers.</p>
            <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center mb-4 cursor-pointer hover:border-purple-600 transition">
              <Upload size={32} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">Select video or photo</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowUpload(false)} className="flex-1 border border-gray-700 text-white py-3 rounded-xl font-medium">Cancel</button>
              <button onClick={() => { setShowUpload(false); }}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold">Upload</button>
            </div>
          </div>
        </div>
      )}

      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
}
