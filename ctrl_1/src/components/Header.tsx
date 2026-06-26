import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Search, Bell, ChevronDown, ExternalLink, Flag, AlertTriangle, Users, TrendingUp, Shield, X, CheckCircle, Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const KLIQ_APP_URL = "http://localhost:5174";

interface AdminNotif {
  id: number;
  type: "flag" | "alert" | "user" | "growth" | "safety";
  title: string;
  desc: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFS: AdminNotif[] = [];

const NOTIF_ICONS: Record<AdminNotif["type"], React.ElementType> = {
  flag: Flag, alert: AlertTriangle, user: Users, growth: TrendingUp, safety: Shield,
};
const NOTIF_COLORS: Record<AdminNotif["type"], string> = {
  flag: "text-red-400 bg-red-500/10", alert: "text-yellow-400 bg-yellow-500/10",
  user: "text-blue-400 bg-blue-500/10", growth: "text-green-400 bg-green-500/10",
  safety: "text-purple-400 bg-purple-500/10",
};

function getAdminUser() {
  try {
    const raw = localStorage.getItem("kliq_admin_user");
    if (raw) return JSON.parse(raw) as { username: string; email: string };
  } catch { /* ignore */ }
  return null;
}

export function Header() {
  const navigate = useNavigate();
  const { mode: themeMode, setMode: setThemeMode, effective } = useTheme();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState<AdminNotif[]>(INITIAL_NOTIFS);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const adminUser = getAdminUser();

  const unread = notifs.filter(n => !n.read).length;

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const dismissNotif = (id: number) => setNotifs(prev => prev.filter(n => n.id !== id));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 flex-shrink-0 relative z-40">
      {/* Search */}
      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 w-72">
        <Search size={14} className="text-gray-500" />
        <input
          type="text"
          placeholder="Search users, content, communities..."
          className="bg-transparent text-gray-300 text-sm placeholder-gray-600 focus:outline-none w-full"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* View App */}
        <a
          href={KLIQ_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-lg shadow-pink-500/20"
        >
          <ExternalLink size={12} /> View KLIQ App
        </a>

        {/* Theme toggle */}
        <button
          onClick={() => setThemeMode(effective === "dark" ? "light" : "dark")}
          title={`Switch to ${effective === "dark" ? "light" : "dark"} mode`}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition relative"
        >
          {effective === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          {themeMode === "system" && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-indigo-500 rounded-full border border-gray-900" title="System mode active" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifs(v => !v); setShowProfile(false); }}
            className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[9px] font-black flex items-center justify-center px-0.5">
                {unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <div>
                  <p className="text-white font-bold text-sm">Admin Notifications</p>
                  <p className="text-gray-500 text-xs">{unread} unread</p>
                </div>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-indigo-400 text-xs font-semibold hover:text-indigo-300 transition flex items-center gap-1">
                      <CheckCircle size={11} /> Mark all read
                    </button>
                  )}
                  <button onClick={() => setShowNotifs(false)} className="text-gray-500 hover:text-white p-1">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Notification list */}
              <div className="max-h-96 overflow-y-auto divide-y divide-gray-800">
                {notifs.map(n => {
                  const Icon = NOTIF_ICONS[n.type];
                  const colorStyle = NOTIF_COLORS[n.type];
                  return (
                    <div key={n.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-800/50 transition group ${!n.read ? "bg-indigo-500/5" : ""}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${colorStyle}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold ${n.read ? "text-gray-300" : "text-white"}`}>{n.title}</p>
                          <button
                            onClick={() => dismissNotif(n.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-gray-400 transition flex-shrink-0 mt-0.5"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{n.desc}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-gray-600 text-xs">{n.time}</span>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {notifs.length === 0 && (
                <div className="py-10 text-center text-gray-600 text-sm">All caught up!</div>
              )}

              <div className="px-4 py-2.5 border-t border-gray-800">
                <button className="text-indigo-400 text-xs font-semibold hover:text-indigo-300 transition">
                  View notification history →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setShowProfile(v => !v); setShowNotifs(false); }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">{(adminUser?.username?.[0] ?? "A").toUpperCase()}</span>
            </div>
            <span className="text-gray-300 text-sm font-medium">{adminUser?.username ?? "Admin"}</span>
            <ChevronDown size={14} className={`text-gray-500 transition-transform ${showProfile ? "rotate-180" : ""}`} />
          </button>
          {showProfile && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 py-1">
              <div className="px-4 py-2 border-b border-gray-700 mb-1">
                <p className="text-white text-xs font-semibold">{adminUser?.username ?? "Admin"}</p>
                <p className="text-gray-500 text-xs">{adminUser?.email ?? "admin@kliq.app"}</p>
              </div>
              {[
                { label: "Profile",      path: "/profile"       },
                { label: "Preferences",  path: "/preferences"   },
                { label: "Activity Log", path: "/activity-log"  },
                { label: "Sign Out",     path: "/login"         },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => { setShowProfile(false); navigate(item.path); }}
                  className={`w-full text-left px-4 py-2 text-sm transition ${item.label === "Sign Out" ? "text-red-400 hover:bg-red-900/20 hover:text-red-300" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
