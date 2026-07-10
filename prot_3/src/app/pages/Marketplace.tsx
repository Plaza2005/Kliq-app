import { useState, useEffect } from "react";
import { Search, Shield, ShoppingBag, Package, Zap, Store, Receipt } from "lucide-react";
import { useNavigate } from "react-router";
import { api } from "../api/client";
import { MediaImg } from "../components/media/MediaImg";

type Category = "All" | "Digital" | "Physical";

const CATEGORIES: Category[] = ["All", "Digital", "Physical"];

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  isDigital: boolean;
  stock: number | null;
  status: string;
  mediaUrl: string | null;
  thumbUrl: string | null;
  category: string | null;
  seller: { username: string; displayName: string; avatarUrl: string | null; isVerified: boolean };
}

export function Marketplace() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    api.get<Product[]>("/marketplace/products").then(setProducts).catch(() => {});
  }, []);

  const filtered = products.filter(p => {
    if (activeCategory === "Digital" && !p.isDigital) return false;
    if (activeCategory === "Physical" && p.isDigital) return false;
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-full bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-gray-800 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-600 transition"
              />
            </div>
            <button
              onClick={() => navigate("/wallet/orders")}
              className="p-2.5 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition"
              title="My Orders"
            >
              <Receipt size={18} />
            </button>
            <button
              onClick={() => navigate("/marketplace/seller")}
              className="p-2.5 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition"
              title="My Listings & Sales"
            >
              <Store size={18} />
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
        {/* Items Grid */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">
            {activeCategory === "All" ? "All Items" : activeCategory} ({filtered.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((item) => (
              <div key={item.id} onClick={() => navigate(`/marketplace/product/${item.id}`)} className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden cursor-pointer group hover:border-gray-600 transition-all">
                <div className="aspect-square relative overflow-hidden bg-gray-900">
                  {(item.thumbUrl ?? item.mediaUrl) ? (
                    <MediaImg src={item.thumbUrl ?? item.mediaUrl!} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" context={`Marketplace/product:${item.id}`} />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <ShoppingBag size={32} className="text-gray-600" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-gray-300 text-[10px] px-2 py-0.5 rounded-full">
                      {item.isDigital ? <><Zap size={9} className="text-yellow-400" /> Digital</> : <><Package size={9} className="text-blue-400" /> Physical</>}
                    </span>
                  </div>
                  {item.status === "sold_out" && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="bg-red-900/80 text-red-300 text-xs font-bold px-3 py-1 rounded-full">SOLD OUT</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-white font-semibold text-sm truncate mb-0.5">{item.title}</p>
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/user/${item.seller.username}`); }}
                      className="text-gray-500 text-xs hover:text-purple-400 transition flex items-center gap-0.5"
                    >
                      @{item.seller.username}
                      {item.seller.isVerified && <Shield size={10} className="text-purple-400 ml-0.5" />}
                    </button>
                    <span className="text-yellow-400 text-xs font-bold">🪙 {item.price.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/marketplace/product/${item.id}`); }}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold py-1.5 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                  >
                    {item.status === "sold_out" ? "View" : "View & Buy"}
                  </button>
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
