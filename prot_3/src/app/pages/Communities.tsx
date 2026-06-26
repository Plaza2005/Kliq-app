import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Search, Users, PlusCircle, Loader2 } from "lucide-react";
import { api, resolveMediaUrl } from "../api/client";

interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  avatarUrl?: string | null;
  isMember?: boolean;
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export function Communities() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  useEffect(() => {
    setLoading(true);
    api.get<Community[]>("/communities")
      .then(data => setCommunities(Array.isArray(data) ? data : []))
      .catch(() => setCommunities([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = communities.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.description.toLowerCase().includes(query.toLowerCase())
  );

  const handleJoin = async (c: Community, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (c.isMember) {
        await api.delete(`/communities/${c.id}/join`);
        setCommunities(prev => prev.map(x => x.id === c.id ? { ...x, isMember: false, memberCount: x.memberCount - 1 } : x));
        showToast(`Left ${c.name}`);
      } else {
        await api.post(`/communities/${c.id}/join`, {});
        setCommunities(prev => prev.map(x => x.id === c.id ? { ...x, isMember: true, memberCount: x.memberCount + 1 } : x));
        showToast(`Joined ${c.name}!`);
        setTimeout(() => navigate(`/community/${c.id}`), 600);
      }
    } catch {
      showToast("Something went wrong");
    }
  };

  return (
    <div className="min-h-full bg-black pb-24">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[90] bg-gray-900 text-white text-sm px-5 py-2.5 rounded-full shadow-xl border border-gray-700 pointer-events-none whitespace-nowrap">
          {toast}
        </div>
      )}

      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-gray-900">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-white">Communities</h1>
            <button
              onClick={() => navigate("/create-community")}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition"
            >
              <PlusCircle size={15} /> Create
            </button>
          </div>
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5">
            <Search size={16} className="text-gray-500 flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search communities..."
              className="bg-transparent text-white text-sm outline-none flex-1 placeholder-gray-600"
            />
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex justify-center pt-16">
            <Loader2 size={28} className="text-purple-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <Users size={36} className="text-gray-700" />
            <p className="text-gray-500 text-sm">
              {communities.length === 0 ? "No communities yet — be the first to create one!" : "No communities match your search."}
            </p>
            {communities.length === 0 && (
              <button
                onClick={() => navigate("/create-community")}
                className="mt-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition"
              >
                Create Community
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => navigate(`/community/${c.id}`)}
                className="w-full text-left flex items-center gap-4 bg-gray-950 border border-gray-800 rounded-2xl p-4 hover:border-purple-800/60 hover:bg-gray-900/50 transition"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                  {c.avatarUrl ? (
                    <img src={resolveMediaUrl(c.avatarUrl) ?? ""} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-700 to-pink-700">
                      <Users size={22} className="text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm mb-0.5 truncate">{c.name}</p>
                  <p className="text-gray-500 text-xs leading-snug line-clamp-2 mb-1.5">{c.description}</p>
                  <div className="flex items-center gap-1 text-gray-600 text-xs">
                    <Users size={11} />
                    <span>{formatCount(c.memberCount)} members</span>
                  </div>
                </div>

                <button
                  onClick={e => handleJoin(c, e)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-bold border transition ${
                    c.isMember
                      ? "border-purple-600 text-purple-400 bg-purple-900/20 hover:bg-purple-900/40"
                      : "border-transparent bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
                  }`}
                >
                  {c.isMember ? "Joined" : "Join"}
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
