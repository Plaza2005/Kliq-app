import { X, Wallet, Activity, Download, Tv, Briefcase, Settings, TrendingUp, Video } from "lucide-react";
import { useNavigate } from "react-router";

interface ActionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActionPanel({ isOpen, onClose }: ActionPanelProps) {
  const navigate = useNavigate();

  const menuItems = [
    { icon: Wallet, label: "Wallet", path: "/wallet", emoji: "💰" },
    { icon: Activity, label: "Activity Centre", path: "/settings", emoji: "📊" },
    { icon: Download, label: "Offline Videos", path: "/stream", emoji: "📥" },
    { icon: Tv, label: "Kliq Stream", path: "/stream", emoji: "🎬" },
    { icon: Briefcase, label: "Kliq Business", path: "/business", emoji: "💼" },
    { icon: Video, label: "Kliq Studio", path: "/studio", emoji: "🎛" },
    { icon: TrendingUp, label: "Amplify", path: "/amplify", emoji: "📣" },
    { icon: Settings, label: "Settings & Privacy", path: "/settings", emoji: "⚙️" },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-80 bg-gradient-to-b from-gray-900 to-black z-50 overflow-y-auto border-l border-gray-800">
        <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4 flex justify-between items-center">
          <h2 className="text-xl text-white">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-gray-800/50 transition text-left group"
              >
                <span className="text-2xl">{item.emoji}</span>
                <span className="text-white group-hover:text-blue-400 transition">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
