import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Music, Play, Pause, Search, Loader2, Upload, X } from "lucide-react";
import { api, resolveMediaUrl } from "../api/client";

interface Sound {
  id: string; title: string; useCount: number; audioUrl: string; coverUrl: string | null;
  author: { username: string; displayName: string; avatarUrl: string };
}

export function SoundsPage() {
  const navigate = useNavigate();
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadModal, setUploadModal] = useState<{ file: File; previewUrl: string } | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const q = search.trim();
    const url = q ? `/sounds/search?q=${encodeURIComponent(q)}` : "/sounds/trending";
    setLoading(true);
    api.get<Sound[]>(url).then(setSounds).catch(() => {}).finally(() => setLoading(false));
  }, [search]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setUploadTitle(file.name.replace(/\.[^.]+$/, ""));
    setUploadModal({ file, previewUrl });
    e.target.value = "";
  };

  const submitUpload = async () => {
    if (!uploadModal || !uploadTitle.trim()) return;
    setUploading(true);
    try {
      const { url: audioUrl } = await api.upload(uploadModal.file);
      await api.post("/sounds", { title: uploadTitle.trim(), audioUrl });
      URL.revokeObjectURL(uploadModal.previewUrl);
      setUploadModal(null);
      setUploadTitle("");
      const q = search.trim();
      const url = q ? `/sounds/search?q=${encodeURIComponent(q)}` : "/sounds/trending";
      api.get<Sound[]>(url).then(setSounds).catch(() => {});
    } catch {
    } finally {
      setUploading(false);
    }
  };

  const togglePlay = (sound: Sound) => {
    if (playing === sound.id) {
      audioRef.current?.pause();
      setPlaying(null);
    } else {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
      const audio = new Audio(resolveMediaUrl(sound.audioUrl) ?? sound.audioUrl);
      audio.play().catch(() => {});
      audio.onended = () => setPlaying(null);
      audioRef.current = audio;
      setPlaying(sound.id);
    }
  };

  return (
    <div className="min-h-full bg-black pb-24">
      {/* Upload modal */}
      {uploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold">Upload Sound</h3>
              <button onClick={() => { URL.revokeObjectURL(uploadModal.previewUrl); setUploadModal(null); }} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <audio src={uploadModal.previewUrl} controls className="w-full rounded-lg" />
            <div>
              <label className="block text-xs text-gray-500 font-semibold uppercase mb-1.5">Title</label>
              <input
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
                placeholder="Name your sound..."
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500"
                autoFocus
              />
            </div>
            <button
              onClick={submitUpload}
              disabled={!uploadTitle.trim() || uploading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileSelect} />

      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur border-b border-gray-900 px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full"><ArrowLeft size={20} className="text-white" /></button>
          <h1 className="text-white font-bold flex items-center gap-2"><Music size={18} className="text-purple-400" />Sounds</h1>
          <button onClick={() => fileInputRef.current?.click()} className="ml-auto flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-full transition">
            <Upload size={13} /> Upload
          </button>
        </div>
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full px-4 py-2">
          <Search size={14} className="text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sounds..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-600" />
        </div>
      </div>

      <div className="px-2">
        {!search && <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-2 py-3">Trending Sounds</p>}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-400" /></div>
        ) : sounds.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3"><Music size={36} className="text-gray-700" /><p className="text-gray-500">No sounds found</p></div>
        ) : (
          <div className="divide-y divide-gray-900">
            {sounds.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 px-2 py-3">
                <span className="text-gray-600 text-sm w-6 text-right flex-shrink-0">{i + 1}</span>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-900 to-pink-900 overflow-hidden flex-shrink-0">
                  {s.coverUrl ? <img src={resolveMediaUrl(s.coverUrl) ?? ""} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Music size={18} className="text-purple-300" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{s.title}</p>
                  <p className="text-gray-500 text-xs">@{s.author.username} · {s.useCount.toLocaleString()} uses</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => togglePlay(s)} className="w-9 h-9 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition">
                    {playing === s.id ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
