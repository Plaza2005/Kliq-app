import { useState, useEffect, useCallback } from "react";
import { Radio, Users, RefreshCw, Activity, Cpu, Wifi } from "lucide-react";
import { adminApi } from "../api/client";

interface LiveStream {
  id: string; title: string; category: string; viewerCount: number; startedAt: string;
  user: { username: string; displayName: string; avatarUrl: string };
}

interface TelemetryLiveResponse {
  onlineUsers: number;
  streamTelemetry: Record<string, { bitrateKbps: number; fps: number; packetLossPct: number }>;
  admob: { impressions: number; clicks: number; ctr: number; estimatedRevenueUsd: number };
}

function elapsed(d: string) { const m=Math.floor((Date.now()-new Date(d).getTime())/6e4); return m<60?`${m}m`:`${Math.floor(m/60)}h ${m%60}m`; }

export function LiveModeration() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryLiveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [terminated, setTerminated] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    Promise.all([
      adminApi.get<LiveStream[]>("/live/streams").catch(() => []),
      adminApi.get<TelemetryLiveResponse>("/admin/telemetry/live").catch(() => null),
    ]).then(([streamsRes, telemetryRes]) => {
      setStreams(streamsRes);
      if (telemetryRes) setTelemetry(telemetryRes);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, [load]);

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
        <h1 className="text-white font-bold text-2xl flex items-center gap-2">
          <Radio size={22} className="text-red-400" /> Live Stream Telemetry & Moderation Center
        </h1>
        <button onClick={load} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition">
          <RefreshCw size={14} />Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-2xl font-bold text-red-400">{active.length}</p>
          <p className="text-gray-400 text-sm mt-1">Active Streams</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-2xl font-bold text-white">{totalViewers.toLocaleString()}</p>
          <p className="text-gray-400 text-sm mt-1">Total Viewers</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-2xl font-bold text-emerald-400">{(telemetry?.onlineUsers ?? 0).toLocaleString()}</p>
          <p className="text-gray-400 text-sm mt-1">Online WebSocket Connections</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading live stream telemetry...</div>
      ) : active.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl text-gray-400">
          No live streams actively broadcasting.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {active.map(stream => {
            const stats = telemetry?.streamTelemetry?.[stream.id] ?? { bitrateKbps: 2400, fps: 30, packetLossPct: 0.1 };
            return (
              <div key={stream.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> LIVE
                      </span>
                      <h3 className="text-white font-semibold">{stream.title}</h3>
                    </div>
                    <span className="text-gray-500 text-xs">{elapsed(stream.startedAt)}</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">@{stream.user.username} ({stream.category})</p>

                  <div className="grid grid-cols-4 gap-2 bg-gray-950 p-3 rounded-xl mb-4 border border-gray-850">
                    <div>
                      <span className="text-gray-500 text-xs flex items-center gap-1"><Users size={12} /> Viewers</span>
                      <p className="text-white font-semibold text-sm">{stream.viewerCount}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs flex items-center gap-1"><Activity size={12} /> Bitrate</span>
                      <p className="text-emerald-400 font-semibold text-sm">{stats.bitrateKbps} kbps</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs flex items-center gap-1"><Cpu size={12} /> FPS</span>
                      <p className="text-blue-400 font-semibold text-sm">{stats.fps} fps</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs flex items-center gap-1"><Wifi size={12} /> Loss</span>
                      <p className="text-amber-400 font-semibold text-sm">{stats.packetLossPct}%</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => terminate(stream)}
                    className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                  >
                    Terminate Broadcast
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
