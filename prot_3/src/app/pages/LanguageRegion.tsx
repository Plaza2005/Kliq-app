import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Check } from "lucide-react";

const LANGUAGES = [
  { code: "en-US", label: "English (US)", currency: "USD", timeFormat: "12h" },
  { code: "en-GB", label: "English (UK)", currency: "GBP", timeFormat: "24h" },
  { code: "es", label: "Español", currency: "EUR", timeFormat: "24h" },
  { code: "fr", label: "Français", currency: "EUR", timeFormat: "24h" },
  { code: "de", label: "Deutsch", currency: "EUR", timeFormat: "24h" },
  { code: "pt-BR", label: "Português (Brasil)", currency: "BRL", timeFormat: "24h" },
  { code: "ja", label: "日本語", currency: "JPY", timeFormat: "24h" },
  { code: "ko", label: "한국어", currency: "KRW", timeFormat: "24h" },
  { code: "zh-CN", label: "中文 (简体)", currency: "CNY", timeFormat: "24h" },
  { code: "ar", label: "العربية", currency: "SAR", timeFormat: "12h" },
  { code: "hi", label: "हिन्दी", currency: "INR", timeFormat: "12h" },
  { code: "sw", label: "Kiswahili", currency: "KES", timeFormat: "24h" },
  { code: "zu-ZA", label: "Zulu / isiZulu", currency: "ZAR", timeFormat: "24h" },
  { code: "af", label: "Afrikaans", currency: "ZAR", timeFormat: "24h" },
];

const REGIONS = [
  { code: "US", label: "United States", currency: "USD" },
  { code: "GB", label: "United Kingdom", currency: "GBP" },
  { code: "ZA", label: "South Africa", currency: "ZAR" },
  { code: "NG", label: "Nigeria", currency: "NGN" },
  { code: "KE", label: "Kenya", currency: "KES" },
  { code: "GH", label: "Ghana", currency: "GHS" },
  { code: "EU", label: "European Union", currency: "EUR" },
  { code: "BR", label: "Brazil", currency: "BRL" },
  { code: "JP", label: "Japan", currency: "JPY" },
  { code: "AU", label: "Australia", currency: "AUD" },
];

export function LanguageRegion() {
  const navigate = useNavigate();
  const [selectedLang, setSelectedLang] = useState("en-US");
  const [selectedRegion, setSelectedRegion] = useState("US");
  const [saved, setSaved] = useState(false);

  const lang = LANGUAGES.find(l => l.code === selectedLang);
  const region = REGIONS.find(r => r.code === selectedRegion);

  const save = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); navigate(-1); }, 1500);
  };

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur-md border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full transition">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <span className="text-white font-bold flex-1">Language & Region</span>
        <button onClick={save} className="text-purple-400 font-semibold text-sm hover:text-purple-300 transition">
          {saved ? <Check size={18} className="text-green-400" /> : "Save"}
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Preview */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2 text-sm">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Current Settings</p>
          <div className="flex justify-between">
            <span className="text-gray-400">Language</span>
            <span className="text-white font-medium">{lang?.label || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Region</span>
            <span className="text-white font-medium">{region?.label || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Currency</span>
            <span className="text-white font-medium">{region?.currency || lang?.currency || "USD"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Time format</span>
            <span className="text-white font-medium">{lang?.timeFormat === "12h" ? "12-hour (AM/PM)" : "24-hour"}</span>
          </div>
        </div>

        {/* Language */}
        <div>
          <p className="text-sm font-medium text-gray-300 mb-3">Language</p>
          <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-900">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setSelectedLang(l.code)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-900/50 transition text-left">
                <span className={`text-sm ${selectedLang === l.code ? "text-white font-semibold" : "text-gray-300"}`}>
                  {l.label}
                </span>
                {selectedLang === l.code && <Check size={16} className="text-purple-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* Region */}
        <div>
          <p className="text-sm font-medium text-gray-300 mb-3">Region</p>
          <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-900">
            {REGIONS.map(r => (
              <button key={r.code} onClick={() => setSelectedRegion(r.code)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-900/50 transition text-left">
                <div>
                  <span className={`text-sm ${selectedRegion === r.code ? "text-white font-semibold" : "text-gray-300"}`}>
                    {r.label}
                  </span>
                  <span className="text-gray-600 text-xs ml-2">({r.currency})</span>
                </div>
                {selectedRegion === r.code && <Check size={16} className="text-purple-400" />}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-blue-900/20 border border-blue-800/40 rounded-2xl p-4">
          <p className="text-blue-300 text-sm">
            Changing your region affects pricing, payment methods, and the type of content shown in your feed.
          </p>
        </div>

        <button onClick={save}
          className={`w-full font-bold py-4 rounded-xl transition text-base ${saved
            ? "bg-green-700 text-white"
            : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"}`}>
          {saved ? "✓ Saved!" : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
