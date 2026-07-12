import { useState, useEffect } from "react";
import { Search, Shield, Ban, CheckCircle, Trash2, Settings, Bell, X, Loader2 } from "lucide-react";
import { adminApi } from "../api/client";

type ActionType = "All" | "Moderation" | "User" | "Content" | "System" | "Notification";

interface LogEntry {
  id: string;
  time: string;
  admin: string;
  action: string;
  target: string;
  type: ActionType;
  ip: string;
  result: "Success" | "Failed";
}

interface ApiLog {
  id: string;
  action: string;
  target: string | null;
  ip: string | null;
  createdAt: string;
  actor: { username: string; displayName: string; avatarUrl: string } | null;
}

function mapAction(action: string): { label: string; type: ActionType } {
  if (action === "admin.ban")           return { label: "Banned user",         type: "User" };
  if (action === "admin.suspend")       return { label: "Suspended user",      type: "User" };
  if (action === "admin.unban")         return { label: "Reinstated user",     type: "User" };
  if (action === "admin.verify")        return { label: "Verified user",       type: "User" };
  if (action === "admin.delete_user")   return { label: "Deleted user",        type: "User" };
  if (action === "admin.tier")          return { label: "Changed user tier",   type: "User" };
  if (action === "admin.remove_content")return { label: "Removed content",     type: "Content" };
  if (action.startsWith("notification"))return { label: action,                type: "Notification" };
  if (action.startsWith("system"))      return { label: action,                type: "System" };
  return { label: action, type: "Moderation" };
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toISOString().replace("T", " ").slice(0, 16);
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  Moderation:   Shield,
  User:         CheckCircle,
  Content:      Ban,
  System:       Settings,
  Notification: Bell,
  All:          Search,
};
const TYPE_COLORS: Record<string, string> = {
  Moderation:   "text-yellow-400 bg-yellow-500/10",
  User:         "text-cyan-400 bg-cyan-500/10",
  Content:      "text-red-400 bg-red-500/10",
  System:       "text-gray-400 bg-gray-700",
  Notification: "text-purple-400 bg-purple-500/10",
};
const FILTER_TYPES: ActionType[] = ["All", "Moderation", "User", "Content", "System", "Notification"];

export function ActivityLog() {
  const [filter, setFilter] = useState<ActionType>("All");
  const [query, setQuery] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get<ApiLog[]>("/admin/activity").then(data => {
      setLog(data.map(l => {
        const { label, type } = mapAction(l.action);
        return {
          id:     l.id,
          time:   formatTime(l.createdAt),
          admin:  l.actor?.displayName ?? "Admin",
          action: label,
          target: l.target ?? "—",
          type,
          ip:     l.ip ?? "—",
          result: "Success" as const,
        };
      }));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = log.filter(e => {
    const matchType = filter === "All" || e.type === filter;
    const matchQ = !query || e.action.toLowerCase().includes(query.toLowerCase()) || e.target.toLowerCase().includes(query.toLowerCase());
    return matchType && matchQ;
  });

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity Log</h1>
          <p className="text-gray-500 text-sm mt-0.5">Complete history of admin actions</p>
        </div>
        <button className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition">
          Export Log
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={13} className="text-gray-500" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search actions or targets..."
            className="bg-transparent text-gray-300 text-sm placeholder-gray-600 focus:outline-none w-full" />
          {query && <button onClick={() => setQuery("")}><X size={11} className="text-gray-500" /></button>}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TYPES.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition ${filter === t ? "bg-cyan-600 text-white" : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 size={24} className="animate-spin text-cyan-400" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {["Time", "Admin", "Action", "Target", "Type", "IP"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 first:pl-5 last:pr-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map(e => {
                const Icon = TYPE_ICONS[e.type] ?? Shield;
                const typeColor = TYPE_COLORS[e.type] ?? "";
                return (
                  <tr key={e.id} className="hover:bg-gray-800/40 transition">
                    <td className="px-4 py-3 pl-5 text-gray-500 text-xs whitespace-nowrap">{e.time}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{e.admin}</td>
                    <td className="px-4 py-3 text-white text-sm">{e.action}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{e.target}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full w-fit ${typeColor}`}>
                        <Icon size={10} /> {e.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 pr-5 text-gray-600 text-xs font-mono">{e.ip}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-gray-600">No log entries match your filter.</div>
        )}
      </div>
      <p className="text-gray-700 text-xs text-center">Showing {filtered.length} of {log.length} entries · Logs retained for 90 days</p>
    </div>
  );
}
