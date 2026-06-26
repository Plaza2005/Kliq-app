import { useState, useEffect } from "react";
import { X, Search, Link, Copy, Check } from "lucide-react";
import { api, resolveMediaUrl } from "../api/client";

interface Friend {
  username: string;
  avatarUrl: string;
}

const PLATFORMS = [
  { name: "Repost",    emoji: "🔁", color: "bg-purple-700" },
  { name: "WhatsApp",  emoji: "💬", color: "bg-green-600" },
  { name: "Status",    emoji: "⭕", color: "bg-green-700" },
  { name: "Messenger", emoji: "💙", color: "bg-blue-600" },
  { name: "Facebook",  emoji: "📘", color: "bg-blue-800" },
  { name: "Telegram",  emoji: "✈️", color: "bg-sky-500" },
  { name: "SMS",       emoji: "✉️", color: "bg-gray-700" },
  { name: "IG Direct", emoji: "📸", color: "bg-pink-600" },
  { name: "Email",     emoji: "📧", color: "bg-gray-600" },
  { name: "Instagram", emoji: "📷", color: "bg-gradient-to-br from-pink-500 to-orange-400" },
  { name: "IG Stories", emoji: "🔮", color: "bg-gradient-to-br from-purple-500 to-pink-500" },
  { name: "More",      emoji: "⋯", color: "bg-gray-800" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  url?: string;
  onRepost?: () => void;
}

export function ShareSheet({ isOpen, onClose, url, onRepost }: Props) {
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [friends, setFriends] = useState<Friend[]>([]);

  const shareUrl = url || window.location.href;

  // Fetch users when sheet opens
  useEffect(() => {
    if (!isOpen) return;
    api.get<{ users: Friend[] } | Friend[]>("/search/users?q=")
      .then(data => {
        const list = Array.isArray(data) ? data : (data as { users: Friend[] }).users ?? [];
        setFriends(list.slice(0, 20));
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback for browsers that block clipboard
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const sendToFriend = async (username: string) => {
    if (sent.has(username)) return;
    setSent(prev => { const n = new Set(prev); n.add(username); return n; });
    try {
      await api.post("/messages/send", { recipientUsername: username, body: `Check this out: ${shareUrl}` });
    } catch {
      // message queued silently — recipient will see it in chat
    }
  };

  const filteredFriends = friends.filter(f =>
    f.username.toLowerCase().includes(search.toLowerCase())
  );

  const handlePlatform = (name: string) => {
    const encoded = encodeURIComponent(shareUrl);
    switch (name) {
      case "Repost":
        if (onRepost) { onRepost(); } else { onClose(); }
        break;
      case "WhatsApp":
        window.open(`https://wa.me/?text=${encoded}`, "_blank");
        break;
      case "Telegram":
        window.open(`https://t.me/share/url?url=${encoded}`, "_blank");
        break;
      case "SMS":
        window.open(`sms:?body=${encoded}`);
        break;
      case "Email":
        window.open(`mailto:?body=${encoded}&subject=${encodeURIComponent("Check this out on Kliq")}`);
        break;
      case "More":
        if (navigator.share) {
          navigator.share({ url: shareUrl, title: "Check this out on Kliq" }).catch(() => {});
        } else {
          copyLink();
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-gray-950 border-t border-gray-800 rounded-t-3xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mt-3 mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 mb-4">
          <h3 className="text-white font-bold text-base">Share</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-800 rounded-full transition">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Friends search */}
        <div className="px-4 mb-5">
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 mb-4">
            <Search size={15} className="text-gray-500 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search friends..."
              className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
            />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {filteredFriends.map(f => (
              <button key={f.username} onClick={() => sendToFriend(f.username)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className={`relative w-14 h-14 rounded-full overflow-hidden bg-gray-800 border-2 transition ${sent.has(f.username) ? "border-purple-500" : "border-transparent"}`}>
                  <img src={resolveMediaUrl(f.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.username}`} alt={f.username} className="w-full h-full object-cover" />
                  {sent.has(f.username) && (
                    <div className="absolute inset-0 bg-purple-600/60 flex items-center justify-center">
                      <Check size={20} className="text-white" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 truncate max-w-[56px] text-center">{f.username}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Platforms grid */}
        <div className="px-4 mb-5">
          <div className="grid grid-cols-6 gap-3">
            {PLATFORMS.map(p => (
              <button key={p.name} onClick={() => handlePlatform(p.name)} className="flex flex-col items-center gap-1.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${p.color}`}>
                  {p.emoji}
                </div>
                <span className="text-[9px] text-gray-400 truncate w-full text-center">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Copy link */}
        <div className="px-4 pb-8">
          <button
            onClick={copyLink}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition ${copied ? "border-green-500/50 bg-green-900/20" : "border-gray-800 bg-gray-900 hover:bg-gray-800"}`}
          >
            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
              {copied ? <Check size={18} className="text-green-400" /> : <Link size={18} className="text-gray-400" />}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-white text-sm font-medium">{copied ? "Link Copied!" : "Copy Link"}</p>
              <p className="text-gray-600 text-xs truncate">{shareUrl}</p>
            </div>
            {!copied && <Copy size={16} className="text-gray-600 flex-shrink-0" />}
          </button>
        </div>
      </div>
    </div>
  );
}
