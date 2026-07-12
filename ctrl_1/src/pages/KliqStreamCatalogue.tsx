import { useState, useEffect, useCallback } from "react";
import { Film, Loader2, Star, Trash2, CheckCircle, XCircle } from "lucide-react";
import { adminApi, resolveAvatarUrl, resolveMediaUrl } from "../api/client";

interface KliqTitle {
  id: string;
  type: "movie" | "series";
  title: string;
  synopsis: string | null;
  genre: string;
  ageRating: string;
  posterUrl: string | null;
  status: string;
  isFeatured: boolean;
  minTier: string;
  createdAt: string;
  author: { id: string; username: string; displayName: string; avatarUrl: string };
}

interface KliqStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

type Filter = "all" | "pending" | "approved" | "rejected";

const TIER_LABELS: Record<string, string> = { free: "Free", plus: "Plus", pro: "Pro" };
const TIER_COLORS: Record<string, string> = {
  free: "bg-gray-700 text-gray-300",
  plus: "bg-cyan-500/20 text-cyan-300",
  pro:  "bg-purple-500/20 text-purple-300",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function KliqStreamCatalogue() {
  const [stats, setStats]           = useState<KliqStats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [titles, setTitles]         = useState<KliqTitle[]>([]);
  const [filter, setFilter]         = useState<Filter>("all");
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<KliqTitle | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<KliqTitle | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const loadStats = useCallback(async () => {
    try {
      const data = await adminApi.get<KliqStats>("/admin/kliqstream/stats");
      setStats(data);
    } catch {
      // On 404 or error, keep zeroes
    }
  }, []);

  const loadTitles = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "all"
        ? "/admin/kliqstream/titles"
        : `/admin/kliqstream/titles?status=${filter}`;
      const data = await adminApi.get<KliqTitle[]>(url);
      setTitles(data);
    } catch {
      setTitles([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadStats();
    loadTitles();
  }, [loadStats, loadTitles]);

  const handleApprove = async (t: KliqTitle) => {
    try {
      await adminApi.patch(`/admin/kliqstream/titles/${t.id}`, { status: "approved" });
      showToast(`"${t.title}" approved`);
      loadStats();
      loadTitles();
    } catch {
      showToast("Failed to approve title");
    }
  };

  const handleToggleFeatured = async (t: KliqTitle) => {
    try {
      await adminApi.patch(`/admin/kliqstream/titles/${t.id}`, { isFeatured: !t.isFeatured });
      showToast(t.isFeatured ? `"${t.title}" unfeatured` : `"${t.title}" featured`);
      loadTitles();
    } catch {
      showToast("Failed to update featured status");
    }
  };

  const handleTierChange = async (t: KliqTitle, minTier: string) => {
    try {
      await adminApi.patch(`/admin/kliqstream/titles/${t.id}`, { minTier });
      showToast(`Tier updated to ${TIER_LABELS[minTier] ?? minTier}`);
      loadTitles();
    } catch {
      showToast("Failed to update tier");
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    try {
      await adminApi.patch(`/admin/kliqstream/titles/${rejectTarget.id}`, {
        status: "rejected",
        ...(rejectReason.trim() ? { rejectionReason: rejectReason.trim() } : {}),
      });
      showToast(`"${rejectTarget.title}" rejected`);
      setRejectTarget(null);
      setRejectReason("");
      loadStats();
      loadTitles();
    } catch {
      showToast("Failed to reject title");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi.delete(`/admin/kliqstream/titles/${deleteTarget.id}`);
      showToast(`"${deleteTarget.title}" deleted`);
      setDeleteTarget(null);
      loadStats();
      loadTitles();
    } catch {
      showToast("Failed to delete title");
    }
  };

  const STAT_CARDS = [
    { label: "Total Titles",   value: stats.total,    color: "text-white",        bg: "bg-gray-800",         border: "border-gray-700"       },
    { label: "Pending Review", value: stats.pending,  color: "text-amber-400",    bg: "bg-amber-500/10",      border: "border-amber-500/20"    },
    { label: "Live",           value: stats.approved, color: "text-green-400",    bg: "bg-green-500/10",      border: "border-green-500/20"    },
    { label: "Rejected",       value: stats.rejected, color: "text-red-400",      bg: "bg-red-500/10",        border: "border-red-500/20"      },
  ];

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all",      label: "All"      },
    { key: "pending",  label: "Pending"  },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => { setRejectTarget(null); setRejectReason(""); }}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-800">
              <h3 className="text-white font-bold text-lg">Reject "{rejectTarget.title}"?</h3>
              <p className="text-gray-500 text-xs mt-1">Optionally provide a reason for the creator.</p>
            </div>
            <div className="p-5 space-y-4">
              <textarea
                className="w-full bg-gray-800 border border-gray-700 text-gray-300 rounded-xl px-4 py-3 text-sm placeholder:text-gray-600 focus:outline-none focus:border-cyan-500 resize-none"
                placeholder="Reason (optional)"
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-800">
              <h3 className="text-white font-bold text-lg">Delete "{deleteTarget.title}"?</h3>
              <p className="text-red-400 text-sm mt-1">This cannot be undone.</p>
            </div>
            <div className="p-5 flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition flex items-center gap-2"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">KliqStream Catalogue</h1>
        <p className="text-gray-500 text-sm mt-0.5">Review and manage creator-submitted movies and series</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-5`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-cyan-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-cyan-400" />
        </div>
      ) : titles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Film size={48} className="text-gray-700 mb-4" />
          <p className="text-gray-400 font-medium">No titles submitted yet</p>
          <p className="text-gray-600 text-sm mt-1">Creators upload content through Kliq Studio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {titles.map(t => {
            const statusColor =
              t.status === "approved" ? "bg-green-500/20 text-green-300 border-green-500/30" :
              t.status === "rejected" ? "bg-red-500/20 text-red-300 border-red-500/30" :
              "bg-amber-500/20 text-amber-300 border-amber-500/30";

            return (
              <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
                {/* Poster */}
                <div className="relative w-full h-40 bg-gray-800 flex-shrink-0">
                  {t.posterUrl ? (
                    <img
                      src={t.posterUrl}
                      alt={t.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film size={36} className="text-gray-700" />
                    </div>
                  )}
                  {t.isFeatured && (
                    <div className="absolute top-2 left-2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star size={10} fill="black" />
                      FEATURED
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  {/* Type + genre + age rating */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium bg-gray-800 text-gray-300 px-2 py-0.5 rounded-md border border-gray-700">
                      {t.type === "movie" ? "?? Movie" : "?? Series"}
                    </span>
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md border border-gray-700">
                      {t.genre}
                    </span>
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md border border-gray-700">
                      {t.ageRating}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="text-white font-bold text-base leading-snug">{t.title}</p>

                  {/* Author */}
                  <div className="flex items-center gap-2">
                    <img
                      src={resolveAvatarUrl(t.author.avatarUrl)}
                      alt={t.author.username}
                      className="w-6 h-6 rounded-full object-cover bg-gray-700"
                    />
                    <span className="text-gray-400 text-xs">@{t.author.username}</span>
                    <span className="text-gray-600 text-xs ml-auto">{timeAgo(t.createdAt)}</span>
                  </div>

                  {/* Status + tier badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusColor}`}>
                      {t.status}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${TIER_COLORS[t.minTier] ?? TIER_COLORS.free}`}>
                      {TIER_LABELS[t.minTier] ?? t.minTier}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
                    {/* Approve */}
                    {t.status !== "approved" && (
                      <button
                        onClick={() => handleApprove(t)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition"
                      >
                        <CheckCircle size={12} />
                        Approve
                      </button>
                    )}

                    {/* Feature toggle */}
                    <button
                      onClick={() => handleToggleFeatured(t)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                        t.isFeatured
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                          : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700"
                      }`}
                    >
                      <Star size={12} fill={t.isFeatured ? "currentColor" : "none"} />
                      {t.isFeatured ? "Unfeature" : "Feature"}
                    </button>

                    {/* Tier dropdown */}
                    <select
                      value={t.minTier}
                      onChange={e => handleTierChange(t, e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="free">Free</option>
                      <option value="plus">Plus</option>
                      <option value="pro">Pro</option>
                    </select>

                    {/* Reject */}
                    {t.status !== "rejected" && (
                      <button
                        onClick={() => setRejectTarget(t)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 text-xs font-medium transition"
                      >
                        <XCircle size={12} />
                        Reject
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition ml-auto"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
