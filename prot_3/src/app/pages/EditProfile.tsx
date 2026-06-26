import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Camera, Globe, Lock, Check, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, resolveMediaUrl } from "../api/client";

export function EditProfile() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio]                 = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl]     = useState(user?.avatarUrl ?? "");
  const [isPrivate, setIsPrivate]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingAvatar(true);
    try {
      const { url } = await api.upload(file);
      setAvatarUrl(url);
    } catch {
      setError("Failed to upload photo. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.patch<{
        displayName: string; bio: string; avatarUrl: string; coverUrl: string | null;
      }>("/auth/me", { displayName, bio, avatarUrl });
      updateUser(updated);
      setSaved(true);
      setTimeout(() => { setSaved(false); navigate("/profile"); }, 1500);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur-md border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full transition">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <span className="text-white font-bold flex-1">Edit Profile</span>
        <button
          onClick={save}
          disabled={saving || saved}
          className="text-purple-400 font-semibold text-sm hover:text-purple-300 transition disabled:opacity-50"
        >
          {saved ? <Check size={18} className="text-green-400" /> : saving ? <Loader2 size={18} className="animate-spin" /> : "Save"}
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="relative w-24 h-24 cursor-pointer"
            onClick={() => avatarInputRef.current?.click()}
          >
            <img
              src={resolveMediaUrl(avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
              alt="Profile"
              className="w-full h-full rounded-full object-cover border-4 border-gray-800"
            />
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              {uploadingAvatar
                ? <Loader2 size={20} className="animate-spin text-white" />
                : <Camera size={20} className="text-white" />}
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center border-2 border-black">
              {uploadingAvatar ? <Loader2 size={12} className="animate-spin text-white" /> : <Camera size={14} className="text-white" />}
            </div>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          <p className="text-gray-500 text-xs">Tap photo to change</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Display Name</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-600 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Username</label>
            <div className="flex items-center bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
              <span className="px-4 py-3 text-gray-500 text-sm border-r border-gray-700">@</span>
              <span className="flex-1 px-3 py-3 text-gray-500 text-sm">{user?.username}</span>
            </div>
            <p className="text-gray-600 text-xs mt-1">Username cannot be changed here.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              maxLength={150}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-600 transition resize-none"
            />
            <p className="text-gray-600 text-xs text-right mt-1">{bio.length}/150</p>
          </div>
        </div>

        {/* Privacy */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isPrivate ? <Lock size={16} className="text-purple-400" /> : <Globe size={16} className="text-green-400" />}
                <p className="text-white font-semibold text-sm">{isPrivate ? "Private Account" : "Public Account"}</p>
              </div>
              <p className="text-gray-400 text-xs">
                {isPrivate
                  ? "Only approved followers can see your content and profile."
                  : "Anyone on Kliq can see your profile and content."}
              </p>
            </div>
            <button
              onClick={() => setIsPrivate(p => !p)}
              className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${isPrivate ? "bg-purple-600" : "bg-gray-700"}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPrivate ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving || saved}
          className={`w-full font-bold py-4 rounded-xl transition text-base disabled:opacity-50 ${
            saved
              ? "bg-green-700 text-white"
              : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
          }`}
        >
          {saved ? "✓ Saved!" : saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
