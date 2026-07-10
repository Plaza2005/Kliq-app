import { useState, useEffect, useCallback } from "react";
import { Search, Shield, Ban, Trash2, ExternalLink, CheckCircle, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { adminApi, resolveAvatarUrl, resolveMediaUrl } from "../api/client";
import { exportToCsv } from "../utils/csv";

const KLIQ_APP_URL = "http://localhost:5174";

interface ApiUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  tier: string;
  status: string;
  isVerified: boolean;
  isAdmin: boolean;
  followerCount: number;
  postCount: number;
  createdAt: string;
  avatarUrl: string;
}

const TIER_LABEL: Record<string, string>  = { free: "Basic", plus: "Plus", pro: "Pro" };
const TIER_COLOR: Record<string, string>  = {
  free: "text-gray-400 bg-gray-800 border-gray-700",
  plus: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  pro:  "text-purple-400 bg-purple-500/10 border-purple-500/20",
};
const STATUS_COLOR: Record<string, string> = {
  active:    "text-green-400 bg-green-500/10",
  suspended: "text-yellow-400 bg-yellow-500/10",
  banned:    "text-red-400 bg-red-500/10",
};

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export function Users() {
  const navigate = useNavigate();
  const [query, setQuery]           = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [users, setUsers]           = useState<ApiUser[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState<string | null>(null);
  const [exporting, setExporting]   = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ action: string; userId: string; username: string } | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const load = useCallback(async (p: number, status: string, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (status !== "All") params.set("status", status);
      if (q.trim())         params.set("q", q.trim());
      const data = await adminApi.get<{ users: ApiUser[]; total: number; page: number; pages: number }>(
        `/admin/users?${params}`
      );
      setUsers(data.users);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1, filterStatus, query); }, []);

  const search = () => { load(1, filterStatus, query); };
  const changeStatus = (s: string) => { setFilterStatus(s); load(1, s, query); };

  const handleAction = (action: string, user: ApiUser) => {
    setConfirmModal({ action, userId: user.id, username: user.username });
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      // Fetch every page matching the current filter so the export covers
      // the full filtered set, not just the visible page.
      const all: ApiUser[] = [];
      let p = 1;
      let totalPages = 1;
      do {
        const params = new URLSearchParams({ page: String(p) });
        if (filterStatus !== "All") params.set("status", filterStatus);
        if (query.trim())           params.set("q", query.trim());
        const data = await adminApi.get<{ users: ApiUser[]; pages: number }>(`/admin/users?${params}`);
        all.push(...data.users);
        totalPages = data.pages;
        p++;
      } while (p <= totalPages);

      exportToCsv(`kliq-users-${new Date().toISOString().slice(0, 10)}`, [
        { header: "Username",     value: u => u.username },
        { header: "Display Name", value: u => u.displayName },
        { header: "Email",        value: u => u.email },
        { header: "Tier",         value: u => u.tier },
        { header: "Status",       value: u => u.status },
        { header: "Verified",     value: u => u.isVerified ? "yes" : "no" },
        { header: "Admin",        value: u => u.isAdmin ? "yes" : "no" },
        { header: "Posts",        value: u => u.postCount },
        { header: "Followers",    value: u => u.followerCount },
        { header: "Joined",       value: u => new Date(u.createdAt).toISOString() },
      ], all);
      showToast(`Exported ${all.length} users to CSV.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleTierChange = async (userId: string, username: string, tier: string) => {
    try {
      await adminApi.patch(`/admin/users/${userId}`, { action: "tier", tier });
      showToast(`@${username} tier changed to ${tier}.`);
      load(page, filterStatus, query);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Tier change failed");
    }
  };

  const confirmAction = async () => {
    if (!confirmModal) return;
    const { action, userId, username } = confirmModal;
    setConfirmModal(null);
    try {
      if (action === "Delete") {
        await adminApi.delete(`/admin/users/${userId}`);
        showToast(`@${username} deleted.`);
      } else {
        const actionMap: Record<string, string> = {
          Verify:   "verify",
          Suspend:  "suspend",
          Reinstate:"unban",
          Ban:      "ban",
        };
        await adminApi.patch(`/admin/users/${userId}`, { action: actionMap[action] });
        showToast(`@${username} � ${action} applied.`);
      }
      load(page, filterStatus, query);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed");
    }
  };

  return (
    <div className="space-y-5 max-w-7xl">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold text-lg mb-2">{confirmModal.action} User</h3>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to <strong className="text-white">{confirmModal.action.toLowerCase()}</strong>{" "}
              <strong className="text-indigo-400">@{confirmModal.username}</strong>? This action will take effect immediately.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)}
                className="flex-1 border border-gray-700 text-gray-300 hover:bg-gray-800 py-2.5 rounded-xl text-sm font-medium transition">
                Cancel
              </button>
              <button onClick={confirmAction}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-bold transition">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} total users</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={14} className="text-gray-500" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="Search by name, username, email..."
            className="bg-transparent text-gray-300 text-sm placeholder-gray-600 focus:outline-none w-full" />
          {query && <button onClick={() => { setQuery(""); load(1, filterStatus, ""); }}><X size={12} className="text-gray-500" /></button>}
          <button onClick={search} className="text-gray-400 hover:text-white transition text-xs font-medium px-2 py-0.5 bg-gray-800 rounded-md">Go</button>
        </div>
        <div className="flex gap-2">
          {["All", "active", "suspended", "banned"].map(s => (
            <button key={s} onClick={() => changeStatus(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition ${filterStatus === s ? "bg-indigo-600 text-white" : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"}`}>
              {s === "All" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {["User", "Email", "Tier", "Status", "Posts", "Followers", "Joined", "Actions"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 first:pl-5 last:pr-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-800/40 transition">
                  <td className="px-4 py-3 pl-5">
                    <button
                      onClick={() => navigate(`/users/${u.id}/analytics`)}
                      className="flex items-center gap-3 text-left hover:opacity-80 transition group"
                      title="View Analytics"
                    >
                      <img src={resolveAvatarUrl(u.avatarUrl)} alt={u.username}
                        className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-white text-sm font-medium group-hover:text-indigo-400 transition">@{u.username}</p>
                          {u.isVerified && <CheckCircle size={12} className="text-blue-400 fill-blue-400" />}
                          {u.isAdmin && <span className="text-[9px] font-bold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">ADMIN</span>}
                        </div>
                        <p className="text-gray-500 text-xs">{u.displayName}</p>
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{u.email}</td>
                  <td className="px-4 py-3 min-w-[110px]">
                    <div className={`inline-flex flex-col px-2.5 py-1 rounded-lg border ${TIER_COLOR[u.tier] ?? "text-gray-400 bg-gray-800 border-gray-700"}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{u.tier}</span>
                      <span className="text-xs font-semibold leading-tight">{TIER_LABEL[u.tier] ?? u.tier}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLOR[u.status] ?? "text-gray-400 bg-gray-700"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{u.postCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{fmtNum(u.followerCount)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 pr-5">
                    <div className="flex items-center gap-1">
                      <select
                        value={u.tier}
                        title="Change tier"
                        onChange={e => handleTierChange(u.id, u.username, e.target.value)}
                        className="text-[10px] bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-1 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="free">Free</option>
                        <option value="plus">Plus</option>
                        <option value="pro">Pro</option>
                      </select>
                      <a href={`${KLIQ_APP_URL}/user/${u.username}`} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition" title="View Profile">
                        <ExternalLink size={13} />
                      </a>
                      {!u.isVerified && (
                        <button onClick={() => handleAction("Verify", u)}
                          className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition" title="Verify">
                          <Shield size={13} />
                        </button>
                      )}
                      {u.status === "active" && (
                        <button onClick={() => handleAction("Suspend", u)}
                          className="p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition" title="Suspend">
                          <ChevronLeft size={13} />
                        </button>
                      )}
                      {(u.status === "suspended" || u.status === "banned") && (
                        <button onClick={() => handleAction("Reinstate", u)}
                          className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition" title="Reinstate">
                          <CheckCircle size={13} />
                        </button>
                      )}
                      {u.status !== "banned" && !u.isAdmin && (
                        <button onClick={() => handleAction("Ban", u)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition" title="Ban">
                          <Ban size={13} />
                        </button>
                      )}
                      {!u.isAdmin && (
                        <button onClick={() => handleAction("Delete", u)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && users.length === 0 && (
          <div className="py-16 text-center text-gray-600">No users match your filter.</div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-sm">Page {page} of {pages} � {total} users</p>
          <div className="flex gap-2">
            <button onClick={() => load(page - 1, filterStatus, query)} disabled={page <= 1}
              className="p-2 bg-gray-800 border border-gray-700 text-gray-400 hover:text-white disabled:opacity-40 rounded-lg transition">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => load(page + 1, filterStatus, query)} disabled={page >= pages}
              className="p-2 bg-gray-800 border border-gray-700 text-gray-400 hover:text-white disabled:opacity-40 rounded-lg transition">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
