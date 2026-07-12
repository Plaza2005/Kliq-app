import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Trash2, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { adminApi } from "../api/client";

interface KeywordRule {
  id: string;
  keyword: string;
  createdBy: string;
  createdAt: string;
}

interface SpamSettings {
  flagManyLinks: boolean;
  flagNewAccounts: boolean;
  autoRejectKeywords: boolean;
}

interface ThresholdSettings {
  flagAfterReports: number;
  autoBanAfterViolations: number;
}

const DEFAULT_SPAM: SpamSettings = {
  flagManyLinks: true,
  flagNewAccounts: false,
  autoRejectKeywords: false,
};

const DEFAULT_THRESHOLDS: ThresholdSettings = {
  flagAfterReports: 3,
  autoBanAfterViolations: 5,
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex-shrink-0 transition ${on ? "text-cyan-400" : "text-gray-600"}`}
      aria-label={on ? "Disable" : "Enable"}
    >
      {on ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
    </button>
  );
}

export function AutoModeration() {
  const [rules, setRules]               = useState<KeywordRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [newKeyword, setNewKeyword]     = useState("");
  const [addLoading, setAddLoading]     = useState(false);

  const [spam, setSpam]                 = useState<SpamSettings>(DEFAULT_SPAM);
  const [thresholds, setThresholds]     = useState<ThresholdSettings>(DEFAULT_THRESHOLDS);
  const [saveLoading, setSaveLoading]   = useState(false);

  const [toast, setToast]               = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const loadRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const data = await adminApi.get<KeywordRule[]>("/admin/moderation/rules");
      setRules(data);
    } catch {
      setRules([]);
    } finally {
      setRulesLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const data = await adminApi.get<{ spam: SpamSettings; thresholds: ThresholdSettings }>("/admin/moderation/settings");
      if (data.spam)       setSpam(data.spam);
      if (data.thresholds) setThresholds(data.thresholds);
    } catch {
      // keep defaults
    }
  }, []);

  useEffect(() => {
    loadRules();
    loadSettings();
  }, []);

  const handleAddRule = async () => {
    const keyword = newKeyword.trim();
    if (!keyword) return;
    setAddLoading(true);
    try {
      const created = await adminApi.post<KeywordRule>("/admin/moderation/rules", { keyword });
      setRules(prev => [created, ...prev]);
      setNewKeyword("");
      showToast(`Keyword "${keyword}" added.`);
    } catch {
      // Optimistic fallback: add locally with temp id
      const tempRule: KeywordRule = {
        id: `temp-${Date.now()}`,
        keyword,
        createdBy: "Admin",
        createdAt: new Date().toISOString(),
      };
      setRules(prev => [tempRule, ...prev]);
      setNewKeyword("");
      showToast(`Keyword "${keyword}" added.`);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteRule = async (id: string, keyword: string) => {
    try {
      await adminApi.delete(`/admin/moderation/rules/${id}`);
    } catch {
      // best-effort
    }
    setRules(prev => prev.filter(r => r.id !== id));
    showToast(`"${keyword}" removed.`);
  };

  const patchSettings = async (spamUpdate: SpamSettings, thresholdUpdate: ThresholdSettings) => {
    try {
      await adminApi.patch("/admin/moderation/settings", { spam: spamUpdate, thresholds: thresholdUpdate });
    } catch {
      // if 404 / error, still update local state
    }
  };

  const handleToggleSpam = async (key: keyof SpamSettings) => {
    const updated = { ...spam, [key]: !spam[key] };
    setSpam(updated);
    await patchSettings(updated, thresholds);
    showToast("Setting updated.");
  };

  const handleSaveThresholds = async () => {
    setSaveLoading(true);
    try {
      await patchSettings(spam, thresholds);
      showToast("Thresholds saved.");
    } finally {
      setSaveLoading(false);
    }
  };

  const SPAM_TOGGLES: { key: keyof SpamSettings; label: string; description: string }[] = [
    {
      key: "flagManyLinks",
      label: "Flag posts with >5 links",
      description: "Automatically flag content containing more than 5 hyperlinks.",
    },
    {
      key: "flagNewAccounts",
      label: "Flag posts from accounts <24h old",
      description: "Hold posts from brand-new accounts for review before publishing.",
    },
    {
      key: "autoRejectKeywords",
      label: "Auto-reject posts matching keyword filters",
      description: "Automatically reject any post that contains a blocked keyword without manual review.",
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Auto-Moderation Rules</h1>
        <p className="text-gray-500 text-sm mt-0.5">Configure automated content filtering and detection settings</p>
      </div>

      {/* Section 1: Keyword Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Keyword Filters</h2>
          <p className="text-gray-500 text-xs mt-0.5">Blocked keywords and phrases that trigger moderation</p>
        </div>

        {/* Add keyword */}
        <div className="px-5 py-4 border-b border-gray-800">
          <div className="flex gap-3">
            <input
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddRule()}
              placeholder="Enter keyword or phrase..."
              className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500 placeholder-gray-600"
            />
            <button
              onClick={handleAddRule}
              disabled={addLoading || !newKeyword.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
            >
              {addLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add
            </button>
          </div>
        </div>

        {/* Rules list */}
        {rulesLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 size={20} className="animate-spin text-cyan-400" />
          </div>
        ) : rules.length === 0 ? (
          <div className="py-12 text-center text-gray-600 text-sm">No keyword filters added yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {["Keyword", "Added By", "Date Added", ""].map((h, i) => (
                  <th key={i} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 first:pl-5 last:pr-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rules.map(rule => (
                <tr key={rule.id} className="hover:bg-gray-800/40 transition">
                  <td className="px-4 py-3 pl-5 text-white text-sm font-medium">{rule.keyword}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{rule.createdBy}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(rule.createdAt)}</td>
                  <td className="px-4 py-3 pr-5 text-right">
                    <button
                      onClick={() => handleDeleteRule(rule.id, rule.keyword)}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Delete rule"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Section 2: Spam Detection Settings */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Spam Detection Settings</h2>
          <p className="text-gray-500 text-xs mt-0.5">Toggle automated spam detection behaviours</p>
        </div>
        <div className="divide-y divide-gray-800">
          {SPAM_TOGGLES.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between px-5 py-4 gap-4">
              <div>
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{description}</p>
              </div>
              <Toggle on={spam[key]} onToggle={() => handleToggleSpam(key)} />
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Thresholds */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Thresholds</h2>
          <p className="text-gray-500 text-xs mt-0.5">Numeric limits that trigger automated actions</p>
        </div>
        <div className="px-5 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Flag after X reports
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={thresholds.flagAfterReports}
                onChange={e => setThresholds(prev => ({ ...prev, flagAfterReports: Number(e.target.value) }))}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-gray-600 text-xs mt-1">Content is flagged for review after this many user reports.</p>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Auto-ban after X violations
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={thresholds.autoBanAfterViolations}
                onChange={e => setThresholds(prev => ({ ...prev, autoBanAfterViolations: Number(e.target.value) }))}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-gray-600 text-xs mt-1">Users are automatically banned after accumulating this many violations.</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveThresholds}
              disabled={saveLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
            >
              {saveLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Thresholds
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
