import { useState, useEffect } from "react";
import { BadgeCheck, Loader2, CheckCircle, XCircle } from "lucide-react";
import { adminApi, resolveMediaUrl } from "../api/client";

type StatusFilter = "pending" | "approved" | "rejected";

interface BadgeReq {
  id: string; reason: string; status: string; createdAt: string;
  user: { id: string; username: string; displayName: string; avatarUrl: string; isVerified: boolean };
}

function timeAgo(d: string) { const m=Math.floor((Date.now()-new Date(d).getTime())/6e4); return m<60?`${m}m ago`:m<1440?`${Math.floor(m/60)}h ago`:`${Math.floor(m/1440)}d ago`; }

export function BadgeRequests() {
  const [requests, setRequests] = useState<BadgeReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<StatusFilter>("pending");

  useEffect(() => {
    adminApi.get<BadgeReq[]>("/admin/badge-requests").then(data => {
      setRequests(data);
      const s: Record<string, string> = {};
      data.forEach(r => { s[r.id] = r.status; });
      setStatuses(s);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const act = async (id: string, status: "approved" | "rejected") => {
    await adminApi.patch(`/admin/badge-requests/${id}`, { status }).catch(() => {});
    setStatuses(prev => ({ ...prev, [id]: status }));
  };

  const filtered = requests.filter(r => (statuses[r.id] ?? r.status) === tab);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <h1 className="text-white font-bold text-2xl mb-6 flex items-center gap-2"><BadgeCheck size={22} className="text-blue-400" /> Badge Requests</h1>

      <div className="flex gap-2 mb-6">
        {(["pending","approved","rejected"] as StatusFilter[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition ${tab===t?"bg-indigo-600 text-white":"bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
            {t} ({requests.filter(r=>(statuses[r.id]??r.status)===t).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <BadgeCheck size={40} className="text-gray-700" />
          <p className="text-gray-500">No {tab} requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => {
            const status = statuses[r.id] ?? r.status;
            return (
              <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <img src={resolveMediaUrl(r.user.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.user.username}`} className="w-12 h-12 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold">{r.user.displayName}</span>
                      {r.user.isVerified && <span className="text-blue-400 text-sm">✓ Already verified</span>}
                      {status === "approved" && <span className="bg-green-900/50 text-green-400 text-xs px-2 py-0.5 rounded-full font-semibold">Approved</span>}
                      {status === "rejected" && <span className="bg-red-900/50 text-red-400 text-xs px-2 py-0.5 rounded-full font-semibold">Rejected</span>}
                    </div>
                    <p className="text-gray-500 text-sm">@{r.user.username}</p>
                    <p className="text-gray-300 text-sm mt-2 leading-relaxed">"{r.reason}"</p>
                    <p className="text-gray-600 text-xs mt-1">Submitted {timeAgo(r.createdAt)}</p>
                  </div>
                </div>
                {status === "pending" && (
                  <div className="flex gap-3 mt-4 justify-end">
                    <button onClick={() => act(r.id, "rejected")}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-900/30 hover:bg-red-900/60 text-red-400 text-sm font-semibold rounded-xl transition">
                      <XCircle size={15} />Reject
                    </button>
                    <button onClick={() => act(r.id, "approved")}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition">
                      <CheckCircle size={15} />Approve ✓
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
