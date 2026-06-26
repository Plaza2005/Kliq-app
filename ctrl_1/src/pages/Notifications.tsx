import { useState, useEffect } from "react";
import { Send, Bell, CheckCircle, Users, Star, Zap, Loader2 } from "lucide-react";
import { adminApi } from "../api/client";

type Audience = "all" | "tier2plus" | "tier3" | "new";

interface SentNotif {
  id: number;
  title: string;
  message: string;
  audience: Audience;
  sentAt: string;
  delivered: number;
  opened: number;
}

const AUDIENCE_LABELS: Record<Audience, string> = {
  all:      "All Users",
  tier2plus:"Tier 2+ (Plus & Pro)",
  tier3:    "Tier 3 (Pro only)",
  new:      "New Users (last 7 days)",
};

const AUDIENCE_ICONS: Record<Audience, React.ElementType> = {
  all:      Users,
  tier2plus:Star,
  tier3:    Zap,
  new:      Bell,
};

export function Notifications() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [sent, setSent] = useState(false);
  const [history, setHistory] = useState<SentNotif[]>([]);
  const [error, setError] = useState("");
  const [audienceCounts, setAudienceCounts] = useState<Record<Audience, number>>({
    all: 0, tier2plus: 0, tier3: 0, new: 0,
  });

  useEffect(() => {
    adminApi.get<{
      stats: { totalUsers: number };
      tiers: { free: number; plus: number; pro: number };
      userChart: { day: string; users: number }[];
    }>("/admin/stats").then(resp => {
      const plus = resp.tiers?.plus ?? 0;
      const pro  = resp.tiers?.pro  ?? 0;
      const newLast7 = resp.userChart?.reduce((a, d) => a + d.users, 0) ?? 0;
      setAudienceCounts({
        all:      resp.stats?.totalUsers ?? 0,
        tier2plus:plus + pro,
        tier3:    pro,
        new:      newLast7,
      });
    }).catch(() => {/* leave counts at 0 */});
  }, []);

  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    if (!message.trim()) { setError("Message is required."); return; }
    setSending(true);
    setError("");
    try {
      const result = await adminApi.post<{ sent: boolean; recipients: number }>(
        "/admin/notifications/broadcast",
        { title: title.trim(), message: message.trim(), audience }
      );
      const newNotif: SentNotif = {
        id: Date.now(),
        title, message, audience,
        sentAt: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        delivered: result.recipients,
        opened: 0,
      };
      setHistory(prev => [newNotif, ...prev]);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setAudience("all");
    setSent(false);
    setError("");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Push Notifications</h1>
        <p className="text-gray-500 text-sm mt-0.5">Broadcast messages to KLIQ users</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Composer */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
            <Bell size={16} className="text-indigo-400" /> Compose Notification
          </h2>

          {sent ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-3">
                <CheckCircle size={28} className="text-green-400" />
              </div>
              <p className="text-white font-bold text-lg mb-1">Notification Sent!</p>
              <p className="text-gray-400 text-sm mb-1">
                Queued for <span className="text-white font-semibold">{audienceCounts[audience].toLocaleString()}</span> users
              </p>
              <p className="text-gray-500 text-xs mb-6">{AUDIENCE_LABELS[audience]}</p>
              <button onClick={resetForm}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
                Send Another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-4">
              {/* Audience */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Audience</label>
                <div className="space-y-2">
                  {(["all", "tier2plus", "tier3", "new"] as Audience[]).map(a => {
                    const Icon = AUDIENCE_ICONS[a];
                    return (
                      <button type="button" key={a} onClick={() => setAudience(a)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition text-left ${
                          audience === a
                            ? "border-indigo-500 bg-indigo-500/10 text-white"
                            : "border-gray-700 bg-gray-800 text-gray-400 hover:text-white hover:border-gray-600"
                        }`}>
                        <Icon size={14} className={audience === a ? "text-indigo-400" : "text-gray-500"} />
                        <span className="flex-1">{AUDIENCE_LABELS[a]}</span>
                        <span className="text-xs text-gray-500">
                          {audienceCounts[a] > 0 ? audienceCounts[a].toLocaleString() : "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  maxLength={80}
                  placeholder="Notification title..."
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 placeholder-gray-600" />
                <p className="text-gray-600 text-xs text-right mt-1">{title.length}/80</p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Message</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  maxLength={200} rows={4}
                  placeholder="Notification body..."
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 placeholder-gray-600 resize-none" />
                <p className="text-gray-600 text-xs text-right mt-1">{message.length}/200</p>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-800/40 text-red-400 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button type="submit" disabled={sending}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-60">
                {sending ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : <><Send size={15} /> Send Notification</>}
              </button>
            </form>
          )}
        </div>

        {/* History */}
        <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">Sent History</h2>
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
                <Bell size={24} className="text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium mb-1">No notifications sent yet</p>
              <p className="text-gray-600 text-sm">Notifications you send will appear here with delivery stats.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map(n => {
                const Icon = AUDIENCE_ICONS[n.audience];
                const openRate = n.delivered > 0 ? Math.round((n.opened / n.delivered) * 100) : 0;
                return (
                  <div key={n.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-white text-sm font-semibold">{n.title}</p>
                      <span className="text-gray-500 text-xs whitespace-nowrap flex-shrink-0">{n.sentAt}</span>
                    </div>
                    <p className="text-gray-400 text-xs mb-3 line-clamp-2">{n.message}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                        <Icon size={11} /> {AUDIENCE_LABELS[n.audience]}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-400">{n.delivered.toLocaleString()} queued</span>
                        <span className="text-green-400 font-semibold">{openRate > 0 ? `${openRate}% opened` : "—"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
