import { useState, useRef } from "react";
import { X, Upload, Loader2, Image as ImageIcon, Video } from "lucide-react";
import { api } from "../api/client";

interface StoryCreateProps {
  onCreated: () => void;
  onClose: () => void;
}

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export function StoryCreate({ onCreated, onClose }: StoryCreateProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File) => {
    if (f.size > MAX_SIZE) {
      setError("File must be under 50 MB.");
      return;
    }
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  };

  const submit = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const { url: mediaUrl } = await api.upload(file);
      const mediaType = file.type.startsWith("video") ? "video" : "image";
      await api.post("/stories", { mediaUrl, mediaType, body: caption.trim() || undefined });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create story.");
    } finally {
      setUploading(false);
    }
  };

  const isVideo = file?.type.startsWith("video");

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gray-950 border-t border-gray-800 rounded-t-3xl p-5 pb-8 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">New Story</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-800 rounded-full transition">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* File picker / preview */}
        {!previewUrl ? (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 rounded-2xl h-52 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-purple-600 transition"
          >
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileInput} />
            <Upload size={28} className="text-gray-600" />
            <div className="text-center">
              <p className="text-gray-400 text-sm font-medium">Tap to pick photo or video</p>
              <p className="text-gray-600 text-xs mt-0.5">Up to 50 MB</p>
            </div>
            <div className="flex gap-3 mt-1">
              <span className="flex items-center gap-1 text-gray-600 text-xs"><ImageIcon size={12} /> Image</span>
              <span className="flex items-center gap-1 text-gray-600 text-xs"><Video size={12} /> Video</span>
            </div>
          </div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden bg-gray-900">
            {isVideo ? (
              <video src={previewUrl} className="w-full max-h-64 object-cover" muted controls={false} playsInline autoPlay loop />
            ) : (
              <img src={previewUrl} alt="Story preview" className="w-full max-h-64 object-cover" />
            )}
            <button
              onClick={() => { setFile(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition"
            >
              <X size={14} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 bg-black/60 text-white rounded-full px-3 py-1 text-xs hover:bg-black/80 transition font-medium"
            >
              Change
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileInput} />
          </div>
        )}

        {/* Caption */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1">Caption (optional)</label>
          <input
            value={caption}
            onChange={e => setCaption(e.target.value)}
            maxLength={200}
            placeholder="Add a caption…"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-400 text-xs text-center">{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={submit}
          disabled={!file || uploading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {uploading ? (
            <><Loader2 size={16} className="animate-spin" /> Uploading…</>
          ) : (
            "Share Story"
          )}
        </button>
      </div>
    </div>
  );
}
