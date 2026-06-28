import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Send, Users, Image as ImageIcon, Smile, MoreVertical,
  CornerUpLeft, X, BellOff, Flag, LogOut, UserCheck, Check,
  Copy, Star, Share2, Trash2, Loader2,
} from "lucide-react";
import { api, resolveMediaUrl, resolveAvatarUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useRealtime } from "../context/RealtimeContext";

interface MemberInfo { username: string; displayName: string; avatarUrl: string; role: string; }

const GALLERY = [
  "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1587620962725-abab7fe55159?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=400&auto=format&fit=crop",
];

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
const EMOJIS = ["😀","😂","🥰","😍","🤩","😎","🥳","🤔","😭","😱","🔥","❤️","💜","✨","🎉","👏","🙌","💯","🚀","🎶","💪","👀","🤝","💡","🎨","🎵","🏆","✅","😮","🤣"];

interface ReplyRef { id: number; user: string; text: string; }
interface Message {
  id: number;
  user: string;
  avatar: string;
  text?: string;
  imageUrl?: string;
  time: string;
  isOwn: boolean;
  replyTo?: ReplyRef;
  reactions: Record<string, number>;
  myReaction?: string;
  starred?: boolean;
  deleted?: boolean;
}

interface CommunityInfo {
  name: string;
  members: string;
  img: string;
}

function timeStr(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function initMsg(m: Omit<Message, "reactions">): Message { return { ...m, reactions: {} }; }

export function CommunityChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribe } = useRealtime();

  const [community, setCommunity] = useState<CommunityInfo>({ name: "", members: "…", img: "" });
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const membersLoaded = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [input, setInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<ReplyRef | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [mutedComm, setMutedComm] = useState(false);

  /* Context menu */
  const [ctxMenu, setCtxMenu] = useState<number | null>(null);
  const [showReactPicker, setShowReactPicker] = useState(false);

  /* Swipe-to-reply */
  const [swipingId, setSwipingId] = useState<number | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const touchStart = useRef({ x: 0, y: 0 });
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [toast, setToast] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch community info
  useEffect(() => {
    if (!id) return;
    api.get<{ id: string; name: string; memberCount: number; avatarUrl?: string }>(`/communities/${id}`)
      .then(data => {
        setCommunity({
          name: data.name,
          members: data.memberCount >= 1000 ? (data.memberCount / 1000).toFixed(1) + "K" : String(data.memberCount),
          img: data.avatarUrl ?? "",
        });
      })
      .catch(() => {});
  }, [id]);

  const loadMembers = () => {
    if (!id || membersLoaded.current) return;
    membersLoaded.current = true;
    setLoadingMembers(true);
    api.get<MemberInfo[]>(`/communities/${id}/members`)
      .then(data => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  };

  // Fetch initial messages
  useEffect(() => {
    if (!id) return;
    setLoadingMsgs(true);
    api.get<{ id: string; body: string; createdAt: string; author: { username: string; displayName: string; avatarUrl: string }; replyTo?: { id: string; author: { username: string }; body: string } }[]>(
      `/communities/${id}/messages?limit=50`
    )
      .then(data => {
        const mapped: Message[] = data.map(m => initMsg({
          id: Number(m.id) || Date.now() + Math.random(),
          user: m.author.username,
          avatar: resolveAvatarUrl(m.author.avatarUrl),
          text: m.body,
          time: timeStr(m.createdAt),
          isOwn: user?.username === m.author.username,
          replyTo: m.replyTo ? { id: Number(m.replyTo.id), user: m.replyTo.author.username, text: m.replyTo.body } : undefined,
        }));
        setMessages(mapped);
      })
      .catch(() => {
        setMessages([]);
      })
      .finally(() => setLoadingMsgs(false));
  }, [id, user?.username]);

  // Subscribe to WS for new community messages
  useEffect(() => {
    return subscribe(event => {
      if (event.type === "community:message" && event.communityId === id) {
        const m = event.message;
        setMessages(prev => [...prev, initMsg({
          id: Number(m.id) || Date.now() + Math.random(),
          user: m.author.username,
          avatar: resolveAvatarUrl(m.author.avatarUrl),
          text: m.body,
          time: timeStr(m.createdAt),
          isOwn: user?.username === m.author.username,
          replyTo: m.replyTo ? { id: Number(m.replyTo.id), user: m.replyTo.author.username, text: m.replyTo.body } : undefined,
        })]);
      }
    });
  }, [subscribe, id, user?.username]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  const send = async () => {
    if (!input.trim() || !id) return;
    const text = input.trim();
    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    const optimisticId = Date.now();
    const myAvatar = resolveAvatarUrl(user?.avatarUrl);
    const myUsername = user?.username || "me";

    // Optimistic append
    setMessages(prev => [...prev, initMsg({
      id: optimisticId,
      user: myUsername,
      avatar: myAvatar,
      text,
      time: now,
      isOwn: true,
      replyTo: replyingTo ?? undefined,
    })]);
    setInput(""); setReplyingTo(null); setCtxMenu(null);

    try {
      await api.post(`/communities/${id}/messages`, {
        body: text,
        replyToId: replyingTo?.id,
      });
    } catch {
      // Remove optimistic message on failure and restore input
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      setInput(text);
      showToast("Failed to send message");
    }
  };

  const sendImage = (url: string) => {
    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    const myAvatar = resolveAvatarUrl(user?.avatarUrl);
    const myUsername = user?.username || "me";
    setMessages(prev => [...prev, initMsg({ id: Date.now(), user: myUsername, avatar: myAvatar, imageUrl: url, time: now, isOwn: true })]);
    setShowGallery(false);
  };

  const startReply = (msg: Message) => {
    setReplyingTo({ id: msg.id, user: msg.isOwn ? "You" : msg.user, text: msg.text || "📷 Image" });
    setCtxMenu(null); setShowReactPicker(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const ctxMsg = messages.find(m => m.id === ctxMenu);

  const addReaction = (emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== ctxMenu) return m;
      const prev_count = m.reactions[emoji] || 0;
      const already = m.myReaction === emoji;
      const newR = { ...m.reactions };
      if (already) {
        newR[emoji] = Math.max(0, prev_count - 1);
        if (!newR[emoji]) delete newR[emoji];
        return { ...m, reactions: newR, myReaction: undefined };
      } else {
        if (m.myReaction) {
          newR[m.myReaction] = Math.max(0, (newR[m.myReaction] || 1) - 1);
          if (!newR[m.myReaction]) delete newR[m.myReaction];
        }
        newR[emoji] = prev_count + 1;
        return { ...m, reactions: newR, myReaction: emoji };
      }
    }));
    setCtxMenu(null); setShowReactPicker(false);
  };

  const copyMessage = () => {
    if (ctxMsg?.text) navigator.clipboard.writeText(ctxMsg.text).catch(() => {});
    showToast("Copied"); setCtxMenu(null);
  };
  const toggleStar = () => {
    setMessages(prev => prev.map(m => m.id === ctxMenu ? { ...m, starred: !m.starred } : m));
    showToast(ctxMsg?.starred ? "Unstarred" : "Starred"); setCtxMenu(null);
  };
  const deleteMessage = () => {
    setMessages(prev => prev.map(m => m.id === ctxMenu ? { ...m, deleted: true, text: undefined, imageUrl: undefined } : m));
    setCtxMenu(null);
  };

  /* Touch handlers */
  const onTouchStart = (e: React.TouchEvent, msg: Message) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressRef.current = setTimeout(() => { setCtxMenu(msg.id); setShowReactPicker(false); }, 500);
  };
  const onTouchMove = (e: React.TouchEvent, msg: Message) => {
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
    }
    if (dx > 0 && Math.abs(dy) < 40) {
      setSwipingId(msg.id); setSwipeX(Math.min(dx, 80));
    }
  };
  const onTouchEnd = (e: React.TouchEvent, msg: Message) => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (dx > 55 && Math.abs(dy) < 40) startReply(msg);
    setSwipingId(null); setSwipeX(0);
  };
  const onContextMenu = (e: React.MouseEvent, msgId: number) => {
    e.preventDefault(); setCtxMenu(msgId); setShowReactPicker(false);
  };

  return (
    <div className="flex flex-col h-full bg-black" onClick={() => { setCtxMenu(null); setShowMenu(false); setShowEmoji(false); }}>

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg border border-gray-700 pointer-events-none">
          {toast}
        </div>
      )}

      {/* ── CONTEXT MENU ── */}
      {ctxMenu !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={() => { setCtxMenu(null); setShowReactPicker(false); }}>
          <div className="w-full bg-gray-950 border-t border-gray-800 rounded-t-3xl max-w-xl mx-auto pb-6" onClick={e => e.stopPropagation()}>
            {!showReactPicker ? (
              <div className="flex items-center justify-around px-4 py-4 border-b border-gray-800">
                {QUICK_REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => addReaction(emoji)}
                    className={`text-2xl w-11 h-11 rounded-full flex items-center justify-center transition hover:scale-125 ${ctxMsg?.myReaction === emoji ? "bg-purple-900/40 ring-2 ring-purple-500" : "hover:bg-gray-800"}`}>
                    {emoji}
                  </button>
                ))}
                <button onClick={() => setShowReactPicker(true)} className="text-gray-400 w-11 h-11 rounded-full flex items-center justify-center hover:bg-gray-800 transition text-lg">+</button>
              </div>
            ) : (
              <div className="px-4 py-3 border-b border-gray-800">
                <div className="grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => addReaction(e)} className="text-2xl w-10 h-10 flex items-center justify-center hover:bg-gray-800 rounded-lg transition hover:scale-110">{e}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="px-2 pt-2 space-y-0.5">
              <button onClick={() => startReply(ctxMsg!)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 rounded-xl transition text-left">
                <CornerUpLeft size={18} className="text-gray-400" /><span className="text-white text-sm font-medium">Reply</span>
              </button>
              {ctxMsg?.text && (
                <button onClick={copyMessage} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 rounded-xl transition text-left">
                  <Copy size={18} className="text-gray-400" /><span className="text-white text-sm font-medium">Copy</span>
                </button>
              )}
              <button onClick={toggleStar} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 rounded-xl transition text-left">
                <Star size={18} className={ctxMsg?.starred ? "text-yellow-400 fill-yellow-400" : "text-gray-400"} />
                <span className="text-white text-sm font-medium">{ctxMsg?.starred ? "Unstar" : "Star"}</span>
              </button>
              <button onClick={() => { showToast("Forwarded"); setCtxMenu(null); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 rounded-xl transition text-left">
                <Share2 size={18} className="text-gray-400" /><span className="text-white text-sm font-medium">Forward</span>
              </button>
              {ctxMsg?.isOwn ? (
                <button onClick={deleteMessage} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 rounded-xl transition text-left">
                  <Trash2 size={18} className="text-red-400" /><span className="text-red-400 text-sm font-medium">Delete</span>
                </button>
              ) : (
                <button onClick={() => { showToast("Report submitted"); setCtxMenu(null); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 rounded-xl transition text-left">
                  <Flag size={18} className="text-red-400" /><span className="text-red-400 text-sm font-medium">Report</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MEMBERS MODAL ── */}
      {showMembers && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end" onClick={() => setShowMembers(false)}>
          <div className="w-full bg-gray-950 border-t border-gray-800 rounded-t-3xl p-5 max-w-xl mx-auto max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="text-white font-bold text-lg">Members ({members.length})</h3>
              <button onClick={() => setShowMembers(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1">
              {loadingMembers ? (
                <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-purple-400" /></div>
              ) : members.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-8">No members found</p>
              ) : members.map(m => (
                <div key={m.username} className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl">
                  <img src={resolveMediaUrl(m.avatarUrl) ?? m.avatarUrl} alt={m.username} className="w-10 h-10 rounded-full object-cover bg-gray-800" />
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">@{m.username}</p>
                    <p className="text-gray-500 text-xs">{m.displayName}</p>
                  </div>
                  {(m.role === "admin" || m.role === "Admin") && (
                    <span className="text-[10px] font-bold text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded-full">Admin</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── THREE-DOTS MENU ── */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowMenu(false)}>
          <div className="absolute top-14 right-3 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl w-56" onClick={e => e.stopPropagation()}>
            {[
              { icon: UserCheck, label: "View members", action: () => { loadMembers(); setShowMembers(true); setShowMenu(false); } },
              { icon: BellOff, label: mutedComm ? "Unmute community" : "Mute community", action: () => { setMutedComm(p => !p); setShowMenu(false); showToast(mutedComm ? "Unmuted" : "Muted"); } },
              { icon: Flag, label: "Report community", action: () => { showToast("Report submitted"); setShowMenu(false); } },
              { icon: LogOut, label: "Leave community", action: () => { navigate(-1); }, danger: true },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition hover:bg-gray-800 ${(item as { danger?: boolean }).danger ? "text-red-400" : "text-white"}`}>
                <item.icon size={16} className={(item as { danger?: boolean }).danger ? "text-red-400" : "text-gray-400"} />
                {item.label}
                {item.label.startsWith("Unmute") && <Check size={14} className="ml-auto text-purple-400" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── GALLERY ── */}
      {showGallery && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end" onClick={() => setShowGallery(false)}>
          <div className="w-full bg-gray-950 border-t border-gray-800 rounded-t-3xl p-5 max-w-xl mx-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Gallery</h3>
              <button onClick={() => setShowGallery(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {GALLERY.map((url, i) => (
                <button key={i} onClick={() => sendImage(url)} className="aspect-square rounded-xl overflow-hidden bg-gray-800 hover:opacity-80 transition">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-black/90 backdrop-blur-md flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full transition">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
          <img src={community.img} alt={community.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">{community.name}</p>
          <p className="text-gray-500 text-xs flex items-center gap-1"><Users size={10} /> {community.members} members</p>
        </div>
        <button onClick={e => { e.stopPropagation(); setShowMenu(p => !p); }} className="p-2 hover:bg-gray-900 rounded-full transition">
          <MoreVertical size={20} className="text-gray-400" />
        </button>
      </div>

      {/* ── MESSAGES ── */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" onClick={() => { setCtxMenu(null); setShowEmoji(false); }}>
        {loadingMsgs ? (
          <div className="flex justify-center pt-12">
            <Loader2 size={24} className="text-purple-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-12 text-gray-600 text-sm">
            <p>No messages yet. Be the first to say something!</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id}
              className={`flex gap-3 select-none ${msg.isOwn ? "flex-row-reverse" : ""}`}
              style={{
                transform: swipingId === msg.id ? `translateX(${msg.isOwn ? -swipeX : swipeX}px)` : "translateX(0)",
                transition: swipingId === msg.id ? "none" : "transform 0.2s ease",
              }}
              onTouchStart={e => { e.stopPropagation(); onTouchStart(e, msg); }}
              onTouchMove={e => { e.stopPropagation(); onTouchMove(e, msg); }}
              onTouchEnd={e => { e.stopPropagation(); onTouchEnd(e, msg); }}
              onContextMenu={e => { e.stopPropagation(); onContextMenu(e, msg.id); }}
            >
              {!msg.isOwn && (
                <img src={msg.avatar} alt={msg.user} className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 object-cover self-end" />
              )}

              <div className={`max-w-[75%] flex flex-col ${msg.isOwn ? "items-end" : "items-start"}`}>
                {!msg.isOwn && <p className="text-purple-400 text-xs font-semibold mb-1">{msg.user}</p>}

                {/* Swipe arrow */}
                {swipingId === msg.id && swipeX > 20 && (
                  <CornerUpLeft size={14} className="text-purple-400 mb-1" style={{ opacity: Math.min(swipeX / 60, 1) }} />
                )}

                {/* Quoted reply */}
                {msg.replyTo && (
                  <div className="text-xs px-3 py-1.5 mb-1 rounded-xl border-l-2 border-purple-500 bg-gray-800/80 max-w-full">
                    <span className="text-purple-400 font-semibold block">{msg.replyTo.user}</span>
                    <span className="text-gray-400 truncate block max-w-[180px]">{msg.replyTo.text}</span>
                  </div>
                )}

                {/* Bubble */}
                {msg.deleted ? (
                  <div className="px-4 py-2.5 rounded-2xl text-sm text-gray-600 italic bg-gray-900/50 border border-gray-800">
                    🚫 This message was deleted
                  </div>
                ) : msg.imageUrl ? (
                  <div className={`rounded-2xl overflow-hidden w-44 ${msg.isOwn ? "rounded-tr-sm" : "rounded-tl-sm"}`}>
                    <img src={msg.imageUrl} alt="sent" className="w-full object-cover" />
                  </div>
                ) : (
                  <div className={`px-4 py-2.5 rounded-2xl text-sm ${msg.isOwn ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-tr-sm" : "bg-gray-900 text-gray-100 rounded-tl-sm"}`}>
                    {msg.starred && <Star size={9} className="inline mr-1 text-yellow-400 fill-yellow-400" />}
                    {msg.text}
                  </div>
                )}

                {/* Reactions */}
                {Object.keys(msg.reactions).length > 0 && (
                  <div className={`flex gap-1 mt-1 flex-wrap ${msg.isOwn ? "justify-end" : "justify-start"}`}>
                    {Object.entries(msg.reactions).filter(([, c]) => c > 0).map(([emoji, count]) => (
                      <button key={emoji}
                        onClick={e => { e.stopPropagation(); setCtxMenu(msg.id); addReaction(emoji); }}
                        className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border transition ${msg.myReaction === emoji ? "bg-purple-900/40 border-purple-600 text-white" : "bg-gray-900 border-gray-700 text-gray-300"}`}>
                        {emoji} {count}
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-gray-600 text-[10px] mt-0.5">{msg.time}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── EMOJI PANEL ── */}
      {showEmoji && (
        <div className="bg-gray-950 border-t border-gray-800 px-4 py-3 grid grid-cols-10 gap-2 flex-shrink-0">
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setInput(p => p + e)} className="text-xl leading-none hover:scale-125 transition-transform">{e}</button>
          ))}
        </div>
      )}

      {/* ── INPUT ── */}
      <div className="border-t border-gray-800 flex-shrink-0" onClick={e => e.stopPropagation()}>
        {replyingTo && (
          <div className="flex items-center justify-between px-4 pt-3 pb-0 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CornerUpLeft size={13} className="text-purple-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-purple-400 text-xs font-semibold">{replyingTo.user}</span>
                <p className="text-gray-500 text-xs truncate">{replyingTo.text}</p>
              </div>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-800 rounded-full transition flex-shrink-0">
              <X size={13} className="text-gray-500" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => { setShowGallery(true); setShowEmoji(false); }} className="p-2 hover:bg-gray-900 rounded-full transition flex-shrink-0">
            <ImageIcon size={20} className="text-gray-500" />
          </button>
          <div className="flex-1 flex items-center bg-gray-900 border border-gray-800 rounded-full px-4 py-2.5 gap-2">
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder={replyingTo ? `Reply to ${replyingTo.user}…` : "Message the community…"}
              className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none" />
            <button onClick={() => { setShowEmoji(p => !p); inputRef.current?.focus(); }}
              className={`transition flex-shrink-0 ${showEmoji ? "text-purple-400" : "text-gray-500 hover:text-gray-300"}`}>
              <Smile size={18} />
            </button>
          </div>
          <button onClick={send} disabled={!input.trim()}
            className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center disabled:opacity-40 transition flex-shrink-0">
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
