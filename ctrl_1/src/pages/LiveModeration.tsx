import { useState, useEffect, useCallback } from "react";
import { Radio, Users, X, Loader2, RefreshCw } from "lucide-react";
import { adminApi, resolveAvatarUrl, resolveMediaUrl } from "../api/client";

interface LiveStream {
  id: string; title: string; category: string; viewerCount: number; startedAt: string;
  user: { username: string; displayName: string; avatarUrl: string };
}

function elapsed(d: string) { const m=Math.floor((Date.now()-new Date(d).getTime())/6e4); return m<60?`${m}m`:`${Math.floor(m/60)}h ${m%60}m`; }

export function LiveModeration() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [terminated, setTerminated] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    adminApi.get<LiveStream[]>("/live/streams").then(setStreams).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  const terminate = async (stream: LiveStream) => {
    if (!confirm(`Terminate ${stream.user.displayName}'s stream?`)) return;
    await adminApi.post(`/admin/live/${stream.id}/terminate`, {}).catch(() => {});
    setTerminated(prev => new Set([...prev, stream.id]));
  };

  const active = streams.filter(s => !terminated.has(s.id));
  const totalViewers = active.reduce((sum, s) => sum + s.viewerCount, 0);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white font-bold text-2xl flex items-center gap-2"><Radio size={22} className="text-red-400" /> Live Streams</h1>
        <button onClick={load} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition"><RefreshCw size={14} />Refresh</button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-2xl font-bold text-red-400">{active.length}</p>
          <p className="text-gray-400 text-sm mt-1">Active Streams</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-2xl font-bold text-white">{totalViewers.toLocaleString()}</p>
          <p className="text-gray-400 text-sm mt-1">Total Viewers</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <Radio size={40} className="text-gray-700" />
          <p className="text-gray-500">No active streams</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map(s => (
            <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <img src={resolveAvatarUrl(s.user.avatarUrl)} className="w-9 h-9 rounded-full" />
                  <div>
                    <p className="text-white font-semibold text-sm">{s.user.displayName}</p>
                    <p className="text-gray-500 text-xs">@{s.user.username}</p>
                  </div>
                </div>
                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />LIVE</span>
              </div>
              <p className="text-gray-200 text-sm font-medium mb-1 line-clamp-1">{s.title}</p>
              <p className="text-gray-500 text-xs mb-3">{s.category} · {elapsed(s.startedAt)} elapsed</p>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-400 text-xs"><Users size={12} />{s.viewerCount.toLocaleString()} watching</span>
                <button onClick={() => terminate(s)} className="flex items-center gap-1 bg-red-900/40 hover:bg-red-900/80 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition"><X size={12} />Terminate</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
