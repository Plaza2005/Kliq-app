import { useState, useEffect } from "react";
import { MessageSquare, MessagesSquare, Loader2, ExternalLink } from "lucide-react";
import { adminApi } from "../api/client";

const KLIQ_APP_URL = "http://localhost:8080";

interface MsgStats { totalThreads: number; totalMessages: number; activeToday: number }

export function Messages() {
  const [stats, setStats] = useState<MsgStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get<MsgStats>("/admin/messages/stats")
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Messages</h1>
        <p className="text-gray-500 text-sm mt-0.5">Platform DM activity overview</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-cyan-400" /></div>
      ) : stats ? (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Threads",  value: stats.totalThreads.toLocaleString(),  icon: MessagesSquare, color: "text-cyan-400" },
            { label: "Total Messages", value: stats.totalMessages.toLocaleString(), icon: MessageSquare,  color: "text-cyan-400"   },
            { label: "Sent Today",     value: stats.activeToday.toLocaleString(),   icon: MessageSquare,  color: "text-green-400"  },
          ].map(c => (
            <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <c.icon size={16} className={c.color} />
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{c.label}</p>
              </div>
              <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center">
          <MessageSquare size={24} className="text-gray-500" />
        </div>
        <div>
          <h3 className="text-white font-semibold mb-1">Admin Messaging Bridge</h3>
          <p className="text-gray-500 text-sm max-w-sm">
            Direct admin-to-user support conversations are not yet enabled. To reach a user, view their profile on the KLIQ app.
          </p>
        </div>
        <a
          href={KLIQ_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <ExternalLink size={14} /> Open KLIQ App
        </a>
      </div>
    </div>
  );
}
