import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Coins } from "lucide-react";
import { api } from "../api/client";

interface Transaction {
  id: string; type: string; amount: number; description: string; createdAt: string;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function WalletHistory() {
  const navigate = useNavigate();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<{ tokens: number; diamonds: number; balance: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Transaction[]>("/wallet/me/transactions"),
      api.get<typeof balance>("/wallet/me"),
    ]).then(([t, b]) => { setTxns(t); setBalance(b); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full"><ArrowLeft size={20} className="text-white" /></button>
        <h1 className="text-white font-bold">Wallet & Earnings</h1>
      </div>

      {/* Balance cards */}
      {balance && (
        <div className="grid grid-cols-3 gap-3 p-4">
          <div className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border border-yellow-800/30 rounded-2xl p-3 text-center">
            <p className="text-yellow-400 font-bold text-xl">🪙 {(balance.tokens ?? 0).toLocaleString()}</p>
            <p className="text-gray-500 text-xs mt-1">Tokens</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border border-cyan-800/30 rounded-2xl p-3 text-center">
            <p className="text-cyan-400 font-bold text-xl">💎 {(balance.diamonds ?? 0).toLocaleString()}</p>
            <p className="text-gray-500 text-xs mt-1">Diamonds</p>
          </div>
          <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-800/30 rounded-2xl p-3 text-center">
            <p className="text-green-400 font-bold text-xl">${balance.balance.toFixed(2)}</p>
            <p className="text-gray-500 text-xs mt-1">Balance</p>
          </div>
        </div>
      )}

      <div className="px-4">
        <h2 className="text-white font-semibold mb-3">Transaction History</h2>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-purple-400" /></div>
        ) : txns.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Coins size={36} className="text-gray-700" />
            <p className="text-gray-500">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {txns.map(t => (
              <div key={t.id} className="flex items-center gap-3 bg-gray-950 border border-gray-900 rounded-xl px-4 py-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${t.amount >= 0 ? "bg-green-900/40" : "bg-red-900/40"}`}>
                  {t.amount >= 0 ? <TrendingUp size={16} className="text-green-400" /> : <TrendingDown size={16} className="text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium capitalize">{t.type.replace(/_/g, " ")}</p>
                  <p className="text-gray-500 text-xs truncate">{t.description}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${t.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {t.amount >= 0 ? "+" : ""}{t.amount} 🪙
                  </p>
                  <p className="text-gray-600 text-xs">{fmtDate(t.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
