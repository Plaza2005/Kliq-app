import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Loader2, ShoppingBag, Shield, Package, Zap, Check, Minus, Plus, Store } from "lucide-react";
import { api, resolveAvatarUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { MediaImg } from "../components/media/MediaImg";

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
  condition: string | null;
  location: string | null;
  createdAt: string;
  seller: { username: string; displayName: string; avatarUrl: string | null; isVerified: boolean };
}

interface Order {
  id: string;
  quantity: number;
  totalPrice: number;
  status: string;
  paymentRef: string | null;
}

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get<Product>(`/marketplace/products/${id}`).then(setProduct).catch(() => {}).finally(() => setLoading(false));
    api.get<{ tokens: number }>("/wallet/me").then(w => setTokens(w.tokens)).catch(() => {});
  }, [id]);

  const isOwn = user?.username === product?.seller.username;
  const maxQty = product?.stock ?? 99;
  const total = (product?.price ?? 0) * quantity;

  const handleBuy = async () => {
    if (!product || buying) return;
    setBuying(true);
    setBuyError(null);
    try {
      const placed = await api.post<Order>(`/marketplace/products/${product.id}/buy`, { quantity });
      setOrder(placed);
      setTokens(t => (t != null ? t - placed.totalPrice : t));
      // reflect stock change locally
      setProduct(p => p && p.stock != null
        ? { ...p, stock: p.stock - placed.quantity, status: p.stock - placed.quantity <= 0 ? "sold_out" : p.status }
        : p);
    } catch (e) {
      setBuyError(e instanceof Error ? e.message : "Purchase failed.");
    } finally {
      setBuying(false);
    }
  };

  if (loading) return (
    <div className="min-h-full bg-black flex justify-center pt-24">
      <Loader2 size={28} className="animate-spin text-purple-400" />
    </div>
  );

  if (!product) return (
    <div className="min-h-full bg-black flex flex-col items-center pt-24 gap-3">
      <ShoppingBag size={40} className="text-gray-700" />
      <p className="text-gray-500 font-medium">Product not found</p>
      <button onClick={() => navigate("/marketplace")} className="text-purple-400 text-sm font-semibold">Back to Marketplace</button>
    </div>
  );

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full"><ArrowLeft size={20} className="text-white" /></button>
        <h1 className="text-white font-bold truncate">{product.title}</h1>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4">
        {/* Order confirmation */}
        {order && (
          <div className="mb-4 bg-green-900/20 border border-green-700/50 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-900/40 border border-green-700/50 rounded-full flex items-center justify-center flex-shrink-0">
                <Check size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-white font-bold">Order confirmed!</p>
                <p className="text-gray-400 text-xs">Ref: {order.paymentRef ?? order.id}</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-3">
              You bought {order.quantity} × {product.title} for <span className="text-yellow-400 font-bold">🪙 {order.totalPrice.toLocaleString()}</span> tokens.
            </p>
            <button onClick={() => navigate("/wallet/orders")}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2.5 rounded-xl text-sm hover:opacity-90 transition">
              View My Orders
            </button>
          </div>
        )}

        {/* Media */}
        <div className="rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 mb-4 relative">
          {(product.mediaUrl ?? product.thumbUrl) ? (
            <MediaImg src={product.mediaUrl ?? product.thumbUrl!} alt={product.title} className="w-full max-h-96 object-cover" context={`ProductDetail:${product.id}`} />
          ) : (
            <div className="w-full h-56 flex items-center justify-center">
              <ShoppingBag size={40} className="text-gray-700" />
            </div>
          )}
          <div className="absolute top-3 right-3">
            <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-gray-200 text-xs px-2.5 py-1 rounded-full">
              {product.isDigital ? <><Zap size={11} className="text-yellow-400" /> Digital</> : <><Package size={11} className="text-blue-400" /> Physical</>}
            </span>
          </div>
        </div>

        {/* Title & price */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-white font-bold text-xl">{product.title}</h2>
          <span className="text-yellow-400 font-black text-xl whitespace-nowrap">🪙 {product.price.toLocaleString()}</span>
        </div>

        {/* Stock / status */}
        <div className="flex items-center gap-2 mb-4">
          {product.status === "sold_out" ? (
            <span className="bg-red-900/40 text-red-400 text-xs font-bold px-2.5 py-1 rounded-full">Sold out</span>
          ) : product.stock != null ? (
            <span className="bg-gray-900 border border-gray-800 text-gray-400 text-xs px-2.5 py-1 rounded-full">{product.stock} in stock</span>
          ) : (
            <span className="bg-gray-900 border border-gray-800 text-gray-400 text-xs px-2.5 py-1 rounded-full">Unlimited stock</span>
          )}
          {product.category && <span className="bg-gray-900 border border-gray-800 text-gray-400 text-xs px-2.5 py-1 rounded-full">{product.category}</span>}
          {product.condition && <span className="bg-gray-900 border border-gray-800 text-gray-400 text-xs px-2.5 py-1 rounded-full capitalize">{product.condition.replace(/_/g, " ")}</span>}
          {product.location && <span className="bg-gray-900 border border-gray-800 text-gray-400 text-xs px-2.5 py-1 rounded-full">{product.location}</span>}
        </div>

        {/* Seller */}
        <button onClick={() => navigate(`/user/${product.seller.username}`)}
          className="w-full flex items-center gap-3 bg-gray-950 border border-gray-800 rounded-2xl p-3 mb-4 hover:border-gray-600 transition text-left">
          <img src={resolveAvatarUrl(product.seller.avatarUrl)} alt={product.seller.displayName} className="w-10 h-10 rounded-full object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm flex items-center gap-1">
              {product.seller.displayName}
              {product.seller.isVerified && <Shield size={12} className="text-purple-400" />}
            </p>
            <p className="text-gray-500 text-xs">@{product.seller.username}</p>
          </div>
          <span className="text-gray-600 text-xs">Seller</span>
        </button>

        {/* Description */}
        {product.description && (
          <p className="text-gray-300 text-sm leading-relaxed mb-6 whitespace-pre-wrap">{product.description}</p>
        )}

        {/* Buy panel */}
        {isOwn ? (
          <button onClick={() => navigate("/marketplace/seller")}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 border border-gray-800 text-gray-300 font-bold py-3 rounded-xl hover:border-gray-600 transition text-sm">
            <Store size={16} /> This is your listing — Manage it
          </button>
        ) : product.status === "sold_out" ? (
          <button disabled className="w-full bg-gray-900 border border-gray-800 text-gray-600 font-bold py-3 rounded-xl text-sm cursor-not-allowed">
            Sold Out
          </button>
        ) : !order && (
          <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm">Quantity</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-8 h-8 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center text-gray-300 hover:border-gray-500 transition">
                    <Minus size={14} />
                  </button>
                  <span className="text-white font-bold w-8 text-center">{quantity}</span>
                  <button onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                    className="w-8 h-8 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center text-gray-300 hover:border-gray-500 transition">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs">Total</p>
                <p className="text-yellow-400 font-bold">🪙 {total.toLocaleString()}</p>
              </div>
            </div>
            {tokens != null && (
              <p className="text-gray-500 text-xs mb-3">Your balance: 🪙 {tokens.toLocaleString()} tokens{tokens < total ? " — not enough for this purchase" : ""}</p>
            )}
            {buyError && <p className="text-red-400 text-sm mb-3 text-center">{buyError}</p>}
            <button onClick={handleBuy} disabled={buying || (tokens != null && tokens < total)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {buying ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : <><ShoppingBag size={16} /> Buy Now</>}
            </button>
            {tokens != null && tokens < total && (
              <button onClick={() => navigate("/wallet")} className="w-full mt-2 text-purple-400 text-xs font-semibold hover:text-purple-300 transition">
                Top up your wallet →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
