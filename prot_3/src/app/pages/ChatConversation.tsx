import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Send, Image as ImageIcon, Smile, Phone, Video,
  MoreVertical, CornerUpLeft, X, Mic, MicOff, Volume2, VolumeX,
  CameraOff, FlipHorizontal, PhoneOff, Palette, BellOff, ShieldAlert,
  Flag, Trash2, Check, Copy, Star, Share2, Loader2, Play, Pause,
} from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { api, resolveMediaUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useRealtime } from "../context/RealtimeContext";

interface ReplyRef { id: string; user: string; text: string; }
interface Message {
  id: string;
  text?: string;
  imageUrl?: string;
  mediaUrl?: string;
  mediaType?: string;
  time: string;
  isOwn: boolean;
  replyTo?: ReplyRef;
  reactions: Record<string, number>;
  myReaction?: string;
  starred?: boolean;
  deleted?: boolean;
}

interface ApiMessage {
  id: string;
  body: string;
  mediaUrl: string | null;
  mediaType?: string | null;
  createdAt: string;
  isMine: boolean;
  deleted?: boolean;
  reactions?: Record<string, number>;
  myReaction?: string;
  sender: { id: string; username: string; displayName: string; avatarUrl: string };
}

interface OtherUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
const EMOJIS = ["😀","😂","🥰","😍","🤩","😎","🥳","🤔","😭","😱","🔥","❤️","💜","✨","🎉","👏","🙌","💯","🚀","🎶","💪","👀","🤝","💡","🎨","🎵","🏆","✅","😮","🤣"];
const ACCENT_COLORS = [
  { name: "Purple", from: "from-purple-600", to: "to-pink-600", preview: "bg-purple-500" },
  { name: "Blue",   from: "from-blue-600",   to: "to-cyan-500",    preview: "bg-blue-500"   },
  { name: "Green",  from: "from-green-600",  to: "to-emerald-400", preview: "bg-green-500"  },
  { name: "Orange", from: "from-orange-500", to: "to-yellow-400",  preview: "bg-orange-500" },
  { name: "Red",    from: "from-red-600",    to: "to-pink-500",    preview: "bg-red-500"    },
];

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function toMsg(m: ApiMessage): Message {
  return {
    id:        m.id,
    text:      m.body || undefined,
    imageUrl:  (!m.mediaType || m.mediaType.startsWith("image") || m.mediaType.startsWith("video"))
                 ? (resolveMediaUrl(m.mediaUrl) ?? undefined)
                 : undefined,
    mediaUrl:  m.mediaUrl ? (resolveMediaUrl(m.mediaUrl) ?? undefined) : undefined,
    mediaType: m.mediaType ?? undefined,
    time:      fmtTime(m.createdAt),
    isOwn:     m.isMine,
    deleted:   m.deleted ?? false,
    reactions: m.reactions ?? {},
    myReaction: m.myReaction,
  };
}

// ── Audio player bubble ──────────────────────────────────────────────────────
function AudioPlayer({ src, isOwn }: { src: string; isOwn: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play(); setPlaying(true); }
  };

  const onTimeUpdate = () => {
    const el = audioRef.current;
    if (!el) return;
    setCurrent(el.currentTime);
    setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const onEnded = () => { setPlaying(false); setProgress(0); setCurrent(0); };

  const fmtSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    el.currentTime = pct * el.duration;
  };

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl min-w-[200px] max-w-[260px]
      ${isOwn ? "bg-purple-700/80 rounded-tr-sm" : "bg-gray-800 rounded-tl-sm"}`}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        preload="metadata"
      />
      <button onClick={toggle}
        className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition">
        {playing
          ? <Pause size={14} className="text-white" />
          : <Play size={14} className="text-white ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className="h-1.5 bg-white/20 rounded-full cursor-pointer mb-1 relative overflow-hidden"
          onClick={seekTo}
        >
          <div
            className="absolute left-0 top-0 h-full bg-white/70 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-white/60 select-none">
          {playing ? fmtSecs(current) : fmtSecs(duration || 0)}
        </p>
      </div>
      <span className="text-white/50 text-lg flex-shrink-0">🎤</span>
    </div>
  );
}

export function ChatConversation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const { subscribe } = useRealtime();

  const [threadId, setThreadId]   = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [loading, setLoading]     = useState(true);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyRef | null>(null);

  const [ctxMenu, setCtxMenu]               = useState<string | null>(null);
  const [showReactPicker, setShowReactPicker] = useState(false);
  const [swipingId, setSwipingId]           = useState<string | null>(null);
  const [swipeX, setSwipeX]                 = useState(0);
  const touchStart = useRef({ x: 0, y: 0 });
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [callType, setCallType]     = useState<"audio" | "video" | null>(null);
  const [callState, setCallState]   = useState<"calling" | "connected">("calling");
  const [muted, setMuted]           = useState(false);
  const [speakerOn, setSpeakerOn]   = useState(true);
  const [camOff, setCamOff]         = useState(false);
  const [callTimer, setCallTimer]   = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showMenu, setShowMenu]           = useState(false);
  const [showEmoji, setShowEmoji]         = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [accent, setAccent]               = useState(ACCENT_COLORS[0]);
  const [mutedNotif, setMutedNotif]       = useState(false);
  const [toast, setToast]                 = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // ── Voice recording state ──────────────────────────────────────────────────
  const [isRecording, setIsRecording]     = useState(false);
  const [recSeconds, setRecSeconds]       = useState(0);
  const [sendingVoice, setSendingVoice]   = useState(false);
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const recChunksRef      = useRef<Blob[]>([]);
  const recStreamRef      = useRef<MediaStream | null>(null);
  const recTimerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const recMimeRef        = useRef<string>("audio/webm");

  // ── Emoji picker ref for click-outside ────────────────────────────────────
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const listRef    = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const lastMsgTime = useRef<string>(new Date(0).toISOString());

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  // Click-outside for emoji picker
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmoji]);

  useEffect(() => {
    if (!id) { setLoading(false); return; }

    // A CUID (Prisma ID) is all lowercase alphanumeric, 20+ chars.
    // A username typically contains mixed chars, underscores, or is shorter.
    // This also handles legacy URLs where a user ID was used instead of username.
    const looksLikeCuid = /^[0-9a-z]{20,}$/.test(id);

    if (!looksLikeCuid) {
      // Definitely a username — fetch user profile, then look for an existing thread
      const resolveByUsername = async () => {
        try {
          const u = await api.get<{ id: string; username: string; displayName: string; avatarUrl: string }>(`/users/${id}`);
          setOtherUser({ id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl });

          // Find an existing thread with this user so messages load
          const threads = await api.get<{ threadId: string; other: { id: string; username: string } | null }[]>("/messages/threads");
          const match = threads.find(t => t.other?.username === u.username);
          if (match) {
            setThreadId(match.threadId);
            const msgs = await api.get<ApiMessage[]>(`/messages/threads/${match.threadId}`);
            setMessages(msgs.map(toMsg));
            if (msgs.length > 0) lastMsgTime.current = msgs[msgs.length - 1].createdAt;
          }
        } catch { /* profile or threads fetch failed */ } finally {
          setLoading(false);
        }
      };
      resolveByUsername();
    } else {
      // Looks like a CUID — try as thread ID first, then fall back to user ID lookup
      const resolveId = async () => {
        try {
          const data = await api.get<ApiMessage[]>(`/messages/threads/${id}`);
          setThreadId(id);
          const other = data.find(m => !m.isMine)?.sender ?? null;
          if (other) {
            setOtherUser({ id: other.id, username: other.username, displayName: other.displayName, avatarUrl: other.avatarUrl });
          } else {
            // All messages are from the current user (or thread is empty) — look up the
            // other participant via the thread list so the header still shows their name.
            try {
              const threads = await api.get<{ threadId: string; other: { id: string; username: string; displayName: string; avatarUrl: string } | null }[]>("/messages/threads");
              const match = threads.find(t => t.threadId === id);
              if (match?.other) {
                setOtherUser(match.other);
                // Rewrite URL to username-based path so future reloads resolve cleanly
                window.history.replaceState(null, "", `/chat/${match.other.username}`);
              }
            } catch { /* non-critical, header degrades gracefully */ }
          }
          setMessages(data.map(toMsg));
          if (data.length > 0) {
            lastMsgTime.current = data[data.length - 1].createdAt;
          }
        } catch {
          // Thread lookup failed (403/404) — the ID might be a user ID, not a thread ID.
          // The server's /users/:username endpoint also accepts IDs, so try that.
          try {
            const u = await api.get<{ id: string; username: string; displayName: string; avatarUrl: string }>(`/users/${id}`);
            setOtherUser({ id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl });
            // Rewrite URL to canonical username path
            window.history.replaceState(null, "", `/chat/${u.username}`);
          } catch { /* give up — header will show fallback */ }
        } finally {
          setLoading(false);
        }
      };
      resolveId();
    }
  }, [id]);

  // Real-time: receive new messages / deletions / reactions via WebSocket
  useEffect(() => {
    return subscribe(event => {
      if (!threadId || event.threadId !== threadId) return;

      if (event.type === "message:new") {
        lastMsgTime.current = event.createdAt;
        const incoming: Message = {
          id:        event.id,
          text:      event.body || undefined,
          imageUrl:  event.mediaUrl ? (resolveMediaUrl(event.mediaUrl) ?? undefined) : undefined,
          mediaUrl:  event.mediaUrl ? (resolveMediaUrl(event.mediaUrl) ?? undefined) : undefined,
          mediaType: event.mediaType ?? undefined,
          time:      fmtTime(event.createdAt),
          isOwn:     false,
          reactions: {},
        };
        setMessages(prev => {
          if (prev.some(m => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      } else if (event.type === "message:deleted") {
        setMessages(prev => prev.map(m =>
          m.id === event.messageId ? { ...m, deleted: true, text: undefined, imageUrl: undefined } : m
        ));
      } else if (event.type === "message:reaction") {
        setMessages(prev => prev.map(m =>
          m.id === event.messageId
            ? { ...m, reactions: event.reactions ?? {}, myReaction: event.myReaction ?? m.myReaction }
            : m
        ));
      }
    });
  }, [subscribe, threadId]);

  // Poll as fallback (slower now that WS handles real-time)
  useEffect(() => {
    if (!threadId) return;
    const poll = async () => {
      try {
        const newMsgs = await api.get<ApiMessage[]>(`/messages/threads/${threadId}/poll?after=${encodeURIComponent(lastMsgTime.current)}`);
        if (newMsgs.length > 0) {
          lastMsgTime.current = newMsgs[newMsgs.length - 1].createdAt;
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const fresh = newMsgs.filter(m => !existingIds.has(m.id)).map(toMsg);
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        }
      } catch {}
    };
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [threadId]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const now = new Date().toISOString();
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId, text, time: fmtTime(now), isOwn: true,
      replyTo: replyingTo ?? undefined, reactions: {},
    };
    setMessages(prev => [...prev, tempMsg]);
    setReplyingTo(null);
    setShowEmoji(false);

    try {
      const body: Record<string, string> = { body: text };
      if (threadId) {
        body.threadId = threadId;
      } else if (otherUser) {
        body.recipientId = otherUser.id;
      } else {
        setSending(false);
        return;
      }

      const resp = await api.post<{ threadId: string; id: string; body: string; createdAt: string; isMine: boolean; sender: OtherUser }>(
        "/messages/send", body
      );

      if (!threadId && resp.threadId) {
        setThreadId(resp.threadId);
        // Navigate using username so the header always resolves correctly
        navigate(`/chat/${otherUser?.username ?? resp.threadId}`, { replace: true });
      }

      lastMsgTime.current = resp.createdAt;
      setMessages(prev => prev.map(m => m.id === tempId ? {
        ...m, id: resp.id, time: fmtTime(resp.createdAt)
      } : m));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      showToast("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const tempId = `img-temp-${Date.now()}`;
    const localUrl = URL.createObjectURL(file);
    const now = new Date().toISOString();
    setMessages(prev => [...prev, { id: tempId, imageUrl: localUrl, time: fmtTime(now), isOwn: true, reactions: {} }]);
    setUploadingImage(true);

    try {
      const { url: mediaUrl } = await api.upload(file);

      const body: Record<string, string> = { mediaUrl };
      const tId = threadId;
      if (tId) {
        body.threadId = tId;
      } else if (otherUser) {
        body.recipientId = otherUser.id;
      } else return;

      const resp = await api.post<{ threadId: string; id: string; createdAt: string }>(
        "/messages/send", body
      );
      if (!threadId && resp.threadId) {
        setThreadId(resp.threadId);
        navigate(`/chat/${otherUser?.username ?? resp.threadId}`, { replace: true });
      }
      lastMsgTime.current = resp.createdAt;
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: resp.id, time: fmtTime(resp.createdAt) } : m));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      URL.revokeObjectURL(localUrl);
      showToast("Failed to send image");
    } finally {
      setUploadingImage(false);
    }
  };

  // ── Voice recording ────────────────────────────────────────────────────────
  const stopRecordingTimer = useCallback(() => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
  }, []);

  const stopRecordingStream = useCallback(() => {
    recStreamRef.current?.getTracks().forEach(t => t.stop());
    recStreamRef.current = null;
  }, []);

  const cancelRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    recChunksRef.current = [];
    stopRecordingTimer();
    stopRecordingStream();
    setIsRecording(false);
    setRecSeconds(0);
  }, [stopRecordingTimer, stopRecordingStream]);

  const finishAndSendVoice = useCallback((mr: MediaRecorder, mimeType: string) => {
    mr.addEventListener("stop", async () => {
      const chunks = recChunksRef.current.slice();
      recChunksRef.current = [];
      stopRecordingTimer();
      stopRecordingStream();
      setIsRecording(false);
      setRecSeconds(0);

      if (chunks.length === 0) return;
      const blob = new Blob(chunks, { type: mimeType });
      const ext  = mimeType.includes("ogg") ? "ogg" : "webm";
      const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });

      setSendingVoice(true);
      const tempId  = `voice-temp-${Date.now()}`;
      const localUrl = URL.createObjectURL(blob);
      const now = new Date().toISOString();
      setMessages(prev => [...prev, {
        id: tempId, text: "🎤 Voice message",
        mediaUrl: localUrl, mediaType: mimeType,
        time: fmtTime(now), isOwn: true, reactions: {},
      }]);

      try {
        const { url: mediaUrl } = await api.upload(file);
        const body: Record<string, string> = {
          body: "🎤 Voice message",
          mediaUrl,
          mediaType: mimeType,
        };
        const tId = threadId;
        if (tId) {
          body.threadId = tId;
        } else if (otherUser) {
          body.recipientId = otherUser.id;
        } else {
          setSendingVoice(false);
          return;
        }
        const resp = await api.post<{ threadId: string; id: string; createdAt: string }>(
          "/messages/send", body
        );
        if (!threadId && resp.threadId) {
          setThreadId(resp.threadId);
          navigate(`/chat/${otherUser?.username ?? resp.threadId}`, { replace: true });
        }
        lastMsgTime.current = resp.createdAt;
        setMessages(prev => prev.map(m => m.id === tempId ? {
          ...m, id: resp.id, mediaUrl: resolveMediaUrl(mediaUrl) ?? localUrl, time: fmtTime(resp.createdAt),
        } : m));
      } catch {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        URL.revokeObjectURL(localUrl);
        showToast("Failed to send voice message");
      } finally {
        setSendingVoice(false);
      }
    }, { once: true });

    mr.stop();
  }, [stopRecordingTimer, stopRecordingStream, threadId, otherUser, navigate]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      recMimeRef.current = mimeType;
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      recChunksRef.current = [];

      mr.addEventListener("dataavailable", (e: BlobEvent) => {
        if (e.data.size > 0) recChunksRef.current.push(e.data);
      });

      mr.start(100);
      setIsRecording(true);
      setRecSeconds(0);

      recTimerRef.current = setInterval(() => {
        setRecSeconds(prev => {
          if (prev >= 59) {
            finishAndSendVoice(mr, mimeType);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      showToast("Microphone permission denied");
    }
  }, [finishAndSendVoice]);

  const handleMicClick = () => {
    if (isRecording) {
      const mr = mediaRecorderRef.current;
      if (mr) finishAndSendVoice(mr, recMimeRef.current);
      mediaRecorderRef.current = null;
    } else {
      startRecording();
    }
  };

  const fmtRecTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── Standard message actions ───────────────────────────────────────────────
  const startReply = (msg: Message) => {
    setReplyingTo({ id: msg.id, user: msg.isOwn ? "You" : (otherUser?.username ?? "them"), text: msg.text || "📷 Image" });
    setCtxMenu(null); setShowReactPicker(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const ctxMsg = messages.find(m => m.id === ctxMenu);

  const copyMessage = () => {
    if (ctxMsg?.text) navigator.clipboard.writeText(ctxMsg.text).catch(() => {});
    showToast("Copied to clipboard"); setCtxMenu(null);
  };
  const toggleStar = () => {
    setMessages(prev => prev.map(m => m.id === ctxMenu ? { ...m, starred: !m.starred } : m));
    showToast(ctxMsg?.starred ? "Unstarred" : "Message starred"); setCtxMenu(null);
  };
  const deleteMessage = () => {
    const msgId = ctxMenu;
    if (!msgId) return;
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deleted: true, text: undefined, imageUrl: undefined } : m));
    setCtxMenu(null);
    api.delete(`/messages/${msgId}`).catch(() => {});
  };
  const forwardMessage = () => { showToast("Forwarded"); setCtxMenu(null); };
  const addReaction = (emoji: string) => {
    const msgId = ctxMenu;
    if (!msgId) { setCtxMenu(null); setShowReactPicker(false); return; }
    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const prevCount = m.reactions[emoji] || 0;
      const already   = m.myReaction === emoji;
      const newR = { ...m.reactions };
      if (already) {
        newR[emoji] = Math.max(0, prevCount - 1);
        if (newR[emoji] === 0) delete newR[emoji];
        return { ...m, reactions: newR, myReaction: undefined };
      } else {
        if (m.myReaction) {
          newR[m.myReaction] = Math.max(0, (newR[m.myReaction] || 1) - 1);
          if (newR[m.myReaction] === 0) delete newR[m.myReaction];
        }
        newR[emoji] = prevCount + 1;
        return { ...m, reactions: newR, myReaction: emoji };
      }
    }));
    setCtxMenu(null); setShowReactPicker(false);
    // Persist to server
    api.post<{ reactions: Record<string, number>; myReaction?: string }>(`/messages/${msgId}/react`, { emoji })
      .then(res => {
        setMessages(prev => prev.map(m => m.id === msgId
          ? { ...m, reactions: res.reactions, myReaction: res.myReaction }
          : m));
      })
      .catch(() => {});
  };

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
    if (dx > 0 && Math.abs(dy) < 40) { setSwipingId(msg.id); setSwipeX(Math.min(dx, 80)); }
  };
  const onTouchEnd = (e: React.TouchEvent, msg: Message) => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (dx > 55 && Math.abs(dy) < 40) startReply(msg);
    setSwipingId(null); setSwipeX(0);
  };
  const onContextMenu = (e: React.MouseEvent, msgId: string) => {
    e.preventDefault(); setCtxMenu(msgId); setShowReactPicker(false);
  };

  const startCall = (type: "audio" | "video") => {
    setCallType(type); setCallState("calling"); setCallTimer(0);
    setTimeout(() => {
      setCallState("connected");
      timerRef.current = setInterval(() => setCallTimer(t => t + 1), 1000);
    }, 2000);
  };
  const endCall = () => {
    setCallType(null);
    if (timerRef.current) clearInterval(timerRef.current);
    setCallTimer(0); setMuted(false); setSpeakerOn(true); setCamOff(false);
  };
  const fmtCallTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const ownBubble = `bg-gradient-to-r ${accent.from} ${accent.to}`;

  const avatar = otherUser?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser?.username ?? "x"}`;
  const displayName = otherUser?.displayName ?? otherUser?.username ?? id ?? "Chat";

  return (
    <div className="flex flex-col h-full bg-black" onClick={() => { setCtxMenu(null); setShowMenu(false); setShowEmoji(false); }}>

      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg border border-gray-700 pointer-events-none">
          {toast}
        </div>
      )}

      {/* CALL OVERLAY */}
      {callType && (
        <div className="fixed inset-0 z-[60] bg-gray-950 flex flex-col items-center justify-between py-16 px-6">
          {callType === "video" && !camOff && (
            <img src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=800&auto=format&fit=crop"
              alt="cam" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          )}
          <div className="relative z-10 flex flex-col items-center gap-4">
            <img src={avatar} alt={displayName} className="w-28 h-28 rounded-full bg-gray-800 border-4 border-gray-700 object-cover" />
            <p className="text-white text-2xl font-bold">{displayName}</p>
            <p className="text-gray-400 text-sm">{callState === "calling" ? `${callType === "video" ? "Video" : "Voice"} calling…` : fmtCallTime(callTimer)}</p>
          </div>
          {callType === "video" && !camOff && (
            <div className="absolute bottom-48 right-6 w-28 h-40 rounded-2xl overflow-hidden border-2 border-gray-700 z-10">
              <img src={resolveMediaUrl(me?.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${me?.username}`} alt="me" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="relative z-10 flex items-center gap-6">
            <button onClick={() => setMuted(p => !p)} className={`w-14 h-14 rounded-full flex items-center justify-center transition ${muted ? "bg-white text-black" : "bg-gray-800 text-white"}`}>
              {muted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            {callType === "audio" ? (
              <button onClick={() => setSpeakerOn(p => !p)} className={`w-14 h-14 rounded-full flex items-center justify-center transition ${speakerOn ? "bg-white text-black" : "bg-gray-800 text-white"}`}>
                {speakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
              </button>
            ) : (
              <button onClick={() => setCamOff(p => !p)} className={`w-14 h-14 rounded-full flex items-center justify-center transition ${camOff ? "bg-white text-black" : "bg-gray-800 text-white"}`}>
                <CameraOff size={22} />
              </button>
            )}
            {callType === "video" && (
              <button onClick={() => showToast("Camera flipped")} className="w-14 h-14 bg-gray-800 rounded-full flex items-center justify-center text-white">
                <FlipHorizontal size={22} />
              </button>
            )}
            <button onClick={endCall} className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-900/50">
              <PhoneOff size={24} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* CONTEXT MENU */}
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
              <button onClick={forwardMessage} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 rounded-xl transition text-left">
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

      {/* THREE-DOTS MENU */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowMenu(false)}>
          <div className="absolute top-14 right-3 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl w-56" onClick={e => e.stopPropagation()}>
            {[
              { icon: Palette,   label: "Customize chat",                action: () => { setShowCustomize(true); setShowMenu(false); } },
              { icon: BellOff,   label: mutedNotif ? "Unmute" : "Mute",  action: () => { setMutedNotif(p => !p); setShowMenu(false); showToast(mutedNotif ? "Unmuted" : "Muted"); } },
              { icon: ShieldAlert,label: "Block user",                   action: () => { showToast(`${displayName} blocked`); setShowMenu(false); } },
              { icon: Flag,       label: "Report",                       action: () => { showToast("Report submitted"); setShowMenu(false); } },
              { icon: Trash2,     label: "Clear chat",                   action: () => { setMessages([]); setShowMenu(false); }, danger: true },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition hover:bg-gray-800 ${(item as { danger?: boolean }).danger ? "text-red-400" : "text-white"}`}>
                <item.icon size={16} className={(item as { danger?: boolean }).danger ? "text-red-400" : "text-gray-400"} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CUSTOMIZE CHAT */}
      {showCustomize && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end" onClick={() => setShowCustomize(false)}>
          <div className="w-full bg-gray-950 border-t border-gray-800 rounded-t-3xl p-6 max-w-xl mx-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Customize Chat</h3>
              <button onClick={() => setShowCustomize(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <p className="text-gray-400 text-sm mb-3">Chat colour</p>
            <div className="flex gap-3 mb-6">
              {ACCENT_COLORS.map(c => (
                <button key={c.name} onClick={() => setAccent(c)} className={`w-10 h-10 rounded-full ${c.preview} flex items-center justify-center transition hover:scale-110`}>
                  {accent.name === c.name && <Check size={16} className="text-white" />}
                </button>
              ))}
            </div>
            <button onClick={() => setShowCustomize(false)} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition">Save</button>
          </div>
        </div>
      )}

      {/* Hidden image file input */}
      <input ref={imgInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleImageFile} />

      {/* HEADER */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-black/90 backdrop-blur-md flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full transition">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <div className="relative flex-shrink-0">
          <img src={avatar} alt={displayName} className="w-10 h-10 rounded-full bg-gray-800 object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">{displayName}</p>
          <p className="text-xs text-gray-500">@{otherUser?.username ?? id}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => startCall("audio")} className="p-2 hover:bg-gray-900 rounded-full transition">
            <Phone size={18} className="text-gray-400" />
          </button>
          <button onClick={() => startCall("video")} className="p-2 hover:bg-gray-900 rounded-full transition">
            <Video size={18} className="text-gray-400" />
          </button>
          <button onClick={e => { e.stopPropagation(); setShowMenu(p => !p); }} className="p-2 hover:bg-gray-900 rounded-full transition">
            <MoreVertical size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0" onClick={() => { setCtxMenu(null); setShowEmoji(false); }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={28} className="animate-spin text-purple-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <img src={avatar} alt={displayName} className="w-16 h-16 rounded-full bg-gray-800 mb-3 object-cover" />
            <p className="text-white font-semibold">{displayName}</p>
            <p className="text-gray-500 text-sm mt-1">Start a conversation</p>
          </div>
        ) : messages.map(msg => (
          <div key={msg.id}
            className={`flex items-end gap-2 select-none ${msg.isOwn ? "justify-end" : "justify-start"}`}
            style={{
              transform: swipingId === msg.id ? `translateX(${msg.isOwn ? -swipeX : swipeX}px)` : "translateX(0)",
              transition: swipingId === msg.id ? "none" : "transform 0.2s ease",
            }}
            onTouchStart={e => { e.stopPropagation(); onTouchStart(e, msg); }}
            onTouchMove={e => { e.stopPropagation(); onTouchMove(e, msg); }}
            onTouchEnd={e => { e.stopPropagation(); onTouchEnd(e, msg); }}
            onContextMenu={e => { e.stopPropagation(); onContextMenu(e, msg.id); }}
          >
            {swipingId === msg.id && swipeX > 20 && (
              <div className={`flex-shrink-0 ${msg.isOwn ? "order-first" : "order-last"}`}>
                <CornerUpLeft size={16} className="text-purple-400" style={{ opacity: Math.min(swipeX / 60, 1) }} />
              </div>
            )}
            <div className={`max-w-[75%] flex flex-col ${msg.isOwn ? "items-end" : "items-start"}`}>
              {msg.replyTo && (
                <div className={`text-xs px-3 py-1.5 mb-1 rounded-xl border-l-2 border-purple-500 bg-gray-800/80 max-w-full ${msg.isOwn ? "self-end" : "self-start"}`}>
                  <span className="text-purple-400 font-semibold block">{msg.replyTo.user}</span>
                  <span className="text-gray-400 truncate block max-w-[200px]">{msg.replyTo.text}</span>
                </div>
              )}
              {msg.deleted ? (
                <div className="px-4 py-2.5 rounded-2xl text-sm text-gray-600 italic bg-gray-900/50 border border-gray-800">
                  🚫 This message was deleted
                </div>
              ) : msg.mediaType?.startsWith("audio") && msg.mediaUrl ? (
                <AudioPlayer src={msg.mediaUrl} isOwn={msg.isOwn} />
              ) : msg.imageUrl ? (
                <div className={`rounded-2xl overflow-hidden w-48 ${msg.isOwn ? "rounded-tr-sm" : "rounded-tl-sm"}`}>
                  <img src={msg.imageUrl} alt="sent" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`px-4 py-2.5 rounded-2xl text-sm ${msg.isOwn ? `${ownBubble} text-white rounded-tr-sm` : "bg-gray-900 text-gray-100 rounded-tl-sm"}`}>
                  {msg.starred && <Star size={9} className="inline mr-1 text-yellow-400 fill-yellow-400" />}
                  {msg.text}
                </div>
              )}
              {Object.keys(msg.reactions).length > 0 && (
                <div className={`flex gap-1 mt-1 flex-wrap ${msg.isOwn ? "justify-end" : "justify-start"}`}>
                  {Object.entries(msg.reactions).filter(([, c]) => c > 0).map(([emoji, count]) => (
                    <button key={emoji} onClick={e => { e.stopPropagation(); setCtxMenu(msg.id); addReaction(emoji); }}
                      className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border transition ${msg.myReaction === emoji ? "bg-purple-900/40 border-purple-600 text-white" : "bg-gray-900 border-gray-700 text-gray-300"}`}>
                      {emoji} {count}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-gray-600 text-[10px] mt-0.5 px-1">{msg.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* EMOJI PICKER (full, WhatsApp-style) */}
      {showEmoji && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-[72px] left-2 z-40"
          onClick={e => e.stopPropagation()}
        >
          <EmojiPicker
            theme={Theme.DARK}
            onEmojiClick={(data: EmojiClickData) => {
              setInput(prev => prev + data.emoji);
              // Keep picker open (WhatsApp behaviour)
            }}
            height={350}
            width={320}
          />
        </div>
      )}

      {/* INPUT */}
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

        {isRecording ? (
          /* Recording state bar */
          <div className="flex items-center gap-3 px-4 py-4">
            <button
              onClick={cancelRecording}
              className="p-2 hover:bg-gray-900 rounded-full transition flex-shrink-0"
            >
              <X size={20} className="text-gray-400" />
            </button>
            <div className="flex-1 flex items-center bg-gray-900 border border-red-800 rounded-full px-4 py-2.5 gap-3">
              {/* Pulsing red dot */}
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
              <span className="text-red-400 text-sm font-mono tabular-nums">{fmtRecTime(recSeconds)}</span>
              <span className="text-gray-500 text-xs flex-1">Recording…</span>
            </div>
            <button
              onClick={handleMicClick}
              disabled={sendingVoice}
              className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center transition flex-shrink-0 disabled:opacity-40"
            >
              {sendingVoice
                ? <Loader2 size={16} className="text-white animate-spin" />
                : <Send size={16} className="text-white" />}
            </button>
          </div>
        ) : (
          /* Normal input bar */
          <div className="flex items-center gap-2 px-4 py-4">
            <button
              onClick={() => { imgInputRef.current?.click(); setShowEmoji(false); }}
              disabled={uploadingImage}
              className="p-2 hover:bg-gray-900 rounded-full transition flex-shrink-0 disabled:opacity-40"
            >
              {uploadingImage ? <Loader2 size={20} className="text-purple-400 animate-spin" /> : <ImageIcon size={20} className="text-gray-500" />}
            </button>
            <div className="flex-1 flex items-center bg-gray-900 border border-gray-800 rounded-full px-4 py-2.5 gap-2">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder={replyingTo ? `Reply to ${replyingTo.user}…` : `Message ${displayName}…`}
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none" />
              <button
                onClick={e => { e.stopPropagation(); setShowEmoji(p => !p); inputRef.current?.focus(); }}
                className={`transition flex-shrink-0 ${showEmoji ? "text-purple-400" : "text-gray-500 hover:text-gray-300"}`}
              >
                <Smile size={18} />
              </button>
            </div>
            {input.trim() ? (
              <button onClick={send} disabled={sending}
                className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center disabled:opacity-40 transition flex-shrink-0">
                {sending ? <Loader2 size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
              </button>
            ) : (
              <button
                onClick={handleMicClick}
                disabled={sendingVoice}
                className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center transition flex-shrink-0 disabled:opacity-40"
              >
                {sendingVoice
                  ? <Loader2 size={16} className="text-white animate-spin" />
                  : <Mic size={16} className="text-white" />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
