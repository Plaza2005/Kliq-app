import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Prefs { likes: boolean; comments: boolean; follows: boolean; tips: boolean; messages: boolean; }

const DEFAULT_PREFS: Prefs = { likes: true, comments: true, follows: true, tips: true, messages: true };

const NOTIF_ITEMS: { key: keyof Prefs; label: string; desc: string; icon: string }[] = [
  { key: "likes",    label: "Likes",          desc: "When someone likes your post",        icon: "❤️" },
  { key: "comments", label: "Comments",        desc: "When someone comments on your post",  icon: "💬" },
  { key: "follows",  label: "New followers",   desc: "When someone follows you",            icon: "👤" },
  { key: "tips",     label: "Tips received",   desc: "When someone sends you a tip",        icon: "🪙" },
  { key: "messages", label: "Messages",        desc: "When you receive a direct message",   icon: "📨" },
];

export function NotificationPrefs() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState<keyof Prefs | null>(null);
  const [saved, setSaved] = useState(false);

  // Load stored prefs from user object
  useEffect(() => {
    if (!user?.notifPrefs) return;
    try {
      const parsed = JSON.parse(user.notifPrefs);
      setPrefs(prev => ({ ...prev, ...parsed }));
    } catch {}
  }, [user?.notifPrefs]);

  const toggle = async (key: keyof Prefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(key);
    try {
      await api.patch("/users/me/notif-prefs", next);
      updateUser({ notifPrefs: JSON.stringify(next) });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setPrefs(prefs); // revert on error
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h1 className="text-white font-bold flex-1">Notifications</h1>
        {saved && <span className="text-green-400 text-sm">Saved ✓</span>}
      </div>
      <div className="divide-y divide-gray-900">
        {NOTIF_ITEMS.map(item => (
          <div key={item.key} className="flex items-center gap-4 px-4 py-4">
            <span className="text-xl w-8 text-center flex-shrink-0">{item.icon}</span>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">{item.label}</p>
              <p className="text-gray-500 text-xs">{item.desc}</p>
            </div>
            <button
              onClick={() => toggle(item.key)}
              disabled={saving === item.key}
              className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 relative disabled:opacity-60 ${prefs[item.key] ? "bg-purple-600" : "bg-gray-700"}`}
            >
              {saving === item.key ? (
                <Loader2 size={12} className="absolute top-1 left-1/2 -translate-x-1/2 animate-spin text-white" />
              ) : (
                <span className={`absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs[item.key] ? "translate-x-5" : "translate-x-0.5"}`} />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
