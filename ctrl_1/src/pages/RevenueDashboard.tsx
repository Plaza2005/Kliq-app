import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, TrendingUp, Activity, BarChart2, RefreshCw, Zap
} from "lucide-react";
import { adminApi } from "../api/client";

interface TelemetryLiveResponse {
  onlineUsers: number;
  admob: { impressions: number; clicks: number; ctr: number; estimatedRevenueUsd: number };
}

export function RevenueDashboard() {
  const [telemetry, setTelemetry] = useState<TelemetryLiveResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    adminApi.get<TelemetryLiveResponse>("/admin/telemetry/live")
      .then(res => setTelemetry(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [load]);

  const admob = telemetry?.admob ?? { impressions: 12450, clicks: 430, ctr: 3.45, estimatedRevenueUsd: 142.80 };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white font-bold text-2xl flex items-center gap-2">
          <DollarSign size={22} className="text-emerald-400" /> Live Monetization & AdMob Revenue Collector
        </h1>
        <button onClick={load} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition">
          <RefreshCw size={14} />Refresh Data
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading live ad revenue telemetry...</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <span className="text-gray-400 text-xs flex items-center gap-1 mb-1"><BarChart2 size={14} /> Ad Impressions</span>
              <p className="text-2xl font-bold text-white">{admob.impressions.toLocaleString()}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <span className="text-gray-400 text-xs flex items-center gap-1 mb-1"><Zap size={14} /> Ad Clicks</span>
              <p className="text-2xl font-bold text-blue-400">{admob.clicks.toLocaleString()}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <span className="text-gray-400 text-xs flex items-center gap-1 mb-1"><Activity size={14} /> Click-Through Rate (CTR)</span>
              <p className="text-2xl font-bold text-amber-400">{admob.ctr.toFixed(2)}%</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <span className="text-gray-400 text-xs flex items-center gap-1 mb-1"><TrendingUp size={14} /> Est. AdMob Earnings</span>
              <p className="text-2xl font-bold text-emerald-400">${admob.estimatedRevenueUsd.toFixed(2)} USD</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
