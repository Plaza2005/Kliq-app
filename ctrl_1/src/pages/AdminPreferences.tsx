import { useState } from "react";
import { Save, Bell, Monitor, Clock, Globe, Palette, Check } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

type Toggle = { label: string; desc: string; key: string };

const EMAIL_PREFS: Toggle[] = [
  { key: "flag",     label: "Content flagged",          desc: "When new content is flagged for review" },
  { key: "user_ban", label: "User banned / suspended",  desc: "When a moderation action is taken on a user" },
  { key: "revenue",  label: "Revenue milestones",       desc: "When MTD revenue crosses key thresholds" },
  { key: "system",   label: "System alerts",            desc: "Service degradation and outage notifications" },
  { key: "weekly",   label: "Weekly summary report",    desc: "Sunday 08:00 UTC digest of platform stats" },
];

const ALERT_PREFS: Toggle[] = [
  { key: "realtime_flag",  label: "Real-time flag alerts",    desc: "Browser push for high-flag-count content" },
  { key: "signup_spike",   label: "Signup spike alerts",      desc: "Alert when signups exceed 2× daily average" },
  { key: "error_rate",     label: "Error rate threshold",     desc: "Alert when API error rate exceeds 1%" },
  { key: "crash_rate",     label: "Crash rate alerts",        desc: "Alert when any app version crashes > 2%" },
];

const TIMEZONES = ["UTC", "UTC+2 (Namibia)", "UTC+3 (East Africa)", "UTC+1 (West Africa)", "UTC+5:30 (India)"];
const REFRESHES = ["Off", "30 seconds", "1 minute", "5 minutes", "10 minutes"];

export function AdminPreferences() {
  const { mode: themeMode, setMode: setThemeMode, effective: themeEffective } = useTheme();
  const [emailToggles, setEmailToggles] = useState<Record<string, boolean>>({
    flag: true, user_ban: true, revenue: false, system: true, weekly: true,
  });
  const [alertToggles, setAlertToggles] = useState<Record<string, boolean>>({
    realtime_flag: true, signup_spike: true, error_rate: true, crash_rate: false,
  });
  const [timezone, setTimezone] = useState("UTC+2 (Namibia)");
  const [refresh, setRefresh] = useState("1 minute");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const toggleEmail = (key: string) => setEmailToggles(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleAlert = (key: string) => setAlertToggles(prev => ({ ...prev, [key]: !prev[key] }));

  const save = (e: React.FormEvent) => { e.preventDefault(); showToast("Preferences saved."); };

  return (
    <div className="max-w-2xl space-y-6">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">Preferences</h1>
        <p className="text-gray-500 text-sm mt-0.5">Customize your admin dashboard experience</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* Email notifications */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
            <Bell size={16} className="text-cyan-400" />
            <h2 className="text-white font-semibold">Email Notifications</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {EMAIL_PREFS.map(p => (
              <div key={p.key} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-white text-sm font-medium">{p.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{p.desc}</p>
                </div>
                <button type="button" onClick={() => toggleEmail(p.key)}
                  className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${emailToggles[p.key] ? "bg-cyan-600" : "bg-gray-700"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${emailToggles[p.key] ? "translate-x-5" : ""}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time alerts */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
            <Monitor size={16} className="text-cyan-400" />
            <h2 className="text-white font-semibold">Real-Time Alerts</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {ALERT_PREFS.map(p => (
              <div key={p.key} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-white text-sm font-medium">{p.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{p.desc}</p>
                </div>
                <button type="button" onClick={() => toggleAlert(p.key)}
                  className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${alertToggles[p.key] ? "bg-cyan-600" : "bg-gray-700"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${alertToggles[p.key] ? "translate-x-5" : ""}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Display settings */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={16} className="text-cyan-400" />
            <h2 className="text-white font-semibold">Display & Region</h2>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Time Zone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none">
              {TIMEZONES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1.5">
              <Clock size={12} /> Dashboard Auto-Refresh
            </label>
            <div className="flex gap-2 flex-wrap">
              {REFRESHES.map(r => (
                <button key={r} type="button" onClick={() => setRefresh(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${refresh === r ? "bg-cyan-600/20 border-cyan-500 text-white" : "border-gray-700 text-gray-400 hover:text-white"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Appearance / Theme */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
            <Palette size={16} className="text-cyan-400" />
            <h2 className="text-white font-semibold">Appearance</h2>
            {themeMode === "system" && (
              <span className="ml-auto text-xs text-gray-500">System ({themeEffective})</span>
            )}
          </div>
          <div className="p-4 grid grid-cols-3 gap-3">
            {(["dark", "light", "system"] as const).map(opt => {
              const labels = { dark: "Dark", light: "Light", system: "System" };
              const icons = { dark: "🌙", light: "☀️", system: "⚙️" };
              return (
                <button key={opt} type="button" onClick={() => setThemeMode(opt)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${themeMode === opt ? "border-cyan-500 bg-cyan-600/10 text-white" : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"}`}>
                  <span className="text-xl">{icons[opt]}</span>
                  <span className="text-xs font-semibold">{labels[opt]}</span>
                  {themeMode === opt && <Check size={12} className="text-cyan-400" />}
                </button>
              );
            })}
          </div>
        </div>

        <button type="submit"
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition">
          <Save size={14} /> Save Preferences
        </button>
      </form>
    </div>
  );
}
