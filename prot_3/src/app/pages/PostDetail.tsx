import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Heart, MessageCircle, Share2, Loader2, Pencil, X, Bookmark, Repeat2, Send, Scissors, Copy } from "lucide-react";
import { api, resolveAvatarUrl, resolveMediaUrl } from "../api/client";
import { MediaImg } from "../components/media/MediaImg";
import { MediaVideo } from "../components/media/MediaVideo";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

interface PostData {
  id: string; body: string; mediaUrl: string | null; mediaType: string | null;
  postType: string; likeCount: number; commentCount: number; shareCount: number;
  viewCount: number; createdAt: string; liked: boolean;
  isPaylocked?: boolean; payPrice?: number | null; purchased?: boolean;
  author: { username: string; displayName: string; avatarUrl: string };
  comments?: CommentItem[];
}

interface CommentItem {
  id: string; body: string; createdAt: string;
  replyCount?: number;
  author: { username: string; displayName: string; avatarUrl: string };
}

export function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);

  // Bookmark state
  const [bookmarked, setBookmarked] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState("");

  // Reply state
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Poll state
  const [poll, setPoll] = useState<{
    id: string; question: string; myVoteOptionId: string | null;
    options: { id: string; text: string; _count: { votes: number } }[];
  } | null>(null);

  // Post analytics state (own posts only)
  const [postStats, setPostStats] = useState<{ earnings: number } | null>(null);

  // Purchase state (marketplace items)
  const [purchasing, setPurchasing] = useState(false);

  // Share to DM state
  const [showShareDM, setShowShareDM] = useState(false);
  const [dmSearch, setDmSearch] = useState("");
  const [dmUsers, setDmUsers] = useState<{ id: string; username: string; displayName: string; avatarUrl: string | null }[]>([]);
  const [sharingTo, setSharingTo] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<PostData>(`/posts/${id}`),
      api.get<CommentItem[]>(`/posts/${id}/comments`).catch(() => []),
    ]).then(([p, comments]) => {
      setPost({ ...p, comments: comments as CommentItem[] });
      setEditBody(p.body);
    }).catch(() => {}).finally(() => setLoading(false));
    api.get<typeof poll>(`/polls/${id}`).then(setPoll).catch(() => {});
    api.post(`/posts/${id}/view`, {}).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!post || post.author.username !== user?.username) return;
    if (post.isPaylocked && post.payPrice) {
      setPostStats({ earnings: post.payPrice });
    }
  }, [post, user]);

  const isOwn = post?.author.username === user?.username;

  const handlePurchase = async () => {
    if (!post || purchasing) return;
    setPurchasing(true);
    try {
      await api.post(`/posts/${post.id}/purchase`, {});
      setPost(p => p ? { ...p, purchased: true } : p);
      toast("Purchase successful! You now have access to this item.");
    } catch (e: unknown) {
      toast((e as Error).message ?? "Purchase failed");
    } finally {
      setPurchasing(false);
    }
  };

  const toggleBookmark = async () => {
    if (!post) return;
    const was = bookmarked;
    setBookmarked(!was);
    try {
      if (was) await api.delete(`/bookmarks/${post.id}`);
      else await api.post(`/bookmarks/${post.id}`, {});
    } catch { setBookmarked(was); }
  };

  const saveEdit = async () => {
    if (!post) return;
    try {
      await api.patch(`/posts/${post.id}`, { body: editBody });
      setPost(p => p ? { ...p, body: editBody } : p);
      setEditing(false);
    } catch {
      toast("Failed to save");
    }
  };

  const repost = async () => {
    if (!post) return;
    try {
      await api.post("/posts", {
        body: `🔁 @${post.author.username}: ${post.body?.slice(0, 100) ?? ""}${(post.body?.length ?? 0) > 100 ? "…" : ""}`,
        postType: "post",
      });
      toast("Reposted!");
    } catch {
      toast("Failed to repost");
    }
  };

  const votePoll = async (optionId: string) => {
    if (poll?.myVoteOptionId) return;
    await api.post(`/polls/${poll!.id}/vote`, { optionId });
    setPoll(p => p ? { ...p, myVoteOptionId: optionId } : p);
  };

  const submitComment = async () => {
    if (!post || !commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const newComment = await api.post<CommentItem>(`/posts/${post.id}/comments`, {
        body: commentText.trim(),
        parentId: replyingTo?.id ?? undefined,
      });
      setPost(p => p ? { ...p, comments: [...(p.comments ?? []), newComment], commentCount: p.commentCount + 1 } : p);
      setCommentText("");
      setReplyingTo(null);
    } catch {
      toast("Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) return (
    <div className="min-h-full bg-black flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-purple-400" />
    </div>
  );

  if (!post) return (
    <div className="min-h-full bg-black flex flex-col items-center justify-center gap-3">
      <p className="text-white">Post not found</p>
      <button onClick={() => navigate(-1)} className="text-purple-400 text-sm">Go back</button>
    </div>
  );

  return (
    <div className="min-h-full bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur-md border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full transition">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <span className="text-white font-bold flex-1">Post</span>
        {isOwn && !editing && (
          <button onClick={() => setEditing(true)} className="p-2 hover:bg-gray-900 rounded-full">
            <Pencil size={18} className="text-gray-400" />
          </button>
        )}
      </div>

      <div className="max-w-xl mx-auto px-4 pt-4">
        {/* Author */}
        <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => navigate(`/user/${post.author.username}`)}>
          <img src={resolveAvatarUrl(post.author.avatarUrl)} className="w-10 h-10 rounded-full object-cover bg-gray-800" />
          <div>
            <p className="text-white font-semibold text-sm">{post.author.displayName}</p>
            <p className="text-gray-500 text-xs">@{post.author.username}</p>
          </div>
        </div>

        {/* Body — editable */}
        {editing ? (
          <div className="space-y-2 mb-4">
            <textarea
              value={editBody}
              onChange={e => setEditBody(e.target.value)}
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                className="bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                Save
              </button>
              <button
                onClick={() => { setEditBody(post.body); setEditing(false); }}
                className="text-gray-500 text-xs px-3 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          post.body && <p className="text-white mb-4 leading-relaxed">{post.body}</p>
        )}

        {/* Media */}
        {post.mediaUrl && (
          <div className="rounded-2xl overflow-hidden mb-4 bg-gray-900">
            {post.mediaType?.startsWith("video") || post.postType === "reel" ? (
              <MediaVideo src={resolveMediaUrl(post.mediaUrl) ?? ""} controls className="w-full max-h-96 object-contain" context={`PostDetail/post:${post.id}`} />
            ) : (
              <MediaImg src={resolveMediaUrl(post.mediaUrl) ?? ""} className="w-full object-cover" context={`PostDetail/post:${post.id}`} />
            )}
          </div>
        )}

        {/* Poll */}
        {poll && (
          <div className="mb-4 bg-gray-900 rounded-2xl p-4 space-y-3">
            <p className="text-white font-semibold">{poll.question}</p>
            {(() => {
              const totalVotes = poll.options.reduce((s, o) => s + o._count.votes, 0);
              return poll.options.map(o => {
                const pct = totalVotes > 0 ? Math.round((o._count.votes / totalVotes) * 100) : 0;
                const voted = poll.myVoteOptionId === o.id;
                return (
                  <button key={o.id} onClick={() => votePoll(o.id)} disabled={!!poll.myVoteOptionId}
                    className={`w-full text-left rounded-xl px-4 py-3 relative overflow-hidden border transition ${voted ? "border-purple-500" : "border-gray-700 hover:border-gray-600"} ${poll.myVoteOptionId ? "" : "cursor-pointer"}`}>
                    {poll.myVoteOptionId && <div className="absolute inset-0 bg-purple-600/20 rounded-xl" style={{ width: `${pct}%` }} />}
                    <div className="relative flex items-center justify-between">
                      <span className="text-white text-sm">{o.text} {voted && "✓"}</span>
                      {poll.myVoteOptionId && <span className="text-gray-400 text-xs">{pct}%</span>}
                    </div>
                  </button>
                );
              });
            })()}
            <p className="text-gray-600 text-xs">{poll.options.reduce((s, o) => s + o._count.votes, 0)} votes</p>
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-5 py-3 border-t border-gray-900 mb-4">
          <span className="flex items-center gap-1.5 text-gray-400 text-sm">
            <Heart size={16} /> {(post.likeCount ?? 0).toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5 text-gray-400 text-sm">
            <MessageCircle size={16} /> {(post.commentCount ?? 0).toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5 text-gray-400 text-sm">
            <Share2 size={16} /> {(post.shareCount ?? 0).toLocaleString()}
          </span>
          <button
            onClick={() => setShowShareDM(true)}
            className="flex items-center gap-1.5 text-white text-sm ml-auto"
          >
            <Send size={20} />
          </button>
          <button
            id="repost-btn"
            onClick={repost}
            className="flex items-center gap-1.5 text-white text-sm"
          >
            <Repeat2 size={20} />
          </button>
          <button onClick={toggleBookmark} className="flex flex-col items-center gap-1">
            <Bookmark size={24} fill={bookmarked ? "white" : "none"} className="text-white" />
          </button>
        </div>

        {/* Duet / Stitch row — only for video posts by others */}
        {!isOwn && (post.mediaType?.startsWith("video") || post.postType === "reel" || post.postType === "tube") && (
          <div className="flex items-center gap-3 py-3 border-t border-gray-900 mb-4">
            <button
              onClick={() => navigate(`/create?mode=duet&postId=${post.id}`)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-medium px-3 py-2 bg-gray-900 rounded-full transition"
            >
              <Copy size={14} /> Duet
            </button>
            <button
              onClick={() => navigate(`/create?mode=stitch&postId=${post.id}`)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-medium px-3 py-2 bg-gray-900 rounded-full transition"
            >
              <Scissors size={14} /> Stitch
            </button>
          </div>
        )}

        {/* Marketplace purchase row */}
        {post.postType === "marketplace" && post.isPaylocked && post.payPrice && !isOwn && (
          <div className="py-4 border-t border-gray-900 mb-4">
            {post.purchased ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-green-900/30 border border-green-700/50 rounded-xl">
                <span className="text-green-400 text-sm font-semibold">✓ Purchased</span>
                <span className="text-gray-500 text-xs">You own this item</span>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-3">
                <div>
                  <p className="text-white font-semibold text-sm">Marketplace Item</p>
                  <p className="text-gray-400 text-xs mt-0.5">Purchase to unlock this item</p>
                </div>
                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold text-sm px-4 py-2 rounded-xl transition"
                >
                  {purchasing ? <Loader2 size={14} className="animate-spin" /> : "🪙"}
                  {purchasing ? "Buying..." : `Buy for ${post.payPrice} tokens`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Analytics row — own posts only */}
        {isOwn && post.viewCount > 0 && (
          <div className="flex items-center gap-4 py-3 border-t border-gray-900 mb-2 overflow-x-auto">
            <div className="text-center flex-shrink-0">
              <p className="text-white font-bold text-sm">{(post.viewCount ?? 0).toLocaleString()}</p>
              <p className="text-gray-600 text-xs">Views</p>
            </div>
            <div className="text-center flex-shrink-0">
              <p className="text-white font-bold text-sm">{(post.likeCount ?? 0).toLocaleString()}</p>
              <p className="text-gray-600 text-xs">Likes</p>
            </div>
            <div className="text-center flex-shrink-0">
              <p className="text-white font-bold text-sm">{post.shareCount?.toLocaleString() ?? 0}</p>
              <p className="text-gray-600 text-xs">Shares</p>
            </div>
            {post.isPaylocked && post.payPrice && (
              <div className="text-center flex-shrink-0">
                <p className="text-yellow-400 font-bold text-sm">🪙 {post.payPrice}</p>
                <p className="text-gray-600 text-xs">Per unlock</p>
              </div>
            )}
          </div>
        )}

        {/* Comments */}
        <h3 className="text-white font-semibold mb-3">Comments</h3>
        {post.comments?.length === 0 && <p className="text-gray-600 text-sm">No comments yet.</p>}
        <div className="space-y-4 mb-6">
          {post.comments?.map(c => (
            <div key={c.id} className="flex gap-3">
              <img src={resolveAvatarUrl(c.author.avatarUrl)} className="w-8 h-8 rounded-full object-cover bg-gray-800 flex-shrink-0" />
              <div>
                <span className="text-white text-sm font-semibold">{c.author.displayName} </span>
                <span className="text-gray-400 text-sm">{c.body}</span>
                <div className="flex items-center mt-1">
                  <button
                    onClick={() => setReplyingTo({ id: c.id, username: c.author.username })}
                    className="text-gray-600 text-xs hover:text-gray-400"
                  >
                    Reply
                  </button>
                  {(c.replyCount ?? 0) > 0 && (
                    <span className="text-purple-500 text-xs ml-2">{c.replyCount} replies</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comment input */}
        <div className="fixed bottom-16 left-0 right-0 max-w-xl mx-auto px-4">
          {replyingTo && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 rounded-t-xl border-b border-gray-800">
              <span className="text-gray-400 text-xs">Replying to @{replyingTo.username}</span>
              <button onClick={() => setReplyingTo(null)}>
                <X size={12} className="text-gray-600" />
              </button>
            </div>
          )}
          <div className={`flex gap-2 bg-gray-950 border border-gray-800 ${replyingTo ? "rounded-b-xl" : "rounded-xl"} px-3 py-2`}>
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
              placeholder="Add a comment…"
              className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
            />
            <button
              onClick={submitComment}
              disabled={!commentText.trim() || submittingComment}
              className="text-purple-400 text-xs font-bold disabled:text-gray-700"
            >
              {submittingComment ? <Loader2 size={14} className="animate-spin" /> : "Post"}
            </button>
          </div>
        </div>
      </div>

      {/* Share to DM modal */}
      {showShareDM && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center"
          onClick={() => { setShowShareDM(false); setShareSuccess(false); setSharingTo(null); setDmSearch(""); setDmUsers([]); }}
        >
          <div
            className="w-full max-w-lg bg-gray-950 border border-gray-800 rounded-t-3xl p-5"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white font-bold mb-3">Share to...</h3>
            <input
              value={dmSearch}
              onChange={e => {
                setDmSearch(e.target.value);
                if (e.target.value.length >= 1) {
                  api.get<{ id: string; username: string; displayName: string; avatarUrl: string | null }[]>(
                    `/search/users?q=${encodeURIComponent(e.target.value)}`
                  ).then(setDmUsers).catch(() => {});
                } else {
                  setDmUsers([]);
                }
              }}
              placeholder="Search people..."
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white text-sm mb-3 focus:outline-none focus:border-purple-500"
            />
            {shareSuccess ? (
              <p className="text-center text-green-400 font-medium py-4">Shared!</p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {dmUsers.map(u => (
                  <button
                    key={u.username}
                    disabled={sharingTo === u.username}
                    onClick={async () => {
                      setSharingTo(u.username);
                      const postUrl = `Check out this post: /post/${post?.id}`;
                      await api.post("/messages/send", { recipientId: u.id, body: postUrl }).catch(() => {});
                      setShareSuccess(true);
                      setTimeout(() => {
                        setShowShareDM(false);
                        setShareSuccess(false);
                        setSharingTo(null);
                        setDmSearch("");
                        setDmUsers([]);
                      }, 1500);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-900 rounded-xl transition"
                  >
                    <img
                      src={resolveAvatarUrl(u.avatarUrl)}
                      className="w-9 h-9 rounded-full object-cover bg-gray-800"
                      alt={u.username}
                    />
                    <div className="text-left">
                      <p className="text-white text-sm font-medium">{u.displayName}</p>
                      <p className="text-gray-500 text-xs">@{u.username}</p>
                    </div>
                    {sharingTo === u.username && (
                      <span className="ml-auto text-gray-500 text-xs">Sending...</span>
                    )}
                  </button>
                ))}
                {dmSearch.length >= 1 && dmUsers.length === 0 && (
                  <p className="text-gray-600 text-sm text-center py-4">No users found</p>
                )}
                {dmSearch.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">Start typing to search</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
