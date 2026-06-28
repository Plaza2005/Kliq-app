import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize2, Loader2, SkipForward, PictureInPicture2 } from "lucide-react";
import { api, resolveMediaUrl } from "../api/client";

interface WatchResponse {
  mediaUrl: string;
  title: string;
  episodeNumber?: number;
  seriesTitle?: string;
  titleId?: string;
  nextEpisodeId?: string | null;
  locked?: boolean;
  requiredTier?: string;
  duration?: number | null;
}

function fmtTime(secs: number): string {
  if (!isFinite(secs)) return "0:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function KliqStreamPlayer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMovie = searchParams.get("type") === "movie";

  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [data, setData] = useState<WatchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ageRestricted, setAgeRestricted] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const INTRO_SKIP_SECS = 30;

  // Fetch watch data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get<WatchResponse>(`/kliqstream/watch/${id}${isMovie ? "?type=movie" : ""}`)
      .then(d => setData(d))
      .catch((err: Error) => {
        const msg = err.message ?? "";
        if (msg.toLowerCase().includes("age") || msg.toLowerCase().includes("18")) {
          setAgeRestricted(true);
        } else {
          setErrorMsg(msg || "Content unavailable");
        }
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [id, isMovie]);

  // Auto-hide controls after 3s
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3000);
  }, []);

  // Spacebar play/pause
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Show controls initially
  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [resetHideTimer]);

  // Restore and save watch progress
  useEffect(() => {
    if (!id) return;

    api.get<{ progressS: number }>(`/kliqstream/progress/${id}`).then(p => {
      if (p.progressS > 10 && videoRef.current) videoRef.current.currentTime = p.progressS;
    }).catch(() => {});

    const save = () => {
      const el = videoRef.current;
      if (!el) return;
      api.post("/kliqstream/progress", {
        contentId: id,
        contentType: isMovie ? "movie" : "episode",
        progressS: Math.floor(el.currentTime),
        durationS: isFinite(el.duration) ? Math.floor(el.duration) : undefined,
      }).catch(() => {});
    };
    const interval = setInterval(save, 10000);
    const el = videoRef.current;
    el?.addEventListener("pause", save);
    el?.addEventListener("ended", save);
    return () => {
      clearInterval(interval);
      el?.removeEventListener("pause", save);
      el?.removeEventListener("ended", save);
      save();
    };
  }, [id, isMovie]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
    } else {
      v.pause();
      setShowControls(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    const val = parseFloat(e.target.value);
    if (!v) return;
    v.currentTime = val;
    setCurrentTime(val);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    const val = parseFloat(e.target.value);
    if (!v) return;
    v.volume = val;
    setVolume(val);
    setMuted(val === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const handleFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <Loader2 size={40} className="animate-spin text-red-500" />
      </div>
    );
  }

  // Age restriction gate
  if (ageRestricted) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 gap-5 px-6 text-center">
        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-700">
          <span className="text-3xl">🔞</span>
        </div>
        <p className="text-white font-bold text-xl">Mature Content</p>
        <p className="text-gray-400 text-sm max-w-xs">
          This content is rated 18+. You must verify your age in your profile settings to continue.
        </p>
        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="px-5 py-2.5 rounded-md bg-zinc-800 text-white text-sm font-semibold hover:bg-zinc-700 transition flex items-center gap-2">
            <ArrowLeft size={15} /> Go Back
          </button>
          <button onClick={() => navigate("/edit-profile")} className="px-5 py-2.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition">
            Update Profile
          </button>
        </div>
      </div>
    );
  }

  // Generic error
  if (errorMsg && !data) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 gap-4 px-6 text-center">
        <p className="text-white font-bold text-lg">{errorMsg}</p>
        <button onClick={() => navigate(-1)} className="px-5 py-2.5 rounded-md bg-zinc-800 text-white text-sm font-semibold hover:bg-zinc-700 transition flex items-center gap-2">
          <ArrowLeft size={15} /> Go Back
        </button>
      </div>
    );
  }

  // Tier lock overlay
  if (data?.locked) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 gap-5 px-6 text-center">
        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-700">
          <span className="text-3xl">🔒</span>
        </div>
        <p className="text-white font-bold text-xl">
          This title requires{" "}
          <span className="text-red-400">{data.requiredTier ?? "Plus"}</span> tier
        </p>
        <p className="text-gray-400 text-sm max-w-xs">
          Upgrade your plan to unlock exclusive KliqStream content.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-md bg-zinc-800 text-white text-sm font-semibold hover:bg-zinc-700 transition flex items-center gap-2"
          >
            <ArrowLeft size={15} /> Go Back
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="px-5 py-2.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition"
          >
            Upgrade
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 gap-4">
        <p className="text-white text-lg font-bold">Content not available</p>
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white text-sm flex items-center gap-2 transition"
        >
          <ArrowLeft size={16} /> Go back
        </button>
      </div>
    );
  }

  const resolvedMedia = resolveMediaUrl(data.mediaUrl);
  const displayTitle = data.seriesTitle
    ? `${data.seriesTitle} — Ep. ${data.episodeNumber ?? ""} · ${data.title}`
    : data.title;

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={resolvedMedia ?? ""}
        className="w-full h-full object-contain"
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => { setPlaying(false); setShowControls(true); }}
        onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
        onEnded={() => { if (data.nextEpisodeId) navigate(`/kliqstream/watch/${data.nextEpisodeId}`); }}
        onClick={togglePlay}
      />

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Top bar */}
        <div className="bg-gradient-to-b from-black/80 to-transparent px-4 pt-4 pb-10 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white hover:text-gray-200 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 text-center">
            <p className="text-white font-semibold text-sm line-clamp-1">{displayTitle}</p>
            {isMovie && <p className="text-gray-400 text-xs">Movie</p>}
          </div>
          {/* Spacer to balance back button */}
          <div className="w-10" />
        </div>

        {/* Center pause/play indicator (shows briefly on toggle) */}
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Play size={36} className="text-white fill-white ml-1" />
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div className="bg-gradient-to-t from-black/90 to-transparent px-4 pb-6 pt-12">
          {/* Skip intro button (visible in first 30s) */}
          {currentTime < INTRO_SKIP_SECS && currentTime > 0 && (
            <div className="flex justify-end mb-2">
              <button
                onClick={() => { if (videoRef.current) videoRef.current.currentTime = INTRO_SKIP_SECS; }}
                className="bg-black/60 border border-white/30 text-white text-xs font-semibold px-4 py-2 rounded hover:bg-white/20 transition"
              >
                Skip Intro →
              </button>
            </div>
          )}

          {/* Seek bar */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-white/70 text-xs w-10 text-right tabular-nums">{fmtTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 accent-red-500 cursor-pointer"
            />
            <span className="text-white/70 text-xs w-10 tabular-nums">{fmtTime(duration)}</span>
          </div>

          {/* Buttons row */}
          <div className="flex items-center gap-3">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="w-11 h-11 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition flex-shrink-0"
            >
              {playing
                ? <Pause size={20} className="text-black" />
                : <Play size={20} className="text-black fill-black ml-0.5" />}
            </button>

            {/* Mute toggle */}
            <button onClick={toggleMute} className="p-2 text-white hover:text-gray-300 transition">
              {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            {/* Volume slider */}
            <input
              type="range" min={0} max={1} step={0.05}
              value={muted ? 0 : volume} onChange={handleVolume}
              className="w-20 h-1 accent-red-500 cursor-pointer"
            />

            <div className="flex-1" />

            {/* Speed selector */}
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setShowSpeedMenu(s => !s); }}
                className="text-white text-xs font-mono px-2 py-1 rounded border border-white/30 hover:bg-white/10 transition"
              >
                {speed === 1 ? "1×" : `${speed}×`}
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-1 bg-black/90 border border-white/20 rounded-lg overflow-hidden">
                  {SPEEDS.map(s => (
                    <button
                      key={s}
                      onClick={e => {
                        e.stopPropagation();
                        setSpeed(s);
                        if (videoRef.current) videoRef.current.playbackRate = s;
                        setShowSpeedMenu(false);
                      }}
                      className={`block w-full px-4 py-1.5 text-xs text-left font-mono hover:bg-white/10 transition ${speed === s ? "text-red-400 font-bold" : "text-white"}`}
                    >
                      {s === 1 ? "1× Normal" : `${s}×`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PiP */}
            {"pictureInPictureEnabled" in document && (
              <button
                onClick={() => (videoRef.current as HTMLVideoElement)?.requestPictureInPicture?.().catch(() => {})}
                className="p-2 text-white hover:text-gray-300 transition"
              >
                <PictureInPicture2 size={18} />
              </button>
            )}

            {/* Next episode */}
            {data.nextEpisodeId && (
              <button
                onClick={() => navigate(`/kliqstream/watch/${data.nextEpisodeId}`)}
                className="p-2 text-white hover:text-gray-300 transition"
                title="Next Episode"
              >
                <SkipForward size={20} />
              </button>
            )}

            {/* Fullscreen */}
            <button onClick={handleFullscreen} className="p-2 text-white hover:text-gray-300 transition">
              <Maximize2 size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
