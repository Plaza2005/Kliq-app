import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Play, Lock, Loader2 } from "lucide-react";
import { api, resolveAvatarUrl, resolveMediaUrl } from "../api/client";

interface KliqEpisode {
  id: string;
  number: number;
  title: string;
  synopsis: string | null;
  mediaUrl: string;
  duration: number | null;
  thumbUrl: string | null;
}

interface KliqSeason {
  id: string;
  number: number;
  episodes: KliqEpisode[];
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
  seasons?: KliqSeason[];
}

function fmtDuration(secs: number | null): string {
  if (!secs) return "";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

export function KliqStreamShow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState<KliqTitle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    api.get<KliqTitle>(`/kliqstream/title/${id}`)
      .then(d => setTitle(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-red-500" />
      </div>
    );
  }

  if (error || !title) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-white text-lg font-bold">Title not found</p>
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white text-sm flex items-center gap-2 transition"
        >
          <ArrowLeft size={16} /> Go back
        </button>
      </div>
    );
  }

  const seasons = title.seasons ?? [];
  const currentSeason = seasons[selectedSeason];
  const episodes = currentSeason?.episodes ?? [];
  const firstEpisode = seasons[0]?.episodes?.[0];

  const handlePlay = () => {
    if (title.locked) {
      navigate("/settings");
      return;
    }
    if (title.type === "movie") {
      navigate(`/kliqstream/watch/${title.id}?type=movie`);
    } else if (firstEpisode) {
      navigate(`/kliqstream/watch/${firstEpisode.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full font-medium hover:bg-black/80 transition text-sm"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Hero / Header (~50vh) */}
      <div className="relative w-full" style={{ minHeight: "50vh" }}>
        {/* Backdrop */}
        <div className="absolute inset-0">
          {title.posterUrl ? (
            <img
              src={resolveMediaUrl(title.posterUrl) ?? ""}
              alt={title.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-950 via-zinc-900 to-black" />
          )}
          {/* Heavy gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-end px-6 md:px-12 pb-8 pt-24" style={{ minHeight: "50vh" }}>
          <h1 className="text-2xl md:text-4xl font-extrabold text-white mb-3 leading-tight">
            {title.title}
          </h1>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-gray-400 text-xs capitalize">{title.type}</span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span className="text-gray-400 text-xs">{title.genre}</span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span className="bg-gray-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              {title.ageRating}
            </span>
            {title.duration && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-600" />
                <span className="text-gray-400 text-xs">{fmtDuration(title.duration)}</span>
              </>
            )}
          </div>

          {/* Synopsis */}
          {title.synopsis && (
            <p className="text-gray-300 text-sm md:text-base mb-5 line-clamp-3 max-w-lg leading-relaxed">
              {title.synopsis}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handlePlay}
              className="bg-white text-black px-7 py-2.5 rounded-md font-bold flex items-center gap-2 hover:bg-gray-200 transition text-sm"
            >
              <Play size={16} fill="currentColor" />
              {title.type === "movie" ? "Play Movie" : "Play S1E1"}
            </button>
            {title.locked && (
              <div className="flex items-center gap-2 bg-zinc-800/70 backdrop-blur-sm text-gray-300 px-4 py-2.5 rounded-md text-sm">
                <Lock size={14} className="text-red-400" />
                <span>Requires <span className="font-bold text-red-400">{title.minTier}</span> tier</span>
              </div>
            )}
          </div>

          {/* Author */}
          <div className="flex items-center gap-2 mt-5">
            <img
              src={resolveAvatarUrl(title.author.avatarUrl)}
              alt={title.author.displayName}
              className="w-7 h-7 rounded-full object-cover border border-white/20"
            />
            <span className="text-gray-400 text-xs">
              by <span className="text-gray-200 font-medium">{title.author.displayName}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Episode list (series only) */}
      {title.type === "series" && seasons.length > 0 && (
        <div className="px-4 md:px-8 mt-6">
          {/* Season selector */}
          {seasons.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-5">
              {seasons.map((season, idx) => (
                <button
                  key={season.id}
                  onClick={() => setSelectedSeason(idx)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition ${
                    selectedSeason === idx
                      ? "bg-white text-black"
                      : "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
                  }`}
                >
                  Season {season.number}
                </button>
              ))}
            </div>
          )}

          {seasons.length === 1 && (
            <h2 className="text-white font-bold text-lg mb-4">
              Season {currentSeason?.number ?? 1} Episodes
            </h2>
          )}

          {/* Episode list */}
          <div className="space-y-3">
            {episodes.map(ep => (
              <button
                key={ep.id}
                onClick={() => navigate(`/kliqstream/watch/${ep.id}`)}
                className="w-full flex items-start gap-4 p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition text-left group"
              >
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-28 md:w-36 aspect-video rounded-lg overflow-hidden bg-zinc-800 relative">
                  {ep.thumbUrl ? (
                    <img
                      src={resolveMediaUrl(ep.thumbUrl) ?? ""}
                      alt={ep.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-900 to-zinc-900 flex items-center justify-center">
                      <Play size={20} className="text-white/40" />
                    </div>
                  )}
                  {/* Play overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <Play size={20} className="text-white fill-white" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-gray-400 text-xs mb-0.5">Episode {ep.number}</p>
                  <p className="text-white font-semibold text-sm line-clamp-1">{ep.title}</p>
                  {ep.synopsis && (
                    <p className="text-gray-400 text-xs line-clamp-2 mt-1 leading-relaxed">{ep.synopsis}</p>
                  )}
                  {ep.duration && (
                    <p className="text-gray-500 text-xs mt-1.5">{fmtDuration(ep.duration)}</p>
                  )}
                </div>
              </button>
            ))}

            {episodes.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-sm">
                No episodes available for this season yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
