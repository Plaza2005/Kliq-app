import { useState } from "react";
import { Menu, ArrowUpRight, ArrowDownLeft, DollarSign, Bitcoin, Coins, History, HelpCircle } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { ActionPanel } from "../components/ActionPanel";

const balances = [
  { type: "Fiat", amount: "$2,450.00", icon: DollarSign, color: "text-green-400" },
  { type: "Crypto", amount: "0.0234 BTC", icon: Bitcoin, color: "text-orange-400" },
  { type: "Tokens", amount: "12,500", icon: Coins, color: "text-purple-400" },
];

const transactions = [
  {
    id: 1,
    type: "receive",
    description: "Gift from @user123",
    amount: "+500 tokens",
    date: "2h ago",
  },
  {
    id: 2,
    type: "send",
    description: "Sent to @friend",
    amount: "-100 tokens",
    date: "5h ago",
  },
  {
    id: 3,
    type: "receive",
    description: "Token purchase",
    amount: "+2,000 tokens",
    date: "1d ago",
  },
  {
    id: 4,
    type: "send",
    description: "P2P Trade",
    amount: "-$50.00",
    date: "2d ago",
  },
];

const cryptoList = [
  { name: "Bitcoin", symbol: "BTC", balance: "0.0234", value: "$1,234.00" },
  { name: "Ethereum", symbol: "ETH", balance: "0.5432", value: "$892.00" },
  { name: "USDT", symbol: "USDT", balance: "324.00", value: "$324.00" },
];

export function Wallet() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "crypto" | "history">("overview");

  return (
    <div className="min-h-screen bg-black pb-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md z-40 border-b border-gray-800">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <button onClick={() => setIsPanelOpen(true)}>
            <Menu className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl text-white">Wallet</h1>
          <button>
            <HelpCircle className="w-6 h-6 text-white" />
          </button>
        </div>
      </header>

      <div className="pt-14">
        {/* Total Balance */}
        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 p-6 border-b border-gray-800">
          <div className="text-gray-300 text-sm mb-2">Total Balance</div>
          <div className="text-4xl text-white mb-6">$4,900.00</div>
          <div className="flex gap-3">
            <button className="flex-1 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2">
              <ArrowUpRight className="w-5 h-5" />
              Send
            </button>
            <button className="flex-1 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-2">
              <ArrowDownLeft className="w-5 h-5" />
              Receive
            </button>
          </div>
        </div>

        {/* Balances */}
        <div className="p-4 space-y-3 border-b border-gray-800">
          {balances.map((balance) => {
            const Icon = balance.icon;
            return (
              <div
                key={balance.type}
                className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gray-800 rounded-full">
                    <Icon className={`w-6 h-6 ${balance.color}`} />
                  </div>
                  <div>
                    <div className="text-white">{balance.type}</div>
                    <div className="text-gray-400 text-sm">Available</div>
                  </div>
                </div>
                <div className={`text-lg ${balance.color}`}>{balance.amount}</div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-4 ${
              activeTab === "overview"
                ? "text-white border-b-2 border-white"
                : "text-gray-400"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("crypto")}
            className={`flex-1 py-4 ${
              activeTab === "crypto"
                ? "text-white border-b-2 border-white"
                : "text-gray-400"
            }`}
          >
            Crypto
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-4 ${
              activeTab === "history"
                ? "text-white border-b-2 border-white"
                : "text-gray-400"
            }`}
          >
            History
          </button>
        </div>

        {/* Content */}
        {activeTab === "overview" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-lg">Recent Transactions</h3>
              <button className="text-purple-400 text-sm">View All</button>
            </div>
            <div className="space-y-2">
              {transactions.slice(0, 3).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        tx.type === "receive"
                          ? "bg-green-900/30"
                          : "bg-red-900/30"
                      }`}
                    >
                      {tx.type === "receive" ? (
                        <ArrowDownLeft className="w-5 h-5 text-green-400" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-white text-sm">{tx.description}</div>
                      <div className="text-gray-400 text-xs">{tx.date}</div>
                    </div>
                  </div>
                  <div
                    className={`${
                      tx.type === "receive" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {tx.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "crypto" && (
          <div className="p-4 space-y-3">
            {cryptoList.map((crypto) => (
              <div
                key={crypto.symbol}
                className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white">
                    {crypto.symbol[0]}
                  </div>
                  <div>
                    <div className="text-white">{crypto.name}</div>
                    <div className="text-gray-400 text-sm">
                      {crypto.balance} {crypto.symbol}
                    </div>
                  </div>
                </div>
                <div className="text-white text-right">
                  <div>{crypto.value}</div>
                  <div className="text-green-400 text-xs">+2.34%</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "history" && (
          <div className="p-4 space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      tx.type === "receive" ? "bg-green-900/30" : "bg-red-900/30"
                    }`}
                  >
                    {tx.type === "receive" ? (
                      <ArrowDownLeft className="w-5 h-5 text-green-400" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-white text-sm">{tx.description}</div>
                    <div className="text-gray-400 text-xs">{tx.date}</div>
                  </div>
                </div>
                <div
                  className={`${
                    tx.type === "receive" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {tx.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
      <ActionPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
    </div>
  );
}
