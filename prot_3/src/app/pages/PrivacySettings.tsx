import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Privacy { whoCanMessage: string; whoCanSeeFollowers: string; }

const DEFAULTS: Privacy = { whoCanMessage: "everyone", whoCanSeeFollowers: "everyone" };

export function PrivacySettings() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [privacy, setPrivacy] = useState<Privacy>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load stored prefs from the user object (already fetched by AuthContext on mount)
  useEffect(() => {
    if (!user?.privacySettings) return;
    try {
      const parsed = JSON.parse(user.privacySettings);
      setPrivacy(prev => ({ ...prev, ...parsed }));
    } catch {}
  }, [user?.privacySettings]);

  const save = async (update: Partial<Privacy>) => {
    const next = { ...privacy, ...update };
    setPrivacy(next);
    setLoading(true);
    try {
      await api.patch("/users/me/privacy", next);
      updateUser({ privacySettings: JSON.stringify(next) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {} finally { setLoading(false); }
  };

  const ToggleRow = ({ label, desc, field, options }: {
    label: string; desc: string; field: keyof Privacy;
    options: { value: string; label: string }[];
  }) => (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4">
      <p className="text-white font-medium text-sm mb-0.5">{label}</p>
      <p className="text-gray-500 text-xs mb-3">{desc}</p>
      <div className="flex gap-2">
        {options.map(o => (
          <button key={o.value} onClick={() => save({ [field]: o.value })}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition ${
              privacy[field] === o.value
                ? "bg-purple-600 border-purple-600 text-white"
                : "border-gray-700 text-gray-400 hover:border-gray-600"
            }`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h1 className="text-white font-bold flex-1">Privacy</h1>
        {loading && <Loader2 size={16} className="animate-spin text-purple-400" />}
        {saved && <span className="text-green-400 text-sm">Saved ✓</span>}
      </div>
      <div className="p-4 space-y-3">
        <ToggleRow
          label="Who can message you"
          desc="Control who can send you direct messages"
          field="whoCanMessage"
          options={[
            { value: "everyone", label: "Everyone" },
            { value: "following", label: "Following" },
            { value: "none", label: "No one" },
          ]}
        />
        <ToggleRow
          label="Who can see your followers"
          desc="Show or hide your followers list"
          field="whoCanSeeFollowers"
          options={[
            { value: "everyone", label: "Everyone" },
            { value: "following", label: "Following" },
            { value: "only_me", label: "Only me" },
          ]}
        />

        <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
          {[
            { label: "Blocked Accounts", path: "/blocked-users", icon: "🚫" },
            { label: "Muted Accounts", path: "/muted-users", icon: "🔇" },
          ].map(item => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-900 transition border-b border-gray-900 last:border-0 text-left">
              <span className="text-lg">{item.icon}</span>
              <span className="text-white text-sm font-medium flex-1">{item.label}</span>
              <span className="text-gray-600">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
