import { useState } from "react";
import { Menu, Search, Camera, Heart, MessageCircle, Users } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { ActionPanel } from "../components/ActionPanel";

const notifications = [
  {
    id: 1,
    type: "like",
    user: "@artlover",
    action: "liked your video",
    time: "2m ago",
  },
  {
    id: 2,
    type: "follow",
    user: "@musicfan",
    action: "started following you",
    time: "1h ago",
  },
  {
    id: 3,
    type: "comment",
    user: "@designer",
    action: 'commented: "This is amazing! 🔥"',
    time: "3h ago",
  },
];

const chats = [
  {
    id: 1,
    username: "@bestfriend",
    message: "Did you see the new update?",
    time: "5m",
    unread: 2,
    streak: 14,
  },
  {
    id: 2,
    username: "@creativeteam",
    message: "Great work on the project!",
    time: "1h",
    unread: 0,
    streak: 7,
  },
  {
    id: 3,
    username: "@mentor",
    message: "Let's catch up tomorrow",
    time: "2h",
    unread: 1,
    streak: 0,
  },
];

export function Inbox() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"notifications" | "chats">("notifications");

  return (
    <div className="min-h-screen bg-black pb-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md z-40 border-b border-gray-800">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <button onClick={() => setIsPanelOpen(true)}>
            <Menu className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl text-white">Inbox</h1>
          <button>
            <Search className="w-6 h-6 text-white" />
          </button>
        </div>
      </header>

      <div className="pt-14">
        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex-1 py-4 flex items-center justify-center gap-2 ${
              activeTab === "notifications"
                ? "text-white border-b-2 border-white"
                : "text-gray-400"
            }`}
          >
            <Heart className="w-5 h-5" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab("chats")}
            className={`flex-1 py-4 flex items-center justify-center gap-2 ${
              activeTab === "chats"
                ? "text-white border-b-2 border-white"
                : "text-gray-400"
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            Chats
          </button>
        </div>

        {/* Content */}
        {activeTab === "notifications" ? (
          <div className="divide-y divide-gray-800">
            {notifications.map((notif) => (
              <div key={notif.id} className="p-4 flex items-center gap-3 hover:bg-gray-900/30 transition">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  {notif.type === "like" && <Heart className="w-6 h-6 text-white" />}
                  {notif.type === "follow" && <Users className="w-6 h-6 text-white" />}
                  {notif.type === "comment" && <MessageCircle className="w-6 h-6 text-white" />}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">
                    <span className="font-medium">{notif.user}</span>{" "}
                    <span className="text-gray-400">{notif.action}</span>
                  </p>
                  <p className="text-gray-500 text-xs mt-1">{notif.time}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {chats.map((chat) => (
              <div key={chat.id} className="p-4 flex items-center gap-3 hover:bg-gray-900/30 transition">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full" />
                  {chat.streak > 0 && (
                    <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                      🔥{chat.streak}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white">{chat.username}</span>
                    <span className="text-gray-500 text-xs">{chat.time}</span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1 truncate">
                    {chat.message}
                  </p>
                </div>
                {chat.unread > 0 && (
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">{chat.unread}</span>
                  </div>
                )}
                <button className="p-2">
                  <Camera className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
      <ActionPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
    </div>
  );
}
