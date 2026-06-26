import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, ThumbsUp, ThumbsDown, Share2, Bookmark,
  Play, ChevronDown, ChevronUp, Send
} from "lucide-react";
import { useSocial } from "../context/SocialContext";
import { ShareSheet } from "../components/ShareSheet";
import { api, resolveMediaUrl } from "../api/client";

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
  liked: boolean;
  author: { username: string; displayName: string; avatarUrl: string; isVerified: boolean };
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string };
}

function fmtViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
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

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d < 1) return "today";
  if (d < 7) return `${d} day${d !== 1 ? "s" : ""} ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} week${w !== 1 ? "s" : ""} ago`;
  return `${Math.floor(d / 30)} months ago`;
}

function getFallbackThumb(post: TubePost): string {
  return `https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=640&q=80&sig=${post.id}`;
}

export function KliqTubeWatch() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFollowing, toggleFollow } = useSocial();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [video, setVideo] = useState<TubePost | null>(null);
  const [related, setRelated] = useState<TubePost[]>([]);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (!id) return;
    setVideo(null);
    setComments([]);
    setCommentsExpanded(false);

    api.get<TubePost>(`/posts/${id}`)
      .then(p => { setVideo(p); setLiked(p.liked); })
      .catch(() => {});

    // Record a view when the post is opened
    api.post(`/posts/${id}/view`, {}).catch(() => {});

    api.get<TubePost[]>("/posts?type=tube&limit=10")
      .then(posts => setRelated(posts.filter(p => p.id !== id).slice(0, 10)))
      .catch(() => {});

    api.get<Comment[]>(`/posts/${id}/comments`)
      .then(data => setComments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [id]);

  // Restore and save watch progress
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !id) return;

    api.get<{ progressS: number }>(`/kliqstream/progress/${id}`).then(p => {
      if (p.progressS > 10 && videoRef.current) videoRef.current.currentTime = p.progressS;
    }).catch(() => {});

    const save = () => {
      if (!videoRef.current) return;
      api.post("/kliqstream/progress", {
        contentId: id,
        contentType: "tube",
        progressS: Math.floor(videoRef.current.currentTime),
        durationS: isFinite(videoRef.current.duration) ? Math.floor(videoRef.current.duration) : undefined,
      }).catch(() => {});
    };
    const interval = setInterval(save, 10000);
    el.addEventListener("pause", save);
    el.addEventListener("ended", save);
    return () => { clearInterval(interval); el.removeEventListener("pause", save); el.removeEventListener("ended", save); save(); };
  }, [id]);

  const handleLike = async () => {
    if (!id) return;
    const wasLiked = liked;
    setLiked(l => !l);
    if (disliked) setDisliked(false);
    try {
      await (wasLiked
        ? api.delete(`/posts/${id}/like`)
        : api.post(`/posts/${id}/like`, {}));
    } catch {
      setLiked(wasLiked);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: video?.title ?? video?.body ?? "Video", url }).catch(() => {});
    } else {
      setShowShare(true);
    }
  };

  const submitComment = async () => {
    if (!id || !commentInput.trim()) return;
    setSubmittingComment(true);
    try {
      const newComment = await api.post<Comment>(`/posts/${id}/comments`, { body: commentInput.trim() });
      setComments(prev => [newComment, ...prev]);
      setCommentInput("");
      setVideo(v => v ? { ...v, commentCount: v.commentCount + 1 } : v);
    } catch {
      // silent
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!video) {
    return (
      <div className="min-h-full bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const subscribed = isFollowing(video.author.username);
  const videoTitle = video.title ?? video.body ?? "Untitled";

  return (
    <div className="min-h-full bg-[#0f0f0f] pb-24">
      {/* Back bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-[#0f0f0f]/95 backdrop-blur border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full transition">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <span className="text-white font-bold text-sm truncate">{videoTitle}</span>
      </div>

      <div className="max-w-7xl mx-auto lg:flex lg:gap-6 lg:px-6 lg:py-4">
        {/* Main content */}
        <div className="lg:flex-1 min-w-0">
          {/* Video player — full width, 16:9, native controls, autoplay */}
          <div className="bg-black w-full">
            {video.mediaUrl ? (
              <video
                ref={videoRef}
                key={video.id}
                src={resolveMediaUrl(video.mediaUrl) ?? ""}
                controls
                autoPlay
                playsInline
                className="w-full aspect-video bg-black lg:rounded-xl"
              />
            ) : (
              <div className="w-full aspect-video bg-gray-900 flex items-center justify-center lg:rounded-xl">
                <p className="text-gray-500 text-sm">No video available</p>
              </div>
            )}
          </div>

          <div className="px-4 lg:px-0 pt-4">
            {/* Title */}
            <h1 className="text-white font-bold text-base lg:text-lg leading-snug mb-1">
              {videoTitle}
            </h1>

            {/* Views + date */}
            <p className="text-gray-500 text-sm mb-3">
              {fmtViews(video.viewCount)} views · {timeAgo(video.createdAt)}
              {video.duration != null && ` · ${fmtDuration(video.duration)}`}
            </p>

            {/* Action row — like, dislike, share, save */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition ${
                  liked ? "bg-white text-black border-white" : "border-gray-700 text-gray-300 hover:border-gray-500"
                }`}
              >
                <ThumbsUp size={16} className={liked ? "fill-black" : ""} />
                {fmtViews(video.likeCount + (liked ? 1 : 0))}
              </button>

              <button
                onClick={() => { setDisliked(p => !p); if (liked) setLiked(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition ${
                  disliked ? "bg-white text-black border-white" : "border-gray-700 text-gray-300 hover:border-gray-500"
                }`}
              >
                <ThumbsDown size={16} className={disliked ? "fill-black" : ""} />
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-gray-700 text-gray-300 hover:border-gray-500 transition"
              >
                <Share2 size={16} /> Share
              </button>

              <button
                onClick={() => setSaved(p => !p)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition ${
                  saved ? "border-red-500 text-red-400" : "border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                <Bookmark size={16} className={saved ? "fill-red-400" : ""} /> Save
              </button>
            </div>

            {/* Channel row */}
            <div className="flex items-center gap-3 mb-4 p-4 bg-gray-900/60 rounded-2xl">
              <button
                onClick={() => navigate(`/user/${video.author.username}`)}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <img
                  src={resolveMediaUrl(video.author.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.author.username}`}
                  alt={video.author.displayName}
                  className="w-11 h-11 rounded-full bg-gray-800 object-cover"
                />
                <div className="text-left min-w-0">
                  <p className="text-white font-bold text-sm hover:text-gray-300 transition truncate">
                    {video.author.displayName}
                    {video.author.isVerified && <span className="ml-1 text-gray-400 text-xs">✓</span>}
                  </p>
                  <p className="text-gray-500 text-xs">@{video.author.username}</p>
                </div>
              </button>
              <button
                onClick={() => toggleFollow(video.author.username)}
                className={`text-sm font-semibold px-4 py-1.5 rounded-full border transition flex-shrink-0 ${
                  subscribed
                    ? "border-gray-600 text-gray-300 bg-transparent"
                    : "border-white text-black bg-white hover:bg-gray-200"
                }`}
              >
                {subscribed ? "Following" : "Follow"}
              </button>
            </div>

            {/* Description */}
            <div className="mb-4 bg-gray-900/60 rounded-2xl p-4">
              <p className={`text-gray-300 text-sm leading-relaxed ${descExpanded ? "" : "line-clamp-3"}`}>
                {video.body || "No description"}
              </p>
              <button
                onClick={() => setDescExpanded(p => !p)}
                className="mt-2 flex items-center gap-1 text-white text-sm font-semibold hover:text-gray-300 transition"
              >
                {descExpanded
                  ? <><ChevronUp size={16} /> Show less</>
                  : <><ChevronDown size={16} /> Show more</>}
              </button>
            </div>

            {/* Comments section */}
            <div className="mb-4 bg-gray-900/60 rounded-2xl p-4">
              <button
                onClick={() => setCommentsExpanded(p => !p)}
                className="w-full flex items-center justify-between mb-3"
              >
                <span className="text-white font-semibold">
                  Comments {video.commentCount > 0 ? `(${fmtViews(video.commentCount)})` : ""}
                </span>
                {commentsExpanded ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
              </button>

              {commentsExpanded && (
                <>
                  {/* Comment input */}
                  <div className="flex gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
                    <div className="flex-1 flex gap-2">
                      <input
                        value={commentInput}
                        onChange={e => setCommentInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                        placeholder="Add a comment..."
                        className="flex-1 bg-transparent border-b border-gray-700 text-white text-sm outline-none placeholder:text-gray-600 pb-1 focus:border-gray-400 transition"
                      />
                      <button
                        onClick={submitComment}
                        disabled={!commentInput.trim() || submittingComment}
                        className="text-gray-400 hover:text-white disabled:opacity-40 transition flex-shrink-0"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Comments list */}
                  {comments.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-4">No comments yet. Be the first!</p>
                  ) : (
                    <div className="space-y-4">
                      {comments.map(c => (
                        <div key={c.id} className="flex gap-3">
                          <img
                            src={resolveMediaUrl(c.author.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.author.username}`}
                            alt={c.author.displayName}
                            className="w-8 h-8 rounded-full bg-gray-800 object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-300 text-xs font-semibold mb-0.5">
                              @{c.author.username}
                              <span className="text-gray-600 font-normal ml-2">{timeAgo(c.createdAt)}</span>
                            </p>
                            <p className="text-gray-200 text-sm leading-snug">{c.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Related / Up Next sidebar */}
        <div className="lg:w-80 xl:w-96 px-4 lg:px-0">
          <h3 className="text-white font-bold mb-4 hidden lg:block text-sm">Up Next</h3>
          <div className="space-y-3">
            {related.map(v => {
              const vThumb = v.thumbUrl
                ? (resolveMediaUrl(v.thumbUrl) ?? v.thumbUrl)
                : getFallbackThumb(v);
              return (
                <div
                  key={v.id}
                  onClick={() => navigate(`/klixtube/watch/${v.id}`)}
                  className="flex gap-3 cursor-pointer group"
                >
                  {/* Thumbnail */}
                  <div className="relative w-40 flex-shrink-0 aspect-video rounded-xl overflow-hidden bg-gray-900">
                    <img
                      src={vThumb}
                      alt={v.title ?? v.body}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {v.duration != null && (
                      <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded font-mono">
                        {fmtDuration(v.duration)}
                      </span>
                    )}
                    {!v.mediaUrl && !v.thumbUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                        <Play size={20} className="text-gray-600" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white text-xs font-semibold line-clamp-2 leading-snug mb-1 group-hover:text-gray-300 transition">
                      {v.title ?? v.body}
                    </h4>
                    <p className="text-gray-500 text-xs">{v.author.displayName}</p>
                    <p className="text-gray-600 text-xs">{fmtViews(v.viewCount)} views · {timeAgo(v.createdAt)}</p>
                  </div>
                </div>
              );
            })}
            {related.length === 0 && (
              <p className="text-gray-600 text-sm text-center py-4">No related videos yet</p>
            )}
          </div>
        </div>
      </div>

      <ShareSheet isOpen={showShare} onClose={() => setShowShare(false)} url={window.location.href} />
    </div>
  );
}
