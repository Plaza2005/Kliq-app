import { useState, useEffect, useCallback } from "react";
import { ExternalLink, Trash2, ChevronLeft, ChevronRight, Loader2, Heart, MessageCircle, Globe, Youtube, Tv, Store, Eye } from "lucide-react";
import { adminApi, resolveMediaUrl } from "../api/client";

const KLIQ_APP_URL = "http://localhost:5174";

interface ApiContent {
  id: string;
  body: string;
  mediaUrl: string | null;
  mediaType: string | null;
  postType: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Map tab → postType query values
const TAB_TYPES: Record<string, string> = {
  Social:      "social",
  KliqTube:    "tube",
  Stream:      "stream",
  Marketplace: "marketplace",
};

const TAB_ICONS: Record<string, typeof Globe> = {
  Social: Globe, KliqTube: Youtube, Stream: Tv, Marketplace: Store,
};

const TAB_COLORS: Record<string, string> = {
  Social:      "text-blue-400",
  KliqTube:    "text-red-400",
  Stream:      "text-pink-400",
  Marketplace: "text-yellow-400",
};

const POST_TYPE_LABEL: Record<string, string> = {
  post:        "Social",
  reel:        "Reel",
  tube:        "KliqTube",
  stream:      "Stream",
  marketplace: "Marketplace",
};

export function Content() {
  const [activeTab, setActiveTab] = useState("Social");
  const [content, setContent]     = useState<ApiContent[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<ApiContent | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const load = useCallback(async (p: number, tab: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), type: TAB_TYPES[tab] });
      const data = await adminApi.get<{ content: ApiContent[]; total: number; page: number; pages: number }>(
        `/admin/content?${params}`
      );
      setContent(data.content);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1, activeTab); }, []);

  const switchTab = (tab: string) => { setActiveTab(tab); load(1, tab); };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    try {
      await adminApi.delete(`/admin/content/${deleteModal.id}`);
      showToast("Content removed.");
      setDeleteModal(null);
      load(page, activeTab);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete failed");
      setDeleteModal(null);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Delete modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold text-lg mb-1">Remove Content</h3>
            <p className="text-gray-400 text-sm mb-6">
              Remove <strong className="text-white capitalize">{POST_TYPE_LABEL[deleteModal.postType] ?? deleteModal.postType}</strong> post by{" "}
              <strong className="text-indigo-400">@{deleteModal.author.username}</strong>? This soft-deletes and removes it from the feed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)}
                className="flex-1 border border-gray-700 text-gray-300 hover:bg-gray-800 py-2.5 rounded-xl text-sm font-medium transition">
                Cancel
              </button>
              <button onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-bold transition">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Content Management</h1>
        <p className="text-gray-500 text-sm mt-0.5">{total} {activeTab} items</p>
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-1 bg-gray-900/60 border border-gray-800 rounded-xl p-1">
        {["Social", "KliqTube", "Stream", "Marketplace"].map(tab => {
          const Icon = TAB_ICONS[tab];
          const active = activeTab === tab;
          return (
            <button key={tab} onClick={() => switchTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition ${
                active
                  ? "bg-gray-800 text-white shadow"
                  : "text-gray-500 hover:text-gray-300"
              }`}>
              <Icon size={14} className={active ? TAB_COLORS[tab] : ""} />
              <span className="hidden sm:inline">{tab}</span>
            </button>
          );
        })}
      </div>

      {/* Content grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : content.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {(() => { const Icon = TAB_ICONS[activeTab]; return <Icon size={24} className={`${TAB_COLORS[activeTab]} opacity-50`} />; })()}
          </div>
          <p className="text-gray-500 text-sm">No {activeTab} content yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {content.map(item => (
            <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition">
              <div className="relative aspect-video bg-gray-800">
                {item.mediaUrl ? (
                  item.mediaType === "video"
                    ? <video src={item.mediaUrl} className="w-full h-full object-cover opacity-80" preload="metadata" />
                    : <img src={item.mediaUrl} alt="" className="w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {(() => { const Icon = TAB_ICONS[activeTab]; return <Icon size={32} className="text-gray-700" />; })()}
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 ${TAB_COLORS[activeTab]}`}>
                    {POST_TYPE_LABEL[item.postType] ?? item.postType}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-white text-sm line-clamp-2 mb-2 min-h-[40px]">{item.body || "(No caption)"}</p>
                <div className="flex items-center justify-between mb-3">
                  <a href={`${KLIQ_APP_URL}/user/${item.author.username}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 group">
                    <img src={resolveMediaUrl(item.author.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.author.username}`} alt="" className="w-6 h-6 rounded-full bg-gray-700" />
                    <span className="text-indigo-400 text-xs group-hover:underline">@{item.author.username}</span>
                  </a>
                  <span className="text-gray-600 text-xs">{timeAgo(item.createdAt)}</span>
                </div>
                <div className="flex items-center gap-4 mb-3 text-gray-400 text-xs">
                  <span className="flex items-center gap-1"><Heart size={11} /> {item.likeCount.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={11} /> {item.commentCount.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Eye size={11} /> {item.viewCount.toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <a href={`${KLIQ_APP_URL}`} target="_blank" rel="noopener noreferrer"
                    className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition" title="View in app">
                    <ExternalLink size={13} />
                  </a>
                  <button onClick={() => setDeleteModal(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-600/20 hover:bg-red-700 border border-red-800/40 text-red-400 hover:text-white text-xs font-bold py-2 rounded-lg transition">
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-sm">Page {page} of {pages} · {total} items</p>
          <div className="flex gap-2">
            <button onClick={() => load(page - 1, activeTab)} disabled={page <= 1}
              className="p-2 bg-gray-800 border border-gray-700 text-gray-400 hover:text-white disabled:opacity-40 rounded-lg transition">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => load(page + 1, activeTab)} disabled={page >= pages}
              className="p-2 bg-gray-800 border border-gray-700 text-gray-400 hover:text-white disabled:opacity-40 rounded-lg transition">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
