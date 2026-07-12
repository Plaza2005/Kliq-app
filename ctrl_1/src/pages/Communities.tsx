import { useState, useEffect } from "react";
import { Search, Users, Loader2 } from "lucide-react";
import { adminApi, resolveMediaUrl } from "../api/client";

interface Community {
  id: string;
  name: string;
  handle: string;
  description: string;
  owner: string;
  memberCount: number;
  postCount: number;
  createdAt: string;
  status: "Active" | "Suspended" | "Featured";
  featured: boolean;
  avatarUrl: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  Active:    "text-green-400 bg-green-500/10",
  Suspended: "text-red-400 bg-red-500/10",
  Featured:  "text-yellow-400 bg-yellow-500/10",
};

export function Communities() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading]         = useState(true);
  const [query, setQuery]             = useState("");

  useEffect(() => {
    adminApi.get<Community[]>("/admin/communities")
      .then(setCommunities)
      .catch(() => setCommunities([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = communities.filter(
    c =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.handle.toLowerCase().includes(query.toLowerCase()) ||
      c.owner.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Communities</h1>
          <p className="text-gray-400 text-sm mt-0.5">{communities.length} communities on Kliq</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search communities..."
          className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-cyan-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
            <Users size={28} className="text-gray-500" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">
            {query ? "No communities match your search" : "No communities yet"}
          </h3>
          <p className="text-gray-500 text-sm max-w-xs">
            {query
              ? "Try a different search term."
              : "Communities created by users on Kliq will appear here once the community feature is live."}
          </p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-semibold">Community</th>
                <th className="text-left px-4 py-3 font-semibold">Owner</th>
                <th className="text-right px-4 py-3 font-semibold">Members</th>
                <th className="text-right px-4 py-3 font-semibold">Posts</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-800/40 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-700 flex items-center justify-center flex-shrink-0">
                        {c.avatarUrl
                          ? <img src={resolveMediaUrl(c.avatarUrl) ?? ""} alt={c.name} className="w-full h-full rounded-xl object-cover" />
                          : <Users size={16} className="text-gray-400" />
                        }
                      </div>
                      <div>
                        <p className="text-white font-medium">{c.name}</p>
                        <p className="text-gray-500 text-xs">@{c.handle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-300">{c.owner}</td>
                  <td className="px-4 py-4 text-right text-gray-300">{c.memberCount.toLocaleString()}</td>
                  <td className="px-4 py-4 text-right text-gray-300">{c.postCount.toLocaleString()}</td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status] ?? "text-gray-400 bg-gray-700"}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
