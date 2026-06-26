import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize2, SkipForward, SkipBack, ThumbsUp } from "lucide-react";
import { api, resolveMediaUrl } from "../api/client";

interface StreamPost {
  id: string;
  body: string;
  mediaUrl: string | null;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  liked: boolean;
  author: { username: string; displayName: string; avatarUrl: string; isVerified: boolean };
}

export function KliqStreamWatch() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [post, setPost] = useState<StreamPost | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [liked, setLiked] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get<StreamPost>(`/posts/${id}`).then(p => { setPost(p); setLiked(p.liked); }).catch(() => {});
    api.post(`/posts/${id}/view`, {}).catch(() => {});
  }, [id]);

  const resetHideTimer = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };

  const seek = (pct: number) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    v.currentTime = (pct / 100) * duration;
    setProgress(pct);
  };

  const skip = (secs: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + secs));
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const fmtTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!post) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black flex flex-col" onMouseMove={resetHideTimer}>
      {/* Video area */}
      <div className="flex-1 relative cursor-pointer" onClick={togglePlay}>
        {post.mediaUrl ? (
          <video
            ref={videoRef}
            src={resolveMediaUrl(post.mediaUrl) ?? ""}
            className="w-full h-full object-contain"
            playsInline
            onTimeUpdate={e => {
              const v = e.currentTarget;
              if (v.duration) setProgress((v.currentTime / v.duration) * 100);
            }}
            onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        ) : (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <p className="text-gray-500 text-sm">No video available</p>
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />

        {/* Back button */}
        <button
          onClick={e => { e.stopPropagation(); navigate(-1); }}
          className={`absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full font-medium hover:bg-black/80 transition ${showControls ? "opacity-100" : "opacity-0"}`}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Title top right */}
        <div className={`absolute top-4 right-4 text-right transition ${showControls ? "opacity-100" : "opacity-0"}`}>
          <p className="text-white font-bold text-lg drop-shadow-lg line-clamp-1 max-w-xs">{post.body}</p>
          <p className="text-white/70 text-sm">{post.author.displayName}</p>
        </div>

        {/* Center play icon (when paused) */}
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition ${playing ? "opacity-0" : "opacity-100"}`}>
          <div className="w-20 h-20 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Play size={36} className="text-white fill-white ml-2" />
          </div>
        </div>

        {/* Controls overlay */}
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 transition ${showControls ? "opacity-100" : "opacity-0"}`}>
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-white/70 text-xs mb-2">
              <span>{fmtTime((progress / 100) * duration)}</span>
              <span>{fmtTime(duration)}</span>
            </div>
            <div
              className="w-full h-1 bg-white/30 rounded-full cursor-pointer relative"
              onClick={e => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                seek(Math.round(((e.clientX - rect.left) / rect.width) * 100));
              }}
            >
              <div className="h-full bg-white rounded-full relative" style={{ width: `${progress}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full -translate-x-1/2" />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-4">
            <button onClick={e => { e.stopPropagation(); skip(-10); }} className="p-2 hover:bg-white/10 rounded-full transition text-white">
              <SkipBack size={22} />
            </button>
            <button onClick={e => { e.stopPropagation(); togglePlay(); }}
              className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition">
              {playing ? <Pause size={22} className="text-black" /> : <Play size={22} className="text-black fill-black ml-0.5" />}
            </button>
            <button onClick={e => { e.stopPropagation(); skip(10); }} className="p-2 hover:bg-white/10 rounded-full transition text-white">
              <SkipForward size={22} />
            </button>
            <button onClick={e => { e.stopPropagation(); toggleMute(); }} className="p-2 hover:bg-white/10 rounded-full transition text-white">
              {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>
            <button
              onClick={e => { e.stopPropagation(); setLiked(p => !p); }}
              className={`p-2 rounded-full transition ${liked ? "text-pink-400" : "text-white hover:bg-white/10"}`}>
              <ThumbsUp size={22} className={liked ? "fill-pink-400" : ""} />
            </button>
            <div className="flex-1" />
            <button
              onClick={e => { e.stopPropagation(); videoRef.current?.requestFullscreen?.(); }}
              className="p-2 hover:bg-white/10 rounded-full transition text-white">
              <Maximize2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="bg-gray-950 px-6 py-4 flex items-center gap-4 border-t border-gray-800">
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-bold text-base truncate">{post.body}</h2>
          <p className="text-gray-400 text-xs">{post.author.displayName}</p>
        </div>
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white text-sm transition">Close</button>
      </div>
    </div>
  );
}
