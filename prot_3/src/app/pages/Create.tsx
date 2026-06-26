import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { X, Zap, Timer, Layout, Ratio, Sparkles, ImagePlus, RotateCcw, Radio, ChevronDown, Check, Loader2, Camera, Mic, Image, Scissors, Plus } from "lucide-react";
import { api, resolveMediaUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";

const FILTERS = ["Normal", "Vivid", "Warm", "Cool", "Fade", "Chrome", "Noir", "Neon"];
const LIVE_CATEGORIES = ["Gaming", "Music", "Chat", "Education", "Art", "Sports", "Cooking", "Tech"];

const PERM_KEY = "kliq_media_perms_asked";

export function Create() {
  const navigate = useNavigate();
  const location = useLocation();
  const stitchState = (location.state as { stitchOfId?: string; stitchCaption?: string } | null);
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState("Normal");
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [mode, setMode] = useState<"photo" | "video" | "live">("video");

  // Permission modal
  const [showPermModal, setShowPermModal] = useState(false);
  const [permGranted, setPermGranted] = useState({ camera: false, mic: false });

  // Live mode state
  const [liveTitle, setLiveTitle] = useState("");
  const [liveCategory, setLiveCategory] = useState("Gaming");
  const [isLive, setIsLive] = useState(false);

  // Post flow state
  const [caption, setCaption] = useState("");
  const [postDone, setPostDone] = useState(false);
  const [posting, setPosting] = useState(false);

  // File upload state
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const SHORT_FORM_MAX = 60; // seconds — videos over this go to KliqTube

  // Carousel state (multiple images)
  const [carouselUrls, setCarouselUrls] = useState<string[]>([]);
  const [carouselPreviews, setCarouselPreviews] = useState<string[]>([]);
  const carouselInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const asked = localStorage.getItem(PERM_KEY);
    if (!asked) {
      setShowPermModal(true);
    }
  }, []);

  const requestPermissions = async () => {
    const result = { camera: false, mic: false };
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(t => t.stop());
      result.camera = true;
      result.mic = true;
    } catch {
      try {
        const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
        vStream.getTracks().forEach(t => t.stop());
        result.camera = true;
      } catch { /* camera denied */ }
      try {
        const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        aStream.getTracks().forEach(t => t.stop());
        result.mic = true;
      } catch { /* mic denied */ }
    }
    setPermGranted(result);
    localStorage.setItem(PERM_KEY, "asked");
    setShowPermModal(false);
  };

  const skipPermissions = () => {
    localStorage.setItem(PERM_KEY, "asked");
    setShowPermModal(false);
  };

  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const local = URL.createObjectURL(file);
    setPreviewUrl(local);
    setHasRecorded(true);

    // Detect video duration before uploading so we can route to the right destination
    if (file.type.startsWith("video/")) {
      const duration = await new Promise<number>(resolve => {
        const vid = document.createElement("video");
        vid.preload = "metadata";
        vid.onloadedmetadata = () => { URL.revokeObjectURL(vid.src); resolve(vid.duration); };
        vid.onerror = () => resolve(0);
        vid.src = local;
      });
      setDetectedDuration(isFinite(duration) ? Math.round(duration) : null);
    } else {
      setDetectedDuration(null);
    }

    setUploading(true);
    try {
      const { url } = await api.upload(file);
      setMediaUrl(url);
    } catch {
      setMediaUrl(null);
    } finally {
      setUploading(false);
    }
    e.target.value = "";
  };

  const isLongForm = detectedDuration != null && detectedDuration > SHORT_FORM_MAX;

  const submitPost = async () => {
    if (!caption.trim() && !mediaUrl && carouselUrls.length === 0) return;
    if (isLongForm && !videoTitle.trim()) return; // title required for KliqTube
    setPosting(true);
    try {
      const isCarousel = carouselUrls.length > 0;
      await api.post("/posts", {
        body: caption,
        mediaType: mediaUrl ? (isLongForm ? "video" : undefined) : undefined,
        // Let server decide postType for videos via videoDuration; explicit for non-video
        ...(detectedDuration != null
          ? { videoDuration: detectedDuration, mediaType: "video" }
          : { postType: isCarousel ? "carousel" : (mode === "photo" ? "post" : "reel") }),
        ...(mediaUrl && !isCarousel ? { mediaUrl } : {}),
        ...(isCarousel ? { carouselMedia: carouselUrls } : {}),
        ...(stitchState?.stitchOfId ? { stitchOfId: stitchState.stitchOfId } : {}),
        ...(isLongForm && videoTitle.trim() ? { title: videoTitle.trim() } : {}),
      });
      setPostDone(true);
    } catch {
      setPosting(false);
    }
  };

  const addCarouselImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setCarouselPreviews(prev => [...prev, preview]);
    if (!hasRecorded) { setHasRecorded(true); setPreviewUrl(preview); }
    try {
      const { url } = await api.upload(file);
      setCarouselUrls(prev => [...prev, url]);
    } catch { /* upload failed, keep preview */ }
    e.target.value = "";
  };

  const handleRecordToggle = () => {
    if (isRecording) {
      setIsRecording(false);
      setHasRecorded(true);
    } else {
      setIsRecording(true);
    }
  };

  const resetCapture = () => {
    setHasRecorded(false);
    setIsRecording(false);
    setMediaUrl(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
  };

  // Post-recording caption screen
  if (hasRecorded && !postDone) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Preview thumbnail */}
        <div className="relative flex-1 bg-gray-950 overflow-hidden">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-90" />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-gray-800 to-black flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check size={28} className="text-green-400" />
                </div>
                <p className="text-gray-400 text-sm">Preview</p>
              </div>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="text-purple-400 animate-spin" />
                <p className="text-white text-sm">Uploading...</p>
              </div>
            </div>
          )}
          <button
            onClick={resetCapture}
            className="absolute top-4 left-4 p-2.5 bg-black/50 backdrop-blur-sm rounded-full text-white"
          >
            <X size={20} />
          </button>
          <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-white text-xs font-bold ${isLongForm ? "bg-red-600" : "bg-gradient-to-r from-purple-600 to-pink-600"}`}>
            {isLongForm ? "📺 KliqTube" : mode === "video" ? "⚡ Kliq" : "Photo"}
          </div>
        </div>

        {/* Caption + post */}
        <div className="bg-gray-950 border-t border-gray-800 p-5 pb-8 space-y-4">
          {/* Destination badge — tells user where their upload is going */}
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${isLongForm ? "bg-red-900/30 border-red-700/40" : "bg-purple-900/20 border-purple-700/30"}`}>
            <span className="text-lg">{isLongForm ? "📺" : "⚡"}</span>
            <div>
              <p className={`text-xs font-bold ${isLongForm ? "text-red-300" : "text-purple-300"}`}>
                {isLongForm ? "Going to KliqTube" : "Going to Kliq Feed"}
              </p>
              <p className="text-gray-500 text-[10px]">
                {isLongForm
                  ? `${detectedDuration}s · Long-form videos go to KliqTube automatically`
                  : detectedDuration != null ? `${detectedDuration}s · Short videos stay in the main feed` : "Photo or text post"}
              </p>
            </div>
          </div>

          {/* KliqTube title field — required for long-form */}
          {isLongForm && (
            <input
              value={videoTitle}
              onChange={e => setVideoTitle(e.target.value)}
              placeholder="Video title (required for KliqTube)..."
              maxLength={120}
              className="w-full bg-gray-900 border border-red-800/40 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-600 transition text-sm"
            />
          )}

          {/* Stitch context banner */}
          {stitchState?.stitchOfId && (
            <div className="flex items-center gap-2 bg-purple-900/30 border border-purple-700/40 rounded-xl px-3 py-2">
              <Scissors size={14} className="text-purple-400 flex-shrink-0" />
              <p className="text-purple-300 text-xs font-semibold">Stitching another creator's post</p>
            </div>
          )}

          {/* Carousel image strip */}
          {carouselPreviews.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {carouselPreviews.map((src, i) => (
                <div key={i} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 border-purple-600/50">
                  <img src={src} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => {
                      setCarouselPreviews(prev => prev.filter((_, j) => j !== i));
                      setCarouselUrls(prev => prev.filter((_, j) => j !== i));
                    }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 rounded-full flex items-center justify-center"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
              {carouselPreviews.length < 10 && (
                <button
                  onClick={() => carouselInputRef.current?.click()}
                  className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center hover:border-purple-500 transition"
                >
                  <Plus size={20} className="text-gray-500" />
                </button>
              )}
            </div>
          )}

          <div className="flex items-start gap-3">
            <img
              src={resolveMediaUrl(user?.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username ?? "me"}`}
              alt="You"
              className="w-10 h-10 rounded-full flex-shrink-0 mt-1"
            />
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Write a caption..."
              rows={3}
              className="flex-1 bg-transparent text-white placeholder-gray-600 focus:outline-none resize-none text-sm"
            />
          </div>

          <div className="flex gap-2">
            {["#kliq", "#trending", "#fyp"].map(tag => (
              <button
                key={tag}
                onClick={() => setCaption(c => c + " " + tag)}
                className="text-xs bg-gray-800 text-purple-300 px-3 py-1.5 rounded-full hover:bg-gray-700 transition"
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={resetCapture}
              className="flex-1 border border-gray-700 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-900 transition text-sm"
            >
              Discard
            </button>
            <button
              onClick={submitPost}
              disabled={posting || uploading || (isLongForm && !videoTitle.trim())}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {posting ? <><Loader2 size={16} className="animate-spin" /> Posting...</> : uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : isLongForm ? "Upload to KliqTube" : "Post"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Post success screen
  if (postDone) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
          <Check size={36} className="text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-white text-2xl font-bold mb-2">Posted!</h2>
          <p className="text-gray-400 text-sm">Your content is now live on Kliq</p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-8 py-3.5 rounded-2xl hover:opacity-90 transition"
        >
          Back to Home
        </button>
      </div>
    );
  }

  // Live mode: "Go Live" setup screen (replaces camera view when mode=live)
  if (mode === "live" && !isLive) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Fake preview */}
        <div className="relative flex-1 bg-gray-950 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black" />
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border border-white/5" />
            ))}
          </div>

          {/* Top controls */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 z-10 p-2.5 bg-black/40 backdrop-blur-sm rounded-full text-white"
          >
            <X size={22} />
          </button>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-1 bg-black/40 backdrop-blur-sm rounded-full p-1">
            {(["photo", "video", "live"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition ${mode === m ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="absolute top-4 right-4 flex flex-col gap-3">
            <button className="p-2.5 bg-black/40 backdrop-blur-sm rounded-full text-white">
              <RotateCcw size={20} />
            </button>
          </div>

          {/* Live preview label */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-bold">LIVE PREVIEW</span>
          </div>
        </div>

        {/* Go Live setup panel */}
        <div className="bg-gray-950 border-t border-gray-800 px-5 pt-5 pb-8 space-y-4">
          <h3 className="text-white font-bold text-lg">Set Up Your Stream</h3>

          <input
            value={liveTitle}
            onChange={e => setLiveTitle(e.target.value)}
            placeholder="Stream title (e.g. 'Chill beats & chat')"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition"
          />

          <div className="relative">
            <select
              value={liveCategory}
              onChange={e => setLiveCategory(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-600 transition appearance-none"
            >
              {LIVE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>

          <button
            onClick={() => setIsLive(true)}
            disabled={!liveTitle.trim()}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition ${liveTitle.trim() ? "bg-red-600 hover:bg-red-500 text-white" : "bg-gray-800 text-gray-600 cursor-not-allowed"}`}
          >
            <Radio size={18} className={liveTitle.trim() ? "text-white" : "text-gray-600"} />
            Go Live
          </button>
        </div>
      </div>
    );
  }

  // Active live stream screen
  if (mode === "live" && isLive) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="relative flex-1 bg-gray-950 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black" />

          {/* Live badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-full z-10">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-xs font-black tracking-wider">LIVE</span>
          </div>

          {/* Viewer count */}
          <div className="absolute top-4 right-16 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full z-10">
            <span className="text-white text-xs font-bold">👁 1.2K</span>
          </div>

          <button
            onClick={() => { setIsLive(false); }}
            className="absolute top-4 right-4 z-10 p-2 bg-black/40 backdrop-blur-sm rounded-full text-white"
          >
            <X size={20} />
          </button>

          {/* Stream title overlay */}
          <div className="absolute bottom-20 left-4 right-4">
            <p className="text-white font-bold text-lg drop-shadow">{liveTitle}</p>
            <p className="text-gray-300 text-sm">{liveCategory}</p>
          </div>

          {/* Fake chat */}
          <div className="absolute bottom-24 right-4 space-y-1">
            {["alex_creates: 🔥🔥", "mia_arts: love this!", "dj_krpt: W stream"].map((msg, i) => (
              <div key={i} className="bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-xl max-w-[160px]">
                {msg}
              </div>
            ))}
          </div>
        </div>

        {/* End stream button */}
        <div className="bg-black px-5 py-4">
          <button
            onClick={() => { setIsLive(false); setMode("video"); navigate("/"); }}
            className="w-full border-2 border-red-600 text-red-400 font-bold py-3.5 rounded-2xl hover:bg-red-600/10 transition"
          >
            End Stream
          </button>
        </div>
      </div>
    );
  }

  // Default camera view (photo / video mode)
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      {/* Permission modal — shown once on first visit */}
      {showPermModal && (
        <div className="absolute inset-0 z-50 bg-black/90 flex items-end">
          <div className="w-full bg-gray-950 border-t border-gray-800 rounded-t-3xl p-6 pb-10">
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-6" />
            <h3 className="text-white font-bold text-xl mb-1">Allow KLIQ to access your device</h3>
            <p className="text-gray-400 text-sm mb-6">To create posts with your camera, microphone, and gallery, we need your permission.</p>

            <div className="space-y-3 mb-6">
              {[
                { icon: Camera, label: "Camera", desc: "Take photos and record videos" },
                { icon: Mic, label: "Microphone", desc: "Record audio for videos and live streams" },
                { icon: Image, label: "Photo Library", desc: "Choose existing photos and videos" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-center gap-4 bg-gray-900 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{label}</p>
                    <p className="text-gray-500 text-xs">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={requestPermissions}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-2xl text-base hover:opacity-90 transition mb-3"
            >
              Allow Access
            </button>
            <button
              onClick={skipPermissions}
              className="w-full text-gray-500 text-sm py-2 hover:text-gray-300 transition"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={carouselInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={addCarouselImage}
      />
      {/* Camera viewfinder */}
      <div className="relative flex-1 bg-gray-950">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full bg-gradient-to-b from-gray-900 to-black opacity-60" />
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border border-white/5" />
            ))}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 p-2.5 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition"
        >
          <X size={22} />
        </button>

        {/* Flash / flip */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-3">
          <button className="p-2.5 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition">
            <Zap size={20} />
          </button>
          <button className="p-2.5 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition">
            <RotateCcw size={20} />
          </button>
        </div>

        {/* Mode selector */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-1 bg-black/40 backdrop-blur-sm rounded-full p-1">
          {(["photo", "video", "live"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition ${mode === m ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Controls strip */}
        <div className="absolute top-20 right-4 z-10 flex flex-col gap-4">
          {[
            { icon: Timer, label: "Timer" },
            { icon: Layout, label: "Layout" },
            { icon: Ratio, label: "Ratio" },
            { icon: Sparkles, label: "Beauty" },
          ].map(({ icon: Icon, label }) => (
            <button key={label} className="flex flex-col items-center gap-1 text-white">
              <div className="p-2 bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition">
                <Icon size={18} />
              </div>
              <span className="text-[9px] text-gray-400">{label}</span>
            </button>
          ))}
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 mt-14 z-10 flex items-center gap-2 bg-red-600/90 px-4 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-xs font-bold tracking-wider">REC</span>
          </div>
        )}

        {/* Filter strip */}
        <div className="absolute bottom-32 left-0 right-0 z-10">
          <div className="flex gap-3 overflow-x-auto px-6 pb-2">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div className={`w-14 h-14 rounded-lg border-2 overflow-hidden transition ${activeFilter === filter ? "border-white shadow-lg shadow-white/20" : "border-transparent opacity-60"}`}>
                  <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900" />
                </div>
                <span className={`text-[10px] font-medium ${activeFilter === filter ? "text-white" : "text-gray-500"}`}>
                  {filter}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="bg-black px-6 pt-4 pb-8 flex items-center justify-between">
        {/* Gallery / Carousel */}
        <div className="flex flex-col gap-1">
          <button onClick={handleGalleryClick} title="Choose from gallery" className="w-14 h-14 rounded-xl bg-gray-800 overflow-hidden hover:opacity-80 transition flex-shrink-0">
            <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
              <ImagePlus size={22} className="text-gray-400" />
            </div>
          </button>
          <button
            onClick={() => { carouselInputRef.current?.click(); }}
            title="Add to carousel"
            className="w-14 h-7 rounded-lg bg-gray-800 flex items-center justify-center gap-1 hover:bg-gray-700 transition"
          >
            <Plus size={12} className="text-purple-400" />
            <span className="text-purple-400 text-[10px] font-bold">MULTI</span>
          </button>
        </div>

        {/* Record button */}
        <button
          onClick={handleRecordToggle}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${isRecording ? "scale-90" : "scale-100"}`}
        >
          <div className="absolute inset-0 rounded-full border-4 border-white" />
          <div className={`transition-all duration-200 ${isRecording ? "w-8 h-8 rounded-lg bg-red-500" : "w-14 h-14 rounded-full bg-white"}`} />
          {isRecording && (
            <div className="absolute -inset-1 rounded-full border-4 border-red-500 animate-pulse" />
          )}
        </button>

        {/* Wand / effects */}
        <button className="w-14 h-14 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center hover:bg-gray-800 transition flex-shrink-0">
          <Sparkles size={22} className="text-purple-400" />
        </button>
      </div>
    </div>
  );
}
