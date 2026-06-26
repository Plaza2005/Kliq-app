import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CreditCard, Check, Lock, Bitcoin } from "lucide-react";

type Method = "card" | "crypto";
type Stage = "select" | "card" | "crypto" | "success";

export function Payment() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>("card");
  const [stage, setStage] = useState<Stage>("select");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
  const [payError, setPayError] = useState("");

  const formatCard = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d; };

  const pay = () => {
    if (method === "card" && (!cardNumber || !expiry || !cvv || !name)) {
      setPayError("Please fill in all card details.");
      return;
    }
    setPayError("");
    setStage("success");
  };

  if (stage === "success") {
    return (
      <div className="min-h-full bg-black flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-700/50">
            <Check size={36} className="text-green-400" />
          </div>
          <h2 className="text-white font-bold text-2xl mb-2">Payment Successful!</h2>
          <p className="text-gray-400 text-sm mb-6">
            Your Amplify campaign has been activated. Your shop is now live and getting promoted across the platform.
          </p>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-left mb-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="text-white font-medium">$49.99</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Plan</span>
              <span className="text-white font-medium">Amplify Starter</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Duration</span>
              <span className="text-white font-medium">30 days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="text-green-400 font-semibold">Active ✓</span>
            </div>
          </div>
          <button onClick={() => navigate("/marketplace")}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl hover:opacity-90 transition">
            Go to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur-md border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full transition">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <span className="text-white font-bold">Payment</span>
        <Lock size={14} className="text-green-400 ml-auto" />
        <span className="text-green-400 text-xs">Secure</span>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Order summary */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Order Summary</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Amplify Starter Plan</span>
              <span className="text-white font-semibold">$49.99</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Duration</span>
              <span className="text-white">30 days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Reach</span>
              <span className="text-white">10K–50K users</span>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-3 pt-3 flex justify-between">
            <span className="text-white font-bold">Total</span>
            <span className="text-white font-bold text-lg">$49.99</span>
          </div>
        </div>

        {/* Payment method */}
        <div>
          <p className="text-sm font-medium text-gray-300 mb-3">Payment Method</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "card" as Method, label: "Credit Card", icon: CreditCard },
              { id: "crypto" as Method, label: "Crypto", icon: Bitcoin },
            ].map(m => {
              const Icon = m.icon;
              return (
                <button key={m.id} onClick={() => setMethod(m.id)}
                  className={`flex items-center gap-2 p-4 rounded-2xl border font-medium text-sm transition ${method === m.id ? "border-purple-500 bg-purple-600/10 text-white" : "border-gray-800 text-gray-400 hover:border-gray-600"}`}>
                  <Icon size={18} /> {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {method === "card" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Name on Card</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Card Number</label>
              <input value={cardNumber} onChange={e => setCardNumber(formatCard(e.target.value))} placeholder="1234 5678 9012 3456"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Expiry</label>
                <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))} placeholder="MM/YY"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">CVV</label>
                <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="•••"
                  type="password"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <p className="text-white font-semibold text-sm">Send payment to:</p>
            <div className="bg-black rounded-xl p-4 font-mono text-xs text-purple-300 break-all">
              0x742d35Cc6634C0532925a3b844Bc454e4438f44e
            </div>
            <div className="space-y-2 text-sm">
              {[["Amount", "0.0235 ETH"], ["Network", "Ethereum (ERC-20)"], ["Confirmations", "2 required"]].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-500">{k}</span>
                  <span className="text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {payError && (
          <div className="bg-red-900/20 border border-red-800/40 text-red-400 text-sm rounded-xl px-4 py-3">
            {payError}
          </div>
        )}
        <button onClick={pay}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl hover:opacity-90 transition text-base">
          {method === "card" ? "Pay $49.99" : "I've Sent Payment"}
        </button>

        <p className="text-center text-gray-600 text-xs flex items-center justify-center gap-1">
          <Lock size={11} /> Payments are encrypted and secure
        </p>
      </div>
    </div>
  );
}
