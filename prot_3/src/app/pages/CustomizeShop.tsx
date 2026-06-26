import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Image as ImageIcon, Upload, Check } from "lucide-react";

const CATEGORIES = ["Digital Art", "Physical Products", "Services", "Fashion", "Music", "Technology", "Food & Beverage", "Handmade", "Other"];

export function CustomizeShop() {
  const navigate = useNavigate();
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Digital Art");
  const [returnPolicy, setReturnPolicy] = useState("No returns");
  const [customPolicyText, setCustomPolicyText] = useState("");
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const startAmplify = () => {
    if (!shopName.trim()) { alert("Please enter a shop name first."); return; }
    navigate("/payment");
  };

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur-md border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full transition">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <span className="text-white font-bold">Customize Shop</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Banner upload */}
        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">Shop Banner</p>
          <div className="w-full h-36 rounded-2xl bg-gray-900 border-2 border-dashed border-gray-700 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-purple-600 transition">
            <ImageIcon size={28} className="text-gray-600" />
            <p className="text-gray-500 text-sm">Upload banner image</p>
            <p className="text-gray-700 text-xs">Recommended: 1500×500px</p>
          </div>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gray-900 border-2 border-dashed border-gray-700 flex items-center justify-center cursor-pointer hover:border-purple-600 transition flex-shrink-0">
            <Upload size={20} className="text-gray-600" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">Shop Logo</p>
            <p className="text-gray-500 text-xs">Square image, min 400×400px</p>
          </div>
        </div>

        {/* Shop Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Shop Name *</label>
          <input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Your shop name..."
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            placeholder="Tell buyers about your shop..."
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-600 transition resize-none" />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-600 transition">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Return policy */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Return Policy</label>
          <div className="space-y-2">
            {["No returns", "Returns within 7 days", "Returns within 30 days", "Custom policy"].map(p => (
              <button key={p} onClick={() => setReturnPolicy(p)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition border ${returnPolicy === p ? "border-purple-500 bg-purple-600/10 text-white" : "border-gray-800 text-gray-400 hover:border-gray-600"}`}>
                {p}
              </button>
            ))}
            {returnPolicy === "Custom policy" && (
              <textarea
                value={customPolicyText}
                onChange={e => setCustomPolicyText(e.target.value)}
                placeholder="Write your custom return policy (e.g. conditions, timeframes, process)..."
                rows={4}
                className="w-full bg-gray-900 border border-purple-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 transition resize-none"
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button onClick={save}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition ${saved ? "bg-green-700 text-white" : "bg-gray-900 border border-gray-700 text-white hover:bg-gray-800"}`}>
            {saved ? <><Check size={18} /> Saved!</> : "Save Changes"}
          </button>
          <button onClick={startAmplify}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition">
            Pay & Start Amplify
          </button>
        </div>
      </div>
    </div>
  );
}
