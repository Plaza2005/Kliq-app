import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle, XCircle, ExternalLink, AlertTriangle, Clock, Flag, Inbox } from "lucide-react";
import { adminApi } from "../api/client";

interface ModerationItem {
  id: string;
  title?: string;
  body?: string;
  thumbnailUrl?: string;
  author: string;
  platform: string;
  reportReason?: string;
  submittedAt: string;
  status: string;
}

interface ModerationStats {
  totalPending: number;
  approvedToday: number;
  rejectedToday: number;
}

const PLATFORM_COLOR: Record<string, string> = {
  feed:      "text-blue-400 bg-blue-500/10 border-blue-500/20",
  klixtube:  "text-purple-400 bg-purple-500/10 border-purple-500/20",
  community: "text-green-400 bg-green-500/10 border-green-500/20",
  stream:    "text-pink-400 bg-pink-500/10 border-pink-500/20",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ModerationQueue() {
  const [tab, setTab]             = useState<"pending" | "flagged">("pending");
  const [items, setItems]         = useState<ModerationItem[]>([]);
  const [stats, setStats]         = useState<ModerationStats>({ totalPending: 0, approvedToday: 0, rejectedToday: 0 });
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const loadItems = useCallback(async (status: "pending" | "flagged") => {
    setLoading(true);
    try {
      const data = await adminApi.get<ModerationItem[]>(`/admin/moderation?status=${status}`);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await adminApi.get<ModerationStats>("/admin/moderation/stats");
      setStats(data);
    } catch {
      // keep zeroed defaults
    }
  }, []);

  useEffect(() => {
    loadItems(tab);
    loadStats();
  }, [tab]);

  const handleApprove = async (id: string, label: string) => {
    setActionLoading(id);
    try {
      await adminApi.post(`/admin/moderation/${id}/approve`);
      showToast(`"${label}" approved.`);
      setItems(prev => prev.filter(i => i.id !== id));
      setStats(prev => ({ ...prev, approvedToday: prev.approvedToday + 1, totalPending: Math.max(0, prev.totalPending - 1) }));
    } catch {
      showToast("Approve failed — please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (id: string, title: string) => {
    setRejectReason("");
    setRejectModal({ id, title });
  };

  const confirmReject = async () => {
    if (!rejectModal) return;
    const { id, title } = rejectModal;
    setRejectModal(null);
    setActionLoading(id);
    try {
      await adminApi.post(`/admin/moderation/${id}/reject`, { reason: rejectReason });
      showToast(`"${title}" rejected.`);
      setItems(prev => prev.filter(i => i.id !== id));
      setStats(prev => ({ ...prev, rejectedToday: prev.rejectedToday + 1, totalPending: Math.max(0, prev.totalPending - 1) }));
    } catch {
      showToast("Reject failed — please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const STAT_CARDS = [
    { label: "Total Pending",    value: stats.totalPending,   icon: Clock,         color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
    { label: "Approved Today",   value: stats.approvedToday,  icon: CheckCircle,   color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20"  },
    { label: "Rejected Today",   value: stats.rejectedToday,  icon: XCircle,       color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20"    },
  ];

  return (
    <div className="space-y-5 max-w-7xl">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold text-lg mb-1">Reject Content</h3>
            <p className="text-gray-400 text-sm mb-4">
              Rejecting <strong className="text-white">"{rejectModal.title}"</strong>. Optionally provide a reason.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason (optional)..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 resize-none placeholder-gray-600 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 border border-gray-700 text-gray-300 hover:bg-gray-800 py-2.5 rounded-xl text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-bold transition"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Moderation Queue</h1>
        <p className="text-gray-500 text-sm mt-0.5">Review and action pending or flagged content</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {STAT_CARDS.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-5`}>
              <div className="flex items-center gap-3 mb-2">
                <Icon size={18} className={s.color} />
                <span className="text-gray-400 text-sm">{s.label}</span>
              </div>
              <p className="text-white text-2xl font-bold">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "pending" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
        >
          <span className="flex items-center gap-2">
            <Clock size={14} />
            Pending Review
          </span>
        </button>
        <button
          onClick={() => setTab("flagged")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "flagged" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
        >
          <span className="flex items-center gap-2">
            <Flag size={14} />
            Flagged
          </span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl py-20 flex flex-col items-center gap-3">
          <Inbox size={36} className="text-gray-600" />
          <p className="text-gray-500 font-medium">No items in queue</p>
          <p className="text-gray-600 text-sm">
            {tab === "pending" ? "No content awaiting approval." : "No reported posts at this time."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const label = item.title ?? item.body?.slice(0, 60) ?? item.id;
            const platformColor = PLATFORM_COLOR[item.platform?.toLowerCase()] ?? "text-gray-400 bg-gray-800 border-gray-700";
            return (
              <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex gap-4">
                {/* Thumbnail */}
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-gray-800"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gray-800 flex-shrink-0 flex items-center justify-center">
                    <AlertTriangle size={24} className="text-gray-600" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {item.title && (
                        <p className="text-white font-semibold text-sm truncate">{item.title}</p>
                      )}
                      {item.body && (
                        <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">{item.body}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-gray-500 text-xs">by <span className="text-gray-300">{item.author}</span></span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${platformColor}`}>
                          {item.platform ?? "Unknown"}
                        </span>
                        {tab === "flagged" && item.reportReason && (
                          <span className="text-xs text-red-400 flex items-center gap-1">
                            <Flag size={10} />
                            {item.reportReason}
                          </span>
                        )}
                        <span className="text-gray-600 text-xs">{fmtDate(item.submittedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0 justify-center">
                  <button
                    onClick={() => handleApprove(item.id, label)}
                    disabled={actionLoading === item.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                  >
                    {actionLoading === item.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                    Approve
                  </button>
                  <button
                    onClick={() => openRejectModal(item.id, label)}
                    disabled={actionLoading === item.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 hover:bg-red-600 border border-red-500/30 hover:border-red-600 disabled:opacity-50 text-red-400 hover:text-white text-xs font-semibold rounded-lg transition"
                  >
                    <XCircle size={12} />
                    Reject
                  </button>
                  <a
                    href={`#content/${item.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white text-xs font-semibold rounded-lg transition"
                  >
                    <ExternalLink size={12} />
                    View
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
