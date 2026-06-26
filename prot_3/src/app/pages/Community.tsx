import { useState, useEffect } from "react";
import { Users, PlusCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
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

export function Community() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"feed" | "discover">("feed");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Community[]>("/communities")
      .then(data => setCommunities(Array.isArray(data) ? data : []))
      .catch(() => setCommunities([]))
      .finally(() => setLoading(false));
  }, []);

  const myCommunities = communities.filter(c => c.isMember);
  const allCommunities = communities;

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-gray-900">
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Community</h1>
            <button
              onClick={() => navigate("/create-community")}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition"
            >
              <PlusCircle size={15} /> Create
            </button>
          </div>
          <div className="flex border-b border-gray-900">
            {(["feed", "discover"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-semibold capitalize border-b-2 transition-colors ${activeTab === tab ? "border-white text-white" : "border-transparent text-gray-600 hover:text-gray-400"}`}>
                {tab === "feed" ? "My Communities" : "Discover"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center pt-20"><Loader2 size={28} className="animate-spin text-purple-400" /></div>
      ) : activeTab === "feed" ? (
        myCommunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center">
              <Users size={28} className="text-gray-600" />
            </div>
            <h3 className="text-white font-semibold text-lg">No communities yet</h3>
            <p className="text-gray-500 text-sm max-w-xs">Join a community to see it here, or create your own.</p>
            <button onClick={() => setActiveTab("discover")}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:opacity-90 transition">
              Browse Communities
            </button>
          </div>
        ) : (
          <div className="px-4 pt-4 space-y-3">
            {myCommunities.map(c => (
              <button key={c.id} onClick={() => navigate(`/community/${c.id}`)}
                className="w-full text-left flex items-center gap-4 bg-gray-950 border border-gray-800 rounded-2xl p-4 hover:border-purple-800/60 transition">
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
                  <p className="text-white font-bold text-sm truncate">{c.name}</p>
                  <p className="text-gray-500 text-xs line-clamp-1 mt-0.5">{c.description}</p>
                  <p className="text-gray-600 text-xs mt-1 flex items-center gap-1"><Users size={10} />{formatCount(c.memberCount)} members</p>
                </div>
                <span className="text-gray-600 text-lg">›</span>
              </button>
            ))}
          </div>
        )
      ) : (
        // Discover tab — show all communities
        allCommunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center">
              <Users size={28} className="text-gray-600" />
            </div>
            <h3 className="text-white font-semibold text-lg">No communities yet</h3>
            <p className="text-gray-500 text-sm max-w-xs">Be the first to create one!</p>
            <button onClick={() => navigate("/create-community")}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:opacity-90 transition">
              Create Community
            </button>
          </div>
        ) : (
          <div className="px-4 pt-4 space-y-3">
            {allCommunities.map(c => (
              <button key={c.id} onClick={() => navigate(`/community/${c.id}`)}
                className="w-full text-left flex items-center gap-4 bg-gray-950 border border-gray-800 rounded-2xl p-4 hover:border-purple-800/60 transition">
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
                  <p className="text-white font-bold text-sm truncate">{c.name}</p>
                  <p className="text-gray-500 text-xs line-clamp-1 mt-0.5">{c.description}</p>
                  <p className="text-gray-600 text-xs mt-1 flex items-center gap-1"><Users size={10} />{formatCount(c.memberCount)} members</p>
                </div>
                <span className={`flex-shrink-0 px-3 py-1 rounded-xl text-xs font-bold ${c.isMember ? "text-purple-400 bg-purple-900/20" : "bg-gradient-to-r from-purple-600 to-pink-600 text-white"}`}>
                  {c.isMember ? "Joined" : "Join"}
                </span>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}
