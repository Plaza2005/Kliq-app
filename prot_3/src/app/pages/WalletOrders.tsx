import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Loader2, ShoppingBag, Package, Zap } from "lucide-react";
import { api, resolveMediaUrl } from "../api/client";

interface Order {
  id: string;
  quantity: number;
  totalPrice: number;
  status: string;
  paymentRef: string | null;
  createdAt: string;
  product: {
    id: string;
    title: string;
    isDigital: boolean;
    mediaUrl: string | null;
    thumbUrl: string | null;
    seller: { username: string; displayName: string; avatarUrl: string | null; isVerified: boolean };
  };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_COLORS: Record<string, string> = {
  paid:      "text-blue-400 bg-blue-900/30",
  fulfilled: "text-green-400 bg-green-900/30",
  cancelled: "text-red-400 bg-red-900/30",
  refunded:  "text-amber-400 bg-amber-900/30",
  pending:   "text-gray-400 bg-gray-800",
};

export function WalletOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Order[]>("/marketplace/orders").then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full"><ArrowLeft size={20} className="text-white" /></button>
        <h1 className="text-white font-bold">My Orders</h1>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-purple-400" /></div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <ShoppingBag size={36} className="text-gray-700" />
            <p className="text-gray-500">No orders yet</p>
            <button onClick={() => navigate("/marketplace")} className="bg-purple-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl mt-2">Browse Marketplace</button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(o => (
              <div key={o.id} onClick={() => navigate(`/marketplace/product/${o.product.id}`)}
                className="flex gap-3 bg-gray-950 border border-gray-900 rounded-2xl p-3 cursor-pointer hover:border-gray-700 transition">
                <div className="w-16 h-16 rounded-xl bg-gray-800 flex-shrink-0 overflow-hidden">
                  {(o.product.thumbUrl ?? o.product.mediaUrl)
                    ? <img src={resolveMediaUrl(o.product.thumbUrl ?? o.product.mediaUrl ?? "") ?? ""} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={18} className="text-gray-600" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{o.product.title} ×{o.quantity}</p>
                  <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
                    {o.product.isDigital ? <Zap size={10} /> : <Package size={10} />}
                    Sold by @{o.product.seller.username} · {fmtDate(o.createdAt)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-yellow-400 text-xs font-bold">🪙 {o.totalPrice.toLocaleString()}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${STATUS_COLORS[o.status] ?? "text-gray-400 bg-gray-800"}`}>{o.status}</span>
                  </div>
                </div>
                <p className="text-gray-700 text-[10px] self-center font-mono">{o.paymentRef ?? ""}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
