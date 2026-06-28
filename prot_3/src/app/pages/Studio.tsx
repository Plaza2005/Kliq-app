import { useState, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import {
  Users, Eye, TrendingUp, DollarSign, Upload, Lock, Film, Youtube, Tv, Store, Globe,
  AlertCircle, CheckCircle, Clock, BarChart2, ArrowLeft, MoreVertical, Pencil, RefreshCw,
  Trash2, Loader2, Plus, X, Music, UserCheck, MessageSquare, Tag, Image as ImageIcon,
  Gavel, Coins, ChevronRight, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  ThumbsUp, ThumbsDown, ShoppingBag, Play,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import { useAuth } from "../context/AuthContext";
import { api, resolveAvatarUrl, resolveMediaUrl } from "../api/client";
import { useNavigate, useSearchParams } from "react-router";
import { MediaEditor, MediaEditorResult } from "../components/MediaEditor";


type Platform = "Social" | "KliqTube" | "Stream" | "Marketplace";
type PlatformFilter = "All" | Platform;

interface ContentItem {
  id: string;
  platform: Platform;
  title: string;
  date: string;
  views: string;
  status: "Published" | "Pending Manual Approval" | "Processing" | "Rejected";
  thumbnail: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

const PLATFORM_ICONS = { Social: Globe, KliqTube: Youtube, Stream: Tv, Marketplace: Store };
const PLATFORM_COLORS: Record<string, string> = {
  Social: "text-blue-400 bg-blue-900/30",
  KliqTube: "text-red-400 bg-red-900/30",
  Stream: "text-pink-400 bg-pink-900/30",
  Marketplace: "text-yellow-400 bg-yellow-900/30",
};
const STATUS_CONFIG: Record<ContentItem["status"], { color: string; icon: typeof CheckCircle }> = {
  Published: { color: "text-green-400 bg-green-900/30", icon: CheckCircle },
  "Pending Manual Approval": { color: "text-amber-400 bg-amber-900/30", icon: AlertCircle },
  Processing: { color: "text-blue-400 bg-blue-900/30", icon: Clock },
  Rejected: { color: "text-red-400 bg-red-900/30", icon: AlertCircle },
};

const VIDEO_CATEGORIES = ["Gaming", "Music", "Tech", "Education", "Comedy", "Sports", "Film", "Cooking", "Travel", "Lifestyle"];
const SOUNDS = ["Original Sound", "Trending Beat", "Chill Vibes", "Upbeat Pop", "Lo-Fi Hip Hop", "Dramatic Cinematic"];

// ── Step labels per platform ─────────────────────────────────────────────────
const STEPS: Record<Platform, string[]> = {
  Social:      ["Select", "Edit & Caption", "Audience"],
  KliqTube:    ["Upload",  "Details",        "Visibility"],
  Stream:      ["Upload",  "Details",        "Submit"],
  Marketplace: ["Media",   "Item Details",   "Pricing"],
};

export function Studio() {
  const { tier } = useUser();
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("All");
  const [showUpload, setShowUpload]         = useState(false);
  const [uploadPlatform, setUploadPlatform] = useState<Platform>("Social");
  const [uploadStep, setUploadStep]         = useState(1);

  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);

  // Real analytics
  const [analyticsData, setAnalyticsData] = useState<{
    totalViews: number; totalLikes: number; totalComments: number;
    byDay: { name: string; views: number; likes: number; posts: number }[];
  } | null>(null);
  const [openMenuId, setOpenMenuId]     = useState<string | null>(null);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editTitle, setEditTitle]       = useState("");
  const [toast, setToast]               = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Shared upload state ──────────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]     = useState<string | null>(null);
  const [dragOver, setDragOver]         = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [uploadDone, setUploadDone]     = useState(false);
  const [showPreview, setShowPreview]   = useState(false);
  const [showEditor, setShowEditor]     = useState(false);
  const [editorFilter, setEditorFilter] = useState("");
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // ── Social (TikTok) ──────────────────────────────────────────────────────
  const [caption, setCaption]           = useState("");
  const [hashtags, setHashtags]         = useState("");
  const [socialPrivacy, setSocialPrivacy] = useState<"public"|"friends"|"private">("public");
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet]       = useState(true);
  const [selectedSound, setSelectedSound] = useState(SOUNDS[0]);

  // ── KliqTube (YouTube) ───────────────────────────────────────────────────
  const [tubeTitle, setTubeTitle]       = useState("");
  const [tubeDesc, setTubeDesc]         = useState("");
  const [tubeCategory, setTubeCategory] = useState(VIDEO_CATEGORIES[0]);
  const [tubeTags, setTubeTags]         = useState("");
  const [tubeVisibility, setTubeVisibility] = useState<"public"|"unlisted"|"private">("public");
  const [tubeThumbFile, setTubeThumbFile] = useState<File | null>(null);
  const [tubeThumbPreview, setTubeThumbPreview] = useState<string | null>(null);

  // ── Stream ───────────────────────────────────────────────────────────────
  const [streamTitle, setStreamTitle]   = useState("");
  const [streamDesc, setStreamDesc]     = useState("");
  const [streamCategory, setStreamCategory] = useState(VIDEO_CATEGORIES[0]);
  const [streamType, setStreamType]     = useState<"vod"|"live">("vod");
  const [streamGenre, setStreamGenre]   = useState("Drama");
  const [streamAgeRating, setStreamAgeRating] = useState("PG-13");
  const [streamContentType, setStreamContentType] = useState<"movie"|"series">("movie");

  // ── Schedule ─────────────────────────────────────────────────────────────
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt]   = useState("");
  const [scheduledPosts, setScheduledPosts] = useState<{ id: string; body: string; scheduledAt: string; platform: string }[]>([]);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [newScheduledAt, setNewScheduledAt] = useState("");

  // ── Paywall ──────────────────────────────────────────────────────────────
  const [isPaylocked, setIsPaylocked] = useState(false);
  const [payPrice, setPayPrice] = useState(50);

  // ── Poll ─────────────────────────────────────────────────────────────────
  const [isPoll, setIsPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollEndsAt, setPollEndsAt] = useState("");

  // ── Marketplace (Facebook Marketplace + OpenSea hybrid) ─────────────────
  const [mktName, setMktName]           = useState("");
  const [mktDesc, setMktDesc]           = useState("");
  const [mktPrice, setMktPrice]         = useState("");
  const [mktPriceType, setMktPriceType] = useState<"fixed"|"auction">("fixed");
  const [mktRoyalties, setMktRoyalties] = useState("10");
  const [mktProperties, setMktProperties] = useState<{key: string; value: string}[]>([{ key: "", value: "" }]);
  const [mktCondition, setMktCondition] = useState("new");
  const [mktCategory, setMktCategory]   = useState("Electronics");
  const [mktLocation, setMktLocation]   = useState("");
  const [mktContact, setMktContact]     = useState("chat");
  const [mktDelivery, setMktDelivery]   = useState("pickup");
  const [mktNegotiable, setMktNegotiable] = useState(false);

  // ── Thumbnail picker ─────────────────────────────────────────────────────
  const [thumbCandidates, setThumbCandidates] = useState<string[]>([]);
  const [selectedThumb, setSelectedThumb] = useState<string | null>(null);
  const [thumbVideoRef, setThumbVideoRef] = useState<HTMLVideoElement | null>(null);
  const [thumbScrubTime, setThumbScrubTime] = useState(0);
  const [thumbVideoDuration, setThumbVideoDuration] = useState(0);
  const [generatingThumbs, setGeneratingThumbs] = useState(false);
  const [scrubPreview, setScrubPreview] = useState<string | null>(null);

  // ── Region / currency ────────────────────────────────────────────────────
  const [region, setRegion] = useState({ currency: "USD", symbol: "$", locale: "en-US", country: "" });

  useEffect(() => {
    api.get<{ currency: string; symbol: string; locale: string; country: string }>("/region", false)
      .then(r => setRegion(r))
      .catch(() => {});
    api.get<typeof analyticsData>("/analytics/me")
      .then(d => setAnalyticsData(d))
      .catch(() => {});
    api.get<{ id: string; body: string; scheduledAt: string; postType: string }[]>("/posts/scheduled")
      .then(posts => {
        setScheduledPosts(posts.map(p => ({
          id: p.id,
          body: p.body || "(No caption)",
          scheduledAt: p.scheduledAt,
          platform: p.postType === "tube" ? "KliqTube" : p.postType === "stream" ? "Stream" : p.postType === "marketplace" ? "Marketplace" : "Social",
        })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      const p = searchParams.get("platform") as Platform | null;
      if (p && (["Social","KliqTube","Stream","Marketplace"] as string[]).includes(p)) {
        setUploadPlatform(p as Platform);
      }
      setShowUpload(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // ── Thumbnail frame capture helpers ──────────────────────────────────────
  async function captureFrameAtTime(videoEl: HTMLVideoElement, timeSeconds: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const seek = () => {
        videoEl.removeEventListener("seeked", seek);
        const canvas = document.createElement("canvas");
        canvas.width = videoEl.videoWidth || 640;
        canvas.height = videoEl.videoHeight || 360;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No canvas context"));
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      videoEl.addEventListener("seeked", seek, { once: true });
      videoEl.currentTime = timeSeconds;
    });
  }

  async function generateCandidates(videoEl: HTMLVideoElement): Promise<string[]> {
    const duration = videoEl.duration;
    if (!isFinite(duration) || duration === 0) return [];
    const timestamps = [0.05, 0.25, 0.50, 0.75, 0.90].map(p => p * duration);
    const frames: string[] = [];
    for (const t of timestamps) {
      try {
        frames.push(await captureFrameAtTime(videoEl, t));
      } catch {
        // skip failed frames
      }
    }
    return frames;
  }

  function base64ToBlob(dataUrl: string, type: string): Blob {
    const b64 = dataUrl.split(",")[1];
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return new Blob([bytes], { type });
  }

  function closestCandidateIndex(scrubTime: number, duration: number): number {
    const percentages = [0.05, 0.25, 0.50, 0.75, 0.90];
    let closest = 0;
    let minDiff = Infinity;
    percentages.forEach((p, i) => {
      const diff = Math.abs(p * duration - scrubTime);
      if (diff < minDiff) { minDiff = diff; closest = i; }
    });
    return closest;
  }

  const resetUpload = () => {
    setShowUpload(false);
    setUploadStep(1);
    setSelectedFile(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    if (tubeThumbPreview) { URL.revokeObjectURL(tubeThumbPreview); setTubeThumbPreview(null); }
    setDragOver(false);
    setUploading(false);
    setUploadDone(false);
    setShowPreview(false);
    setShowEditor(false);
    setEditorFilter("");
    setScheduleEnabled(false); setScheduledAt("");
    setCaption(""); setHashtags(""); setSocialPrivacy("public"); setAllowComments(true); setAllowDuet(true);
    setTubeTitle(""); setTubeDesc(""); setTubeCategory(VIDEO_CATEGORIES[0]); setTubeTags(""); setTubeVisibility("public"); setTubeThumbFile(null);
    setStreamTitle(""); setStreamDesc(""); setStreamCategory(VIDEO_CATEGORIES[0]); setStreamType("vod");
    setStreamGenre("Drama"); setStreamAgeRating("PG-13"); setStreamContentType("movie");
    setMktName(""); setMktDesc(""); setMktPrice(""); setMktPriceType("fixed"); setMktRoyalties("10"); setMktProperties([{ key: "", value: "" }]);
    setMktCondition("new"); setMktCategory("Electronics"); setMktLocation(""); setMktContact("chat"); setMktDelivery("pickup"); setMktNegotiable(false);
    setIsPaylocked(false); setPayPrice(50);
    setIsPoll(false); setPollQuestion(""); setPollOptions(["", ""]); setPollEndsAt("");
    setThumbCandidates([]); setSelectedThumb(null); setThumbVideoRef(null); setThumbScrubTime(0); setThumbVideoDuration(0); setGeneratingThumbs(false); setScrubPreview(null);
  };

  const openUpload = (p?: Platform) => {
    if (p) setUploadPlatform(p);
    setUploadStep(1);
    setShowUpload(true);
  };

  const FILE_SIZE_LIMITS: Record<Platform, number> = {
    Social:      100 * 1024 * 1024,   // 100 MB
    KliqTube:    2048 * 1024 * 1024,  // 2 GB
    Stream:      4096 * 1024 * 1024,  // 4 GB
    Marketplace: 500 * 1024 * 1024,   // 500 MB
  };
  const FILE_SIZE_LABELS: Record<Platform, string> = {
    Social: "100 MB", KliqTube: "2 GB", Stream: "4 GB", Marketplace: "500 MB",
  };

  const pickFile = async (file: File) => {
    const limit = FILE_SIZE_LIMITS[uploadPlatform];
    if (file.size > limit) {
      showToast(`${uploadPlatform} allows a maximum file size of ${FILE_SIZE_LABELS[uploadPlatform]}. Your file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`);
      return;
    }

    // Client-side image compression for images > 500 KB
    if (file.type.startsWith("image/") && file.size > 500 * 1024) {
      try {
        const originalMB = (file.size / (1024 * 1024)).toFixed(1);
        const compressed = await new Promise<File>((resolve, reject) => {
          const img = new Image();
          const objectUrl = URL.createObjectURL(file);
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const MAX_W = 1920;
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            if (w > MAX_W) { h = Math.round((h * MAX_W) / w); w = MAX_W; }
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) { reject(new Error("canvas")); return; }
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(blob => {
              if (!blob) { reject(new Error("blob")); return; }
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            }, "image/jpeg", 0.85);
          };
          img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("load")); };
          img.src = objectUrl;
        });
        const compressedKB = (compressed.size / 1024).toFixed(0);
        showToast(`Image optimised: ${originalMB} MB → ${compressedKB} KB`);
        file = compressed;
      } catch {
        // Compression failed — fall through with original file
      }
    }

    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    // Auto-generate thumbnails for non-stream video uploads
    if (file.type.startsWith("video/") && uploadPlatform !== "Stream") {
      setGeneratingThumbs(true);
      setThumbCandidates([]);
      setSelectedThumb(null);

      const videoEl = document.createElement("video");
      videoEl.preload = "metadata";
      videoEl.muted = true;
      videoEl.src = URL.createObjectURL(file);

      videoEl.addEventListener("loadedmetadata", async () => {
        setThumbVideoRef(videoEl);
        setThumbVideoDuration(videoEl.duration);
        setThumbScrubTime(videoEl.duration * 0.25);

        const candidates = await generateCandidates(videoEl);
        setThumbCandidates(candidates);
        // Auto-select the 25% frame (index 1)
        if (candidates[1]) setSelectedThumb(candidates[1]);
        setGeneratingThumbs(false);
      }, { once: true });
    } else {
      // Reset thumb state for non-video or stream uploads
      setThumbCandidates([]);
      setSelectedThumb(null);
      setThumbVideoRef(null);
      setThumbScrubTime(0);
      setThumbVideoDuration(0);
      setGeneratingThumbs(false);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await pickFile(f);
    e.target.value = "";
  };

  const handleThumbInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setTubeThumbFile(f);
    if (tubeThumbPreview) URL.revokeObjectURL(tubeThumbPreview);
    setTubeThumbPreview(URL.createObjectURL(f));
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) await pickFile(f);
  };

  // ── Submit handlers per platform ─────────────────────────────────────────
  const submitUpload = async () => {
    if (!selectedFile || uploading) return;
    setUploading(true);
    try {
      const { url: mediaUrl } = await api.upload(selectedFile);

      // Upload auto-generated / scrubbed thumbnail if one was selected
      let autoThumbUrl: string | undefined;
      if (selectedThumb && uploadPlatform !== "Stream") {
        try {
          const thumbBlob = base64ToBlob(selectedThumb, "image/jpeg");
          const thumbFile = new File([thumbBlob], "thumb.jpg", { type: "image/jpeg" });
          const t = await api.upload(thumbFile);
          autoThumbUrl = t.url;
        } catch {
          // thumbnail upload failure is non-fatal
        }
      }

      if (uploadPlatform === "Social") {
        const body = [caption, hashtags].filter(Boolean).join(" ");
        const post = await api.post<{ id: string; body: string; mediaUrl: string | null; likeCount: number; createdAt: string }>(
          "/posts", {
            body, mediaUrl,
            mediaType: selectedFile.type.startsWith("video") ? "video" : "image",
            postType: "post",
            ...(autoThumbUrl ? { thumbUrl: autoThumbUrl } : {}),
            ...(scheduleEnabled && scheduledAt ? { scheduledAt } : {}),
            ...(isPaylocked ? { isPaylocked: true, payPrice } : {}),
          }
        );
        setContentItems(prev => [{ id: post.id, platform: "Social", title: post.body || "(No caption)", date: fmtDate(post.createdAt), views: "0 likes", status: "Published", thumbnail: resolveMediaUrl(autoThumbUrl ?? post.mediaUrl) ?? "" }, ...prev]);
        if (isPoll && pollQuestion && pollOptions.filter(o => o.trim()).length >= 2) {
          await api.post("/polls", {
            postId: post.id,
            question: pollQuestion,
            options: pollOptions.filter(o => o.trim()),
            endsAt: pollEndsAt || undefined,
          }).catch(() => {});
        }
      }

      if (uploadPlatform === "KliqTube") {
        let thumbUrl: string | undefined;
        if (tubeThumbFile) {
          const t = await api.upload(tubeThumbFile);
          thumbUrl = t.url;
        }
        // Fall back to auto-generated thumbnail if no manual one was uploaded
        if (!thumbUrl && autoThumbUrl) thumbUrl = autoThumbUrl;
        const post = await api.post<{ id: string; body: string; mediaUrl: string | null; likeCount: number; createdAt: string }>(
          "/posts", {
            body: [tubeTitle, tubeDesc].filter(Boolean).join("\n"),
            mediaUrl, mediaType: "video", postType: "tube",
            thumbUrl: thumbUrl, category: tubeCategory, tags: tubeTags, visibility: tubeVisibility,
            ...(scheduleEnabled && scheduledAt ? { scheduledAt } : {}),
          }
        );
        setContentItems(prev => [{ id: post.id, platform: "KliqTube", title: tubeTitle || post.body, date: fmtDate(post.createdAt), views: "0 views", status: "Published", thumbnail: resolveMediaUrl(thumbUrl ?? post.mediaUrl) ?? "" }, ...prev]);
      }

      if (uploadPlatform === "Stream") {
        const post = await api.post<{ id: string; body: string; mediaUrl: string | null; likeCount: number; createdAt: string }>(
          "/posts", { body: [streamTitle, streamDesc].filter(Boolean).join("\n"), mediaUrl, mediaType: "video", postType: "stream", category: streamCategory, streamType, genre: streamGenre, ageRating: streamAgeRating, contentType: streamContentType }
        );
        setContentItems(prev => [{ id: post.id, platform: "Stream", title: streamTitle || post.body, date: fmtDate(post.createdAt), views: "Pending", status: "Pending Manual Approval", thumbnail: resolveMediaUrl(post.mediaUrl) ?? "" }, ...prev]);
      }

      if (uploadPlatform === "Marketplace") {
        const props = mktProperties.filter(p => p.key && p.value);
        const post = await api.post<{ id: string; body: string; mediaUrl: string | null; likeCount: number; createdAt: string }>(
          "/posts", {
            body: mktName, mediaUrl, mediaType: "image", postType: "marketplace",
            description: mktDesc, price: mktPrice, currency: region.currency,
            condition: mktCondition, category: mktCategory, location: mktLocation,
            contact: mktContact, delivery: mktDelivery, negotiable: mktNegotiable,
            properties: props,
          }
        );
        setContentItems(prev => [{ id: post.id, platform: "Marketplace", title: mktName || post.body, date: fmtDate(post.createdAt), views: `${mktPrice} KLIQ`, status: "Published", thumbnail: resolveMediaUrl(post.mediaUrl) ?? "" }, ...prev]);
      }

      setUploadDone(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed.");
      setUploading(false);
    }
  };

  const handleEditorSave = (result: MediaEditorResult) => {
    if (previewUrl && previewUrl !== result.previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(result.file);
    setPreviewUrl(result.previewUrl);
    setEditorFilter(result.filter);
    setShowEditor(false);
  };

  // ── Validate step before advancing ───────────────────────────────────────
  const canAdvance = (): boolean => {
    if (uploadStep === 1) return !!selectedFile;
    if (uploadStep === 2) {
      if (uploadPlatform === "KliqTube") return tubeTitle.trim().length >= 3;
      if (uploadPlatform === "Stream")   return streamTitle.trim().length >= 3;
      if (uploadPlatform === "Marketplace") return mktName.trim().length >= 3;
    }
    return true;
  };

  // ── Load content ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!user?.username) return;
    api.get<{ id: string; body: string; mediaUrl: string | null; likeCount: number; createdAt: string; postType: string }[]>(`/users/${user.username}/posts`)
      .then(posts => {
        setContentItems(posts.map(p => {
          const plt: Platform = p.postType === "tube" ? "KliqTube" : p.postType === "stream" ? "Stream" : p.postType === "marketplace" ? "Marketplace" : "Social";
          return { id: p.id, platform: plt, title: p.body || "(No caption)", date: fmtDate(p.createdAt), views: fmtNum(p.likeCount) + " likes", status: "Published" as const, thumbnail: resolveMediaUrl(p.mediaUrl) ?? "" };
        }));
      })
      .catch(() => {})
      .finally(() => setLoadingContent(false));
  }, [user?.username]);

  const STATS = [
    { label: "Total Views",   value: analyticsData ? fmtNum(analyticsData.totalViews) : "—",   icon: Eye,       color: "text-blue-400",   tierReq: 1 },
    { label: "Followers",     value: user ? fmtNum(user.followerCount) : "—",                   icon: Users,     color: "text-green-400",  tierReq: 1 },
    { label: "Total Likes",   value: analyticsData ? fmtNum(analyticsData.totalLikes) : "—",   icon: TrendingUp, color: "text-purple-400", tierReq: 1 },
    { label: "Est. Revenue",  value: "$—",                                                       icon: DollarSign, color: "text-yellow-400", tierReq: 2 },
  ];

  const deleteItem = async (id: string) => {
    try {
      await api.delete(`/posts/${id}`);
      showToast("Content removed.");
    } catch {
      // show nothing — item is gone either way
    }
    setContentItems(prev => prev.filter(i => i.id !== id));
    setOpenMenuId(null);
  };

  const startEdit = (item: ContentItem) => { setEditingId(item.id); setEditTitle(item.title); setOpenMenuId(null); };
  const saveEdit  = (id: string) => { setContentItems(prev => prev.map(i => i.id === id ? { ...i, title: editTitle } : i)); setEditingId(null); showToast("Title updated."); };

  const filteredContent = contentItems.filter(item => platformFilter === "All" || item.platform === platformFilter);
  const steps = STEPS[uploadPlatform];

  // ── Drop zone component ───────────────────────────────────────────────────
  const DropZone = ({ accept = "image/*,video/*" }: { accept?: string }) => (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
        dragOver ? "border-purple-500 bg-purple-900/10" : "border-gray-700 hover:border-purple-600 hover:bg-gray-900/50"
      }`}
    >
      <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={handleFileInput} />
      <Upload size={28} className={`mx-auto mb-2 ${dragOver ? "text-purple-400" : "text-gray-600"}`} />
      <p className="text-gray-400 text-sm font-medium">Click or drag & drop</p>
      <p className="text-gray-600 text-xs mt-1">Up to {FILE_SIZE_LABELS[uploadPlatform]}</p>
    </div>
  );

  // ── File preview with change + edit buttons ──────────────────────────────
  const FilePreview = () => (
    <div className="relative rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
      {selectedFile?.type.startsWith("video") ? (
        <video src={previewUrl!} className="w-full max-h-48 object-cover" muted style={{ filter: editorFilter }} />
      ) : (
        <img src={previewUrl!} alt="Preview" className="w-full max-h-48 object-cover" style={{ filter: editorFilter }} />
      )}
      <button
        onClick={() => { setSelectedFile(null); if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } setEditorFilter(""); }}
        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition"
      >
        <X size={14} />
      </button>
      <div className="px-3 py-2 bg-gray-900 flex items-center justify-between">
        <p className="text-gray-400 text-xs truncate">{selectedFile?.name}</p>
        <div className="flex items-center gap-3 ml-2">
          <button
            onClick={() => setShowEditor(true)}
            className="text-purple-400 text-xs font-semibold hover:text-purple-300 whitespace-nowrap">
            ✏️ Edit
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 text-xs hover:text-gray-300 whitespace-nowrap">Change</button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileInput} />
      </div>
    </div>
  );

  // ── Step content renderers ────────────────────────────────────────────────
  const renderStep = () => {
    if (uploadDone) return (
      <div className="p-10 text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-400" />
        </div>
        <h3 className="text-white font-bold text-xl mb-2">
          {uploadPlatform === "Stream"
            ? "Submitted for Review!"
            : uploadPlatform === "Marketplace"
            ? "Item Listed!"
            : scheduleEnabled && scheduledAt
            ? "Scheduled!"
            : "Published!"}
        </h3>
        <p className="text-gray-400 text-sm mb-6">
          {uploadPlatform === "Stream"
            ? "Our team will review your content within 24-72 hours."
            : scheduleEnabled && scheduledAt
            ? `Your post will go live on ${new Date(scheduledAt).toLocaleString()}.`
            : "Your content is now live."}
        </p>
        <button onClick={() => { resetUpload(); if (uploadPlatform === "KliqTube") navigate("/klixtube"); }}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition">
          Done
        </button>
      </div>
    );

    // ── SOCIAL ────────────────────────────────────────────────────────────
    if (uploadPlatform === "Social") {
      if (uploadStep === 1) return (
        <div className="space-y-4">
          {previewUrl ? <FilePreview /> : <DropZone accept="image/*,video/*" />}
          <p className="text-gray-500 text-xs text-center">Photos and videos — images or clips</p>
        </div>
      );

      if (uploadStep === 2) return (
        <div className="space-y-4">
          {previewUrl && (
            <div className="rounded-xl overflow-hidden max-h-32">
              {selectedFile?.type.startsWith("video")
                ? <video src={previewUrl} className="w-full h-32 object-cover" muted />
                : <img src={previewUrl} className="w-full h-32 object-cover" />}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Caption</label>
            <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3}
              placeholder="Write a caption... use @ to mention, # for hashtags"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition resize-none" />
            <p className="text-right text-gray-600 text-xs mt-0.5">{caption.length}/2200</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1 flex items-center gap-1"><Tag size={11} /> Add hashtags</label>
            <input value={hashtags} onChange={e => setHashtags(e.target.value)}
              placeholder="#trending #fyp #kliq"
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1 flex items-center gap-1"><Music size={11} /> Sound / Mood</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {SOUNDS.map(s => (
                <button key={s} onClick={() => setSelectedSound(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${selectedSound === s ? "bg-purple-600 text-white" : "bg-gray-900 border border-gray-700 text-gray-400 hover:text-white"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Poll toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Add Poll</p>
              <p className="text-gray-500 text-xs">Let your audience vote</p>
            </div>
            <button onClick={() => setIsPoll(v => !v)}
              className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${isPoll ? "bg-purple-600" : "bg-gray-700"} relative`}>
              <span className={`absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPoll ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {isPoll && (
            <div className="space-y-2 bg-gray-900 rounded-2xl p-4">
              <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                placeholder="Ask a question..." className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input value={opt} onChange={e => { const next=[...pollOptions]; next[i]=e.target.value; setPollOptions(next); }}
                    placeholder={`Option ${i + 1}`} className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                  {i >= 2 && <button onClick={() => setPollOptions(prev => prev.filter((_, j) => j !== i))} className="p-2 text-gray-600 hover:text-red-400"><X size={14} /></button>}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <button onClick={() => setPollOptions(prev => [...prev, ""])} className="text-purple-400 text-xs font-semibold hover:text-purple-300">+ Add option</button>
              )}
              <div>
                <p className="text-gray-500 text-xs mb-1">End date (optional)</p>
                <input type="datetime-local" value={pollEndsAt} onChange={e => setPollEndsAt(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 w-full" />
              </div>
            </div>
          )}

          {/* Thumbnail picker — only for video uploads that aren't KliqStream */}
          {selectedFile?.type.startsWith("video/") && (
            <div className="space-y-3">
              <p className="text-white font-semibold text-sm">Thumbnail</p>

              {generatingThumbs ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Generating thumbnails…</span>
                </div>
              ) : (
                <>
                  {thumbCandidates.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-gray-500 text-xs">Auto-generated frames — tap to select</p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {thumbCandidates.map((frame, i) => {
                          const isSelected = selectedThumb === frame;
                          const isNearest = !isSelected && closestCandidateIndex(thumbScrubTime, thumbVideoDuration) === i;
                          return (
                            <button
                              key={i}
                              onClick={() => setSelectedThumb(frame)}
                              className={`flex-shrink-0 w-24 aspect-video rounded-lg overflow-hidden border-2 transition ${
                                isSelected
                                  ? "border-purple-500 ring-2 ring-purple-500/30"
                                  : isNearest
                                  ? "border-gray-500 opacity-80"
                                  : "border-gray-800 hover:border-gray-600"
                              }`}
                            >
                              <img src={frame} className="w-full h-full object-cover" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {thumbVideoRef && thumbVideoDuration > 0 && (
                    <div className="space-y-2">
                      <p className="text-gray-500 text-xs">Or scrub to any point and capture</p>
                      <div className="flex gap-3 items-center">
                        <div className="w-28 aspect-video rounded-lg overflow-hidden bg-gray-900 flex-shrink-0 border border-gray-800">
                          {(scrubPreview ?? selectedThumb) && <img src={scrubPreview ?? selectedThumb ?? ""} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 space-y-2">
                          <input
                            type="range"
                            min={0}
                            max={thumbVideoDuration}
                            step={0.1}
                            value={thumbScrubTime}
                            onChange={async e => {
                              const t = parseFloat(e.target.value);
                              setThumbScrubTime(t);
                              if (thumbVideoRef) {
                                try {
                                  const frame = await captureFrameAtTime(thumbVideoRef, t);
                                  setScrubPreview(frame);
                                } catch {}
                              }
                            }}
                            className="w-full accent-purple-500"
                          />
                          <p className="text-gray-600 text-xs">
                            {Math.floor(thumbScrubTime / 60)}:{String(Math.floor(thumbScrubTime % 60)).padStart(2, "0")} / {Math.floor(thumbVideoDuration / 60)}:{String(Math.floor(thumbVideoDuration % 60)).padStart(2, "0")}
                          </p>
                          <button
                            onClick={async () => {
                              if (!thumbVideoRef) return;
                              try {
                                const frame = await captureFrameAtTime(thumbVideoRef, thumbScrubTime);
                                setSelectedThumb(frame);
                              } catch {}
                            }}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                          >
                            Use This Frame
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedThumb && (
                    <div className="flex items-center gap-2 text-green-400 text-xs">
                      <span>✓</span>
                      <span>Thumbnail selected</span>
                      <button onClick={() => setSelectedThumb(null)} className="text-gray-600 hover:text-gray-400 ml-auto text-xs">Remove</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      );

      if (uploadStep === 3) return (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1"><UserCheck size={11} /> Who can view this</p>
            <div className="space-y-2">
              {(["public", "friends", "private"] as const).map(v => (
                <label key={v} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${socialPrivacy === v ? "border-purple-500 bg-purple-600/10" : "border-gray-800 hover:border-gray-600"}`}>
                  <div>
                    <p className="text-white text-sm font-medium capitalize">{v === "friends" ? "Friends only" : v}</p>
                    <p className="text-gray-500 text-xs">{v === "public" ? "Anyone on KLIQ" : v === "friends" ? "People you follow" : "Only you"}</p>
                  </div>
                  <input type="radio" checked={socialPrivacy === v} onChange={() => setSocialPrivacy(v)} className="accent-purple-600" />
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800 cursor-pointer">
              <div className="flex items-center gap-2"><MessageSquare size={14} className="text-gray-400" /><span className="text-gray-300 text-sm">Allow comments</span></div>
              <button onClick={() => setAllowComments(v => !v)}
                className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${allowComments ? "bg-purple-600" : "bg-gray-700"} relative`}>
                <span className={`absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform ${allowComments ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800 cursor-pointer">
              <div className="flex items-center gap-2"><Film size={14} className="text-gray-400" /><span className="text-gray-300 text-sm">Allow duet / stitch</span></div>
              <button onClick={() => setAllowDuet(v => !v)}
                className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${allowDuet ? "bg-purple-600" : "bg-gray-700"} relative`}>
                <span className={`absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform ${allowDuet ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </label>
            {/* Schedule toggle */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800 cursor-pointer">
              <div className="flex items-center gap-2"><Clock size={14} className="text-gray-400" /><span className="text-gray-300 text-sm">Schedule for later</span></div>
              <button onClick={() => setScheduleEnabled(v => !v)}
                className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${scheduleEnabled ? "bg-purple-600" : "bg-gray-700"} relative`}>
                <span className={`absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform ${scheduleEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </label>
            {scheduleEnabled && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Publish date &amp; time</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-600 transition"
                />
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── KLIQTUBE ──────────────────────────────────────────────────────────
    if (uploadPlatform === "KliqTube") {
      if (uploadStep === 1) return (
        <div className="space-y-4">
          {previewUrl ? <FilePreview /> : <DropZone accept="video/*" />}
          <p className="text-gray-500 text-xs text-center">Upload an MP4, MOV, or WebM file — up to {FILE_SIZE_LABELS[uploadPlatform]}</p>
        </div>
      );

      if (uploadStep === 2) return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Title <span className="text-red-400">*</span></label>
            <input value={tubeTitle} onChange={e => setTubeTitle(e.target.value)} maxLength={100}
              placeholder="Add a title that describes your video"
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition" />
            <p className="text-right text-gray-600 text-xs mt-0.5">{tubeTitle.length}/100</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Description</label>
            <textarea value={tubeDesc} onChange={e => setTubeDesc(e.target.value)} rows={3} maxLength={5000}
              placeholder="Tell viewers about your video (timestamps, links, chapters...)"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1 flex items-center gap-1"><ImageIcon size={11} /> Thumbnail</label>
            <div onClick={() => thumbInputRef.current?.click()}
              className="border border-dashed border-gray-700 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-purple-600 transition">
              <input ref={thumbInputRef} type="file" accept="image/*" className="hidden" onChange={handleThumbInput} />
              {tubeThumbPreview
                ? <img src={tubeThumbPreview} className="w-20 h-12 object-cover rounded-lg" />
                : <div className="w-20 h-12 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0"><ImageIcon size={16} className="text-gray-600" /></div>}
              <div>
                <p className="text-gray-300 text-sm font-medium">{tubeThumbPreview ? "Change thumbnail" : "Upload thumbnail"}</p>
                <p className="text-gray-600 text-xs">JPG, PNG, GIF — 1280×720 recommended</p>
              </div>
            </div>

            {/* Auto-generated thumbnail picker */}
            {generatingThumbs ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm mt-3">
                <Loader2 size={14} className="animate-spin" />
                <span>Generating thumbnails…</span>
              </div>
            ) : (
              <>
                {thumbCandidates.length > 0 && (
                  <div className="space-y-1.5 mt-3">
                    <p className="text-gray-500 text-xs">Auto-generated frames — tap to select</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {thumbCandidates.map((frame, i) => {
                        const isSelected = selectedThumb === frame;
                        const isNearest = !isSelected && closestCandidateIndex(thumbScrubTime, thumbVideoDuration) === i;
                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedThumb(frame)}
                            className={`flex-shrink-0 w-24 aspect-video rounded-lg overflow-hidden border-2 transition ${
                              isSelected
                                ? "border-purple-500 ring-2 ring-purple-500/30"
                                : isNearest
                                ? "border-gray-500 opacity-80"
                                : "border-gray-800 hover:border-gray-600"
                            }`}
                          >
                            <img src={frame} className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {thumbVideoRef && thumbVideoDuration > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-gray-500 text-xs">Or scrub to any point and capture</p>
                    <div className="flex gap-3 items-center">
                      <div className="w-28 aspect-video rounded-lg overflow-hidden bg-gray-900 flex-shrink-0 border border-gray-800">
                        {(scrubPreview ?? selectedThumb) && <img src={scrubPreview ?? selectedThumb ?? ""} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="range"
                          min={0}
                          max={thumbVideoDuration}
                          step={0.1}
                          value={thumbScrubTime}
                          onChange={async e => {
                            const t = parseFloat(e.target.value);
                            setThumbScrubTime(t);
                            if (thumbVideoRef) {
                              try {
                                const frame = await captureFrameAtTime(thumbVideoRef, t);
                                setScrubPreview(frame);
                              } catch {}
                            }
                          }}
                          className="w-full accent-purple-500"
                        />
                        <p className="text-gray-600 text-xs">
                          {Math.floor(thumbScrubTime / 60)}:{String(Math.floor(thumbScrubTime % 60)).padStart(2, "0")} / {Math.floor(thumbVideoDuration / 60)}:{String(Math.floor(thumbVideoDuration % 60)).padStart(2, "0")}
                        </p>
                        <button
                          onClick={async () => {
                            if (!thumbVideoRef) return;
                            try {
                              const frame = await captureFrameAtTime(thumbVideoRef, thumbScrubTime);
                              setSelectedThumb(frame);
                            } catch {}
                          }}
                          className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                        >
                          Use This Frame
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedThumb && (
                  <div className="flex items-center gap-2 text-green-400 text-xs mt-2">
                    <span>✓</span>
                    <span>Auto thumbnail selected{tubeThumbFile ? " (overridden by manual upload)" : ""}</span>
                    <button onClick={() => setSelectedThumb(null)} className="text-gray-600 hover:text-gray-400 ml-auto text-xs">Remove</button>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Category</label>
              <select value={tubeCategory} onChange={e => setTubeCategory(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-600 transition">
                {VIDEO_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 flex items-center gap-1"><Tag size={11} /> Tags</label>
              <input value={tubeTags} onChange={e => setTubeTags(e.target.value)}
                placeholder="gaming, tutorial, fun"
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition" />
            </div>
          </div>
        </div>
      );

      if (uploadStep === 3) return (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2">Visibility</p>
            <div className="space-y-2">
              {(["public", "unlisted", "private"] as const).map(v => (
                <label key={v} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${tubeVisibility === v ? "border-purple-500 bg-purple-600/10" : "border-gray-800 hover:border-gray-600"}`}>
                  <div>
                    <p className="text-white text-sm font-medium capitalize">{v}</p>
                    <p className="text-gray-500 text-xs">{v === "public" ? "Anyone can search and watch" : v === "unlisted" ? "Anyone with the link can watch" : "Only you can watch"}</p>
                  </div>
                  <input type="radio" checked={tubeVisibility === v} onChange={() => setTubeVisibility(v)} className="accent-purple-600" />
                </label>
              ))}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h4 className="text-white text-sm font-semibold mb-2">Summary</h4>
            <div className="space-y-1 text-xs text-gray-400">
              <p><span className="text-gray-500">Title:</span> {tubeTitle}</p>
              <p><span className="text-gray-500">Category:</span> {tubeCategory}</p>
              <p><span className="text-gray-500">Visibility:</span> <span className="capitalize">{tubeVisibility}</span></p>
            </div>
          </div>
          {/* Schedule toggle */}
          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800 cursor-pointer">
              <div className="flex items-center gap-2"><Clock size={14} className="text-gray-400" /><span className="text-gray-300 text-sm">Schedule for later</span></div>
              <button onClick={() => setScheduleEnabled(v => !v)}
                className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${scheduleEnabled ? "bg-purple-600" : "bg-gray-700"} relative`}>
                <span className={`absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform ${scheduleEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </label>
            {scheduleEnabled && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Publish date &amp; time</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-600 transition"
                />
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── STREAM ────────────────────────────────────────────────────────────
    if (uploadPlatform === "Stream") {
      if (uploadStep === 1) return (
        <div className="space-y-4">
          {previewUrl ? <FilePreview /> : <DropZone accept="video/*" />}
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2">Stream type</p>
            <div className="grid grid-cols-2 gap-2">
              {(["vod", "live"] as const).map(t => (
                <button key={t} onClick={() => setStreamType(t)}
                  className={`p-3 rounded-xl border text-sm font-medium transition ${streamType === t ? "border-pink-500 bg-pink-600/10 text-white" : "border-gray-800 text-gray-400 hover:border-gray-600"}`}>
                  {t === "vod" ? "🎬 VOD / Replay" : "🔴 Live Recording"}
                </button>
              ))}
            </div>
          </div>
        </div>
      );

      if (uploadStep === 2) return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Title <span className="text-red-400">*</span></label>
            <input value={streamTitle} onChange={e => setStreamTitle(e.target.value)}
              placeholder="e.g. The Last Frontier"
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Synopsis</label>
            <textarea value={streamDesc} onChange={e => setStreamDesc(e.target.value)} rows={3}
              placeholder="Describe the story..."
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Content Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["movie", "series"] as const).map(ct => (
                <button key={ct} onClick={() => setStreamContentType(ct)}
                  className={`p-3 rounded-xl border text-sm font-medium transition ${streamContentType === ct ? "border-pink-500 bg-pink-600/10 text-white" : "border-gray-800 text-gray-400 hover:border-gray-600"}`}>
                  {ct === "movie" ? "🎬 Movie" : "📺 Series Episode"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Genre</label>
              <select value={streamGenre} onChange={e => setStreamGenre(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-600 transition">
                {["Drama","Action","Comedy","Thriller","Horror","Documentary","Romance","Sci-Fi","Animation","Family"].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Age Rating</label>
              <select value={streamAgeRating} onChange={e => setStreamAgeRating(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-600 transition">
                {["G","PG","PG-13","R","TV-MA"].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>
      );

      if (uploadStep === 3) return (
        <div className="space-y-4">
          <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 flex gap-3">
            <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 text-sm font-semibold">Manual Review Required</p>
              <p className="text-amber-300/70 text-xs mt-1">KliqStream content is reviewed by our moderation team within 24–72 hours before going live. You'll receive a notification once approved or if changes are needed.</p>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h4 className="text-white text-sm font-semibold mb-2">Submission Summary</h4>
            <div className="space-y-1 text-xs text-gray-400">
              <p><span className="text-gray-500">Title:</span> {streamTitle}</p>
              <p><span className="text-gray-500">Type:</span> {streamType === "vod" ? "VOD / Replay" : "Live Recording"}</p>
              <p><span className="text-gray-500">Content:</span> <span className="capitalize">{streamContentType}</span></p>
              <p><span className="text-gray-500">Genre:</span> {streamGenre}</p>
              <p><span className="text-gray-500">Age Rating:</span> {streamAgeRating}</p>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <p className="text-gray-400 text-xs">By submitting you confirm this content follows the <span className="text-purple-400">KLIQ Community Guidelines</span> and KliqStream content policies.</p>
          </div>
        </div>
      );
    }

    // ── MARKETPLACE ───────────────────────────────────────────────────────
    if (uploadPlatform === "Marketplace") {
      if (uploadStep === 1) return (
        <div className="space-y-4">
          {previewUrl ? <FilePreview /> : <DropZone accept="image/*" />}
          <p className="text-gray-500 text-xs text-center">Images only — JPG, PNG, WebP up to {FILE_SIZE_LABELS[uploadPlatform]}</p>
        </div>
      );

      const MKT_CATS = ["Electronics","Furniture","Clothing & Shoes","Vehicles","Property","Garden & Outdoor","Sports & Outdoors","Books & Media","Toys & Kids","Health & Beauty","Tools","Collectibles","Food & Beverages","Other"];
      const CONDITIONS = [
        { value: "new",       label: "New",       desc: "Brand new, unused, with tags/packaging" },
        { value: "like_new",  label: "Like New",  desc: "Used once or twice, near-perfect condition" },
        { value: "good",      label: "Good",      desc: "Minor wear, fully functional" },
        { value: "fair",      label: "Fair",      desc: "Visible wear, works well" },
        { value: "poor",      label: "For Parts", desc: "Not fully functional, sold for parts/repair" },
      ];

      if (uploadStep === 2) return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Title <span className="text-red-400">*</span></label>
            <input value={mktName} onChange={e => setMktName(e.target.value)} maxLength={80}
              placeholder="What are you selling?"
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Description</label>
            <textarea value={mktDesc} onChange={e => setMktDesc(e.target.value)} rows={3}
              placeholder="Describe the item — size, colour, brand, age, any defects..."
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Category</label>
              <select value={mktCategory} onChange={e => setMktCategory(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2 py-2.5 text-white text-xs focus:outline-none focus:border-yellow-500 transition">
                {MKT_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Location / Area</label>
              <input value={mktLocation} onChange={e => setMktLocation(e.target.value)}
                placeholder="e.g. Sandton, Gauteng"
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Condition</label>
            <div className="space-y-1.5">
              {CONDITIONS.map(c => (
                <label key={c.value}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition ${mktCondition === c.value ? "border-yellow-500 bg-yellow-500/10" : "border-gray-800 hover:border-gray-600"}`}>
                  <input type="radio" checked={mktCondition === c.value} onChange={() => setMktCondition(c.value)} className="accent-yellow-500 flex-shrink-0" />
                  <div>
                    <p className="text-white text-xs font-semibold">{c.label}</p>
                    <p className="text-gray-500 text-[10px]">{c.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-400">Additional Properties</label>
              <button onClick={() => setMktProperties(p => [...p, { key: "", value: "" }])}
                className="text-yellow-400 hover:text-yellow-300 transition flex items-center gap-1 text-xs"><Plus size={12} /> Add</button>
            </div>
            <div className="space-y-2">
              {mktProperties.map((prop, i) => (
                <div key={i} className="flex gap-2">
                  <input value={prop.key} onChange={e => setMktProperties(p => p.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                    placeholder="e.g. Brand"
                    className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition" />
                  <input value={prop.value} onChange={e => setMktProperties(p => p.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                    placeholder="e.g. Samsung"
                    className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition" />
                  {mktProperties.length > 1 && (
                    <button onClick={() => setMktProperties(p => p.filter((_, j) => j !== i))} className="text-gray-600 hover:text-red-400 transition"><X size={14} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );

      if (uploadStep === 3) return (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1"><Coins size={11} /> Price ({region.currency})</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">{region.symbol}</span>
              <input type="number" value={mktPrice} onChange={e => setMktPrice(e.target.value)} min="0"
                placeholder="0.00"
                className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-8 pr-20 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-yellow-500 transition" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">{region.currency}</span>
            </div>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={mktNegotiable} onChange={e => setMktNegotiable(e.target.checked)} className="accent-yellow-500" />
              <span className="text-gray-400 text-xs">Price is negotiable</span>
            </label>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2">Delivery options</p>
            <div className="grid grid-cols-3 gap-2">
              {[["pickup","Pickup only"],["delivery","Delivery"],["both","Pickup & Delivery"]].map(([v,l]) => (
                <button key={v} onClick={() => setMktDelivery(v)}
                  className={`p-2.5 rounded-xl border text-[11px] font-medium transition text-center ${mktDelivery === v ? "border-yellow-500 bg-yellow-500/10 text-white" : "border-gray-800 text-gray-400 hover:border-gray-600"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2">Contact preference</p>
            <div className="grid grid-cols-2 gap-2">
              {[["chat","💬 Chat only"],["whatsapp","📱 WhatsApp"],["call","📞 Call"],["email","✉️ Email"]].map(([v,l]) => (
                <button key={v} onClick={() => setMktContact(v)}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition ${mktContact === v ? "border-yellow-500 bg-yellow-500/10 text-white" : "border-gray-800 text-gray-400 hover:border-gray-600"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs text-gray-400 space-y-1">
            <p><span className="text-gray-500">Title:</span> {mktName}</p>
            <p><span className="text-gray-500">Condition:</span> {CONDITIONS.find(c => c.value === mktCondition)?.label}</p>
            <p><span className="text-gray-500">Price:</span> {region.symbol}{mktPrice || "—"} {region.currency}{mktNegotiable ? " (negotiable)" : ""}</p>
            <p><span className="text-gray-500">Delivery:</span> {mktDelivery}</p>
            <p><span className="text-gray-500">Location:</span> {mktLocation || "—"}</p>
          </div>
        </div>
      );
    }

    return null;
  };

  // ── Platform previews ────────────────────────────────────────────────────
  const renderPreview = () => {
    const username = user?.username ?? "you";
    const displayName = user?.displayName ?? "You";
    const avatar = resolveAvatarUrl(user?.avatarUrl);

    if (uploadPlatform === "Social") return (
      <div className="flex flex-col items-center">
        {/* Phone frame */}
        <div className="relative w-[280px] h-[500px] bg-black rounded-[32px] border-4 border-gray-700 overflow-hidden shadow-2xl">
          {/* notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-700 rounded-b-xl z-10" />
          {/* media */}
          <div className="absolute inset-0">
            {previewUrl
              ? (selectedFile?.type.startsWith("video")
                ? <video src={previewUrl} className="w-full h-full object-cover" autoPlay muted loop />
                : <img src={previewUrl} className="w-full h-full object-cover" />)
              : <div className="w-full h-full bg-gradient-to-b from-purple-900 via-indigo-900 to-black flex items-center justify-center">
                  <p className="text-white text-sm text-center px-6 font-semibold">{caption || "Your caption will appear here"}</p>
                </div>}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
          </div>
          {/* overlay ui */}
          <div className="absolute bottom-4 left-3 right-12 z-10">
            <p className="text-white font-bold text-xs mb-0.5">@{username}</p>
            <p className="text-gray-200 text-[11px] line-clamp-2">{caption || "Your caption"} {hashtags && <span className="text-blue-300">{hashtags}</span>}</p>
            <div className="flex items-center gap-1 mt-1">
              <Music size={10} className="text-white" />
              <p className="text-gray-300 text-[10px] truncate">{selectedSound}</p>
            </div>
          </div>
          <div className="absolute bottom-4 right-2 z-10 flex flex-col items-center gap-3">
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden"><img src={avatar} className="w-full h-full object-cover" /></div>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Heart size={20} className="text-white" /><span className="text-white text-[10px]">0</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <MessageCircle size={20} className="text-white" /><span className="text-white text-[10px]">0</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Share2 size={20} className="text-white" /><span className="text-white text-[10px]">Share</span>
            </div>
          </div>
          {/* tab bar hint */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800" />
        </div>
        <p className="text-gray-500 text-xs mt-3">Social feed preview</p>
      </div>
    );

    if (uploadPlatform === "KliqTube") return (
      <div className="space-y-3 w-full">
        {/* Video card */}
        <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
          <div className="aspect-video relative bg-gray-800">
            {tubeThumbPreview
              ? <img src={tubeThumbPreview} className="w-full h-full object-cover" />
              : previewUrl
                ? <video src={previewUrl} className="w-full h-full object-cover" preload="metadata" />
                : <div className="w-full h-full flex items-center justify-center"><Play size={32} className="text-gray-600" /></div>}
            <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">0:00</div>
          </div>
          <div className="p-3 flex gap-2.5">
            <img src={avatar} className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold line-clamp-2 leading-tight">{tubeTitle || "Your video title"}</p>
              <p className="text-gray-500 text-xs mt-0.5">{displayName} · 0 views · Just now</p>
            </div>
            <MoreHorizontal size={16} className="text-gray-500 flex-shrink-0" />
          </div>
        </div>
        {/* Watch page preview */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
          <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-2">Watch page</p>
          <p className="text-white text-sm font-bold mb-1">{tubeTitle || "Your video title"}</p>
          <div className="flex items-center gap-2 mb-3">
            <img src={avatar} className="w-6 h-6 rounded-full" />
            <span className="text-gray-300 text-xs font-medium">{displayName}</span>
            <span className="text-gray-600 text-xs">· 0 subscribers</span>
          </div>
          <div className="flex gap-2">
            {[["ThumbsUp","0"],["ThumbsDown",""],["Share",""],["Save",""],["Clip",""]].map(([label]) => (
              <div key={label} className="flex items-center gap-1 bg-gray-800 rounded-full px-2.5 py-1">
                <span className="text-gray-400 text-[10px] font-medium">{label}</span>
              </div>
            ))}
          </div>
          {tubeDesc && <p className="text-gray-400 text-xs mt-3 line-clamp-3">{tubeDesc}</p>}
        </div>
        <p className="text-gray-500 text-xs text-center">KliqTube · <span className="capitalize">{tubeVisibility}</span> · {tubeCategory}</p>
      </div>
    );

    if (uploadPlatform === "Stream") return (
      <div className="space-y-3 w-full">
        <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
          <div className="aspect-video relative bg-gray-800">
            {previewUrl
              ? <video src={previewUrl} className="w-full h-full object-cover" preload="metadata" />
              : <div className="w-full h-full flex items-center justify-center"><Tv size={32} className="text-pink-600/50" /></div>}
            <div className="absolute top-2 left-2 bg-black/70 text-pink-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-pink-500/40">
              {streamType === "live" ? "🔴 LIVE" : "▶ VOD"}
            </div>
          </div>
          <div className="p-3">
            <p className="text-white text-sm font-semibold">{streamTitle || "Your stream title"}</p>
            <div className="flex items-center gap-2 mt-1">
              <img src={avatar} className="w-5 h-5 rounded-full" />
              <span className="text-gray-400 text-xs">{displayName}</span>
              <span className="text-gray-600 text-xs">· {streamCategory}</span>
            </div>
          </div>
        </div>
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-3 flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
          <p className="text-amber-300/80 text-xs">This will be sent for manual review before going live.</p>
        </div>
        <p className="text-gray-500 text-xs text-center">KliqStream · {streamGenre} · {streamAgeRating} · <span className="capitalize">{streamContentType}</span></p>
      </div>
    );

    if (uploadPlatform === "Marketplace") return (
      <div className="space-y-3 w-full">
        <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
          <div className="aspect-square relative bg-gray-800">
            {previewUrl
              ? (selectedFile?.type.startsWith("video")
                ? <video src={previewUrl} className="w-full h-full object-cover" muted loop autoPlay />
                : <img src={previewUrl} className="w-full h-full object-cover" />)
              : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={32} className="text-yellow-500/50" /></div>}
          </div>
          <div className="p-4">
            <p className="text-gray-400 text-xs mb-0.5">{displayName}</p>
            <p className="text-white font-bold text-base">{mktName || "Item Name"}</p>
            {mktDesc && <p className="text-gray-400 text-xs mt-1 line-clamp-2">{mktDesc}</p>}
            {mktProperties.some(p => p.key && p.value) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {mktProperties.filter(p => p.key && p.value).map((p, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg px-2.5 py-1.5 border border-gray-700 text-center">
                    <p className="text-yellow-400 text-[9px] font-bold uppercase tracking-wider">{p.key}</p>
                    <p className="text-white text-xs font-medium">{p.value}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">{mktPriceType === "auction" ? "Min. bid" : "Price"}</p>
                <p className="text-white font-bold text-lg">{mktPrice || "—"} <span className="text-yellow-400 text-sm font-semibold">KLIQ</span></p>
              </div>
              <button className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold px-4 py-2 rounded-xl text-sm hover:opacity-90 transition">
                {mktPriceType === "auction" ? "Place Bid" : "Buy Now"}
              </button>
            </div>
          </div>
        </div>
        <p className="text-gray-500 text-xs text-center">Marketplace · {mktRoyalties}% creator royalty</p>
      </div>
    );

    return null;
  };

  const isLastStep = uploadStep === steps.length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-2xl">
          {toast}
        </div>
      )}

      {/* ── Media Editor ───────────────────────────────────────────────── */}
      {showEditor && selectedFile && previewUrl && (
        <MediaEditor
          file={selectedFile}
          previewUrl={previewUrl}
          onSave={handleEditorSave}
          onClose={() => setShowEditor(false)}
        />
      )}

      {/* ── Upload Wizard Modal ─────────────────────────────────────────── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            {!uploadDone && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-800 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    {uploadStep > 1 && (
                      <button onClick={() => { setUploadStep(s => s - 1); setShowPreview(false); }} className="p-1.5 hover:bg-gray-800 rounded-full transition text-gray-400">
                        <ArrowLeft size={16} />
                      </button>
                    )}
                    <div>
                      <h2 className="text-base font-bold text-white">{steps[uploadStep - 1]}</h2>
                      <p className="text-gray-500 text-xs">{uploadPlatform} · Step {uploadStep} of {steps.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadStep >= 2 && selectedFile && (
                      <button
                        onClick={() => setShowPreview(v => !v)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${showPreview ? "bg-purple-600 border-purple-500 text-white" : "border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"}`}
                      >
                        {showPreview ? "← Edit" : "Preview"}
                      </button>
                    )}
                    <button onClick={resetUpload} className="p-1.5 hover:bg-gray-800 rounded-full transition text-gray-400"><X size={16} /></button>
                  </div>
                </div>

                {/* Platform selector (only on step 1) */}
                {uploadStep === 1 && (
                  <div className="px-5 pt-4 flex-shrink-0">
                    <div className="grid grid-cols-4 gap-1.5 mb-4">
                      {(["Social", "KliqTube", "Stream", "Marketplace"] as Platform[]).map(p => {
                        const Icon = PLATFORM_ICONS[p];
                        const locked = p === "Stream" && tier < 2;
                        return (
                          <button key={p} onClick={() => !locked && setUploadPlatform(p)} disabled={locked}
                            className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-[11px] font-medium transition ${locked ? "border-gray-800 text-gray-700 cursor-not-allowed" : uploadPlatform === p ? "border-purple-500 bg-purple-600/10 text-white" : "border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300"}`}>
                            <Icon size={15} />
                            <span className="leading-none">{p === "KliqTube" ? "KliqTube" : p}</span>
                            {locked && <span className="text-[9px] text-purple-400 font-bold">T2</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              </>
            )}

            {/* Body */}
            <div className="overflow-y-auto px-5 pb-5 flex-1">
              {showPreview ? (
                <div className="py-4 flex flex-col items-center gap-3">
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider self-start">How it will look</p>
                  {renderPreview()}
                </div>
              ) : renderStep()}
            </div>

            {/* Footer */}
            {!uploadDone && (
              <div className="px-5 pb-5 flex-shrink-0 pt-2 border-t border-gray-800/50">
                {isLastStep ? (
                  <button onClick={submitUpload} disabled={uploading || !canAdvance()}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {uploading
                      ? <><Loader2 size={16} className="animate-spin" /> Uploading...</>
                      : uploadPlatform === "Stream" ? "Submit for Review"
                      : uploadPlatform === "Marketplace" ? "List Item"
                      : "Publish"}
                  </button>
                ) : (
                  <button onClick={() => { setUploadStep(s => s + 1); setShowPreview(false); }} disabled={!canAdvance()}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-2">
                    Next <ChevronRight size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Kliq Studio</h1>
          <p className="text-gray-500 mt-1">Content Tracker & Analytics Hub</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {tier >= 2 ? (
            <button onClick={() => navigate("/analytics")}
              className="bg-gray-900 border border-gray-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-gray-800 transition self-start">
              <BarChart2 size={16} className="text-purple-400" /> Analytics
            </button>
          ) : (
            <button onClick={() => navigate("/settings")} title="Requires Tier 2"
              className="bg-gray-900 border border-gray-700 text-gray-500 px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-gray-800 transition self-start">
              <Lock size={16} className="text-gray-600" /> Analytics
              <span className="text-[10px] font-bold text-purple-400 bg-purple-900/30 px-1.5 py-0.5 rounded-full">T2</span>
            </button>
          )}
          <button onClick={() => openUpload()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition self-start">
            <Upload size={16} /> Upload Content
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {STATS.map((stat) => {
          const isLocked = tier < stat.tierReq;
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-gray-950 border border-gray-800 p-4 rounded-xl relative overflow-hidden">
              {isLocked && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
                  <Lock size={18} className="text-gray-500 mb-1" />
                  <span className="text-[10px] font-bold text-gray-400">Tier {stat.tierReq} Required</span>
                </div>
              )}
              <div className={isLocked ? "opacity-30" : ""}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={stat.color} />
                  <span className="text-gray-500 text-xs font-medium">{stat.label}</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-950 border border-gray-800 p-5 rounded-xl">
          <h3 className="text-base font-bold text-white mb-1">Views — Last 7 Days</h3>
          <p className="text-gray-500 text-xs mb-4">Views received on your posts</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData?.byDay ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "8px" }} itemStyle={{ color: "#fff" }} />
                <Bar dataKey="views" name="Views" fill="#9333ea" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-950 border border-gray-800 p-5 rounded-xl">
          <h3 className="text-base font-bold text-white mb-1">Likes — Last 7 Days</h3>
          <p className="text-gray-500 text-xs mb-4">Likes received on your posts</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analyticsData?.byDay ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: "8px" }} itemStyle={{ color: "#fff" }} />
                <Line type="monotone" dataKey="likes" name="Likes" stroke="#ec4899" strokeWidth={2} dot={{ fill: "#ec4899", strokeWidth: 2, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Content Tracker */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Film size={18} className="text-purple-400" />
            <h3 className="text-base font-bold text-white">Content Tracker</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {(["All", "Social", "KliqTube", "Stream", "Marketplace"] as PlatformFilter[]).map(f => (
              <button key={f} onClick={() => setPlatformFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${platformFilter === f ? "bg-purple-600/20 border border-purple-500/50 text-purple-300" : "text-gray-500 hover:text-gray-300 border border-transparent"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-900" ref={menuRef}>
          {loadingContent ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-purple-400" /></div>
          ) : filteredContent.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-600 text-sm mb-3">No content yet</p>
              <button onClick={() => openUpload(platformFilter !== "All" ? platformFilter as Platform : undefined)}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium transition">
                + Upload your first piece
              </button>
            </div>
          ) : null}
          {filteredContent.map(item => {
            const PlatIcon = PLATFORM_ICONS[item.platform];
            const statusCfg = STATUS_CONFIG[item.status];
            const StatusIcon = statusCfg.icon;
            const isEditing = editingId === item.id;
            const menuOpen  = openMenuId === item.id;
            return (
              <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-gray-900/50 transition">
                <div className="w-16 h-10 rounded-md overflow-hidden bg-gray-800 flex-shrink-0 flex items-center justify-center">
                  {item.thumbnail ? <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" /> : <Film size={16} className="text-gray-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(item.id); if (e.key === "Escape") setEditingId(null); }}
                        className="flex-1 bg-gray-800 border border-purple-600 rounded-lg px-2 py-1 text-white text-sm focus:outline-none" />
                      <button onClick={() => saveEdit(item.id)} className="text-purple-400 text-xs font-semibold hover:text-purple-300">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-500 text-xs">Cancel</button>
                    </div>
                  ) : (
                    <p className="text-white font-medium text-sm truncate">{item.title}</p>
                  )}
                  <p className="text-gray-600 text-xs mt-0.5">{item.date} · {item.views}</p>
                </div>
                <span className={`hidden md:flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${PLATFORM_COLORS[item.platform]}`}>
                  <PlatIcon size={10} /> {item.platform}
                </span>
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${statusCfg.color}`}>
                  <StatusIcon size={10} />
                  {item.status === "Pending Manual Approval" ? "Pending Review" : item.status}
                </span>
                <div className="relative flex-shrink-0">
                  <button onClick={() => setOpenMenuId(menuOpen ? null : item.id)}
                    className="p-1.5 text-gray-600 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition">
                    <MoreVertical size={16} />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-30 py-1 overflow-hidden">
                      <button onClick={() => startEdit(item)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition text-left">
                        <Pencil size={13} className="text-gray-500" /> Edit Title
                      </button>
                      <button onClick={() => { setOpenMenuId(null); openUpload(item.platform); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition text-left">
                        <RefreshCw size={13} className="text-gray-500" /> Re-upload
                      </button>
                      <div className="border-t border-gray-800 my-1" />
                      <button onClick={() => deleteItem(item.id)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition text-left">
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scheduled Posts */}
      {scheduledPosts.length > 0 && (
        <div className="bg-gray-950 border border-gray-800 rounded-xl mt-6">
          <div className="flex items-center gap-2 p-5 border-b border-gray-800">
            <Clock size={18} className="text-purple-400" />
            <h3 className="text-base font-bold text-white">Scheduled Posts</h3>
          </div>
          <div className="divide-y divide-gray-900">
            {scheduledPosts.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-gray-900/50 transition">
                <Clock size={16} className="text-gray-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{item.body}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {item.platform} · Scheduled for {new Date(item.scheduledAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs font-medium text-amber-400 bg-amber-900/30 px-2 py-1 rounded-full whitespace-nowrap flex items-center gap-1">
                  <Clock size={10} /> Scheduled
                </span>
                <div className="flex items-center gap-1 ml-2">
                  {reschedulingId === item.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="datetime-local"
                        value={newScheduledAt}
                        onChange={e => setNewScheduledAt(e.target.value)}
                        className="bg-gray-900 border border-purple-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
                      />
                      <button
                        onClick={async () => {
                          await api.patch(`/posts/scheduled/${item.id}`, { scheduledAt: newScheduledAt });
                          setScheduledPosts(prev => prev.map(p => p.id === item.id ? { ...p, scheduledAt: newScheduledAt } : p));
                          setReschedulingId(null);
                          showToast("Rescheduled");
                        }}
                        className="text-purple-400 text-xs font-bold hover:text-purple-300 px-2"
                      >Save</button>
                      <button onClick={() => setReschedulingId(null)} className="text-gray-500 text-xs">✕</button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => { setReschedulingId(item.id); setNewScheduledAt(item.scheduledAt?.slice(0, 16) ?? ""); }}
                        className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition"
                        title="Reschedule"
                      ><Pencil size={13} /></button>
                      <button
                        onClick={async () => {
                          await api.delete(`/posts/scheduled/${item.id}`);
                          setScheduledPosts(prev => prev.filter(p => p.id !== item.id));
                          showToast("Scheduled post cancelled");
                        }}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        title="Cancel"
                      ><Trash2 size={13} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
