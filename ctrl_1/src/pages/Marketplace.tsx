import { useState, useEffect } from "react";
import { Search, ShoppingBag, Loader2, Trash2, Package } from "lucide-react";
import { adminApi, resolveMediaUrl } from "../api/client";

interface Seller {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

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
  seller: Seller;
  _count: { orders: number };
}

interface Order {
  id: string;
  quantity: number;
  totalPrice: number;
  status: string;
  paymentRef: string | null;
  createdAt: string;
  product: { id: string; title: string; seller: Seller };
  buyer: Seller;
}

type Tab = "products" | "orders";

const PRODUCT_STATUS_COLORS: Record<string, string> = {
  active:   "text-green-400 bg-green-500/10",
  sold_out: "text-amber-400 bg-amber-500/10",
  removed:  "text-red-400 bg-red-500/10",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  paid:      "text-cyan-400 bg-cyan-500/10",
  fulfilled: "text-green-400 bg-green-500/10",
  cancelled: "text-red-400 bg-red-500/10",
  refunded:  "text-amber-400 bg-amber-500/10",
  pending:   "text-gray-400 bg-gray-700",
};

export function Marketplace() {
  const [tab, setTab]           = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState("");

  useEffect(() => {
    Promise.all([
      adminApi.get<Product[]>("/marketplace/admin/products").catch(() => [] as Product[]),
      adminApi.get<Order[]>("/marketplace/admin/orders").catch(() => [] as Order[]),
    ])
      .then(([p, o]) => { setProducts(p); setOrders(o); })
      .finally(() => setLoading(false));
  }, []);

  const removeListing = async (id: string) => {
    try {
      await adminApi.delete(`/marketplace/products/${id}`);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, status: "removed" } : p));
    } catch { /* leave as-is on failure */ }
  };

  const q = query.toLowerCase();
  const filteredProducts = products.filter(
    p => p.title.toLowerCase().includes(q) || p.seller.username.toLowerCase().includes(q)
  );
  const filteredOrders = orders.filter(
    o =>
      o.product.title.toLowerCase().includes(q) ||
      o.buyer.username.toLowerCase().includes(q) ||
      o.product.seller.username.toLowerCase().includes(q)
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketplace</h1>
          <p className="text-gray-400 text-sm mt-0.5">{products.length} products · {orders.length} orders platform-wide</p>
        </div>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="flex gap-2">
          {(["products", "orders"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition ${tab === t ? "bg-cyan-500/20 border border-cyan-500/50 text-white" : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="relative max-w-md flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tab === "products" ? "Search products or sellers..." : "Search orders, buyers or sellers..."}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-cyan-400" />
        </div>
      ) : tab === "products" ? (
        filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
              <ShoppingBag size={28} className="text-gray-500" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">
              {query ? "No products match your search" : "No products yet"}
            </h3>
            <p className="text-gray-500 text-sm max-w-xs">
              {query ? "Try a different search term." : "Products listed by sellers on Kliq will appear here."}
            </p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-semibold">Product</th>
                  <th className="text-left px-4 py-3 font-semibold">Seller</th>
                  <th className="text-right px-4 py-3 font-semibold">Price</th>
                  <th className="text-right px-4 py-3 font-semibold">Stock</th>
                  <th className="text-right px-4 py-3 font-semibold">Sold</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-gray-800/40 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {(p.thumbUrl ?? p.mediaUrl)
                            ? <img src={resolveMediaUrl(p.thumbUrl ?? p.mediaUrl) ?? ""} alt={p.title} className="w-full h-full object-cover" />
                            : <Package size={16} className="text-gray-400" />
                          }
                        </div>
                        <div>
                          <p className="text-white font-medium">{p.title}</p>
                          <p className="text-gray-500 text-xs">{p.isDigital ? "Digital" : "Physical"} · {new Date(p.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-300">@{p.seller.username}</td>
                    <td className="px-4 py-4 text-right text-gray-300">🪙 {p.price.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right text-gray-300">{p.stock === null ? "∞" : p.stock}</td>
                    <td className="px-4 py-4 text-right text-gray-300">{p._count.orders}</td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${PRODUCT_STATUS_COLORS[p.status] ?? "text-gray-400 bg-gray-700"}`}>
                        {p.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {p.status !== "removed" && (
                        <button
                          onClick={() => removeListing(p.id)}
                          title="Remove listing"
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
              <ShoppingBag size={28} className="text-gray-500" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">
              {query ? "No orders match your search" : "No orders yet"}
            </h3>
            <p className="text-gray-500 text-sm max-w-xs">
              {query ? "Try a different search term." : "Marketplace orders will appear here as buyers make purchases."}
            </p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-semibold">Order</th>
                  <th className="text-left px-4 py-3 font-semibold">Buyer</th>
                  <th className="text-left px-4 py-3 font-semibold">Seller</th>
                  <th className="text-right px-4 py-3 font-semibold">Qty</th>
                  <th className="text-right px-4 py-3 font-semibold">Total</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filteredOrders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-800/40 transition">
                    <td className="px-5 py-4">
                      <p className="text-white font-medium">{o.product.title}</p>
                      <p className="text-gray-500 text-xs font-mono">{o.paymentRef ?? o.id}</p>
                    </td>
                    <td className="px-4 py-4 text-gray-300">@{o.buyer.username}</td>
                    <td className="px-4 py-4 text-gray-300">@{o.product.seller.username}</td>
                    <td className="px-4 py-4 text-right text-gray-300">{o.quantity}</td>
                    <td className="px-4 py-4 text-right text-gray-300">🪙 {o.totalPrice.toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${ORDER_STATUS_COLORS[o.status] ?? "text-gray-400 bg-gray-700"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-xs">{new Date(o.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
