import { ArrowUpRight, ArrowDownLeft, Plus, History } from "lucide-react";

const TRANSACTIONS = [
  { id: 1, type: "income", title: "Ad Revenue Payout", amount: "+$450.00", date: "Today, 9:00 AM", status: "Completed" },
  { id: 2, type: "expense", title: "Bought Tokens (550)", amount: "-$5.00", date: "Yesterday", status: "Completed" },
  { id: 3, type: "income", title: "Gift Received (Rose)", amount: "+$0.50", date: "Jun 15", status: "Completed" },
  { id: 4, type: "expense", title: "Marketplace Purchase", amount: "-$45.00", date: "Jun 12", status: "Completed" },
];

export function Wallet() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto pb-24">
      <h1 className="text-3xl font-bold mb-8">Wallet</h1>

      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-8 mb-8 relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black opacity-20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <p className="text-indigo-100 font-medium mb-1">Total Balance</p>
            <h2 className="text-5xl font-extrabold text-white tracking-tight">$1,245.50</h2>
            <div className="flex gap-4 mt-6">
              <div className="bg-black/20 backdrop-blur-md rounded-lg px-4 py-2">
                <p className="text-xs text-indigo-100 mb-0.5">Tokens</p>
                <p className="text-lg font-bold">1,250 🪙</p>
              </div>
              <div className="bg-black/20 backdrop-blur-md rounded-lg px-4 py-2">
                <p className="text-xs text-indigo-100 mb-0.5">Diamonds</p>
                <p className="text-lg font-bold">4,500 💎</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-100 transition-colors">
              <Plus size={18} /> Top Up
            </button>
            <button className="flex-1 md:flex-none bg-indigo-500/30 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-500/50 transition-colors backdrop-blur-md">
              <ArrowUpRight size={18} /> Withdraw
            </button>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2"><History size={20} /> Recent Activity</h3>
          <button className="text-indigo-400 text-sm font-medium hover:text-indigo-300">View All</button>
        </div>

        <div className="space-y-4">
          {TRANSACTIONS.map(tx => (
            <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-zinc-800/50 transition-colors cursor-pointer border border-transparent hover:border-zinc-800">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                  {tx.type === 'income' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                </div>
                <div>
                  <h4 className="font-semibold text-white">{tx.title}</h4>
                  <p className="text-xs text-zinc-500">{tx.date} • {tx.status}</p>
                </div>
              </div>
              <div className={`font-bold ${tx.type === 'income' ? 'text-green-500' : 'text-white'}`}>
                {tx.amount}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
