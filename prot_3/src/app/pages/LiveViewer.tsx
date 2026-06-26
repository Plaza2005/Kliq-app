import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Users, Loader2, Send, Gift } from "lucide-react";
import { api, resolveMediaUrl } from "../api/client";
import { useRealtime } from "../context/RealtimeContext";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const GIFTS = [
  { type: "rose", emoji: "🌹", coins: 1 },
  { type: "heart", emoji: "❤️", coins: 5 },
  { type: "star", emoji: "⭐", coins: 10 },
  { type: "diamond", emoji: "💎", coins: 50 },
  { type: "crown", emoji: "👑", coins: 100 },
  { type: "rocket", emoji: "🚀", coins: 200 },
];

interface LiveStream {
  id: string;
  title: string;
  category: string;
  thumbnailUrl: string | null;
  viewerCount: number;
  startedAt: string;
  user: { username: string; displayName: string; avatarUrl: string };
}

interface ChatMessage {
  id: string;
  body: string;
  from: string;
  avatarUrl?: string;
}

export function LiveViewer() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { subscribe, sendMessage } = useRealtime();
  const { user } = useAuth();

  const [stream, setStream] = useState<LiveStream | null>(null);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const [giftAnim, setGiftAnim] = useState<{ emoji: string; id: number } | null>(null);
  const giftAnimId = useRef(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const msRef = useRef<MediaSource | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch stream info on mount
  useEffect(() => {
    setLoading(true);
    api
      .get<LiveStream[]>("/live/streams")
      .then((streams) => {
        const found = streams.find((s) => s.user.username === username);
        if (!found) {
          setNotFound(true);
        } else {
          setStream(found);
          setStreamId(found.id);
          setViewerCount(found.viewerCount);
          // Register view
          api.post(`/live/${found.id}/view`, {}).catch(() => {});
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  // Set up MediaSource playback and WS subscription once streamId is known
  useEffect(() => {
    if (!videoRef.current || !streamId) return;

    const ms = new MediaSource();
    msRef.current = ms;
    const objUrl = URL.createObjectURL(ms);
    videoRef.current.src = objUrl;

    let sb: SourceBuffer | null = null;
    const queue: ArrayBuffer[] = [];
    let appending = false;

    const tryAppend = () => {
      if (!sb || appending || queue.length === 0) return;
      appending = true;
      sb.appendBuffer(queue.shift()!);
    };

    ms.addEventListener("sourceopen", () => {
      try {
        sb = ms.addSourceBuffer('video/webm;codecs="vp8,opus"');
        sb.addEventListener("updateend", () => {
          appending = false;
          tryAppend();
        });
      } catch (err) {
        console.error("SourceBuffer error:", err);
      }
    });

    // Subscribe to the stream
    sendMessage({ type: "stream:subscribe", streamId });

    const unsub = subscribe((event) => {
      if (event.type === "live:chunk" && event.streamId === streamId) {
        try {
          const bytes = Uint8Array.from(atob(event.chunk), (c) => c.charCodeAt(0));
          queue.push(bytes.buffer);
          tryAppend();
        } catch {}
      }
      if (event.type === "live:chat" && event.streamId === streamId) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: event.id,
            body: event.body,
            from: event.sender.username,
            avatarUrl: event.sender.avatarUrl,
          },
        ]);
      }
      if (event.type === "live:viewers" && event.streamId === streamId) {
        setViewerCount(event.viewerCount);
      }
      if (event.type === "live:end" && event.streamId === streamId) {
        setNotFound(true);
      }
    });

    return () => {
      unsub();
      URL.revokeObjectURL(objUrl);
      sendMessage({ type: "stream:unsubscribe", streamId });
    };
  }, [streamId, subscribe, sendMessage]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendChat = () => {
    const body = chatInput.trim();
    if (!body || !streamId) return;
    sendMessage({
      type: "live:chat",
      streamId,
      body,
      fromUsername: user?.username,
    });
    setChatInput("");
  };

  const sendGift = async (giftType: string, emoji: string) => {
    if (!streamId) return;
    setShowGifts(false);
    const id = ++giftAnimId.current;
    setGiftAnim({ emoji, id });
    setTimeout(() => setGiftAnim(a => a?.id === id ? null : a), 2200);
    try {
      await api.post(`/live/${streamId}/gift`, { giftType });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      toast(msg.includes("coins") ? "Not enough coins" : "Gift failed");
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <Loader2 size={32} className="text-red-400 animate-spin" />
      </div>
    );
  }

  // ── Not found / ended ────────────────────────────────────────────────────
  if (notFound || !stream) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 z-50 px-8 text-center">
        <p className="text-white text-xl font-bold">Stream has ended</p>
        <p className="text-gray-500 text-sm">This live stream is no longer available.</p>
        <button
          onClick={() => navigate("/")}
          className="mt-2 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition"
        >
          Go Home
        </button>
      </div>
    );
  }

  // ── Live viewer UI ───────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Video */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain bg-black"
        />
      </div>

      {/* Top overlay */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-2 bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 flex-shrink-0"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src={resolveMediaUrl(stream.user.avatarUrl) ?? ""}
            alt={stream.user.username}
            className="w-8 h-8 rounded-full bg-gray-700 object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-white text-sm font-bold truncate">{stream.user.displayName}</p>
            <p className="text-gray-400 text-xs truncate">@{stream.user.username}</p>
          </div>
          <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 flex-shrink-0 ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-1 text-white text-xs bg-black/50 px-2 py-1 rounded-full flex-shrink-0">
          <Users size={12} />
          <span>{viewerCount.toLocaleString()}</span>
        </div>
      </div>

      {/* Stream title */}
      <div className="relative z-10 px-4 pt-1 pb-2">
        <p className="text-white text-sm font-semibold drop-shadow">{stream.title}</p>
        <p className="text-gray-400 text-xs">{stream.category}</p>
      </div>

      {/* Gift animation overlay */}
      {giftAnim && (
        <div
          key={giftAnim.id}
          className="absolute right-4 bottom-36 z-20 flex flex-col items-center gap-1 pointer-events-none"
          style={{ animation: "giftFloat 2.2s ease-out forwards" }}
        >
          <span className="text-5xl drop-shadow-lg">{giftAnim.emoji}</span>
          <span className="text-white text-xs font-bold bg-black/50 px-2 py-0.5 rounded-full">Sent!</span>
        </div>
      )}

      {/* Chat panel — pinned to bottom */}
      <div className="relative z-10 mt-auto flex flex-col max-h-[45%] mx-4 mb-4">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-1.5 mb-2 min-h-0">
          {chatMessages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-2">
              {msg.avatarUrl && (
                <img
                  src={resolveMediaUrl(msg.avatarUrl) ?? ""}
                  alt={msg.from}
                  className="w-6 h-6 rounded-full bg-gray-700 flex-shrink-0 mt-0.5 object-cover"
                />
              )}
              <div className="bg-black/60 backdrop-blur-sm rounded-xl px-2.5 py-1 max-w-[80%]">
                <span className="text-purple-300 text-[11px] font-bold">{msg.from} </span>
                <span className="text-white text-[13px]">{msg.body}</span>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Gift panel */}
        {showGifts && (
          <div className="mb-2 bg-black/80 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
            <p className="text-gray-400 text-xs mb-2 font-semibold">Send a gift</p>
            <div className="grid grid-cols-6 gap-2">
              {GIFTS.map(g => (
                <button
                  key={g.type}
                  onClick={() => sendGift(g.type, g.emoji)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gray-900/80 hover:bg-purple-900/40 transition active:scale-90"
                >
                  <span className="text-2xl">{g.emoji}</span>
                  <span className="text-yellow-400 text-[10px] font-bold">{g.coins}🪙</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat input */}
        <div className="flex items-center gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendChat();
            }}
            placeholder="Say something..."
            className="flex-1 bg-black/60 backdrop-blur-sm text-white text-sm px-4 py-2.5 rounded-full border border-white/20 placeholder-gray-500 outline-none focus:border-purple-500"
          />
          <button
            onClick={() => setShowGifts(s => !s)}
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition ${showGifts ? "bg-yellow-500/30 border border-yellow-500/50" : "bg-black/60 border border-white/20"}`}
          >
            <Gift size={18} className={showGifts ? "text-yellow-400" : "text-gray-400"} />
          </button>
          <button
            onClick={sendChat}
            disabled={!chatInput.trim()}
            className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center disabled:opacity-40 flex-shrink-0"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
