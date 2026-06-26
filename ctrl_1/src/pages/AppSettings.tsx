import { useState, useEffect } from "react";
import { Save, AlertTriangle, CheckCircle, Shield, Zap, ShoppingBag, Video, Radio, Users, Loader2 } from "lucide-react";
import { adminApi } from "../api/client";

interface Flag {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: React.ElementType;
  danger?: boolean;
}

const INITIAL_FLAGS: Flag[] = [
  { id: "maintenance",    label: "Maintenance Mode",          description: "Redirect all users to maintenance page. No logins allowed.",           enabled: false, icon: AlertTriangle, danger: true  },
  { id: "registrations",  label: "New Registrations",         description: "Allow new users to create accounts. Disable to freeze sign-ups.",       enabled: true,  icon: Users          },
  { id: "klixtube",       label: "KliqTube Uploads",          description: "Allow users to upload videos to KliqTube.",                            enabled: true,  icon: Video          },
  { id: "marketplace",    label: "Marketplace Listings",      description: "Allow creators to list and sell products in the Marketplace.",          enabled: true,  icon: ShoppingBag    },
  { id: "live_streaming", label: "Live Streaming",            description: "Allow users to go live. Disabling drops all active streams.",           enabled: true,  icon: Radio, danger: true  },
  { id: "amplify",        label: "Amplify Campaigns",         description: "Allow creators to launch Amplify promotion campaigns.",                 enabled: true,  icon: Zap            },
  { id: "communities",    label: "Community Creation",        description: "Allow users to create new community groups.",                          enabled: true,  icon: Users          },
  { id: "pro_verify",     label: "Pro Tier Auto-Verify",      description: "Automatically grant verified badge to all Tier 3 Pro users.",          enabled: false, icon: CheckCircle    },
  { id: "read_only",      label: "Read-Only Mode",            description: "Disable all writes (posts, comments, etc). Feed remains visible.",     enabled: false, icon: Shield, danger: true },
];

interface RateLimit {
  label: string;
  key: string;
  value: number;
  unit: string;
  min: number;
  max: number;
}

const INITIAL_LIMITS: RateLimit[] = [
  { label: "Max Post Length",      key: "post_len",   value: 2200, unit: "chars",     min: 280,  max: 5000  },
  { label: "Uploads per Day",      key: "uploads",    value: 10,   unit: "videos",    min: 1,    max: 50    },
  { label: "Marketplace Items",    key: "mkt_items",  value: 50,   unit: "per user",  min: 5,    max: 500   },
  { label: "Live Stream Duration", key: "stream_dur", value: 240,  unit: "minutes",   min: 30,   max: 720   },
];

export function AppSettings() {
  const [flags, setFlags] = useState<Flag[]>(INITIAL_FLAGS);
  const [limits, setLimits] = useState<RateLimit[]>(INITIAL_LIMITS);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    adminApi.get<{ flags: Record<string, boolean>; limits: Record<string, number> }>("/admin/settings")
      .then(data => {
        if (data.flags) {
          setFlags(prev => prev.map(f => ({ ...f, enabled: data.flags[f.id] ?? f.enabled })));
        }
        if (data.limits) {
          setLimits(prev => prev.map(l => ({ ...l, value: data.limits[l.key] ?? l.value })));
        }
      })
      .catch(() => { /* use defaults */ });
  }, []);

  const requestToggle = (flag: Flag) => {
    if (flag.danger && flag.enabled === false) {
      setConfirmId(flag.id);
      return;
    }
    toggle(flag.id);
  };

  const toggle = (id: string) => {
    setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
    const flag = flags.find(f => f.id === id);
    if (flag) showToast(`"${flag.label}" ${flag.enabled ? "disabled" : "enabled"}.`);
    setConfirmId(null);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const flagsMap = Object.fromEntries(flags.map(f => [f.id, f.enabled]));
      const limitsMap = Object.fromEntries(limits.map(l => [l.key, l.value]));
      await adminApi.patch("/admin/settings", { flags: flagsMap, limits: limitsMap });
      showToast("Settings saved.");
    } catch {
      showToast("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Danger confirm modal */}
      {confirmId && (() => {
        const flag = flags.find(f => f.id === confirmId);
        if (!flag) return null;
        return (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-red-800/40 rounded-2xl p-6 w-full max-w-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={18} className="text-red-400" />
                <h3 className="text-white font-bold">Dangerous Action</h3>
              </div>
              <p className="text-gray-400 text-sm mb-6">
                Enabling <strong className="text-white">"{flag.label}"</strong> will affect all users immediately.
                Are you sure you want to proceed?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmId(null)}
                  className="flex-1 border border-gray-700 text-gray-300 hover:bg-gray-800 py-2.5 rounded-xl text-sm font-medium transition">
                  Cancel
                </button>
                <button onClick={() => toggle(flag.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-bold transition">
                  Enable Anyway
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">App Settings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Feature flags and platform configuration</p>
        </div>
        <button onClick={saveAll} disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-60">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving..." : "Save All"}
        </button>
      </div>

      {/* Feature flags */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Feature Flags</h2>
          <p className="text-gray-500 text-xs mt-0.5">Toggle platform features globally</p>
        </div>
        <div className="divide-y divide-gray-800">
          {flags.map(flag => {
            const Icon = flag.icon;
            return (
              <div key={flag.id} className={`flex items-center justify-between px-5 py-4 ${flag.danger && flag.enabled ? "bg-red-900/10" : ""}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    flag.danger ? "bg-red-500/10" : "bg-gray-800"
                  }`}>
                    <Icon size={15} className={flag.danger ? "text-red-400" : "text-gray-400"} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium">{flag.label}</p>
                      {flag.danger && <span className="text-red-400 text-[10px] font-bold bg-red-500/10 px-1.5 py-0.5 rounded">DANGER</span>}
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5 truncate">{flag.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => requestToggle(flag)}
                  className={`relative ml-4 flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
                    flag.enabled ? (flag.danger ? "bg-red-500" : "bg-indigo-600") : "bg-gray-700"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    flag.enabled ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform limits */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Platform Limits</h2>
          <p className="text-gray-500 text-xs mt-0.5">Adjust content and usage caps</p>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {limits.map(l => (
            <div key={l.key}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-gray-300 font-medium">{l.label}</label>
                <span className="text-indigo-400 text-sm font-bold">{l.value.toLocaleString()} <span className="text-gray-500 font-normal text-xs">{l.unit}</span></span>
              </div>
              <input
                type="range"
                min={l.min}
                max={l.max}
                value={l.value}
                onChange={e => setLimits(prev => prev.map(x => x.key === l.key ? { ...x, value: Number(e.target.value) } : x))}
                className="w-full h-1.5 rounded-full accent-indigo-500"
              />
              <div className="flex justify-between text-gray-600 text-xs mt-1">
                <span>{l.min}</span><span>{l.max}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin info card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-3">Admin Information</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { label: "App Version",   value: "1.0.0-proto" },
            { label: "Environment",   value: "Development" },
            { label: "API Version",   value: "v1.0" },
            { label: "Build",         value: "20260620" },
          ].map(i => (
            <div key={i.label} className="bg-gray-800 rounded-xl py-3">
              <p className="text-white text-sm font-bold">{i.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{i.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
