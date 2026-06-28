import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ShieldX, Loader2 } from "lucide-react";
import { api, resolveAvatarUrl, resolveMediaUrl } from "../api/client";

interface BlockedUser { id: string; username: string; displayName: string; avatarUrl: string; blockedAt: string; }

export function BlockedUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    api.get<BlockedUser[]>("/users/me/blocked").then(setUsers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const unblock = async (username: string) => {
    setUnblocking(username);
    try {
      await api.delete(`/blocks/${username}`);
      setUsers(prev => prev.filter(u => u.username !== username));
    } catch {} finally { setUnblocking(null); }
  };

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full"><ArrowLeft size={20} className="text-white" /></button>
        <h1 className="text-white font-bold">Blocked Accounts</h1>
      </div>
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-400" /></div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <ShieldX size={40} className="text-gray-700" />
          <p className="text-gray-500">No blocked accounts</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-900">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3">
              <img src={resolveAvatarUrl(u.avatarUrl)} className="w-11 h-11 rounded-full object-cover bg-gray-800 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">{u.displayName}</p>
                <p className="text-gray-500 text-xs">@{u.username}</p>
              </div>
              <button onClick={() => unblock(u.username)} disabled={unblocking === u.username}
                className="text-purple-400 border border-purple-500/40 text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-purple-500/10 transition disabled:opacity-50">
                {unblocking === u.username ? "…" : "Unblock"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
