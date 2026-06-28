import { useState, useRef, useEffect, useCallback } from "react";
import { X, Heart, Send, ChevronDown, ChevronUp, Loader2, AlertCircle, Smile, Gift, Search } from "lucide-react";
import { api, resolveAvatarUrl, resolveMediaUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useRealtime } from "../context/RealtimeContext";

interface ApiComment {
  id: string;
  body: string;
  likeCount: number;
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string };
  replies: { id: string; body: string; likeCount: number; createdAt: string; author: { username: string; displayName: string; avatarUrl: string } }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  count?: string;
  postId?: string;
}

function timeAgo(dt: string) {
  const s = Math.floor((Date.now() - new Date(dt).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// Detect GIF markup in comment body
const GIF_RE = /^\[gif\](https?:\/\/.+)\[\/gif\]$/;
function renderBody(body: string) {
  const m = body.match(GIF_RE);
  if (m) return <img src={m[1]} alt="GIF" className="max-w-[220px] rounded-xl" />;
  return <span>{body}</span>;
}

// ── Emoji data ────────────────────────────────────────────────────────────────
const EMOJI_CATS = [
  { icon: "😀", label: "Smileys", emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","😍","🥰","😘","😚","😋","😛","😝","😜","🤪","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","😈","💀","💩","🤡","👻","👽","🤖","😺","😸","😹","😻","🙀","😿"] },
  { icon: "❤️", label: "Hearts & Nature", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","✨","⭐","🌟","💫","⚡","🔥","🌈","☀️","🌙","❄️","🌊","🌸","🌺","🌻","🌹","🌷","🌼","💐","🍀","🌿","🌱","🌵","🌾","🍁","🍂","🍃","🌲","🌳","🌴","🌬️","💨","🌀","⛈️","🌧️","⛅","☁️"] },
  { icon: "👍", label: "Hands", emojis: ["👍","👎","👊","✊","🤛","🤜","🤞","✌️","🤟","🤘","🤙","👌","🤌","🤏","👈","👉","👆","👇","☝️","👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","🫵","👏","🙌","🤲","🤝","🙏","💪","🦾","✍️","🫶","💅","🤳"] },
  { icon: "🔥", label: "Reactions", emojis: ["💯","🔥","✅","❌","⚠️","🚨","💥","🎯","👑","🏆","🎉","🎊","🎈","🥳","✨","💎","🪩","🫶","💀","😂","🤣","🥹","😭","😩","🙃","🤡","💅","🤷","🙄","😳","🫠","🥴","🤯","😵‍💫","🤔","🫤","😮‍💨","😬","🥲","🤓","🧐","👀","🫣","🫢","🤭","😶‍🌫️","🫡","🙄","😤"] },
  { icon: "🐶", label: "Animals", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🦄","🐝","🦋","🐌","🐞","🐜","🐢","🐍","🦖","🦕","🐙","🦑","🦀","🐡","🐠","🐟","🐬","🐳","🦈","🐊","🦒","🦘","🐘","🦛","🦏","🐪","🦓","🦍","🦧","🦣","🐕","🐈","🐓","🦃","🕊️","🐇","🦔","🐿️"] },
  { icon: "🍕", label: "Food", emojis: ["🍎","🍊","🍋","🍇","🍓","🍒","🍑","🥭","🍍","🥝","🥑","🍆","🥦","🥕","🌽","🌶️","🥔","🍕","🍔","🌮","🌯","🍜","🍝","🍣","🍱","🥟","🍤","🧁","🍰","🎂","🍭","🍬","🍫","🍿","🍩","🍪","🍦","🍧","☕","🧋","🍵","🥤","🍺","🍻","🥂","🍷","🥃","🍸","🍹"] },
];

// ── Tenor GIF integration ─────────────────────────────────────────────────────
const TENOR_KEY: string = import.meta.env.VITE_TENOR_API_KEY ?? "";

interface TenorGif {
  id: string;
  title: string;
  url: string;
  preview: string;
}

interface TenorResult {
  id: string;
  title: string;
  media_formats: { gif?: { url: string }; tinygif?: { url: string } };
}

async function tenorSearch(q: string): Promise<TenorGif[]> {
  const endpoint = q.trim()
    ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=16&media_filter=tinygif`
    : `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&limit=16&media_filter=tinygif`;
  const res = await fetch(endpoint);
  const data: { results?: TenorResult[] } = await res.json();
  return (data.results ?? []).map(r => ({
    id: r.id,
    title: r.title,
    url: r.media_formats.gif?.url ?? "",
    preview: r.media_formats.tinygif?.url ?? r.media_formats.gif?.url ?? "",
  }));
}

export function CommentSheet({ isOpen, onClose, count = "0", postId }: Props) {
  const { user } = useAuth();
  const { subscribe } = useRealtime();

  const [comments, setComments]     = useState<ApiComment[]>([]);
  const [loading, setLoading]       = useState(false);
  const [input, setInput]           = useState("");
  const [liked, setLiked]           = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; user: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [sendError, setSendError]   = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // Emoji / GIF picker state
  const [panel, setPanel]           = useState<"emoji" | "gif" | null>(null);
  const [emojiCat, setEmojiCat]     = useState(0);
  const [gifQuery, setGifQuery]     = useState("");
  const [gifs, setGifs]             = useState<TenorGif[]>([]);
  const [loadingGifs, setLoadingGifs] = useState(false);

  const listRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gifDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen || !postId) return;
    setComments([]);
    setLoading(true);
    api.get<ApiComment[]>(`/posts/${postId}/comments`)
      .then(setComments).catch(() => {}).finally(() => setLoading(false));
  }, [isOpen, postId]);

  useEffect(() => {
    if (!isOpen) {
      setInput("");
      setReplyingTo(null);
      setSendError("");
      setKeyboardOffset(0);
      setPanel(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setKeyboardOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !postId) return;
    return subscribe(event => {
      if (event.type === "post:comment" && event.postId === postId) {
        const incoming = event.comment as ApiComment;
        if (!incoming?.id) return;
        setComments(prev => prev.some(c => c.id === incoming.id) ? prev : [incoming, ...prev]);
      }
    });
  }, [isOpen, postId, subscribe]);

  // Load GIFs when panel opens or query changes
  useEffect(() => {
    if (panel !== "gif" || !TENOR_KEY) return;
    if (gifDebounce.current) clearTimeout(gifDebounce.current);
    gifDebounce.current = setTimeout(async () => {
      setLoadingGifs(true);
      const results = await tenorSearch(gifQuery).catch(() => []);
      setGifs(results);
      setLoadingGifs(false);
    }, gifQuery ? 400 : 0);
  }, [panel, gifQuery]);

  if (!isOpen) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || submitting || !postId) return;
    setSendError("");
    setSubmitting(true);
    try {
      const body = replyingTo
        ? (text.startsWith(`@${replyingTo.user}`) ? text : `@${replyingTo.user} ${text}`)
        : text;
      const payload: { body: string; parentId?: string } = { body };
      if (replyingTo) payload.parentId = replyingTo.commentId;
      const newComment = await api.post<ApiComment>(`/posts/${postId}/comments`, payload);
      if (replyingTo) {
        setComments(prev => prev.map(c => c.id === replyingTo.commentId ? { ...c, replies: [...c.replies, newComment] } : c));
        setExpandedReplies(prev => new Set([...prev, replyingTo.commentId]));
      } else {
        setComments(prev => [newComment, ...prev]);
        setTimeout(() => listRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 50);
      }
      setInput("");
      setReplyingTo(null);
      setPanel(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed — tap retry");
    } finally {
      setSubmitting(false);
    }
  };

  const sendGif = async (gif: TenorGif) => {
    if (!postId || submitting) return;
    setSubmitting(true);
    setPanel(null);
    try {
      const body = `[gif]${gif.url}[/gif]`;
      const payload: { body: string; parentId?: string } = { body };
      if (replyingTo) payload.parentId = replyingTo.commentId;
      const newComment = await api.post<ApiComment>(`/posts/${postId}/comments`, payload);
      if (replyingTo) {
        setComments(prev => prev.map(c => c.id === replyingTo.commentId ? { ...c, replies: [...c.replies, newComment] } : c));
        setExpandedReplies(prev => new Set([...prev, replyingTo.commentId]));
      } else {
        setComments(prev => [newComment, ...prev]);
        setTimeout(() => listRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 50);
      }
      setReplyingTo(null);
      setInput("");
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  const insertEmoji = (emoji: string) => {
    setInput(prev => prev + emoji);
    setPanel(null);
    setTimeout(() => {
      inputRef.current?.focus();
      const len = (input + emoji).length;
      inputRef.current?.setSelectionRange(len, len);
    }, 50);
  };

  const startReply = (commentId: string, username: string) => {
    setReplyingTo({ commentId, user: username });
    setInput(`@${username} `);
    setPanel(null);
    setTimeout(() => { inputRef.current?.focus(); }, 50);
  };

  const cancelReply = () => { setReplyingTo(null); setInput(""); inputRef.current?.focus(); };
  const toggleLike = async (commentId: string) => {
    const wasLiked = liked.has(commentId);
    setLiked(prev => { const n = new Set(prev); wasLiked ? n.delete(commentId) : n.add(commentId); return n; });
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, likeCount: c.likeCount + (wasLiked ? -1 : 1) } : c));
    try {
      await api.post(`/posts/${postId}/comments/${commentId}/like`, {});
    } catch {
      setLiked(prev => { const n = new Set(prev); wasLiked ? n.add(commentId) : n.delete(commentId); return n; });
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, likeCount: c.likeCount + (wasLiked ? 1 : -1) } : c));
    }
  };
  const toggleReplies = (id: string) => setExpandedReplies(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const displayCount = comments.length > 0 ? String(comments.length) : count;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-gray-950 border-t border-gray-800 rounded-t-3xl flex flex-col max-h-[85vh]"
        style={{ transform: `translateY(-${keyboardOffset}px)`, transition: "transform 0.2s ease" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mt-3" />

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <h3 className="text-white font-bold text-base">{displayCount} Comments</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-800 rounded-full transition">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Comment list */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-5 min-h-0">
          {loading && <div className="flex justify-center py-8"><Loader2 size={24} className="text-purple-400 animate-spin" /></div>}
          {!loading && comments.length === 0 && (
            <div className="text-center py-10 text-gray-500 text-sm">No comments yet. Be the first!</div>
          )}
          {comments.map(c => (
            <div key={c.id}>
              <div className="flex gap-3">
                <img src={resolveAvatarUrl(c.author.avatarUrl)} alt={c.author.username} className="w-9 h-9 rounded-full bg-gray-800 flex-shrink-0 object-cover" />
                <div className="flex-1">
                  <div className="bg-gray-900 rounded-2xl rounded-tl-none px-4 py-3">
                    <p className="text-white font-semibold text-sm mb-1">@{c.author.username}</p>
                    <p className="text-gray-200 text-sm">{renderBody(c.body)}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 px-2">
                    <span className="text-gray-600 text-xs">{timeAgo(c.createdAt)}</span>
                    <button onClick={() => toggleLike(c.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-pink-400 transition">
                      <Heart size={12} className={liked.has(c.id) ? "fill-pink-500 text-pink-500" : ""} />
                      <span>{c.likeCount + (liked.has(c.id) ? 1 : 0)}</span>
                    </button>
                    <button onClick={() => startReply(c.id, c.author.username)} className="text-xs text-gray-500 hover:text-purple-400 transition font-medium">
                      Reply
                    </button>
                  </div>
                  {c.replies.length > 0 && (
                    <div className="mt-2 pl-1">
                      <button onClick={() => toggleReplies(c.id)} className="flex items-center gap-1 text-xs text-purple-400 font-semibold mb-2">
                        {expandedReplies.has(c.id) ? <><ChevronUp size={13} /> Hide replies</> : <><ChevronDown size={13} /> View {c.replies.length} {c.replies.length === 1 ? "reply" : "replies"}</>}
                      </button>
                      {expandedReplies.has(c.id) && (
                        <div className="space-y-3 border-l-2 border-gray-800 pl-3">
                          {c.replies.map(r => (
                            <div key={r.id} className="flex gap-2">
                              <img src={resolveAvatarUrl(r.author.avatarUrl)} alt={r.author.username} className="w-7 h-7 rounded-full bg-gray-800 flex-shrink-0 object-cover" />
                              <div className="flex-1">
                                <div className="bg-gray-900/70 rounded-2xl rounded-tl-none px-3 py-2">
                                  <p className="text-white font-semibold text-xs mb-0.5">@{r.author.username}</p>
                                  <p className="text-gray-200 text-xs">{renderBody(r.body)}</p>
                                </div>
                                <span className="text-gray-600 text-[10px] px-1">{timeAgo(r.createdAt)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Emoji picker panel */}
        {panel === "emoji" && (
          <div className="border-t border-gray-800 bg-gray-950 flex-shrink-0">
            {/* Category tabs */}
            <div className="flex border-b border-gray-800 overflow-x-auto">
              {EMOJI_CATS.map((cat, i) => (
                <button key={cat.label} onClick={() => setEmojiCat(i)}
                  className={`flex-shrink-0 px-3 py-2.5 text-lg transition ${emojiCat === i ? "border-b-2 border-purple-500" : "opacity-50 hover:opacity-80"}`}>
                  {cat.icon}
                </button>
              ))}
            </div>
            {/* Emoji grid */}
            <div className="grid grid-cols-8 gap-1 p-3 max-h-40 overflow-y-auto">
              {EMOJI_CATS[emojiCat].emojis.map(e => (
                <button key={e} onClick={() => insertEmoji(e)}
                  className="text-2xl p-1 hover:bg-gray-800 rounded-lg transition text-center leading-none">
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* GIF picker panel */}
        {panel === "gif" && (
          <div className="border-t border-gray-800 bg-gray-950 flex-shrink-0 flex flex-col max-h-64">
            {!TENOR_KEY ? (
              <div className="p-5 text-center">
                <p className="text-gray-400 text-sm font-semibold mb-1">GIF support needs a Tenor API key</p>
                <p className="text-gray-600 text-xs">Add <code className="text-purple-400">VITE_TENOR_API_KEY=your_key</code> to prot_3/.env</p>
                <p className="text-gray-700 text-xs mt-1">Get a free key at developers.google.com/tenor</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800">
                  <Search size={14} className="text-gray-500 flex-shrink-0" />
                  <input
                    autoFocus
                    value={gifQuery}
                    onChange={e => setGifQuery(e.target.value)}
                    placeholder="Search GIFs…"
                    className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
                  />
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {loadingGifs ? (
                    <div className="flex justify-center py-6"><Loader2 size={20} className="text-purple-400 animate-spin" /></div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5">
                      {gifs.map(gif => (
                        <button key={gif.id} onClick={() => sendGif(gif)}
                          className="aspect-square rounded-xl overflow-hidden bg-gray-900 hover:ring-2 hover:ring-purple-500 transition">
                          <img src={gif.preview} alt={gif.title} className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ))}
                      {!loadingGifs && gifs.length === 0 && (
                        <p className="col-span-4 text-center text-gray-600 text-sm py-4">No GIFs found</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-800 flex-shrink-0">
          {replyingTo && (
            <div className="flex items-center justify-between px-4 pt-2.5 pb-0">
              <span className="text-xs text-gray-400">
                Replying to <span className="text-purple-400 font-semibold">@{replyingTo.user}</span>
              </span>
              <button onClick={cancelReply} className="p-1 hover:bg-gray-800 rounded-full transition">
                <X size={13} className="text-gray-500" />
              </button>
            </div>
          )}
          {sendError && (
            <div className="flex items-center gap-2 px-4 pt-2 text-red-400 text-xs">
              <AlertCircle size={12} />
              <span>{sendError}</span>
              <button onClick={send} className="text-purple-400 font-semibold hover:text-purple-300 ml-auto">Retry</button>
            </div>
          )}
          <div className="p-4 flex items-center gap-2">
            <img
              src={resolveAvatarUrl(user?.avatarUrl)}
              alt="me"
              className="w-9 h-9 rounded-full bg-gray-800 flex-shrink-0 object-cover"
            />
            {/* Emoji button */}
            <button
              onClick={() => setPanel(p => p === "emoji" ? null : "emoji")}
              className={`p-2 rounded-full transition flex-shrink-0 ${panel === "emoji" ? "text-purple-400 bg-purple-900/30" : "text-gray-500 hover:text-gray-300"}`}>
              <Smile size={20} />
            </button>
            {/* GIF button */}
            <button
              onClick={() => setPanel(p => p === "gif" ? null : "gif")}
              className={`text-xs font-black px-2 py-1 rounded-lg border transition flex-shrink-0 ${panel === "gif" ? "border-purple-500 text-purple-400 bg-purple-900/20" : "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300"}`}>
              GIF
            </button>
            <div className="flex-1 flex items-center bg-gray-900 border border-gray-800 rounded-full px-4 py-2 gap-2 min-w-0">
              <input
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); if (sendError) setSendError(""); }}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder={replyingTo ? `Reply to @${replyingTo.user}…` : "Add a comment…"}
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none min-w-0"
              />
              <button
                onClick={send}
                disabled={!input.trim() || submitting}
                className="text-purple-400 hover:text-purple-300 disabled:text-gray-700 transition flex-shrink-0">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
