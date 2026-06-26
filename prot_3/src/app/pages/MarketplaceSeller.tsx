import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Package, Loader2, Trash2, Eye } from "lucide-react";
import { api, resolveMediaUrl } from "../api/client";

interface Listing { id: string; body: string; mediaUrl: string | null; thumbUrl: string | null; viewCount: number; likeCount: number; createdAt: string; payPrice: number | null; }

export function MarketplaceSeller() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Listing[]>("/users/me/marketplace").then(setListings).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full"><ArrowLeft size={20} className="text-white" /></button>
        <h1 className="text-white font-bold">My Listings</h1>
        <button onClick={() => navigate("/studio")} className="ml-auto bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-xl">+ New</button>
      </div>
      {loading ? <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-400" /></div>
      : listings.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <Package size={40} className="text-gray-700" />
          <p className="text-gray-500 font-medium">No listings yet</p>
          <button onClick={() => navigate("/studio")} className="bg-purple-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl mt-2">Create Listing</button>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-3">
          {listings.map(l => (
            <div key={l.id} className="flex gap-3 bg-gray-950 border border-gray-800 rounded-2xl p-3">
              <div className="w-20 h-20 rounded-xl bg-gray-800 flex-shrink-0 overflow-hidden">
                {(l.thumbUrl ?? l.mediaUrl) && <img src={resolveMediaUrl(l.thumbUrl ?? l.mediaUrl ?? "") ?? ""} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm line-clamp-2">{l.body || "Listing"}</p>
                {l.payPrice != null && <p className="text-yellow-400 text-xs mt-1">🪙 {l.payPrice} tokens</p>}
                <p className="text-gray-600 text-xs mt-1 flex items-center gap-1"><Eye size={10} /> {l.viewCount} views</p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => navigate(`/post/${l.id}`)} className="p-2 hover:bg-gray-800 rounded-lg"><Eye size={15} className="text-gray-400" /></button>
                <button onClick={async () => { await api.delete(`/posts/${l.id}`); setListings(p => p.filter(x => x.id !== l.id)); }} className="p-2 hover:bg-red-900/30 rounded-lg"><Trash2 size={15} className="text-red-400" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
