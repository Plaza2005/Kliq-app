import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router";
import { X, Zap, Timer, Layout, Ratio, Sparkles, ImagePlus, RotateCcw, Check, Loader2, Camera, Mic, Image, Scissors, Plus } from "lucide-react";
import { api, resolveAvatarUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";

const FILTERS = ["Normal", "Vivid", "Warm", "Cool", "Fade", "Chrome", "Noir", "Neon"];
const PERM_KEY = "kliq_media_perms_asked";

export function Create() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Support both route state (from StitchButton) and query params (from PostDetail links)
  const stitchState = (() => {
    const stateVal = location.state as { stitchOfId?: string; stitchCaption?: string } | null;
    const qMode = searchParams.get("mode");
    const qPostId = searchParams.get("postId");
    if (qPostId && (qMode === "stitch" || qMode === "duet")) return { stitchOfId: qPostId, mode: qMode };
    return stateVal;
  })();
  const { user } = useAuth();

  const [activeFilter, setActiveFilter] = useState("Normal");
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [mode, setMode] = useState<"photo" | "video" | "live">("video");

  const [showPermModal, setShowPermModal] = useState(false);

  const [caption, setCaption] = useState("");
  const [postDone, setPostDone] = useState(false);
  const [posting, setPosting] = useState(false);

  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewIsVideo, setPreviewIsVideo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);
  const [videoTitle, setVideoTitle] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const carouselInputRef = useRef<HTMLInputElement>(null);

  const SHORT_FORM_MAX = 60;

  const [carouselUrls, setCarouselUrls] = useState<string[]>([]);
  const [carouselPreviews, setCarouselPreviews] = useState<string[]>([]);

  // Real camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraIdRef = useRef(0); // incremented on every startCamera call; stale resolves are discarded
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(PERM_KEY)) setShowPermModal(true);
  }, []);

  // Live tab → hand off to the dedicated GoLive page which has full streaming
  useEffect(() => {
    if (mode === "live") navigate("/go-live", { replace: true });
  }, [mode, navigate]);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    const id = ++cameraIdRef.current;
    const hadStream = !!streamRef.current;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      if (cameraIdRef.current === id) setCameraError("Camera not supported in this browser.");
      return;
    }

    if (hadStream) {
      await new Promise<void>(r => setTimeout(r, 600));
      if (cameraIdRef.current !== id) return;
    }

    // Progressive constraint fallback — some drivers / OSes reject complex constraints
    // even with 'ideal', and some fail when the mic is already held by another app.
    const tries: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: facing } }, audio: true },
      { video: true, audio: true },
      { video: true },  // mic might be claimed by Teams/Discord/etc.
    ];

    let stream: MediaStream | null = null;
    let lastErr: unknown = null;

    for (let i = 0; i < tries.length; i++) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(tries[i]);
        break;
      } catch (err: unknown) {
        lastErr = err;
        console.error(`[camera] attempt ${i + 1} failed:`, err);
        if (cameraIdRef.current !== id) return;
        const name = (err as { name?: string })?.name ?? "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setCameraError("Camera access denied. Allow it in your browser settings, then tap Retry.");
          return;
        }
        if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setCameraError("No camera found on this device.");
          return;
        }
        if (i < tries.length - 1) {
          await new Promise<void>(r => setTimeout(r, 800));
          if (cameraIdRef.current !== id) return;
        }
      }
    }

    if (!stream) {
      if (cameraIdRef.current !== id) return;
      const name = (lastErr as { name?: string })?.name ?? "";
      setCameraError(
        name === "NotReadableError" || name === "TrackStartError"
          ? "Camera is busy — close other apps using the camera, then tap Retry."
          : "Could not open camera. Tap Retry or check your browser settings."
      );
      return;
    }

    if (cameraIdRef.current !== id) { stream.getTracks().forEach(t => t.stop()); return; }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
    setCameraActive(true);
  }, []);

  // Start the camera once on mount. Mode tab switches (photo ↔ video) reuse the
  // same stream — stopping and restarting on every tab click causes the OS to keep
  // the device "in use" briefly, triggering NotReadableError on the next acquire.
  useEffect(() => {
    if (localStorage.getItem(PERM_KEY)) {
      startCamera(facingMode);
    }
    return () => {
      // Invalidate any in-flight getUserMedia so it doesn't set state on an
      // unmounted component, then release the hardware.
      cameraIdRef.current++;
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — only mount/unmount

  const flipCamera = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    await startCamera(next);
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || !cameraActive) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      streamRef.current?.getTracks().forEach(t => t.stop());
      setCameraActive(false);
      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
      setPreviewIsVideo(false);
      setDetectedDuration(null);
      setHasRecorded(true);
      setUploading(true);
      try {
        const { url } = await api.upload(new File([blob], "photo.jpg", { type: "image/jpeg" }));
        setMediaUrl(url);
      } catch {
        setMediaUrl(null);
      } finally {
        setUploading(false);
      }
    }, "image/jpeg", 0.92);
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream || !cameraActive) return;
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";
    chunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType });
    recorderRef.current = mr;
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
      setPreviewIsVideo(true);
      setHasRecorded(true);
      streamRef.current?.getTracks().forEach(t => t.stop());
      setCameraActive(false);
      const duration = await new Promise<number>(resolve => {
        const vid = document.createElement("video");
        vid.preload = "metadata";
        vid.onloadedmetadata = () => resolve(vid.duration);
        vid.onerror = () => resolve(0);
        vid.src = objectUrl;
      });
      setDetectedDuration(isFinite(duration) ? Math.round(duration) : null);
      setUploading(true);
      try {
        const { url } = await api.upload(new File([blob], "video.webm", { type: "video/webm" }));
        setMediaUrl(url);
      } catch {
        setMediaUrl(null);
      } finally {
        setUploading(false);
      }
    };
    mr.start(500);
    setIsRecording(true);
    setRecordingSeconds(0);
    recordTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
  };

  const stopRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    recorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleCapturePress = () => {
    if (mode === "photo") takePhoto();
    else if (isRecording) stopRecording();
    else startRecording();
  };

  const requestPermissions = () => {
    localStorage.setItem(PERM_KEY, "asked");
    setShowPermModal(false);
    // startCamera's getUserMedia call is what triggers the browser permission dialog —
    // no need for a separate pre-flight acquire that would race with it.
    startCamera(facingMode);
  };

  const skipPermissions = () => {
    localStorage.setItem(PERM_KEY, "asked");
    setShowPermModal(false);
    startCamera(facingMode);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    streamRef.current?.getTracks().forEach(t => t.stop());
    setCameraActive(false);
    const local = URL.createObjectURL(file);
    setPreviewUrl(local);
    setPreviewIsVideo(file.type.startsWith("video/"));
    setHasRecorded(true);
    if (file.type.startsWith("video/")) {
      const duration = await new Promise<number>(resolve => {
        const vid = document.createElement("video");
        vid.preload = "metadata";
        vid.onloadedmetadata = () => resolve(vid.duration);
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

  const addCarouselImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setCarouselPreviews(prev => [...prev, preview]);
    if (!hasRecorded) { setHasRecorded(true); setPreviewUrl(preview); }
    try {
      const { url } = await api.upload(file);
      setCarouselUrls(prev => [...prev, url]);
    } catch { /* keep preview */ }
    e.target.value = "";
  };

  const resetCapture = () => {
    setHasRecorded(false);
    setIsRecording(false);
    setMediaUrl(null);
    setPreviewIsVideo(false);
    setRecordingSeconds(0);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    startCamera(facingMode);
  };

  const isLongForm = detectedDuration != null && detectedDuration > SHORT_FORM_MAX;

  const submitPost = async () => {
    if (!caption.trim() && !mediaUrl && carouselUrls.length === 0) return;
    if (isLongForm && !videoTitle.trim()) return;
    setPosting(true);
    try {
      const isCarousel = carouselUrls.length > 0;
      await api.post("/posts", {
        body: caption,
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

  // ── CAPTION / PREVIEW SCREEN ────────────────────────────────────────────────
  if (hasRecorded && !postDone) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="relative flex-1 bg-gray-950 overflow-hidden">
          {previewUrl ? (
            previewIsVideo ? (
              <video src={previewUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-90" />
            )
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
          <button onClick={resetCapture} className="absolute top-4 left-4 p-2.5 bg-black/50 backdrop-blur-sm rounded-full text-white">
            <X size={20} />
          </button>
          <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-white text-xs font-bold ${isLongForm ? "bg-red-600" : "bg-gradient-to-r from-purple-600 to-pink-600"}`}>
            {isLongForm ? "📺 KliqTube" : mode === "video" ? "⚡ Kliq" : "Photo"}
          </div>
        </div>

        <div className="bg-gray-950 border-t border-gray-800 p-5 pb-8 space-y-4">
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

          {isLongForm && (
            <input
              value={videoTitle}
              onChange={e => setVideoTitle(e.target.value)}
              placeholder="Video title (required for KliqTube)..."
              maxLength={120}
              className="w-full bg-gray-900 border border-red-800/40 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-600 transition text-sm"
            />
          )}

          {stitchState?.stitchOfId && (
            <div className="flex items-center gap-2 bg-purple-900/30 border border-purple-700/40 rounded-xl px-3 py-2">
              <Scissors size={14} className="text-purple-400 flex-shrink-0" />
              <p className="text-purple-300 text-xs font-semibold">
                {(stitchState as { mode?: string }).mode === "duet" ? "Creating a Duet" : "Stitching another creator's post"}
              </p>
            </div>
          )}

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
            <img src={resolveAvatarUrl(user?.avatarUrl)} alt="You" className="w-10 h-10 rounded-full flex-shrink-0 mt-1" />
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
              <button key={tag} onClick={() => setCaption(c => c + " " + tag)} className="text-xs bg-gray-800 text-purple-300 px-3 py-1.5 rounded-full hover:bg-gray-700 transition">
                {tag}
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={resetCapture} className="flex-1 border border-gray-700 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-900 transition text-sm">
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

  // ── SUCCESS SCREEN ──────────────────────────────────────────────────────────
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
        <button onClick={() => navigate("/")} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-8 py-3.5 rounded-2xl hover:opacity-90 transition">
          Back to Home
        </button>
      </div>
    );
  }

  // ── CAMERA VIEW ─────────────────────────────────────────────────────────────
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
            <button onClick={requestPermissions} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-2xl text-base hover:opacity-90 transition mb-3">
              Allow Access
            </button>
            <button onClick={skipPermissions} className="w-full text-gray-500 text-sm py-2 hover:text-gray-300 transition">
              Not now
            </button>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
      <input ref={carouselInputRef} type="file" accept="image/*" className="hidden" onChange={addCarouselImage} />

      {/* Viewfinder */}
      <div className="relative flex-1 bg-black overflow-hidden">
        {/* Live camera feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${cameraActive ? "opacity-100" : "opacity-0"}`}
        />
        {!cameraActive && !cameraError && (
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black" />
        )}
        {/* Rule-of-thirds grid */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="border border-white/5" />
          ))}
        </div>

        {/* Camera error state */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-8 z-10">
            <div className="text-center bg-black/80 rounded-2xl p-6 border border-gray-800">
              <p className="text-red-400 text-sm mb-4">{cameraError}</p>
              <button
                onClick={() => startCamera(facingMode)}
                className="text-xs bg-gray-800 text-white px-4 py-2 rounded-full border border-gray-600 hover:bg-gray-700 transition"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Close */}
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 z-10 p-2.5 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition">
          <X size={22} />
        </button>

        {/* Flash + Flip */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-3">
          <button className="p-2.5 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition">
            <Zap size={20} />
          </button>
          <button onClick={flipCamera} className="p-2.5 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition">
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

        {/* Right controls */}
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

        {/* Recording timer */}
        {isRecording && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 mt-14 z-10 flex items-center gap-2 bg-red-600/90 px-4 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-xs font-bold tracking-wider font-mono">
              {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}
            </span>
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
        {/* Gallery / Multi */}
        <div className="flex flex-col gap-1">
          <button onClick={() => fileInputRef.current?.click()} title="Choose from gallery" className="w-14 h-14 rounded-xl bg-gray-800 overflow-hidden hover:opacity-80 transition flex-shrink-0">
            <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
              <ImagePlus size={22} className="text-gray-400" />
            </div>
          </button>
          <button
            onClick={() => carouselInputRef.current?.click()}
            title="Add to carousel"
            className="w-14 h-7 rounded-lg bg-gray-800 flex items-center justify-center gap-1 hover:bg-gray-700 transition"
          >
            <Plus size={12} className="text-purple-400" />
            <span className="text-purple-400 text-[10px] font-bold">MULTI</span>
          </button>
        </div>

        {/* Capture button */}
        <button
          onClick={handleCapturePress}
          disabled={!cameraActive}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all disabled:opacity-40 ${isRecording ? "scale-90" : "scale-100"}`}
        >
          <div className="absolute inset-0 rounded-full border-4 border-white" />
          {mode === "photo" ? (
            <div className="w-14 h-14 rounded-full bg-white" />
          ) : (
            <div className={`transition-all duration-200 ${isRecording ? "w-8 h-8 rounded-lg bg-red-500" : "w-14 h-14 rounded-full bg-white"}`} />
          )}
          {isRecording && (
            <div className="absolute -inset-1 rounded-full border-4 border-red-500 animate-pulse" />
          )}
        </button>

        {/* Effects */}
        <button className="w-14 h-14 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center hover:bg-gray-800 transition flex-shrink-0">
          <Sparkles size={22} className="text-purple-400" />
        </button>
      </div>
    </div>
  );
}
