import { useState, useEffect } from "react";
import { Heart, MessageCircle, Share2, MoreHorizontal, Upload, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useSocial } from "../context/SocialContext";
import { useAuth } from "../context/AuthContext";
import { api, resolveMediaUrl } from "../api/client";
import { ShareSheet } from "../components/ShareSheet";
import { CommentSheet } from "../components/CommentSheet";

interface FeedPost {
  id: string;
  body: string;
  mediaUrl: string | null;
  mediaType: string | null;
  postType: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  liked: boolean;
  author: { username: string; displayName: string; avatarUrl: string; isVerified: boolean };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface SuggestedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isVerified: boolean;
  followerCount: number;
}

export function Friends() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFollowing, toggleFollow } = useSocial();
  const [posts, setPosts]             = useState<FeedPost[]>([]);
  const [loading, setLoading]         = useState(true);
  const [suggested, setSuggested]     = useState<SuggestedUser[]>([]);
  const [liked, setLiked]             = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts]   = useState<Record<string, number>>({});
  const [showUploadStory, setShowUploadStory] = useState(false);
  const [showShare, setShowShare]     = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);

  useEffect(() => {
    api.get<SuggestedUser[]>("/users/suggested").then(setSuggested).catch(() => {});
    api.get<{ posts: FeedPost[] }>("/posts/feed?tab=following")
      .then(data => {
        setPosts(data.posts);
        const counts: Record<string, number> = {};
        const likedSet = new Set<string>();
        data.posts.forEach(p => {
          counts[p.id] = p.likeCount;
          if (p.liked) likedSet.add(p.id);
        });
        setLikeCounts(counts);
        setLiked(likedSet);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleLike = async (postId: string) => {
    const isLiked = liked.has(postId);
    setLiked(prev => { const n = new Set(prev); isLiked ? n.delete(postId) : n.add(postId); return n; });
    setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] ?? 0) + (isLiked ? -1 : 1) }));
    try {
      if (isLiked) {
        await api.delete(`/posts/${postId}/like`);
      } else {
        await api.post(`/posts/${postId}/like`, {});
      }
    } catch {
      setLiked(prev => { const n = new Set(prev); isLiked ? n.add(postId) : n.delete(postId); return n; });
      setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] ?? 0) + (isLiked ? 1 : -1) }));
    }
  };

  return (
    <div className="min-h-full bg-black pb-24">
      {showUploadStory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end">
          <div className="w-full bg-gray-950 border-t border-gray-800 rounded-t-3xl p-6">
            <h3 className="text-white font-bold text-lg mb-2">Add to Your Story</h3>
            <p className="text-gray-400 text-sm mb-4">Private stories are only visible to mutual followers.</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="border border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-purple-600 transition">
                <Upload size={24} className="text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Upload Video</p>
              </div>
              <div className="border border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-purple-600 transition">
                <Upload size={24} className="text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Upload Photo</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowUploadStory(false)} className="flex-1 border border-gray-700 text-white py-3 rounded-xl font-medium hover:bg-gray-900">Cancel</button>
              <button onClick={() => setShowUploadStory(false)} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:opacity-90">Upload</button>
            </div>
          </div>
        </div>
      )}

      {/* Stories row — static decorative, no story endpoint yet */}
      <div className="border-b border-gray-900 py-4">
        <div className="flex gap-4 overflow-x-auto px-4 pb-1">
          {/* Own story bubble */}
          <button
            onClick={() => setShowUploadStory(true)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div className="p-[2px] rounded-full bg-gray-700">
              <div className="w-14 h-14 rounded-full bg-black p-[2px]">
                <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center relative overflow-hidden">
                  <img
                    src={resolveMediaUrl(user?.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                    alt=""
                    className="w-full h-full object-cover opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-xl font-bold">+</span>
                  </div>
                </div>
              </div>
            </div>
            <span className="text-gray-400 text-[10px] truncate max-w-[56px] text-center">Your Story</span>
          </button>
        </div>
      </div>

      {/* Suggested friends */}
      <div className="px-4 py-4 border-b border-gray-900">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-400">Suggested for You</h3>
          <button className="text-purple-400 text-xs font-medium">See all</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {suggested.length === 0 ? (
            <p className="text-gray-600 text-xs py-4">No suggestions yet. Follow some users first.</p>
          ) : suggested.map((u) => (
            <div key={u.id} className="flex-shrink-0 bg-gray-900 border border-gray-800 rounded-xl p-3 w-32 text-center">
              <img
                src={resolveMediaUrl(u.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                alt={u.username}
                className="w-12 h-12 rounded-full bg-gray-800 mx-auto mb-2 cursor-pointer"
                onClick={() => navigate(`/user/${u.username}`)}
              />
              <p className="text-white text-xs font-medium truncate mb-2">@{u.username}</p>
              <button
                onClick={() => toggleFollow(u.username)}
                className={`w-full text-[10px] font-bold py-1.5 rounded-lg transition ${
                  isFollowing(u.username)
                    ? "bg-gray-800 border border-gray-700 text-gray-300"
                    : "bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-700/50 text-purple-300 hover:from-purple-600/30"
                }`}
              >
                {isFollowing(u.username) ? "Following" : "+ Follow"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Posts feed */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-purple-400" />
        </div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-gray-600 text-sm mb-2">No posts from people you follow yet.</p>
          <p className="text-gray-700 text-xs">Follow some creators to see their posts here.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-900">
          {posts.map((post) => (
            <div key={post.id} className="px-4 py-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => navigate(`/user/${post.author.username}`)}>
                    <img src={resolveMediaUrl(post.author.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author.username}`} alt={post.author.username} className="w-10 h-10 rounded-full bg-gray-800" />
                  </button>
                  <div>
                    <button
                      onClick={() => navigate(`/user/${post.author.username}`)}
                      className="text-white font-semibold text-sm hover:text-purple-300 transition"
                    >
                      {post.author.displayName}
                      {post.author.isVerified && <span className="ml-1 text-blue-400 text-xs">✓</span>}
                    </button>
                    <p className="text-gray-600 text-xs">{timeAgo(post.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFollow(post.author.username)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition ${
                      isFollowing(post.author.username)
                        ? "bg-gray-800 border border-gray-700 text-gray-300"
                        : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
                    }`}
                  >
                    {isFollowing(post.author.username) ? "Following" : "Follow"}
                  </button>
                  <button className="text-gray-600 hover:text-gray-400 transition">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
              </div>

              {post.body && <p className="text-gray-200 text-sm mb-3">{post.body}</p>}

              {post.mediaUrl && (
                <div className="rounded-xl overflow-hidden aspect-[4/3] bg-gray-900 mb-3">
                  <img src={resolveMediaUrl(post.mediaUrl) ?? ""} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex items-center gap-6">
                <button onClick={() => toggleLike(post.id)} className="flex items-center gap-2 text-sm transition">
                  <Heart size={20} className={liked.has(post.id) ? "fill-pink-500 text-pink-500" : "text-gray-400 hover:text-gray-200"} />
                  <span className={`font-medium ${liked.has(post.id) ? "text-pink-400" : "text-gray-500"}`}>
                    {(likeCounts[post.id] ?? 0).toLocaleString()}
                  </span>
                </button>
                <button
                  onClick={() => { setActivePostId(post.id); setShowComments(true); }}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition"
                >
                  <MessageCircle size={20} />
                  <span className="font-medium">{post.commentCount}</span>
                </button>
                <button
                  onClick={() => setShowShare(true)}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition ml-auto"
                >
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CommentSheet isOpen={showComments} onClose={() => setShowComments(false)} postId={activePostId ?? undefined} />
      <ShareSheet isOpen={showShare} onClose={() => setShowShare(false)} />
    </div>
  );
}
