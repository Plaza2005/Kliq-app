import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { ArrowUpRight, ArrowDownLeft, Plus, History, CreditCard, Coins, X, Search, Send, Loader2, ShoppingBag } from "lucide-react";
import { api } from "../api/client";

type ModalType = "topup" | "withdraw" | "transfer" | null;

interface Transaction {
  id: string;
  type: string;
  title: string;
  amount: string;
  status: string;
  createdAt: string;
}

interface WalletData {
  balance: number;
  tokens: number;
  diamonds: number;
  transactions: Transaction[];
}

const TOKEN_RATES: Record<string, { tokens: number; bonus: number }> = {
  "$5":  { tokens: 500, bonus: 50 },
  "$10": { tokens: 1000, bonus: 150 },
  "$25": { tokens: 2500, bonus: 500 },
  "$50": { tokens: 5000, bonus: 1000 },
};

export function Wallet() {
  const navigate = useNavigate();
  const [modal, setModal] = useState<ModalType>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Top-up modal state
  const [topupMethod, setTopupMethod] = useState<"fiat" | "crypto">("fiat");
  const [selectedQuick, setSelectedQuick] = useState<string | null>(null);
  const [customAmt, setCustomAmt] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);

  // Withdraw modal state
  const [withdrawMethod, setWithdrawMethod] = useState<"fiat" | "crypto">("fiat");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawDestination, setWithdrawDestination] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Transfer modal state
  const [transferUser, setTransferUser] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const transferType = "tokens" as const;
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    try {
      const data = await api.get<WalletData>("/wallet/me");
      setBalance(data.balance);
      setTokens(data.tokens);
      setDiamonds(data.diamonds);
      setTransactions(data.transactions);
    } catch {
      // silently ignore — auth errors are handled globally
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleSuccess = (msg: string) => {
    setModal(null);
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleTopUp = async () => {
    const amountVal = selectedQuick
      ? parseFloat(selectedQuick.replace("$", ""))
      : parseFloat(customAmt.replace(/[^0-9.]/g, ""));

    if (isNaN(amountVal) || amountVal <= 0) return;

    setTopupLoading(true);
    setTopupError(null);
    try {
      await api.post("/wallet/topup", { amount: amountVal, method: topupMethod });
      await fetchWallet();
      setSelectedQuick(null);
      setCustomAmt("");
      handleSuccess("Top Up successful! Tokens added to your wallet.");
    } catch (err) {
      setTopupError(err instanceof Error ? err.message : "Top-up failed.");
    } finally {
      setTopupLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawLoading(true);
    setWithdrawError(null);
    try {
      await api.post("/wallet/withdraw", {
        diamonds: parseInt(withdrawAmount),
        method: withdrawMethod,
        destination: withdrawDestination,
      });
      await fetchWallet();
      setWithdrawAmount("");
      setWithdrawDestination("");
      handleSuccess("Withdrawal requested! Funds will arrive in 2-3 business days.");
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : "Withdrawal failed.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleTransfer = async () => {
    setTransferLoading(true);
    setTransferError(null);
    try {
      await api.post("/wallet/transfer", {
        toUsername: transferUser,
        amount: parseFloat(transferAmount),
        currency: transferType,
      });
      await fetchWallet();
      const sentMsg = `Transfer sent! ${transferAmount || "0"} ${transferType} sent to ${transferUser || "user"}.`;
      setTransferUser("");
      setTransferAmount("");
      handleSuccess(sentMsg);
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : "Transfer failed.");
    } finally {
      setTransferLoading(false);
    }
  };

  const closeModal = () => {
    setModal(null);
    setTopupError(null);
    setWithdrawError(null);
    setTransferError(null);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto pb-24 bg-black min-h-full">
      {/* Success toast */}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-800 border border-green-700 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg">
          ✓ {success}
        </div>
      )}

      {/* Top Up Modal */}
      {modal === "topup" && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end">
          <div className="w-full bg-gray-950 border-t border-gray-800 rounded-t-3xl p-6 max-w-xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Top Up</h3>
              <button onClick={closeModal}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button onClick={() => setTopupMethod("fiat")} className={`p-3 rounded-xl border text-sm font-medium transition text-left ${topupMethod === "fiat" ? "border-purple-500 bg-purple-600/10 text-white" : "border-gray-800 text-gray-400"}`}>
                <CreditCard size={18} className="mb-1" />
                Fiat (Card / Bank)
              </button>
              <button onClick={() => setTopupMethod("crypto")} className={`p-3 rounded-xl border text-sm font-medium transition text-left ${topupMethod === "crypto" ? "border-purple-500 bg-purple-600/10 text-white" : "border-gray-800 text-gray-400"}`}>
                <Coins size={18} className="mb-1" />
                Crypto (ETH / BTC)
              </button>
            </div>
            {topupMethod === "fiat" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {["$5", "$10", "$25", "$50"].map(a => (
                    <button key={a} onClick={() => { setSelectedQuick(a); setCustomAmt(""); }}
                      className={`border rounded-xl py-2.5 text-sm font-bold transition ${selectedQuick === a ? "border-purple-500 bg-purple-600/20 text-white" : "border-gray-700 text-white hover:border-purple-500 hover:bg-purple-600/10"}`}>{a}</button>
                  ))}
                </div>
                <input type="text" value={customAmt} onChange={e => { setCustomAmt(e.target.value); setSelectedQuick(null); }} placeholder="Or enter custom amount..." className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition" />
                <div className="bg-gray-900 rounded-xl p-3 text-xs text-gray-400 space-y-1">
                  <div className="flex justify-between"><span>$5</span><span>= 550 Tokens</span></div>
                  <div className="flex justify-between"><span>$10</span><span>= 1,150 Tokens (+50 bonus)</span></div>
                  <div className="flex justify-between"><span>$25</span><span>= 3,000 Tokens (+250 bonus)</span></div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-gray-900 rounded-xl p-4">
                  <p className="text-gray-400 text-xs mb-1">Send ETH to:</p>
                  <p className="font-mono text-xs text-purple-300 break-all">0x742d35Cc6634C0532925a3b844Bc454e4438f44e</p>
                </div>
                <p className="text-gray-500 text-xs">1 ETH ≈ $3,200 • Min deposit: 0.001 ETH</p>
              </div>
            )}
            {topupError && (
              <p className="mt-3 text-red-400 text-sm text-center">{topupError}</p>
            )}
            <button
              onClick={handleTopUp}
              disabled={topupLoading}
              className="w-full mt-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {topupLoading ? (
                <><Loader2 size={18} className="animate-spin" /> Processing…</>
              ) : (
                topupMethod === "fiat" ? "Proceed to Payment" : "I've Sent Payment"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {modal === "withdraw" && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end">
          <div className="w-full bg-gray-950 border-t border-gray-800 rounded-t-3xl p-6 max-w-xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Withdraw Diamonds</h3>
              <button onClick={closeModal}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="bg-gray-900 rounded-xl p-3 mb-4 flex justify-between text-sm">
              <span className="text-gray-400">Available Diamonds</span>
              <span className="text-white font-bold">💎 {diamonds.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => setWithdrawMethod("fiat")} className={`p-3 rounded-xl border text-sm font-medium transition text-left ${withdrawMethod === "fiat" ? "border-purple-500 bg-purple-600/10 text-white" : "border-gray-800 text-gray-400"}`}>
                <CreditCard size={18} className="mb-1" />
                Bank Transfer
              </button>
              <button onClick={() => setWithdrawMethod("crypto")} className={`p-3 rounded-xl border text-sm font-medium transition text-left ${withdrawMethod === "crypto" ? "border-purple-500 bg-purple-600/10 text-white" : "border-gray-800 text-gray-400"}`}>
                <Coins size={18} className="mb-1" />
                Crypto Wallet
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Diamonds to withdraw</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition"
                />
              </div>
              {withdrawMethod === "fiat" ? (
                <input
                  type="text"
                  value={withdrawDestination}
                  onChange={e => setWithdrawDestination(e.target.value)}
                  placeholder="Bank account number..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition"
                />
              ) : (
                <input
                  type="text"
                  value={withdrawDestination}
                  onChange={e => setWithdrawDestination(e.target.value)}
                  placeholder="Your crypto wallet address..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition font-mono"
                />
              )}
              <p className="text-gray-600 text-xs">Conversion rate: 100 💎 = $0.50 • Min withdrawal: 4,500 💎</p>
            </div>
            {withdrawError && (
              <p className="mt-3 text-red-400 text-sm text-center">{withdrawError}</p>
            )}
            <button
              onClick={handleWithdraw}
              disabled={withdrawLoading}
              className="w-full mt-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {withdrawLoading ? (
                <><Loader2 size={18} className="animate-spin" /> Processing…</>
              ) : (
                "Request Withdrawal"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {modal === "transfer" && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end">
          <div className="w-full bg-gray-950 border-t border-gray-800 rounded-t-3xl p-6 max-w-xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Transfer</h3>
              <button onClick={closeModal}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="mb-4">
              <div className="py-2.5 rounded-xl border border-purple-500 bg-purple-600/10 text-white text-sm font-medium text-center">
                🪙 Tokens
              </div>
              <p className="text-xs text-gray-500 mt-2">Diamonds can only be earned through gifts and cannot be transferred.</p>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={transferUser}
                  onChange={e => setTransferUser(e.target.value)}
                  placeholder="Search @username..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount</label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  placeholder="Tokens to send..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition"
                />
              </div>
              <div className="bg-gray-900 rounded-xl p-3 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Available</span>
                  <span className="text-white font-medium">🪙 {tokens.toLocaleString()} Tokens</span>
                </div>
              </div>
            </div>
            {transferError && (
              <p className="mt-3 text-red-400 text-sm text-center">{transferError}</p>
            )}
            <button
              onClick={handleTransfer}
              disabled={transferLoading}
              className="w-full mt-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {transferLoading ? (
                <><Loader2 size={18} className="animate-spin" /> Sending…</>
              ) : (
                <><Send size={16} /> Send Tokens</>
              )}
            </button>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold text-white mb-8">Wallet</h1>

      {/* Balance card */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black opacity-20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <p className="text-pink-100 font-medium mb-1">Total Balance</p>
            {walletLoading ? (
              <div className="flex items-center gap-3 h-14">
                <Loader2 size={28} className="animate-spin text-white/70" />
                <span className="text-white/70 text-lg">Loading…</span>
              </div>
            ) : (
              <h2 className="text-5xl font-black text-white tracking-tight">
                ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            )}
            <div className="flex gap-4 mt-6">
              <div className="bg-black/20 backdrop-blur-md rounded-lg px-4 py-2">
                <p className="text-xs text-pink-100 mb-0.5 flex items-center gap-1">
                  <Coins size={10} /> Tokens
                </p>
                <p className="text-lg font-bold text-white">{walletLoading ? "—" : tokens.toLocaleString()}</p>
              </div>
              <div className="bg-black/20 backdrop-blur-md rounded-lg px-4 py-2">
                <p className="text-xs text-pink-100 mb-0.5">Diamonds</p>
                <p className="text-lg font-bold text-white">{walletLoading ? "—" : diamonds.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => setModal("topup")}
              className="flex-1 md:flex-none bg-white text-purple-900 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
            >
              <Plus size={18} /> Top Up
            </button>
            <button
              onClick={() => setModal("withdraw")}
              className="flex-1 md:flex-none bg-white/20 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/30 transition-colors backdrop-blur-md"
            >
              <ArrowUpRight size={18} /> Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Buy Tokens", icon: Coins, desc: "550 tokens = $5", onClick: () => setModal("topup") },
          { label: "Add Card", icon: CreditCard, desc: "Visa / Mastercard", onClick: () => setModal("topup") },
          { label: "Transfer", icon: ArrowUpRight, desc: "Send to user", onClick: () => setModal("transfer") },
          { label: "My Orders", icon: ShoppingBag, desc: "Marketplace purchases", onClick: () => navigate("/wallet/orders") },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={action.onClick}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center hover:border-gray-600 transition group"
            >
              <div className="w-10 h-10 bg-gray-800 group-hover:bg-purple-900/30 rounded-xl flex items-center justify-center mx-auto mb-2 transition">
                <Icon size={18} className="text-gray-400 group-hover:text-purple-400 transition" />
              </div>
              <p className="text-white text-xs font-semibold">{action.label}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">{action.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Transactions */}
      <div className="bg-gray-950 rounded-2xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <History size={18} className="text-gray-400" /> Recent Activity
          </h3>
          <button className="text-purple-400 text-sm font-medium hover:text-purple-300 transition">View All</button>
        </div>

        {walletLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 size={32} className="animate-spin text-gray-600 mb-3" />
            <p className="text-gray-500 text-sm">Loading transactions…</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History size={32} className="text-gray-700 mb-3" />
            <p className="text-gray-500 font-medium mb-1">No transactions yet</p>
            <p className="text-gray-700 text-sm">Top up your wallet to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-900/60 transition-colors cursor-pointer border border-transparent hover:border-gray-800"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === "income" ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"}`}>
                    {tx.type === "income" ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <h4 className="font-medium text-white text-sm">{tx.title}</h4>
                    <p className="text-xs text-gray-600">
                      {new Date(tx.createdAt).toLocaleDateString()} &bull; {tx.status}
                    </p>
                  </div>
                </div>
                <div className={`font-bold text-sm ${tx.type === "income" ? "text-green-400" : "text-gray-300"}`}>
                  {tx.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
