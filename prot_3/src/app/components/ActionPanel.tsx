import { X, Wallet, BarChart2, Download, Tv, Briefcase, Settings, TrendingUp, Video, Youtube, ChevronRight, Users, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { resolveAvatarUrl, resolveMediaUrl } from "../api/client";

interface ActionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActionPanel({ isOpen, onClose }: ActionPanelProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: User,      label: "My Profile",        path: "/profile",     accent: "text-purple-400", bg: "bg-purple-900/30" },
    { icon: Wallet,    label: "Wallet",            path: "/wallet",      accent: "text-green-400",  bg: "bg-green-900/30" },
    { icon: BarChart2, label: "Analytics",          path: "/analytics",   accent: "text-blue-400",   bg: "bg-blue-900/30"  },
    { icon: Download,  label: "Offline Videos",     path: "/studio",      accent: "text-purple-400", bg: "bg-purple-900/30" },
    { icon: Tv,        label: "Kliq Stream",        path: "/kliqstream",  accent: "text-pink-400",   bg: "bg-pink-900/30"  },
    { icon: Youtube,   label: "KliqTube",           path: "/klixtube",    accent: "text-red-400",    bg: "bg-red-900/30"   },
    { icon: Briefcase, label: "Kliq Business",      path: "/marketplace", accent: "text-yellow-400", bg: "bg-yellow-900/30" },
    { icon: Video,     label: "Kliq Studio",        path: "/studio",      accent: "text-cyan-400",   bg: "bg-cyan-900/30"  },
    { icon: TrendingUp,label: "Amplify",            path: "/amplify",     accent: "text-orange-400", bg: "bg-orange-900/30" },
    { icon: Users,     label: "Community",          path: "/community",   accent: "text-purple-400", bg: "bg-purple-900/30" },
    { icon: Settings,  label: "Settings & Privacy", path: "/settings",    accent: "text-gray-400",   bg: "bg-gray-800"     },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
    navigate("/login");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-80 bg-gradient-to-b from-gray-950 to-black z-50 border-l border-gray-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden p-[2px]">
              <img
                src={resolveAvatarUrl(user?.avatarUrl)}
                alt={user?.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{user?.displayName ?? "—"}</p>
              <p className="text-gray-500 text-xs">@{user?.username ?? "—"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleNavigate(item.path)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-900 transition group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.bg}`}>
                    <Icon className={`w-5 h-5 ${item.accent}`} />
                  </div>
                  <span className="text-white text-sm font-medium group-hover:text-purple-300 transition">
                    {item.label}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-400 transition" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <button
            onClick={() => handleNavigate("/settings")}
            className="w-full text-gray-500 hover:text-white text-sm py-2 transition"
          >
            Switch Account
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-400 text-sm py-2 transition font-medium"
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
