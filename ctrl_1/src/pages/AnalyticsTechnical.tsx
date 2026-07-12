import { BarChart2 } from "lucide-react";
import { useNavigate } from "react-router";

export function AnalyticsTechnical() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
        <BarChart2 size={28} className="text-gray-500" />
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">Technical Performance</h3>
      <p className="text-gray-500 text-sm max-w-sm mb-6">
        API latency percentiles, error rates, crash rates by app version, and CDN performance metrics will appear here once APM instrumentation is connected.
      </p>
      <div className="mb-6 px-4 py-2 bg-cyan-900/30 border border-cyan-700/40 rounded-full">
        <p className="text-cyan-300 text-xs font-medium">Data collection pipeline being configured</p>
      </div>
      <button onClick={() => navigate("/analytics")} className="text-gray-400 hover:text-white text-sm transition">← Back to Analytics</button>
    </div>
  );
}
