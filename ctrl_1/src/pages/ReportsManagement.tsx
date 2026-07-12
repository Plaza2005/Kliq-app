import { useState, useEffect } from "react";
import { Flag, ShieldX, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { adminApi, resolveAvatarUrl, resolveMediaUrl } from "../api/client";

type ReportAction = "dismiss" | "remove_post" | "ban_user";
type FilterTab = "all" | "pending" | "actioned";

interface Report {
  id: string; reason: string; createdAt: string; actioned?: boolean;
  post: { id: string; body: string; mediaUrl: string | null; author: { id: string; username: string; displayName: string; avatarUrl: string } };
  reporter: { username: string; displayName: string };
}

function timeAgo(d: string) { const m=Math.floor((Date.now()-new Date(d).getTime())/6e4); return m<60?`${m}m ago`:m<1440?`${Math.floor(m/60)}h ago`:`${Math.floor(m/1440)}d ago`; }

export function ReportsManagement() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>("all");
  const [actioned, setActioned] = useState<Set<string>>(new Set());
  const [confirmBan, setConfirmBan] = useState<Report | null>(null);

  useEffect(() => {
    adminApi.get<Report[]>("/admin/reports").then(setReports).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const act = async (report: Report, action: ReportAction) => {
    await adminApi.patch(`/admin/reports/${report.id}`, { action }).catch(() => {});
    setActioned(prev => new Set([...prev, report.id]));
    setConfirmBan(null);
  };

  const filtered = reports.filter(r => {
    if (tab === "pending") return !actioned.has(r.id);
    if (tab === "actioned") return actioned.has(r.id);
    return true;
  });

  const stats = { total: reports.length, pending: reports.length - actioned.size, actioned: actioned.size };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <h1 className="text-white font-bold text-2xl mb-6 flex items-center gap-2"><Flag size={22} className="text-red-400" /> Reports Management</h1>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Reports", value: stats.total, color: "text-white" },
          { label: "Pending", value: stats.pending, color: "text-amber-400" },
          { label: "Actioned", value: stats.actioned, color: "text-green-400" },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["all","pending","actioned"] as FilterTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition ${tab===t?"bg-cyan-600 text-white":"bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-cyan-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <ShieldX size={40} className="text-gray-700" />
          <p className="text-gray-500">No reports</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => (
            <div key={r.id} className={`bg-gray-900 border rounded-2xl p-5 transition ${actioned.has(r.id) ? "border-gray-800 opacity-50" : "border-gray-700"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                  <span className="text-amber-400 text-sm font-semibold">Reason: {r.reason}</span>
                </div>
                <span className="text-gray-500 text-xs">{timeAgo(r.createdAt)}</span>
              </div>

              <div className="bg-gray-800 rounded-xl p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <img src={resolveAvatarUrl(r.post.author.avatarUrl)} className="w-7 h-7 rounded-full" />
                  <span className="text-white text-sm font-semibold">{r.post.author.displayName}</span>
                  <span className="text-gray-500 text-xs">@{r.post.author.username}</span>
                </div>
                <p className="text-gray-300 text-sm line-clamp-2">{r.post.body || "[media post]"}</p>
              </div>

              <p className="text-gray-500 text-xs mb-4">Reported by @{r.reporter.username}</p>

              {!actioned.has(r.id) && (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => act(r, "dismiss")}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-semibold rounded-lg transition">Dismiss</button>
                  <button onClick={() => act(r, "remove_post")}
                    className="px-3 py-1.5 bg-red-900/50 hover:bg-red-900/80 text-red-300 text-xs font-semibold rounded-lg transition flex items-center gap-1"><Trash2 size={12} />Remove Post</button>
                  <button onClick={() => setConfirmBan(r)}
                    className="px-3 py-1.5 bg-red-800/50 hover:bg-red-800/80 text-red-400 text-xs font-semibold rounded-lg transition">Ban User</button>
                </div>
              )}
              {actioned.has(r.id) && <span className="text-green-500 text-xs font-semibold">? Actioned</span>}
            </div>
          ))}
        </div>
      )}

      {/* Ban confirm modal */}
      {confirmBan && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold mb-2">Ban @{confirmBan.post.author.username}?</h3>
            <p className="text-gray-400 text-sm mb-6">This will prevent them from accessing the platform.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmBan(null)} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={() => act(confirmBan, "ban_user")} className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm">Ban</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
