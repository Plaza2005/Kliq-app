import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Users, Search, Check, Globe, Lock, Image as ImageIcon, Sparkles, MessageSquare, Loader2, Camera } from "lucide-react";
import { api, resolveAvatarUrl, resolveMediaUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";

type Step = 1 | 2 | 3;

interface CreatedCommunity { id: string; name: string; }

export function CreateCommunity() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedCommunity | null>(null);
  const [error, setError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);

  // Followers list for inviting (loaded lazily — placeholder until real followers fetch)
  const [followers, setFollowers] = useState<{ username: string; displayName: string; avatarUrl: string }[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const followersLoaded = useRef(false);

  const loadFollowers = async () => {
    if (followersLoaded.current) return;
    followersLoaded.current = true;
    setLoadingFollowers(true);
    try {
      const data = await api.get<{ username: string; displayName: string; avatarUrl: string }[]>(
        `/users/${user?.username}/followers`
      );
      setFollowers(data);
    } catch {
      setFollowers([]);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingPhoto(true);
    try {
      const { url } = await api.upload(file);
      setAvatarUrl(url);
    } catch {
      setError("Failed to upload photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const toggleMember = (u: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(u) ? n.delete(u) : n.add(u); return n; });

  const filtered = followers.filter(s =>
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    s.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const finish = async () => {
    setCreating(true);
    setError(null);
    try {
      const c = await api.post<{ id: string; name: string }>("/communities", {
        name: name.trim(),
        description: description.trim(),
        avatarUrl: avatarUrl ?? undefined,
        isPublic,
      });
      setCreated(c);
    } catch {
      setError("Failed to create community. Please try again.");
      setCreating(false);
    }
  };

  if (created) {
    return (
      <div className="min-h-full bg-black flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-900/60">
            {avatarUrl
              ? <img src={resolveMediaUrl(avatarUrl) ?? ""} className="w-full h-full object-cover rounded-3xl" />
              : <Sparkles size={44} className="text-white" />}
          </div>
          <h2 className="text-white font-black text-3xl mb-2">Community Created!</h2>
          <p className="text-gray-400 text-sm mb-2">
            <span className="text-white font-semibold">"{created.name}"</span> is now live.
          </p>
          {selected.size > 0 && (
            <p className="text-gray-500 text-sm mb-6">{selected.size} member{selected.size !== 1 ? "s" : ""} invited</p>
          )}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6 space-y-2 text-sm text-left">
            <div className="flex justify-between">
              <span className="text-gray-500">Privacy</span>
              <span className="text-white">{isPublic ? "Public" : "Private"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Your role</span>
              <span className="text-purple-400 font-semibold">Admin</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate("/community")}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-900 border border-gray-700 text-white font-semibold py-3.5 rounded-xl hover:bg-gray-800 transition">
              <Users size={16} /> Communities
            </button>
            <button onClick={() => navigate(`/community/${created.id}`)}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition">
              <MessageSquare size={16} /> Open Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur-md border-b border-gray-900">
        <button onClick={() => step === 1 ? navigate(-1) : setStep(s => (s - 1) as Step)} className="p-2 hover:bg-gray-900 rounded-full transition">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <span className="text-white font-bold">Create Community</span>
        <div className="flex gap-1.5 ml-auto">
          {[1, 2, 3].map(s => (
            <div key={s} className={`w-2 h-2 rounded-full transition ${step >= s ? "bg-purple-500" : "bg-gray-700"}`} />
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-white font-bold text-xl">Set up your community</h2>

            {/* Photo */}
            <div className="flex flex-col items-center gap-3">
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-24 h-24 rounded-2xl bg-gray-900 border-2 border-dashed border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:border-purple-600 transition relative overflow-hidden"
              >
                {avatarUrl ? (
                  <>
                    <img src={resolveMediaUrl(avatarUrl) ?? ""} className="w-full h-full object-cover absolute inset-0" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                      <Camera size={20} className="text-white" />
                    </div>
                  </>
                ) : uploadingPhoto ? (
                  <Loader2 size={24} className="animate-spin text-purple-400" />
                ) : (
                  <ImageIcon size={28} className="text-gray-600" />
                )}
              </button>
              <p className="text-gray-500 text-xs">Tap to add community photo</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Community Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Name your community..."
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="What is this community about?"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition resize-none" />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-300 mb-3">Privacy</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: true, label: "Public", icon: Globe, desc: "Anyone can join" },
                  { value: false, label: "Private", icon: Lock, desc: "Invite only" },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button key={String(opt.value)} onClick={() => setIsPublic(opt.value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border text-sm font-semibold transition ${isPublic === opt.value
                        ? "border-purple-500 bg-purple-600/10 text-white"
                        : "border-gray-800 text-gray-400 hover:border-gray-600"}`}>
                      <Icon size={20} />
                      <span>{opt.label}</span>
                      <span className="font-normal text-xs text-gray-500">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => { if (name.trim()) { setStep(2); loadFollowers(); } }}
              disabled={!name.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 disabled:opacity-40 transition">
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-white font-bold text-xl">Add Members</h2>
            <p className="text-gray-400 text-sm">Invite people from your followers</p>

            <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5">
              <Search size={15} className="text-gray-500 flex-shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search followers..."
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none" />
            </div>

            {selected.size > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {Array.from(selected).map(u => (
                  <button key={u} onClick={() => toggleMember(u)} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gray-800 border-2 border-purple-500 overflow-hidden relative">
                      <img src={"/avatar-default.svg"} alt={u} className="w-full h-full" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Check size={16} className="text-white" />
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 truncate max-w-[48px]">{u}</span>
                  </button>
                ))}
              </div>
            )}

            {loadingFollowers ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-purple-400" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">
                {followers.length === 0 ? "No followers yet" : "No results"}
              </p>
            ) : (
              <div className="space-y-2">
                {filtered.map(s => (
                  <button key={s.username} onClick={() => toggleMember(s.username)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-900 transition">
                    <img src={resolveAvatarUrl(s.avatarUrl)}
                      alt={s.username} className="w-10 h-10 rounded-full bg-gray-800 object-cover" />
                    <div className="flex-1 text-left">
                      <p className="text-white text-sm font-medium">@{s.username}</p>
                      <p className="text-gray-500 text-xs">{s.displayName}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${selected.has(s.username) ? "bg-purple-600 border-purple-600" : "border-gray-600"}`}>
                      {selected.has(s.username) && <Check size={14} className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(3)}
                className="flex-1 border border-gray-700 text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-900 transition">
                Skip
              </button>
              <button onClick={() => setStep(3)}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition">
                {selected.size > 0 ? `Add (${selected.size})` : "Continue"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-white font-bold text-xl">Ready to launch!</h2>

            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                {avatarUrl
                  ? <img src={resolveMediaUrl(avatarUrl) ?? ""} className="w-full h-full object-cover" />
                  : <Users size={32} className="text-white" />}
              </div>
              <p className="text-white font-bold text-lg">{name}</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Name</span>
                <span className="text-white font-medium">{name}</span>
              </div>
              {description && (
                <div className="flex justify-between text-sm gap-4">
                  <span className="text-gray-500 flex-shrink-0">About</span>
                  <span className="text-white font-medium text-right">{description}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Privacy</span>
                <span className="text-white font-medium">{isPublic ? "Public" : "Private"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Members invited</span>
                <span className="text-white font-medium">{selected.size}</span>
              </div>
            </div>

            <div className="bg-purple-900/20 border border-purple-800/40 rounded-2xl p-4">
              <p className="text-purple-300 text-sm">
                You'll be the admin. You can manage members, pin posts, and edit settings anytime.
              </p>
            </div>

            <button
              onClick={finish}
              disabled={creating}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl hover:opacity-90 disabled:opacity-60 transition text-base flex items-center justify-center gap-2">
              {creating ? <><Loader2 size={18} className="animate-spin" /> Creating…</> : "Create Community"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
