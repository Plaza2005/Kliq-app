import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Package, Loader2, Trash2, Eye, Zap, Check, Receipt } from "lucide-react";
import { api, resolveMediaUrl } from "../api/client";

interface Product {
  id: string;
  title: string;
  price: number;
  isDigital: boolean;
  stock: number | null;
  status: string;
  mediaUrl: string | null;
  thumbUrl: string | null;
  createdAt: string;
  _count: { orders: number };
}

interface Sale {
  id: string;
  quantity: number;
  totalPrice: number;
  status: string;
  paymentRef: string | null;
  createdAt: string;
  product: { id: string; title: string; mediaUrl: string | null; thumbUrl: string | null; price: number };
  buyer: { username: string; displayName: string; avatarUrl: string | null; isVerified: boolean };
}

type Tab = "listings" | "sales";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  paid:      "text-blue-400 bg-blue-900/30",
  fulfilled: "text-green-400 bg-green-900/30",
  cancelled: "text-red-400 bg-red-900/30",
  refunded:  "text-amber-400 bg-amber-900/30",
  pending:   "text-gray-400 bg-gray-800",
};

export function MarketplaceSeller() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("listings");
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Product[]>("/marketplace/my-products").catch(() => [] as Product[]),
      api.get<Sale[]>("/marketplace/sales").catch(() => [] as Sale[]),
    ]).then(([p, s]) => { setProducts(p); setSales(s); }).finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (p: Product) => {
    const next = p.status === "active" ? "sold_out" : "active";
    try {
      await api.patch(`/marketplace/products/${p.id}`, { status: next });
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, status: next } : x));
    } catch { /* leave as-is on failure */ }
  };

  const removeProduct = async (id: string) => {
    try {
      await api.delete(`/marketplace/products/${id}`);
      setProducts(prev => prev.filter(x => x.id !== id));
    } catch { /* leave as-is on failure */ }
  };

  const fulfil = async (orderId: string) => {
    try {
      await api.patch(`/marketplace/orders/${orderId}`, { status: "fulfilled" });
      setSales(prev => prev.map(s => s.id === orderId ? { ...s, status: "fulfilled" } : s));
    } catch { /* leave as-is on failure */ }
  };

  const totalEarned = sales.reduce((sum, s) => sum + s.totalPrice, 0);

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full"><ArrowLeft size={20} className="text-white" /></button>
        <h1 className="text-white font-bold">My Shop</h1>
        <button onClick={() => navigate("/studio?create=1&platform=Marketplace")} className="ml-auto bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-xl">+ New Listing</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 pt-4">
        {(["listings", "sales"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition ${tab === t ? "bg-white text-black" : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"}`}>
            {t === "listings" ? `Listings (${products.length})` : `Sales (${sales.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-400" /></div>
      ) : tab === "listings" ? (
        products.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Package size={40} className="text-gray-700" />
            <p className="text-gray-500 font-medium">No listings yet</p>
            <button onClick={() => navigate("/studio?create=1&platform=Marketplace")} className="bg-purple-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl mt-2">Create Listing</button>
          </div>
        ) : (
          <div className="px-4 pt-4 space-y-3">
            {products.map(p => (
              <div key={p.id} className="flex gap-3 bg-gray-950 border border-gray-800 rounded-2xl p-3">
                <div className="w-20 h-20 rounded-xl bg-gray-800 flex-shrink-0 overflow-hidden">
                  {(p.thumbUrl ?? p.mediaUrl)
                    ? <img src={resolveMediaUrl(p.thumbUrl ?? p.mediaUrl ?? "") ?? ""} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-gray-600" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm line-clamp-2">{p.title}</p>
                  <p className="text-yellow-400 text-xs mt-1">🪙 {p.price.toLocaleString()} tokens</p>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="text-gray-600 flex items-center gap-1">
                      {p.isDigital ? <><Zap size={10} /> Digital</> : <><Package size={10} /> {p.stock ?? 0} in stock</>}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full font-semibold ${p.status === "active" ? "text-green-400 bg-green-900/30" : "text-red-400 bg-red-900/30"}`}>
                      {p.status === "active" ? "Active" : "Sold out"}
                    </span>
                    <span className="text-gray-600">{p._count.orders} sold</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button onClick={() => navigate(`/marketplace/product/${p.id}`)} title="View" className="p-2 hover:bg-gray-800 rounded-lg"><Eye size={15} className="text-gray-400" /></button>
                  <button onClick={() => toggleStatus(p)} title={p.status === "active" ? "Mark sold out" : "Mark active"} className="p-2 hover:bg-gray-800 rounded-lg">
                    <Package size={15} className={p.status === "active" ? "text-amber-400" : "text-green-400"} />
                  </button>
                  <button onClick={() => removeProduct(p.id)} title="Remove" className="p-2 hover:bg-red-900/30 rounded-lg"><Trash2 size={15} className="text-red-400" /></button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        sales.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Receipt size={40} className="text-gray-700" />
            <p className="text-gray-500 font-medium">No sales yet</p>
            <p className="text-gray-600 text-sm">When someone buys your items, orders show up here.</p>
          </div>
        ) : (
          <div className="px-4 pt-4">
            <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-800/30 rounded-2xl p-4 mb-4 text-center">
              <p className="text-yellow-400 font-bold text-2xl">🪙 {totalEarned.toLocaleString()}</p>
              <p className="text-gray-500 text-xs mt-1">Total earned from {sales.length} order{sales.length === 1 ? "" : "s"}</p>
            </div>
            <div className="space-y-3">
              {sales.map(s => (
                <div key={s.id} className="flex gap-3 bg-gray-950 border border-gray-800 rounded-2xl p-3">
                  <div className="w-14 h-14 rounded-xl bg-gray-800 flex-shrink-0 overflow-hidden">
                    {(s.product.thumbUrl ?? s.product.mediaUrl)
                      ? <img src={resolveMediaUrl(s.product.thumbUrl ?? s.product.mediaUrl ?? "") ?? ""} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-gray-600" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{s.product.title} ×{s.quantity}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Bought by <button onClick={() => navigate(`/user/${s.buyer.username}`)} className="text-purple-400 hover:text-purple-300">@{s.buyer.username}</button> · {fmtDate(s.createdAt)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-yellow-400 text-xs font-bold">+🪙 {s.totalPrice.toLocaleString()}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${ORDER_STATUS_COLORS[s.status] ?? "text-gray-400 bg-gray-800"}`}>{s.status}</span>
                    </div>
                  </div>
                  {s.status === "paid" && (
                    <button onClick={() => fulfil(s.id)}
                      className="self-center flex items-center gap-1 bg-green-900/30 border border-green-700/50 text-green-400 text-xs font-bold px-3 py-2 rounded-xl hover:bg-green-900/50 transition whitespace-nowrap">
                      <Check size={12} /> Fulfil
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
