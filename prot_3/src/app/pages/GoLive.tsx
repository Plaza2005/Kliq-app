import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Radio, X, Camera, ChevronDown, Send, Users, Clock } from "lucide-react";
import { api, resolveMediaUrl } from "../api/client";
import { useRealtime } from "../context/RealtimeContext";

const CATEGORIES = ["Gaming", "Music", "IRL", "Sports", "Education", "Entertainment"] as const;
type Category = typeof CATEGORIES[number];

interface ChatMessage {
  id: string;
  body: string;
  sender: { username: string; displayName: string; avatarUrl: string };
  createdAt: string;
}

export function GoLive() {
  const navigate = useNavigate();
  const { subscribe, sendMessage } = useRealtime();

  // Setup phase state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("IRL");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraBlocked, setCameraBlocked] = useState(false);

  // Live phase state
  const [streamId, setStreamId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [ending, setEnding] = useState(false);
  const [incomingGifts, setIncomingGifts] = useState<{ id: number; emoji: string; sender: string }[]>([]);
  const giftIdRef = useRef(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const viewerPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const startCamera = useCallback(async () => {
    setCameraBlocked(false);
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser does not support camera access. Please use a modern browser.");
      setCameraBlocked(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
      }
    } catch (err: unknown) {
      console.error("Camera access error:", err);
      const name = (err as { name?: string })?.name ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError("Camera/microphone permission denied. Click \"Retry\" after granting access in your browser settings.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError("No camera or microphone found on this device.");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setError("Camera is already in use by another app. Close other apps and click \"Retry\".");
      } else {
        setError("Could not access camera. Please check browser permissions and click \"Retry\".");
      }
      setCameraBlocked(true);
    }
  }, []);

  // Start camera preview on mount
  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [startCamera]);

  // Subscribe to WS events once live
  useEffect(() => {
    if (!streamId) return;

    const unsub = subscribe(event => {
      if (event.type === "live:chat" && event.streamId === streamId) {
        setChatMessages(prev => [...prev, {
          id: event.id,
          body: event.body,
          sender: event.sender,
          createdAt: event.createdAt,
        }]);
      } else if (event.type === "live:viewers" && event.streamId === streamId) {
        setViewerCount(event.viewerCount);
      } else if (event.type === "live:gift" && event.streamId === streamId) {
        const GIFT_EMOJIS: Record<string, string> = { rose:"🌹", heart:"❤️", star:"⭐", diamond:"💎", crown:"👑", rocket:"🚀" };
        const emoji = GIFT_EMOJIS[event.giftType] ?? "🎁";
        const id = ++giftIdRef.current;
        setIncomingGifts(g => [...g, { id, emoji, sender: event.senderUsername ?? "someone" }]);
        setTimeout(() => setIncomingGifts(g => g.filter(x => x.id !== id)), 2500);
      }
    });

    return unsub;
  }, [streamId, subscribe]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Elapsed time counter
  useEffect(() => {
    if (!streamId) return;
    timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [streamId]);

  // Poll viewer count every 10s
  useEffect(() => {
    if (!streamId) return;
    viewerPollRef.current = setInterval(async () => {
      try {
        const data = await api.get<{ streams: { id: string; viewerCount: number }[] }>("/live/streams");
        const match = data.streams?.find(s => s.id === streamId);
        if (match) setViewerCount(match.viewerCount ?? 0);
      } catch {}
    }, 10000);
    return () => { if (viewerPollRef.current) clearInterval(viewerPollRef.current); };
  }, [streamId]);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailUploading(true);
    try {
      const result = await api.upload(file);
      setThumbnailUrl(result.url);
    } catch {
      setError("Failed to upload thumbnail.");
    } finally {
      setThumbnailUploading(false);
    }
  };

  const startStream = async () => {
    if (!title.trim()) { setError("Please enter a stream title."); return; }
    setError(null);
    setStarting(true);
    try {
      const resp = await api.post<{ streamId: string }>("/live/start", {
        title: title.trim(),
        category,
        thumbnailUrl,
      });
      setStreamId(resp.streamId);

      // Start MediaRecorder to send chunks
      const stream = streamRef.current;
      if (!stream) return;

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

      const mr = new MediaRecorder(stream, { mimeType });
      recorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) {
          e.data.arrayBuffer().then(buf => {
            const bytes = new Uint8Array(buf);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            const b64 = btoa(binary);
            sendMessage({ type: "live:chunk", streamId: resp.streamId, chunk: b64 });
          });
        }
      };

      mr.start(1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start stream";
      setError(msg);
    } finally {
      setStarting(false);
    }
  };

  const endStream = useCallback(async () => {
    if (ending) return;
    setEnding(true);
    try {
      recorderRef.current?.stop();
      await api.post("/live/end", { streamId });
    } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop());
    navigate("/", { state: { toast: "Stream ended" } });
  }, [ending, streamId, navigate]);

  const sendChat = () => {
    const body = chatInput.trim();
    if (!body || !streamId) return;
    sendMessage({ type: "live:chat", streamId, body });
    setChatInput("");
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // ── LIVE PHASE UI ───────────────────────────────────────────────────────────
  if (streamId) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        {/* Video feed */}
        <div className="absolute inset-0">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
        </div>

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Radio size={10} className="animate-pulse" /> LIVE
            </span>
            <span className="text-white text-sm font-mono bg-black/40 px-2 py-0.5 rounded">
              <Clock size={12} className="inline mr-1" />{formatTime(elapsedSeconds)}
            </span>
            <span className="text-white text-sm bg-black/40 px-2 py-0.5 rounded flex items-center gap-1">
              <Users size={12} /> {viewerCount}
            </span>
          </div>
          <button
            onClick={endStream}
            disabled={ending}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-1.5 rounded-full transition disabled:opacity-50"
          >
            {ending ? "Ending..." : "End Stream"}
          </button>
        </div>

        {/* Title overlay */}
        <div className="relative z-10 px-4 mt-1">
          <p className="text-white text-sm font-semibold drop-shadow">{title}</p>
          <p className="text-gray-300 text-xs">{category}</p>
        </div>

        {/* Incoming gift animations */}
        <div className="absolute bottom-36 right-4 z-20 flex flex-col-reverse gap-2 pointer-events-none">
          {incomingGifts.map(g => (
            <div
              key={g.id}
              className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5"
              style={{ animation: "giftFloat 2.5s ease-out forwards" }}
            >
              <span className="text-2xl">{g.emoji}</span>
              <span className="text-white text-xs font-semibold">{g.sender}</span>
            </div>
          ))}
        </div>

        {/* Chat sidebar */}
        <div className="relative z-10 flex flex-col mt-auto mx-4 mb-4 max-h-[45%]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-1 mb-2 pr-1 min-h-0">
            {chatMessages.map(msg => (
              <div key={msg.id} className="flex items-start gap-2">
                <img
                  src={resolveMediaUrl(msg.sender.avatarUrl) ?? ""}
                  alt={msg.sender.username}
                  className="w-6 h-6 rounded-full bg-gray-700 flex-shrink-0 mt-0.5 object-cover"
                />
                <div className="bg-black/50 backdrop-blur-sm rounded-xl px-2.5 py-1 max-w-[80%]">
                  <span className="text-purple-300 text-[11px] font-bold">{msg.sender.username} </span>
                  <span className="text-white text-[13px]">{msg.body}</span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="flex items-center gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendChat(); }}
              placeholder="Say something..."
              className="flex-1 bg-black/60 backdrop-blur-sm text-white text-sm px-4 py-2.5 rounded-full border border-white/20 placeholder-gray-500 outline-none focus:border-purple-500"
            />
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

  // ── SETUP PHASE UI ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Camera preview */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80 pointer-events-none" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20"
        >
          <X size={20} className="text-white" />
        </button>
        <h1 className="text-white font-bold text-lg">Go Live</h1>
        <div className="w-9" />
      </div>

      {/* Camera icon if no stream */}
      {!streamRef.current && (
        <div className="relative z-10 flex flex-1 items-center justify-center">
          <Camera size={64} className="text-gray-600" />
        </div>
      )}

      {/* Form */}
      <div className="relative z-10 mt-auto px-4 pb-8 space-y-4">
        {error && (
          <div className="bg-red-900/80 border border-red-700 text-red-200 text-sm px-4 py-2.5 rounded-xl flex items-start justify-between gap-3">
            <span>{error}</span>
            {cameraBlocked && (
              <button
                onClick={startCamera}
                className="flex-shrink-0 text-xs font-bold text-white bg-red-700 hover:bg-red-600 px-3 py-1 rounded-lg transition"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Title */}
        <div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Stream title (required)"
            maxLength={100}
            className="w-full bg-gray-900/80 backdrop-blur-sm text-white placeholder-gray-500 text-base px-4 py-3 rounded-xl border border-gray-700 focus:border-purple-500 outline-none"
          />
        </div>

        {/* Category */}
        <div className="relative">
          <button
            onClick={() => setShowCategoryPicker(p => !p)}
            className="w-full bg-gray-900/80 backdrop-blur-sm text-white text-base px-4 py-3 rounded-xl border border-gray-700 flex items-center justify-between"
          >
            <span>{category}</span>
            <ChevronDown size={18} className={`text-gray-400 transition-transform ${showCategoryPicker ? "rotate-180" : ""}`} />
          </button>
          {showCategoryPicker && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden z-20">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => { setCategory(c); setShowCategoryPicker(false); }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    c === category ? "text-purple-400 bg-purple-900/30" : "text-white hover:bg-gray-800"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail */}
        <div className="flex items-center gap-3">
          <label className="flex-1 bg-gray-900/80 backdrop-blur-sm text-gray-400 text-sm px-4 py-3 rounded-xl border border-gray-700 cursor-pointer hover:border-gray-500 transition-colors flex items-center gap-2">
            {thumbnailUploading ? (
              <span className="text-gray-400">Uploading...</span>
            ) : thumbnailUrl ? (
              <>
                <img src={resolveMediaUrl(thumbnailUrl) ?? ""} alt="Thumbnail" className="w-8 h-8 rounded object-cover" />
                <span className="text-white text-sm">Thumbnail set</span>
              </>
            ) : (
              <span>Add thumbnail (optional)</span>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
          </label>
          {thumbnailUrl && (
            <button
              onClick={() => setThumbnailUrl(null)}
              className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center border border-gray-700"
            >
              <X size={16} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 py-3.5 rounded-xl border border-gray-700 text-gray-300 font-semibold text-base"
          >
            Cancel
          </button>
          <button
            onClick={startStream}
            disabled={starting || !title.trim()}
            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 transition"
          >
            <Radio size={18} />
            {starting ? "Starting..." : "Go Live"}
          </button>
        </div>
      </div>
    </div>
  );
}
