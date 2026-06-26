import { useState } from "react";
import { Menu, ChevronRight, User, Lock, Bell, Palette, Globe, Shield, HelpCircle, FileText, LogOut } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { ActionPanel } from "../components/ActionPanel";
import { useNavigate } from "react-router";

const settingsGroups = [
  {
    title: "Account",
    items: [
      { icon: User, label: "Account Settings", path: "/settings/account" },
      { icon: Lock, label: "Privacy & Security", path: "/settings/privacy" },
      { icon: Bell, label: "Notifications", path: "/settings/notifications" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { icon: Palette, label: "Appearance", path: "/settings/appearance" },
      { icon: Globe, label: "Language & Region", path: "/settings/language" },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: HelpCircle, label: "Help & Support", path: "/settings/help" },
      { icon: FileText, label: "Terms & Privacy Policy", path: "/settings/terms" },
      { icon: Shield, label: "About Kliq", path: "/settings/about" },
    ],
  },
];

export function Settings() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black pb-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md z-40 border-b border-gray-800">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <button onClick={() => setIsPanelOpen(true)}>
            <Menu className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl text-white">Settings & Privacy</h1>
          <div className="w-6" />
        </div>
      </header>

      <div className="pt-14">
        {/* Profile Section */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full" />
            <div className="flex-1">
              <div className="text-white text-lg">@yourusername</div>
              <button
                onClick={() => navigate("/profile")}
                className="text-purple-400 text-sm hover:text-purple-300"
              >
                View Profile
              </button>
            </div>
          </div>
        </div>

        {/* Settings Groups */}
        <div className="space-y-6 py-4">
          {settingsGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-gray-400 text-sm px-4 mb-2">{group.title}</h3>
              <div className="bg-gray-900/30 border-y border-gray-800">
                {group.items.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => navigate(item.path)}
                      className={`w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition ${
                        index < group.items.length - 1 ? "border-b border-gray-800" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-gray-400" />
                        <span className="text-white">{item.label}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sign Out */}
        <div className="p-4">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-2 p-4 bg-red-900/20 border border-red-700 text-red-400 rounded-lg hover:bg-red-900/30 transition"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>

        {/* App Version */}
        <div className="text-center text-gray-500 text-sm pb-4">
          <p>Kliq v1.0.0</p>
          <p className="text-xs mt-1">© 2026 Kliq. All rights reserved.</p>
        </div>
      </div>

      <BottomNav />
      <ActionPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
    </div>
  );
}
