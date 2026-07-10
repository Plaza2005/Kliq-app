import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Server, Database, Radio, HardDrive,
  CheckCircle, XCircle, Loader2, RefreshCw, Cpu,
} from "lucide-react";
import { adminApi } from "../api/client";

interface StatusResponse {
  timestamp: string;
  api: {
    ok: boolean;
    uptimeS: number;
    nodeVersion: string;
    pid: number;
    memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number };
  };
  database: { ok: boolean; latencyMs: number | null; error: string | null };
  websocket: { ok: boolean; connections: number };
  storage: { ok: boolean; mode: string; error: string | null };
  counts: { users: number; posts: number } | null;
}

const REFRESH_MS = 15_000;

function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function StatusDot({ ok }: { ok: boolean }) {
  return <div className={`w-2.5 h-2.5 rounded-full ${ok ? "bg-green-400" : "bg-red-400"}`} />;
}

function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return ok ? (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
      <CheckCircle size={12} /> {label ?? "Operational"}
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full">
      <XCircle size={12} /> {label ?? "Down"}
    </span>
  );
}

export function SystemStatus() {
  const navigate = useNavigate();
  const [status, setStatus]         = useState<StatusResponse | null>(null);
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [apiReachable, setApiReachable] = useState(true);
  const [loading, setLoading]       = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const load = useCallback(async () => {
    // Round-trip latency from this browser to the API (public /health endpoint)
    const t0 = Date.now();
    try {
      await adminApi.get<{ status: string }>("/health");
      setApiLatency(Date.now() - t0);
      setApiReachable(true);
    } catch {
      setApiLatency(null);
      setApiReachable(false);
    }

    try {
      const data = await adminApi.get<StatusResponse>("/admin/status");
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLastChecked(new Date());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  const allOk = apiReachable && !!status && status.api.ok && status.database.ok && status.websocket.ok && status.storage.ok;

  const SERVICES = status ? [
    {
      name: "API Server",
      icon: Server,
      ok: apiReachable && status.api.ok,
      detail: apiReachable && status.api.ok ? `Up for ${fmtUptime(status.api.uptimeS)}` : "Not responding",
      metrics: [
        { label: "Round-trip latency", value: apiLatency !== null ? `${apiLatency} ms` : "—" },
        { label: "Uptime",             value: fmtUptime(status.api.uptimeS) },
        { label: "Node version",       value: status.api.nodeVersion },
        { label: "Process ID",         value: String(status.api.pid) },
      ],
    },
    {
      name: "Database (Supabase Postgres)",
      icon: Database,
      ok: status.database.ok,
      detail: status.database.ok
        ? `Connected · ${status.database.latencyMs} ms query latency`
        : status.database.error ?? "Unreachable",
      metrics: [
        { label: "Query latency", value: status.database.latencyMs !== null ? `${status.database.latencyMs} ms` : "—" },
        { label: "Users",         value: status.counts ? status.counts.users.toLocaleString() : "—" },
        { label: "Posts",         value: status.counts ? status.counts.posts.toLocaleString() : "—" },
      ],
    },
    {
      name: "WebSocket Hub",
      icon: Radio,
      ok: status.websocket.ok,
      detail: `${status.websocket.connections} active connection${status.websocket.connections === 1 ? "" : "s"}`,
      metrics: [
        { label: "Active connections", value: String(status.websocket.connections) },
      ],
    },
    {
      name: "Media Storage",
      icon: HardDrive,
      ok: status.storage.ok,
      detail: status.storage.ok
        ? `Writable · mode: ${status.storage.mode}`
        : status.storage.error ?? "Not writable",
      metrics: [
        { label: "Mode",     value: status.storage.mode },
        { label: "Writable", value: status.storage.ok ? "yes" : "no" },
      ],
    },
  ] : [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")}
            className="p-2 bg-gray-800 border border-gray-700 text-gray-400 hover:text-white rounded-lg transition">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">System Status</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Live service health · auto-refreshes every {REFRESH_MS / 1000}s
              {lastChecked && <> · last checked {lastChecked.toLocaleTimeString()}</>}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setLoading(true); load(); }}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading && !status ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
        </div>
      ) : !status && !apiReachable ? (
        /* API entirely unreachable */
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
          <XCircle size={40} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-white font-bold text-xl mb-1">API Unreachable</h2>
          <p className="text-gray-400 text-sm">
            The KLIQ API server is not responding. Check that the backend is running on port 4000.
          </p>
        </div>
      ) : (
        <>
          {/* Overall banner */}
          <div className={`rounded-2xl p-5 border flex items-center gap-4 ${
            allOk ? "bg-green-500/10 border-green-500/30" : "bg-yellow-500/10 border-yellow-500/30"
          }`}>
            {allOk
              ? <CheckCircle size={28} className="text-green-400 flex-shrink-0" />
              : <XCircle size={28} className="text-yellow-400 flex-shrink-0" />}
            <div>
              <h2 className="text-white font-bold text-lg">
                {allOk ? "All Systems Operational" : "Degraded — one or more services need attention"}
              </h2>
              {status && (
                <p className="text-gray-500 text-xs mt-0.5">
                  Server report generated {new Date(status.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Service cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SERVICES.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.name} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">
                        <Icon size={16} className={s.ok ? "text-indigo-400" : "text-red-400"} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusDot ok={s.ok} />
                          <h3 className="text-white font-semibold text-sm">{s.name}</h3>
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5">{s.detail}</p>
                      </div>
                    </div>
                    <StatusBadge ok={s.ok} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {s.metrics.map(m => (
                      <div key={m.label} className="bg-gray-800 rounded-xl px-3 py-2.5">
                        <p className="text-white text-sm font-semibold">{m.value}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Process resources */}
          {status && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Cpu size={16} className="text-indigo-400" />
                <h3 className="text-white font-semibold">API Process Resources</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-800 rounded-xl px-4 py-3">
                  <p className="text-white text-lg font-bold">{status.api.memory.rssMb} MB</p>
                  <p className="text-gray-500 text-xs mt-0.5">Resident memory (RSS)</p>
                </div>
                <div className="bg-gray-800 rounded-xl px-4 py-3">
                  <p className="text-white text-lg font-bold">{status.api.memory.heapUsedMb} MB</p>
                  <p className="text-gray-500 text-xs mt-0.5">Heap used</p>
                </div>
                <div className="bg-gray-800 rounded-xl px-4 py-3">
                  <p className="text-white text-lg font-bold">{status.api.memory.heapTotalMb} MB</p>
                  <p className="text-gray-500 text-xs mt-0.5">Heap total</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
