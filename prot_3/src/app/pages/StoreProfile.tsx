import { useParams, useNavigate } from "react-router";
import { ArrowLeft, MessageCircle, Star, Shield, ExternalLink } from "lucide-react";
import { useSocial } from "../context/SocialContext";

const STORES: Record<string, {
  name: string; desc: string; category: string; followers: string;
  banner: string; avatar: string; owner: string; ownerHandle: string;
  products: { id: number; title: string; price: string; img: string; rating: number }[];
}> = {
  "1": {
    name: "Digital Art Drop", desc: "Premium digital art and NFTs from independent creators around the globe.", category: "Digital Art",
    followers: "4.2K", banner: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=artbykai", owner: "Kai Artworks", ownerHandle: "artbykai",
    products: [
      { id: 1, title: "Abstract NFT #047", price: "0.25 ETH", img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop", rating: 4.9 },
      { id: 2, title: "Neon Dreams #12", price: "0.18 ETH", img: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?q=80&w=400&auto=format&fit=crop", rating: 4.7 },
      { id: 3, title: "Digital Portrait Series", price: "0.08 ETH", img: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=400&auto=format&fit=crop", rating: 4.8 },
      { id: 4, title: "Abstract Collection V2", price: "0.32 ETH", img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=400&auto=format&fit=crop", rating: 5.0 },
    ],
  },
  "2": {
    name: "Creator Tools", desc: "Professional tools and software for content creators, editors, and digital artists.", category: "Software & Tools",
    followers: "1.8K", banner: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?q=80&w=1200&auto=format&fit=crop",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=toolsmith", owner: "ToolSmith Studio", ownerHandle: "toolsmith_studio",
    products: [
      { id: 1, title: "Premiere Pro Preset Pack", price: "$29", img: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=400&auto=format&fit=crop", rating: 4.6 },
      { id: 2, title: "Color Grading LUTs Bundle", price: "$19", img: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=400&auto=format&fit=crop", rating: 4.8 },
    ],
  },
};

export function StoreProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFollowing, toggleFollow } = useSocial();

  const store = STORES[id || "1"] || STORES["1"];
  const followKey = `store:${id}`;
  const following = isFollowing(followKey);

  return (
    <div className="min-h-full bg-black pb-24">
      {/* Back */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur-md border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full transition">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <span className="text-white font-bold">{store.name}</span>
      </div>

      {/* Banner */}
      <div className="h-48 md:h-64 relative">
        <img src={store.banner} alt={store.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      {/* Store info */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-12 relative">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
          <div className="w-24 h-24 rounded-2xl bg-gray-800 border-4 border-black overflow-hidden z-10">
            <img src={store.avatar} alt={store.name} className="w-full h-full" />
          </div>
          <div className="flex-1 z-10">
            <h1 className="text-2xl font-bold text-white">{store.name}</h1>
            <p className="text-gray-400 text-sm">{store.category} • {store.followers} followers</p>
          </div>
          <div className="flex gap-3 z-10">
            <button
              onClick={() => toggleFollow(followKey)}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition ${following
                ? "bg-gray-800 border border-gray-700 text-white hover:bg-gray-700"
                : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"}`}
            >
              {following ? "Following" : "Follow Store"}
            </button>
            <button
              onClick={() => navigate(`/chat/store_${id}`)}
              className="flex items-center gap-2 bg-gray-900 border border-gray-700 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition"
            >
              <MessageCircle size={16} /> Chat
            </button>
          </div>
        </div>

        <p className="text-gray-300 text-sm mb-8">{store.desc}</p>

        {/* Products */}
        <h2 className="text-white font-bold text-lg mb-4">Products</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
          {store.products.map(p => (
            <div key={p.id} className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden cursor-pointer group hover:border-gray-600 transition">
              <div className="aspect-square overflow-hidden bg-gray-900">
                <img src={p.img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-3">
                <p className="text-white font-semibold text-sm truncate mb-1">{p.title}</p>
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold text-sm">{p.price}</span>
                  <div className="flex items-center gap-1 text-xs text-yellow-400">
                    <Star size={11} className="fill-yellow-400" />
                    {p.rating}
                  </div>
                </div>
                <button className="w-full mt-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold py-2 rounded-lg hover:opacity-90 transition">
                  Buy Now
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Owner profile link */}
        <div className="border-t border-gray-800 pt-6">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Store Owner</p>
          <button
            onClick={() => navigate(`/user/${store.ownerHandle}`)}
            className="flex items-center gap-3 p-4 bg-gray-900 border border-gray-800 rounded-2xl w-full hover:border-gray-600 transition text-left group"
          >
            <img src={store.avatar} alt={store.owner} className="w-11 h-11 rounded-full bg-gray-800" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">{store.owner}</p>
              <p className="text-gray-500 text-xs">@{store.ownerHandle}</p>
            </div>
            <div className="flex items-center gap-1 text-gray-500 group-hover:text-purple-400 transition text-xs">
              <Shield size={14} />
              <span>Verified</span>
              <ExternalLink size={13} className="ml-1" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
