import { Outlet, NavLink, useNavigate, Navigate } from "react-router";
import {
  Home, Users, PlusSquare, MessageCircle, User,
  Youtube, Tv, Store, BarChart2, Wallet, Megaphone,
  Bell, Settings, Loader2, Plus, Compass, Sun, Moon
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { AUTH_EXPIRED_EVENT, resolveAvatarUrl, resolveMediaUrl, api } from "../api/client";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import kliqLogo from "../../imports/Kliq_logo.jpeg";
import { useUser } from "../context/UserContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ActionPanel } from "./ActionPanel";
import { useNotifications } from "../context/NotificationContext";
import { initMessaging } from "../../firebase";

const SIDEBAR_SECTIONS = [
  {
    label: "Social",
    items: [
      { to: "/", icon: Home, label: "Home" },
      { to: "/friends", icon: Users, label: "Friends" },
      { to: "/explore", icon: Compass, label: "Explore" },
      { to: "/inbox", icon: MessageCircle, label: "Inbox" },
      { to: "/community", icon: Users, label: "Community" },
    ],
  },
  {
    label: "Platforms",
    items: [
      { to: "/klixtube", icon: Youtube, label: "KliqTube" },
      { to: "/kliqstream", icon: Tv, label: "KliqStream" },
      { to: "/marketplace", icon: Store, label: "Marketplace" },
    ],
  },
  {
    label: "Creator",
    items: [
      { to: "/studio", icon: BarChart2, label: "Kliq Studio" },
      { to: "/amplify", icon: Megaphone, label: "Amplify" },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/wallet", icon: Wallet, label: "Wallet" },
      { to: "/profile", icon: User, label: "Profile" },
      { to: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

const MOBILE_NAV = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/explore", icon: Compass, label: "Explore" },
  { to: "/create", icon: PlusSquare, label: "Create", isCreate: true },
  { to: "/inbox", icon: MessageCircle, label: "Inbox" },
  { to: "/profile", icon: User, label: "Profile" },
];

function tierLabel(t: string) {
  if (t === "pro")  return "Pro";
  if (t === "plus") return "Plus";
  return "Basic";
}

function tierNum(t: string): 1 | 2 | 3 {
  if (t === "pro")  return 3;
  if (t === "plus") return 2;
  return 1;
}

export function Layout() {
  const [isActionPanelOpen, setIsActionPanelOpen] = useState(false);
  const [sidebarBalance, setSidebarBalance] = useState<number | null>(null);
  const { setTier } = useUser();
  const { user, loading, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { effective: themeEff, setMode: setThemeMode } = useTheme();
  const navigate = useNavigate();
  const fcmRegistered = useRef(false);

  useEffect(() => {
    if (user) setTier(tierNum(user.tier));
  }, [user, setTier]);

  // Register FCM token once after login
  useEffect(() => {
    if (!user || fcmRegistered.current) return;
    fcmRegistered.current = true;
    initMessaging().then(token => {
      if (token) api.post("/notifications/token", { token }).catch(() => {});
    }).catch(() => {});
  }, [user]);

  const fetchSidebarBalance = useCallback(async () => {
    try {
      const data = await api.get<{ balance: number }>("/wallet/me");
      setSidebarBalance(data.balance ?? null);
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    if (user) fetchSidebarBalance();
  }, [user, fetchSidebarBalance]);

  // Handle session expiry from any API call (401 event)
  useEffect(() => {
    const handler = () => {
      logout();
      navigate("/login", { replace: true });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler);
  }, [navigate, logout]);

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-purple-400" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-black text-white font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-black border-r border-gray-800 overflow-y-auto flex-shrink-0">
        {/* Logo */}
        <div className="p-5 flex items-center gap-3 border-b border-gray-800">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-900 flex-shrink-0">
            <ImageWithFallback src={kliqLogo} alt="Kliq" className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-bold tracking-widest text-white">KLIQ</span>
        </div>

        {/* Desktop Create button */}
        <div className="px-3 pt-4 pb-2">
          <button
            onClick={() => navigate("/studio?create=1")}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold py-2.5 rounded-xl hover:opacity-90 transition shadow-lg shadow-purple-900/30"
          >
            <Plus size={16} /> Create
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-6">
          {SIDEBAR_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                        isActive
                          ? "bg-gradient-to-r from-purple-600/30 to-pink-600/20 text-white border border-purple-800/50"
                          : "text-gray-400 hover:bg-gray-900 hover:text-white"
                      }`
                    }
                  >
                    <item.icon size={18} />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Tier badge + theme toggle */}
        <div className="p-4 border-t border-gray-800 space-y-3">
          <button
            onClick={() => setThemeMode(themeEff === "dark" ? "light" : "dark")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-900 hover:text-white transition text-sm"
          >
            {themeEff === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            <span>{themeEff === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          {sidebarBalance !== null && (
            <button
              onClick={() => navigate("/wallet")}
              className="w-full bg-gray-900 rounded-xl p-3 text-left hover:bg-gray-800 transition"
            >
              <p className="text-gray-500 text-xs mb-1">Balance</p>
              <p className="text-white font-bold text-sm">
                ${sidebarBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </button>
          )}
          <div className="bg-gray-900 rounded-xl p-3">
            <p className="text-gray-500 text-xs mb-1">Current Plan</p>
            <p className="text-white font-bold text-sm mb-2">
              {tierLabel(user.tier)}
            </p>
            {user.tier !== "pro" && (
              <button
                onClick={() => navigate("/settings")}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold py-2 rounded-lg hover:opacity-90 transition"
              >
                Upgrade
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen min-w-0">
        {/* Top Header */}
        <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-gray-800 bg-black/90 backdrop-blur-md z-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-900">
              <ImageWithFallback src={kliqLogo} alt="Kliq" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold tracking-widest">KLIQ</span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* Desktop quick-create button (hidden on mobile — sidebar has it) */}
            <button
              onClick={() => navigate("/studio?create=1")}
              className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition"
            >
              <Plus size={13} /> Create
            </button>

            <button
              className="p-2 text-gray-400 hover:text-white transition-colors relative"
              onClick={() => navigate("/inbox")}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white px-0.5">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsActionPanelOpen(true)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden p-[2px] flex-shrink-0"
              title="Open menu"
            >
              <img
                src={resolveAvatarUrl(user.avatarUrl)}
                alt={user.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-16 md:pb-0">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-50 flex justify-around items-center h-16 px-2">
        {MOBILE_NAV.map((item) =>
          item.isCreate ? (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-900/50">
                <PlusSquare size={22} className="text-white" />
              </div>
            </NavLink>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                  isActive ? "text-white" : "text-gray-600 hover:text-gray-400"
                }`
              }
            >
              {item.to === "/inbox" ? (
                <div className="relative">
                  <item.icon size={24} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-red-500 rounded-full flex items-center justify-center text-[8px] font-black text-white px-0.5">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
              ) : (
                <item.icon size={24} />
              )}
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          )
        )}
      </nav>

      <ActionPanel isOpen={isActionPanelOpen} onClose={() => setIsActionPanelOpen(false)} />
    </div>
  );
}
