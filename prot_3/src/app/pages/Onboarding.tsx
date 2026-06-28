import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Check, ChevronRight, Sparkles, AtSign, Camera, Loader2 } from "lucide-react";
import { useSocial } from "../context/SocialContext";
import { api } from "../api/client";

const INTERESTS = [
  { id: "music",    label: "Music",   emoji: "🎵" },
  { id: "travel",   label: "Travel",  emoji: "✈️" },
  { id: "gaming",   label: "Gaming",  emoji: "🎮" },
  { id: "art",      label: "Art",     emoji: "🎨" },
  { id: "fitness",  label: "Fitness", emoji: "💪" },
  { id: "food",     label: "Food",    emoji: "🍜" },
  { id: "tech",     label: "Tech",    emoji: "💻" },
  { id: "fashion",  label: "Fashion", emoji: "👗" },
  { id: "sports",   label: "Sports",  emoji: "⚽" },
  { id: "movies",   label: "Movies",  emoji: "🎬" },
  { id: "comedy",   label: "Comedy",  emoji: "😂" },
  { id: "nature",   label: "Nature",  emoji: "🌿" },
];

const SUGGESTIONS = [
  { user: "alex_creates",  name: "Alex Creates",   bio: "Studio setups & gear",   followers: "124K", img: "/avatar-default.svg"    },
  { user: "mia_arts",      name: "Mia Arts",       bio: "Digital art & painting",  followers: "89K",  img: "/avatar-default.svg"     },
  { user: "dj_kryptonite", name: "DJ Kryptonite",  bio: "Producer & beatmaker",    followers: "212K", img: "/avatar-default.svg"      },
  { user: "sarah_vlogs",   name: "Sarah Vlogs",    bio: "Travel & lifestyle",      followers: "78K",  img: "/avatar-default.svg"   },
  { user: "fitness_pro",   name: "Fitness Pro",    bio: "Daily workouts & tips",   followers: "340K", img: "/avatar-default.svg" },
  { user: "travel_kai",    name: "Travel Kai",     bio: "World explorer 🌍",       followers: "55K",  img: "/avatar-default.svg"  },
];

const AVATAR_SEEDS = ["default", "creator", "artist", "gamer", "traveler", "foodie", "techie", "fitness"];

type Step = "interests" | "suggestions" | "profile" | "done";

function StepDots({ step }: { step: Step }) {
  const steps: Step[] = ["interests", "suggestions", "profile", "done"];
  const idx = steps.indexOf(step);
  return (
    <div className="flex gap-1.5">
      {steps.map((_, i) => (
        <div key={i} className={`h-1 w-8 rounded-full transition-all ${i <= idx ? "bg-white" : "bg-white/25"}`} />
      ))}
    </div>
  );
}

export function Onboarding() {
  const navigate = useNavigate();
  const { toggleFollow, isFollowing } = useSocial();
  const [step, setStep] = useState<Step>("interests");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("default");
  const [avatarObjectUrl, setAvatarObjectUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleInterest = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleUsernameChange = (v: string) => {
    const clean = v.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
    setUsername(clean);
    if (clean.length > 0 && clean.length < 3) {
      setUsernameError("At least 3 characters");
    } else {
      setUsernameError("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarObjectUrl(url);
    setSelectedAvatar("__custom__");
  };

  const submitProfile = async () => {
    if (username.length < 3) { setUsernameError("Username must be at least 3 characters."); return; }
    setUsernameError("");
    setSubmitting(true);
    try {
      const avatarUrl = avatarObjectUrl ?? "/avatar-default.svg";
      await api.patch("/auth/me", { username, displayName: displayName || undefined, avatarUrl });
      setStep("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("409") || msg.toLowerCase().includes("taken") || msg.toLowerCase().includes("username")) {
        setUsernameError("Username already taken");
      } else {
        setUsernameError(msg || "Something went wrong, please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const finish = () => {
    api.post("/users/me/onboarding", { interests: [] }).catch(() => {});
    localStorage.setItem("kliq_onboarded", "1");
    navigate("/", { replace: true });
  };

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-purple-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-900/60">
          <Sparkles size={44} className="text-white" />
        </div>
        <h1 className="text-4xl font-black text-white mb-2">You're all set!</h1>
        {username && (
          <p className="text-purple-400 font-semibold mb-1">Welcome, @{username}</p>
        )}
        <p className="text-gray-400 text-base mb-10 max-w-xs leading-relaxed">
          Your feed is personalised and ready. Time to explore Kliq.
        </p>
        <button
          onClick={finish}
          className="w-full max-w-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-2xl text-lg hover:opacity-90 transition shadow-lg shadow-purple-900/50"
        >
          Start Exploring
        </button>
      </div>
    );
  }

  if (step === "profile") {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="px-6 pt-12 pb-4">
          <StepDots step={step} />
          <h2 className="text-3xl font-black text-white mt-4 mb-1">Set up your profile</h2>
          <p className="text-gray-500 text-sm">Choose a username and pick your avatar</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6">
          {/* Avatar picker */}
          <div>
            <p className="text-white font-semibold text-sm mb-3">Pick an avatar</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {AVATAR_SEEDS.map(seed => (
                <button
                  key={seed}
                  onClick={() => { setSelectedAvatar(seed); setAvatarObjectUrl(null); }}
                  className={`flex-shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 transition-all ${
                    selectedAvatar === seed ? "border-purple-500 scale-110 shadow-lg shadow-purple-900/40" : "border-gray-800 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={"/avatar-default.svg"}
                    alt={seed}
                    className="w-full h-full bg-gray-900"
                  />
                </button>
              ))}
              {/* Custom upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`flex-shrink-0 w-16 h-16 rounded-full bg-gray-900 border-2 border-dashed hover:border-purple-600 transition flex items-center justify-center overflow-hidden ${
                  selectedAvatar === "__custom__" ? "border-purple-500 scale-110 shadow-lg shadow-purple-900/40" : "border-gray-700"
                }`}
              >
                {avatarObjectUrl ? (
                  <img src={avatarObjectUrl} alt="custom" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={20} className="text-gray-500" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value.slice(0, 30))}
              placeholder="Your name (optional)"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Username *</label>
            <div className="relative">
              <AtSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={username}
                onChange={e => handleUsernameChange(e.target.value)}
                placeholder="your_handle"
                className={`w-full bg-gray-900 border rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none transition ${
                  usernameError ? "border-red-600 focus:border-red-500" : "border-gray-800 focus:border-purple-600"
                }`}
              />
            </div>
            {usernameError ? (
              <p className="text-red-400 text-xs mt-1">{usernameError}</p>
            ) : username.length >= 3 ? (
              <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                <Check size={11} /> @{username} is available
              </p>
            ) : (
              <p className="text-gray-600 text-xs mt-1">Letters, numbers, underscores · 3–20 chars</p>
            )}
          </div>

          {/* Preview */}
          {(username.length >= 3 || displayName) && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4">
              <img
                src={avatarObjectUrl ?? "/avatar-default.svg"}
                alt="preview"
                className="w-14 h-14 rounded-full bg-gray-800 object-cover"
              />
              <div>
                <p className="text-white font-semibold">{displayName || "Your Name"}</p>
                <p className="text-gray-500 text-sm">@{username || "your_handle"}</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-8 pt-4 border-t border-gray-900 space-y-3">
          <button
            onClick={submitProfile}
            disabled={submitting || username.length < 3}
            className={`w-full font-bold py-4 rounded-2xl text-base transition flex items-center justify-center gap-2 ${
              username.length >= 3 && !submitting
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
                : "bg-gray-900 text-gray-600 cursor-not-allowed"
            }`}
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>Continue <ChevronRight size={18} /></>
            )}
          </button>
          <button onClick={() => setStep("done")}
            className="w-full text-gray-600 text-sm py-2 hover:text-gray-400 transition">
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  if (step === "suggestions") {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="px-6 pt-12 pb-4">
          <StepDots step={step} />
          <h2 className="text-3xl font-black text-white mt-4 mb-1">Suggested for you</h2>
          <p className="text-gray-500 text-sm">Follow some creators to get started</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="space-y-3">
            {SUGGESTIONS.map((s) => (
              <div key={s.user} className="flex items-center gap-4 p-3 bg-gray-950 border border-gray-900 rounded-2xl">
                <img src={s.img} alt={s.name} className="w-14 h-14 rounded-full bg-gray-800 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{s.name}</p>
                  <p className="text-gray-500 text-xs">{s.bio}</p>
                  <p className="text-gray-600 text-xs">{s.followers} followers</p>
                </div>
                <button
                  onClick={() => toggleFollow(s.user)}
                  className={`px-4 py-2 rounded-full text-xs font-bold flex-shrink-0 transition ${
                    isFollowing(s.user)
                      ? "bg-gray-800 border border-gray-700 text-gray-300"
                      : "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  }`}
                >
                  {isFollowing(s.user) ? "Following" : "Follow"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 pb-8 pt-4 border-t border-gray-900 space-y-3">
          <button
            onClick={() => setStep("profile")}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-2xl text-base hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            Continue <ChevronRight size={18} />
          </button>
          <button
            onClick={() => setStep("profile")}
            className="w-full text-gray-600 text-sm py-2 hover:text-gray-400 transition"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="px-6 pt-12 pb-4">
        <StepDots step={step} />
        <h2 className="text-3xl font-black text-white mt-4 mb-1">What are you into?</h2>
        <p className="text-gray-500 text-sm">Pick your interests to personalise your feed</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <div className="grid grid-cols-3 gap-3">
          {INTERESTS.map((item) => {
            const active = selected.has(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleInterest(item.id)}
                className={`relative flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border-2 font-semibold text-sm transition-all ${
                  active
                    ? "border-purple-500 bg-purple-600/20 text-white shadow-lg shadow-purple-900/30 scale-[1.03]"
                    : "border-gray-800 bg-gray-950 text-gray-400 hover:border-gray-700"
                }`}
              >
                {active && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </div>
                )}
                <span className="text-2xl">{item.emoji}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-6 pb-8 pt-4 border-t border-gray-900 space-y-3">
        <button
          onClick={() => selected.size > 0 && setStep("suggestions")}
          className={`w-full font-bold py-4 rounded-2xl text-base transition flex items-center justify-center gap-2 ${
            selected.size > 0
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
              : "bg-gray-900 text-gray-600 cursor-not-allowed"
          }`}
        >
          Continue ({selected.size} selected) <ChevronRight size={18} />
        </button>
        <button
          onClick={() => setStep("suggestions")}
          className="w-full text-gray-600 text-sm py-2 hover:text-gray-400 transition"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
