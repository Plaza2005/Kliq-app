import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, Upload, ChevronRight, X, Shield, Star, ShoppingBag, Lock, Store, Check } from "lucide-react";
import { useNavigate } from "react-router";
import { useUser } from "../context/UserContext";
import { api } from "../api/client";

type Category = "All" | "Digital" | "Physical" | "Services";

const CATEGORIES: Category[] = ["All", "Digital", "Physical", "Services"];

const TOP_STORES = [
  { id: "1", name: "Digital Arts", category: "Digital",  img: "https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=200&q=80" },
  { id: "2", name: "Beat Lab",     category: "Digital",  img: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=200&q=80" },
  { id: "3", name: "GamePacks",   category: "Digital",  img: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&q=80" },
  { id: "4", name: "DesignCo",    category: "Services", img: "https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=200&q=80" },
  { id: "5", name: "VidEdit Pro", category: "Services", img: "https://images.unsplash.com/photo-1574717024344-e2a825c2d35a?w=200&q=80" },
];

const COLLECTIONS = [
  { id: "1", name: "Summer Drop 2025",  count: 42, floor: "$5",  img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80" },
  { id: "2", name: "Beat Packs Vol. 1", count: 18, floor: "$12", img: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&q=80" },
  { id: "3", name: "Creator Toolkit",   count: 67, floor: "$3",  img: "https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=400&q=80" },
];

interface MarketPost {
  id: string;
  body: string;
  mediaUrl: string | null;
  likeCount: number;
  author: { username: string; avatarUrl: string; isVerified: boolean; displayName: string };
}

export function Marketplace() {
  const navigate = useNavigate();
  const { tier } = useUser();
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSell, setShowSell] = useState(false);
  const [sellType, setSellType] = useState<"Digital" | "Physical" | "Services">("Digital");
  const [sellListSuccess, setSellListSuccess] = useState(false);
  const [items, setItems] = useState<MarketPost[]>([]);

  useEffect(() => {
    api.get<MarketPost[]>("/posts/marketplace").then(setItems).catch(() => {});
  }, []);

  const filtered = items.filter(item =>
    item.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-full bg-black pb-24">

      {/* ── SELL / LIST ITEM MODAL (all tiers) ── */}
      {showSell && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={() => { setShowSell(false); setSellListSuccess(false); }}>
          <div className="bg-gray-950 border border-gray-800 rounded-t-3xl md:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-gray-950 z-10">
              <h2 className="text-lg font-bold text-white">Sell on Kliq</h2>
              <button onClick={() => { setShowSell(false); setSellListSuccess(false); }} className="p-1.5 hover:bg-gray-800 rounded-full transition">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {sellListSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 px-5 gap-4">
                <div className="w-16 h-16 bg-green-900/30 border border-green-700/50 rounded-full flex items-center justify-center">
                  <Check size={28} className="text-green-400" />
                </div>
                <p className="text-white font-bold text-lg">Listing Created!</p>
                <p className="text-gray-400 text-sm text-center">Your item is now live on the Kliq Marketplace.</p>
                <button onClick={() => { setShowSell(false); setSellListSuccess(false); }} className="mt-2 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition">
                  Done
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Storefront banner — T3 only */}
                {tier >= 3 ? (
                  <button onClick={() => navigate("/customize-shop")}
                    className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-purple-600/15 to-pink-600/15 border border-purple-700/50 rounded-xl hover:border-purple-500 transition text-left">
                    <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Store size={20} className="text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">Open My Storefront</p>
                      <p className="text-purple-300 text-xs">Manage your full store, branding & analytics</p>
                    </div>
                    <ChevronRight size={16} className="text-purple-400" />
                  </button>
                ) : (
                  <button onClick={() => { setShowSell(false); navigate("/settings"); }}
                    className="w-full flex items-center gap-3 p-4 bg-gray-900 border border-gray-800 rounded-xl opacity-70 hover:opacity-90 transition text-left">
                    <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Lock size={18} className="text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-400 font-bold text-sm flex items-center gap-1.5">
                        Storefront <span className="text-[10px] bg-purple-900/50 text-purple-400 px-1.5 py-0.5 rounded-full font-bold">T3 Pro</span>
                      </p>
                      <p className="text-gray-600 text-xs">Full store with branding & analytics</p>
                    </div>
                    <span className="text-purple-400 text-xs font-semibold">Upgrade →</span>
                  </button>
                )}

                <div className="border-t border-gray-800 pt-4">
                  <p className="text-white font-semibold text-sm mb-3">Quick List — Available to all sellers</p>
                  <div>
                    <p className="text-sm font-medium text-gray-300 mb-2">Item type</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Digital", "Physical", "Services"] as const).map((t) => (
                        <button key={t} onClick={() => setSellType(t)}
                          className={`py-2.5 rounded-lg text-sm font-medium border transition ${sellType === t ? "bg-purple-600/20 border-purple-500 text-white" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                  <input type="text" placeholder="What are you selling?" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea rows={3} placeholder="Describe your item..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition resize-none" />
                </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Price</label>
                  <input type="text" placeholder="$0.00" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Currency</label>
                  <select className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-600 transition">
                    <option>USD</option><option>ETH</option><option>Tokens</option>
                  </select>
                </div>
              </div>
              <div className="border border-dashed border-gray-700 rounded-xl p-5 text-center cursor-pointer hover:border-purple-600 transition">
                <Upload size={24} className="text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Upload photos or files</p>
              </div>
              <button onClick={() => setSellListSuccess(true)} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition">
                Create Listing
              </button>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-gray-800 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search items, stores, creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-600 transition"
              />
            </div>
            <button className="p-2.5 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition">
              <SlidersHorizontal size={18} />
            </button>
            <button
              onClick={() => navigate("/studio?create=1&platform=Marketplace")}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:opacity-90 transition flex items-center gap-2 whitespace-nowrap"
            >
              <ShoppingBag size={15} /> Sell
            </button>
          </div>
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${activeCategory === cat ? "bg-white text-black" : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600"}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {/* Top Stores */}
        {activeCategory === "All" && !searchQuery && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Top Stores</h2>
              <button className="text-purple-400 text-sm font-medium flex items-center gap-1 hover:text-purple-300 transition">
                See all <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              {TOP_STORES.map((store) => (
                <button
                  key={store.id}
                  onClick={() => navigate(`/store/${store.id}`)}
                  className="min-w-[120px] flex-shrink-0 cursor-pointer group text-center"
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-900 mb-2 mx-auto border-2 border-transparent group-hover:border-purple-500 transition">
                    <img src={store.img} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <p className="text-white text-xs font-semibold truncate group-hover:text-purple-300 transition">{store.name}</p>
                  <p className="text-gray-600 text-[10px]">{store.category}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Featured Collections */}
        {activeCategory === "All" && !searchQuery && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Featured Collections</h2>
              <button className="text-purple-400 text-sm font-medium flex items-center gap-1 hover:text-purple-300 transition">
                View all <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              {COLLECTIONS.map((col) => (
                <div key={col.id} className="min-w-[200px] bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer group hover:border-gray-600 transition">
                  <div className="h-24 overflow-hidden">
                    <img src={col.img} alt={col.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-3">
                    <p className="text-white font-bold text-sm">{col.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{col.count} items • Floor: {col.floor}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items Grid */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">
            {activeCategory === "All" ? "All Items" : activeCategory} ({filtered.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((item) => (
              <div key={item.id} className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden cursor-pointer group hover:border-gray-600 transition-all">
                <div className="aspect-square relative overflow-hidden bg-gray-900">
                  {item.mediaUrl ? (
                    <img src={item.mediaUrl} alt={item.body} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <ShoppingBag size={32} className="text-gray-600" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-gray-300 text-[10px] px-2 py-0.5 rounded-full">
                      <Star size={9} className="fill-yellow-500 text-yellow-500" /> {item.likeCount}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-white font-semibold text-sm truncate mb-0.5">{item.body || "Untitled listing"}</p>
                  <div className="flex items-center gap-1 mb-2">
                    <button
                      onClick={() => navigate(`/user/${item.author.username}`)}
                      className="text-gray-500 text-xs hover:text-purple-400 transition"
                    >
                      @{item.author.username}
                    </button>
                    {item.author.isVerified && <Shield size={10} className="text-purple-400" />}
                  </div>
                  <div className="flex gap-1.5">
                    <button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold py-1.5 rounded-lg hover:opacity-90 transition">
                      View
                    </button>
                    <button className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs font-medium py-1.5 rounded-lg hover:bg-gray-700 transition">
                      Offer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <ShoppingBag size={36} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 font-semibold text-lg mb-1">No listings yet</p>
              <p className="text-gray-600 text-sm mb-4">Be the first to list an item on the Kliq Marketplace.</p>
              <button
                onClick={() => navigate("/studio?create=1&platform=Marketplace")}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:opacity-90 transition"
              >
                List Something
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
