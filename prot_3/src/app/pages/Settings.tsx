import { useNavigate } from "react-router";
import {
  User, Bell, Shield, Eye, EyeOff, Palette, Wifi, HelpCircle,
  ChevronRight, LogOut, Trash2, CreditCard, Globe, ExternalLink,
  Lock, BarChart2, DollarSign, ShoppingCart, Target, Repeat, X,
  ChevronDown, Check, Phone, Mail, AlertTriangle, Smartphone,
  Heart, MessageCircle, UserPlus, AtSign, Radio, Search,
  Users, Download, Send, Layers, UserCheck, Grid, Play, Tv, Store,
  Camera, Loader2
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useUser } from "../context/UserContext";
import type { TabKey, TabVisibility } from "../context/UserContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api, resolveMediaUrl } from "../api/client";

/* ─── Marketplace analytics data ─── */
const MKT_STATS = [
  { label: "Gross Merchandise Value", value: "$12,840", change: "+31%", icon: DollarSign },
  { label: "Total Orders", value: "268", change: "+18%", icon: ShoppingCart },
  { label: "Conversion Rate", value: "4.2%", change: "+0.8%", icon: Target },
  { label: "Repeat Buyers", value: "58%", change: "+6%", icon: Repeat },
];
const MKT_TOP = [
  { title: "UI Kit - Dark Mode", revenue: "$2,140", units: 112 },
  { title: "Lofi Beat Pack Vol.3", revenue: "$1,610", units: 55 },
  { title: "Brand Identity Design", revenue: "$1,495", units: 5 },
];

const LANGUAGES = [
  "English (US)", "English (UK)", "Spanish", "French", "German",
  "Portuguese", "Arabic", "Japanese", "Korean", "Chinese (Simplified)",
  "Italian", "Dutch", "Russian", "Hindi", "Turkish",
];

const CONTENT_CATEGORIES = [
  "Music", "Dance", "Comedy", "Gaming", "Food", "Travel",
  "Fitness", "Tech", "Fashion", "Art", "Sports", "Education",
  "Animals", "DIY", "Finance",
];

const BLOCKED_USERS = [
  { user: "spam_acc99", avatar: "/avatar-default.svg" },
  { user: "troll_hater", avatar: "/avatar-default.svg" },
];

const FAQ = [
  { q: "How do I change my username?", a: "Go to Edit Profile from Settings > Account. Usernames can be changed once every 30 days." },
  { q: "How does the Tier system work?", a: "Tier 1 is free. Tier 2 (Plus) unlocks KliqStream and advanced features for $9.99/mo. Tier 3 (Pro) unlocks all creator tools for $29.99/mo." },
  { q: "Why is my account restricted?", a: "Accounts may be restricted for violating community guidelines. Check your email for details or contact support below." },
  { q: "How do I earn from Kliq?", a: "Creators earn through Amplify boosts, Marketplace sales, community subscriptions, and the Kliq Partner Program (Tier 3+)." },
  { q: "Can I download videos for offline viewing?", a: "Yes — tap the Download icon on any video. Offline videos are managed in Kliq Studio under Offline Videos." },
  { q: "How do I report a bug?", a: "Use Settings > Report a Problem. Include steps to reproduce, and our team will get back to you within 48 hours." },
];

const REPORT_CATEGORIES = [
  "App crashes / freezes", "Video not playing", "Audio issue",
  "Upload failing", "Missing features", "Account issue", "Other",
];

type Visibility = "Everyone" | "Friends" | "No one";

/* ─── Reusable components ─── */
function Sheet({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end" onClick={onClose}>
      <div className="w-full bg-gray-950 border-t border-gray-800 rounded-t-3xl flex flex-col max-w-xl mx-auto" style={{ maxHeight: "min(88vh, 700px)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <h3 className="text-white font-bold text-base">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-800 rounded-full transition">
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${on ? "bg-purple-600" : "bg-gray-700"}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function RadioGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="divide-y divide-gray-800">
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-900/50 transition text-left">
          <span className="text-white text-sm">{o}</span>
          {value === o && <Check size={16} className="text-purple-400" />}
        </button>
      ))}
    </div>
  );
}

export function Settings() {
  const navigate = useNavigate();
  const { tier, setTier, tabVisibility, setTabVis } = useUser();
  const { user, refreshUser } = useAuth();
  const { mode: themeMode, setMode: setThemeMode, effective: themeEffective } = useTheme();

  /* Modal visibility */
  const [showBilling, setShowBilling] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showMktAnalytics, setShowMktAnalytics] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [showPushNotif, setShowPushNotif] = useState(false);
  const [showEmailNotif, setShowEmailNotif] = useState(false);
  const [showContentPrefs, setShowContentPrefs] = useState(false);
  const [showDownloadQuality, setShowDownloadQuality] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showProfileTabs, setShowProfileTabs] = useState(false);
  const [showCancelSub, setShowCancelSub] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDone, setCancelDone] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  /* Verification badge */
  const [badgeModal, setBadgeModal] = useState(false);
  const [badgeReason, setBadgeReason] = useState("");
  const [badgeSubmitting, setBadgeSubmitting] = useState(false);
  const [badgeDone, setBadgeDone] = useState(false);

  /* Tier upgrade */
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<"plus" | "pro" | null>(null);
  const [upgradeConfirm, setUpgradeConfirm] = useState(false);

  /* Language */
  const [language, setLanguage] = useState("English (US)");
  const [langSearch, setLangSearch] = useState("");

  /* Privacy */
  const [privateAccount, setPrivateAccount] = useState(false);
  const [whoCanComment, setWhoCanComment] = useState<Visibility>("Everyone");
  const [whoCanDuet, setWhoCanDuet] = useState<Visibility>("Everyone");
  const [whoCanMessage, setWhoCanMessage] = useState<Visibility>("Friends");
  const [whoCanFollow, setWhoCanFollow] = useState<Visibility>("Everyone");
  const [showFollowLists, setShowFollowLists] = useState(true);
  const [dataSharingAds, setDataSharingAds] = useState(true);
  const [privacySubSection, setPrivacySubSection] = useState<string | null>(null);

  /* Blocked */
  const [blocked, setBlocked] = useState(BLOCKED_USERS.map(u => u.user));

  /* 2FA */
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState<"choose" | "phone" | "code" | "done">("choose");
  const [twoFAMethod, setTwoFAMethod] = useState<"SMS" | "Email" | "App">("SMS");
  const [twoFAInput, setTwoFAInput] = useState("");
  const [twoFACode, setTwoFACode] = useState("");

  /* Browser push notifications */
  const [browserNotifPermission, setBrowserNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setBrowserNotifPermission(Notification.permission);
  }, []);
  const requestBrowserNotif = () => {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(p => setBrowserNotifPermission(p));
  };

  /* Push notifications */
  const [pn_likes, setPnLikes] = useState(true);
  const [pn_comments, setPnComments] = useState(true);
  const [pn_follows, setPnFollows] = useState(true);
  const [pn_mentions, setPnMentions] = useState(true);
  const [pn_live, setPnLive] = useState(false);
  const [pn_dms, setPnDms] = useState(true);
  const [pn_collabs, setPnCollabs] = useState(false);

  /* Email notifications */
  const [en_digest, setEnDigest] = useState(true);
  const [en_promos, setEnPromos] = useState(false);
  const [en_security, setEnSecurity] = useState(true);
  const [en_creator, setEnCreator] = useState(true);

  /* Content preferences */
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(["Music", "Gaming", "Tech", "Art"])
  );
  const toggleCategory = (c: string) =>
    setSelectedCategories(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });

  /* Download quality */
  const [downloadQuality, setDownloadQuality] = useState("Auto");

  /* Help center */
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  /* Report */
  const [reportCategory, setReportCategory] = useState("");
  const [reportText, setReportText] = useState("");
  const [reportSent, setReportSent] = useState(false);

  /* Delete account */
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  /* Avatar upload */
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpdatingAvatar(true);
    try {
      const { url } = await api.upload(file);
      await api.patch("/users/me/settings", { avatarUrl: url });
      await refreshUser();
    } catch {
      // silent fail
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const SETTINGS_SECTIONS = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Edit Profile", desc: "Name, bio, avatar", action: () => navigate("/edit-profile") },
        { icon: CreditCard, label: "Subscription & Billing", desc: "Manage your plan and payments", action: () => setShowBilling(true) },
        { icon: Globe, label: "Language & Region", desc: language, action: () => setShowLanguage(true) },
      ],
    },
    {
      title: "Security",
      items: [
        { icon: Lock, label: "Two-Factor Auth", desc: twoFAEnabled ? "Enabled" : "Not enabled", action: () => { setShow2FA(true); setTwoFAStep("choose"); } },
      ],
    },
    {
      title: "Appearance",
      items: [
        {
          icon: Palette,
          label: "Theme",
          desc: themeMode === "system" ? `System (${themeEffective})` : themeMode === "dark" ? "Dark" : "Light",
          action: () => setShowTheme(true),
        },
      ],
    },
    {
      title: "Creator",
      items: [
        { icon: Palette, label: "Content Preferences", desc: `${selectedCategories.size} categories selected`, action: () => setShowContentPrefs(true) },
        { icon: Download, label: "Download Quality", desc: downloadQuality, action: () => setShowDownloadQuality(true) },
      ],
    },
    {
      title: "Marketplace",
      items: [
        {
          icon: BarChart2,
          label: "Marketplace Analytics",
          desc: tier === 3 ? "Revenue, orders, conversion & more" : "Tier 3 Pro required",
          action: () => tier === 3 ? setShowMktAnalytics(true) : setShowUpgrade(true),
          locked: tier < 3,
        },
      ],
    },
    {
      title: "Profile",
      items: [
        {
          icon: Layers,
          label: "Profile Tabs",
          desc: `${Object.values(tabVisibility).filter(v => v !== "Hidden").length} tabs visible`,
          action: () => setShowProfileTabs(true),
        },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help Center", desc: "FAQs and contact support", action: () => setShowHelpCenter(true) },
        { icon: AlertTriangle, label: "Report a Problem", desc: "Bug reports and feedback", action: () => { setShowReport(true); setReportSent(false); setReportCategory(""); setReportText(""); } },
      ],
    },
  ];

  return (
    <div className="min-h-full bg-black pb-24">

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[90] bg-gray-900 text-white text-sm px-5 py-2.5 rounded-full shadow-xl border border-gray-700 pointer-events-none whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* ── PROFILE TABS ── */}
      <Sheet show={showProfileTabs} onClose={() => setShowProfileTabs(false)} title="Profile Tabs">
        <div className="px-5 pt-3 pb-2 border-b border-gray-800">
          <p className="text-gray-500 text-xs leading-relaxed">Control which tabs appear on your profile and who can see them.</p>
        </div>
        <div className="divide-y divide-gray-800">
          {(
            [
              { key: "Posts" as TabKey,       label: "Posts",        icon: Grid,       desc: "Your photo and text posts" },
              { key: "Reels" as TabKey,       label: "Reels",        icon: Play,       desc: "Short-form video clips" },
              { key: "KliqTube" as TabKey,    label: "KliqTube",     icon: Play,       desc: "Long-form videos" },
              { key: "KliqStream" as TabKey,  label: "KliqStream",   icon: Tv,         desc: "Movies, series & sports" },
              { key: "Marketplace" as TabKey, label: "Marketplace",  icon: Store,      desc: "Your store listings" },
              { key: "Community" as TabKey,   label: "Community",    icon: Users,      desc: "Communities you manage" },
            ]
          ).map(tab => {
            const Icon = tab.icon;
            const vis = tabVisibility[tab.key];
            return (
              <div key={tab.key} className="px-5 py-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-semibold">{tab.label}</p>
                    <p className="text-gray-600 text-xs">{tab.desc}</p>
                  </div>
                  {vis === "Hidden" && <EyeOff size={14} className="text-gray-600" />}
                  {vis === "Friends" && <UserCheck size={14} className="text-purple-400" />}
                  {vis === "Everyone" && <Eye size={14} className="text-green-400" />}
                </div>
                <div className="flex gap-2 pl-11">
                  {(["Everyone", "Friends", "Hidden"] as TabVisibility[]).map(opt => (
                    <button key={opt} onClick={() => setTabVis(tab.key, opt)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        vis === opt
                          ? opt === "Everyone" ? "bg-green-900/30 border-green-700 text-green-300"
                          : opt === "Friends"  ? "bg-purple-900/30 border-purple-700 text-purple-300"
                                               : "bg-gray-800 border-gray-600 text-gray-300"
                          : "bg-transparent border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400"
                      }`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-5 border-t border-gray-800">
          <p className="text-gray-600 text-xs text-center">
            <UserCheck size={10} className="inline mr-1 text-purple-400" />Friends = followers only &nbsp;·&nbsp;
            <EyeOff size={10} className="inline mr-1 text-gray-500" />Hidden = not shown on profile
          </p>
        </div>
      </Sheet>

      {/* ── MARKETPLACE ANALYTICS ── */}
      <Sheet show={showMktAnalytics} onClose={() => setShowMktAnalytics(false)} title="Marketplace Analytics">
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {MKT_STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="p-4 bg-gray-900/60 border border-purple-900/40 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <Icon size={15} className="text-purple-400" />
                    <span className="text-green-400 text-xs font-semibold">{s.change}</span>
                  </div>
                  <div className="text-xl font-bold text-white mb-0.5">{s.value}</div>
                  <div className="text-gray-500 text-xs">{s.label}</div>
                </div>
              );
            })}
          </div>
          <div className="bg-gray-900/60 border border-purple-900/40 rounded-xl p-4">
            <h4 className="text-white font-bold text-sm mb-3">Top Selling Products</h4>
            <div className="space-y-2">
              {MKT_TOP.map((item, i) => (
                <div key={item.title} className="flex items-center gap-3 p-2.5 bg-gray-900 rounded-xl">
                  <div className="w-7 h-7 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{i + 1}</div>
                  <div className="flex-1">
                    <div className="text-white text-xs font-medium">{item.title}</div>
                    <div className="text-gray-500 text-[10px]">{item.units} units</div>
                  </div>
                  <div className="text-green-400 font-bold text-sm">{item.revenue}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-900/60 border border-purple-900/40 rounded-xl p-4">
            <h4 className="text-white font-bold text-sm mb-3">Store Health</h4>
            <div className="divide-y divide-gray-800">
              {[
                { label: "Avg. fulfillment time", value: "1.2 days" },
                { label: "Dispute rate", value: "0.4%" },
                { label: "Review score", value: "4.8 / 5" },
                { label: "Active listings", value: "34" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5">
                  <span className="text-gray-400 text-sm">{row.label}</span>
                  <span className="text-white text-sm font-bold">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Sheet>

      {/* ── BILLING ── */}
      <Sheet show={showBilling} onClose={() => { setShowBilling(false); setShowCancelSub(false); setCancelDone(false); setCancelReason(""); }} title="Subscription & Billing">
        <div className="p-5 space-y-4">
          {/* Current plan card */}
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-700/50 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-xs mb-0.5">Current Plan</p>
                <p className="text-white font-bold text-lg">Tier {tier} — {tier === 1 ? "Basic" : tier === 2 ? "Plus" : "Pro"}</p>
                <p className="text-gray-400 text-sm mt-0.5">{tier === 1 ? "Free" : tier === 2 ? "$9.99/month" : "$29.99/month"}</p>
              </div>
              {tier > 1 && (
                <span className="text-[10px] font-bold bg-purple-700/40 text-purple-300 px-2 py-1 rounded-full mt-0.5">Active</span>
              )}
            </div>
            {tier > 1 && (
              <div className="mt-3 pt-3 border-t border-purple-800/50">
                <p className="text-gray-500 text-xs">Next billing date: <span className="text-gray-300 font-medium">July 20, 2026</span></p>
                <p className="text-gray-500 text-xs mt-0.5">Payment method: <span className="text-gray-300 font-medium">Google Play •••• 4242</span></p>
              </div>
            )}
          </div>

          {/* Billing history */}
          {tier > 1 && (
            <div className="bg-gray-900 rounded-xl overflow-hidden">
              <p className="text-gray-400 text-xs font-semibold px-4 py-2.5 border-b border-gray-800 uppercase tracking-widest">Recent Invoices</p>
              {[
                { date: "Jun 20, 2026", amount: tier === 2 ? "$9.99" : "$29.99", status: "Paid" },
                { date: "May 20, 2026", amount: tier === 2 ? "$9.99" : "$29.99", status: "Paid" },
                { date: "Apr 20, 2026", amount: tier === 2 ? "$9.99" : "$29.99", status: "Paid" },
              ].map(inv => (
                <div key={inv.date} className="flex items-center justify-between px-4 py-3 border-b border-gray-800 last:border-b-0">
                  <p className="text-white text-sm">{inv.date}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">{inv.amount}</span>
                    <span className="text-green-400 text-xs font-semibold">{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-blue-900/20 border border-blue-700/40 rounded-xl p-4">
            <p className="text-blue-300 text-sm font-medium mb-1">Managed by Google Play</p>
            <p className="text-blue-200/70 text-xs leading-relaxed">Billing is handled through Google Play. Changes take effect at the end of your current billing cycle.</p>
          </div>

          {/* Upgrade */}
          {tier < 3 && (
            <button onClick={() => { setShowBilling(false); setShowUpgrade(true); }} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition">
              View Upgrade Options
            </button>
          )}

          {/* Cancel subscription */}
          {tier > 1 && !showCancelSub && !cancelDone && (
            <button onClick={() => setShowCancelSub(true)}
              className="w-full border border-red-900/60 text-red-400 py-3 rounded-xl font-medium hover:bg-red-950/30 transition text-sm">
              Cancel Subscription
            </button>
          )}

          {/* Cancel flow */}
          {tier > 1 && showCancelSub && !cancelDone && (
            <div className="bg-gray-900 rounded-xl p-4 space-y-3 border border-red-900/40">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
                <p className="text-white font-semibold text-sm">Cancel Tier {tier} {tier === 2 ? "Plus" : "Pro"}?</p>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                You'll lose access to {tier === 2 ? "KliqStream, advanced analytics, and Upload to KliqTube" : "your Marketplace storefront, analytics, and all Pro features"} at the end of your billing cycle on <span className="text-white font-medium">July 20, 2026</span>.
              </p>
              <div>
                <p className="text-gray-400 text-xs mb-1.5">Why are you cancelling?</p>
                <div className="relative">
                  <select value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-lg text-sm outline-none appearance-none focus:border-red-500 transition">
                    <option value="">Select a reason…</option>
                    <option>Too expensive</option>
                    <option>Not using the features</option>
                    <option>Switching to another plan</option>
                    <option>Technical issues</option>
                    <option>Other</option>
                  </select>
                  <ChevronDown size={14} className="text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowCancelSub(false); setCancelReason(""); }}
                  className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition">
                  Keep Plan
                </button>
                <button
                  disabled={!cancelReason}
                  onClick={() => { setTier(1); setCancelDone(true); setShowCancelSub(false); showToast("Subscription cancelled"); }}
                  className="flex-1 bg-red-700 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-600 transition disabled:opacity-40">
                  Confirm Cancel
                </button>
              </div>
            </div>
          )}

          {/* Cancelled confirmation */}
          {cancelDone && (
            <div className="flex items-center gap-3 p-4 bg-gray-900 rounded-xl border border-gray-800">
              <Check size={18} className="text-green-400 flex-shrink-0" />
              <p className="text-gray-300 text-sm">Subscription cancelled. Access continues until July 20, 2026.</p>
            </div>
          )}

          <button onClick={() => { setShowBilling(false); setShowCancelSub(false); setCancelDone(false); setCancelReason(""); }}
            className="w-full border border-gray-700 text-white py-3 rounded-xl font-medium hover:bg-gray-900 transition">
            Close
          </button>
        </div>
      </Sheet>

      {/* ── THEME ── */}
      <Sheet show={showTheme} onClose={() => setShowTheme(false)} title="Appearance">
        <div className="p-5 space-y-3">
          <p className="text-gray-500 text-sm">Choose how KLIQ looks on your device.</p>
          {(["dark", "light", "system"] as const).map(opt => {
            const labels = { dark: "Dark", light: "Light", system: "System Default" };
            const icons = { dark: "🌙", light: "☀️", system: "⚙️" };
            const descs = {
              dark: "Always use dark theme",
              light: "Always use light theme",
              system: "Follow your device setting",
            };
            return (
              <button key={opt} onClick={() => { setThemeMode(opt); setShowTheme(false); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition text-left ${themeMode === opt ? "border-purple-600 bg-purple-900/20" : "border-gray-800 hover:border-gray-700 bg-gray-900"}`}>
                <span className="text-2xl">{icons[opt]}</span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${themeMode === opt ? "text-white" : "text-gray-300"}`}>{labels[opt]}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{descs[opt]}</p>
                </div>
                {themeMode === opt && <Check size={18} className="text-purple-400 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </Sheet>

      {/* ── LANGUAGE ── */}
      <Sheet show={showLanguage} onClose={() => setShowLanguage(false)} title="Language & Region">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2 bg-gray-900 rounded-xl px-3 py-2.5">
            <Search size={15} className="text-gray-500 flex-shrink-0" />
            <input
              value={langSearch}
              onChange={e => setLangSearch(e.target.value)}
              placeholder="Search language..."
              className="bg-transparent text-white text-sm outline-none flex-1 placeholder-gray-600"
            />
          </div>
        </div>
        <RadioGroup
          options={LANGUAGES.filter(l => l.toLowerCase().includes(langSearch.toLowerCase()))}
          value={language}
          onChange={v => { setLanguage(v); setShowLanguage(false); }}
        />
      </Sheet>

      {/* ── PRIVACY ── */}
      <Sheet show={showPrivacy} onClose={() => { setShowPrivacy(false); setPrivacySubSection(null); }} title={privacySubSection || "Privacy"}>
        {!privacySubSection ? (
          <div className="divide-y divide-gray-800">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-white text-sm font-medium">Private Account</p>
                <p className="text-gray-500 text-xs mt-0.5">Only approved followers see your content</p>
              </div>
              <Toggle on={privateAccount} onChange={() => setPrivateAccount(p => !p)} />
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-white text-sm font-medium">Show Followers/Following Lists</p>
                <p className="text-gray-500 text-xs mt-0.5">Others can see who you follow</p>
              </div>
              <Toggle on={showFollowLists} onChange={() => setShowFollowLists(p => !p)} />
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-white text-sm font-medium">Data Sharing for Ads</p>
                <p className="text-gray-500 text-xs mt-0.5">Personalized ad experiences</p>
              </div>
              <Toggle on={dataSharingAds} onChange={() => setDataSharingAds(p => !p)} />
            </div>
            {[
              { label: "Who can comment", value: whoCanComment, key: "comment" },
              { label: "Who can Duet/Remix", value: whoCanDuet, key: "duet" },
              { label: "Who can send messages", value: whoCanMessage, key: "message" },
              { label: "Who can follow you", value: whoCanFollow, key: "follow" },
            ].map(item => (
              <button key={item.key} onClick={() => setPrivacySubSection(item.label)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-900/50 transition text-left">
                <div>
                  <p className="text-white text-sm font-medium">{item.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{item.value}</p>
                </div>
                <ChevronRight size={16} className="text-gray-600" />
              </button>
            ))}
          </div>
        ) : (
          <>
            <button onClick={() => setPrivacySubSection(null)} className="flex items-center gap-2 px-5 py-3 text-purple-400 text-sm hover:text-purple-300 transition border-b border-gray-800 w-full">
              ← Back
            </button>
            <RadioGroup
              options={["Everyone", "Friends", "No one"]}
              value={
                privacySubSection === "Who can comment" ? whoCanComment :
                privacySubSection === "Who can Duet/Remix" ? whoCanDuet :
                privacySubSection === "Who can send messages" ? whoCanMessage : whoCanFollow
              }
              onChange={v => {
                const vis = v as Visibility;
                if (privacySubSection === "Who can comment") setWhoCanComment(vis);
                else if (privacySubSection === "Who can Duet/Remix") setWhoCanDuet(vis);
                else if (privacySubSection === "Who can send messages") setWhoCanMessage(vis);
                else setWhoCanFollow(vis);
                setPrivacySubSection(null);
              }}
            />
          </>
        )}
      </Sheet>

      {/* ── BLOCKED ACCOUNTS ── */}
      <Sheet show={showBlocked} onClose={() => setShowBlocked(false)} title={`Blocked Accounts (${blocked.length})`}>
        {blocked.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Eye size={36} className="text-gray-700" />
            <p className="text-gray-500 text-sm">No blocked accounts</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {BLOCKED_USERS.filter(u => blocked.includes(u.user)).map(u => (
              <div key={u.user} className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl">
                <img src={u.avatar} alt={u.user} className="w-10 h-10 rounded-full bg-gray-800" />
                <p className="text-white text-sm font-medium flex-1">@{u.user}</p>
                <button
                  onClick={() => setBlocked(prev => prev.filter(x => x !== u.user))}
                  className="px-4 py-1.5 border border-gray-700 text-gray-300 text-xs font-bold rounded-full hover:border-gray-500 transition"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </Sheet>

      {/* ── TWO-FACTOR AUTH ── */}
      <Sheet show={show2FA} onClose={() => setShow2FA(false)} title="Two-Factor Authentication">
        <div className="p-5">
          {twoFAStep === "choose" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-900 rounded-xl mb-2">
                <span className="text-white text-sm">Two-Factor Auth</span>
                <Toggle on={twoFAEnabled} onChange={() => { setTwoFAEnabled(p => !p); if (!twoFAEnabled) setTwoFAStep("choose"); }} />
              </div>
              {!twoFAEnabled && (
                <>
                  <p className="text-gray-400 text-sm">Choose a verification method:</p>
                  {([
                    { key: "SMS", icon: Phone, label: "SMS / Text Message", desc: "Code sent to your phone number" },
                    { key: "Email", icon: Mail, label: "Email", desc: "Code sent to nambingareiter05@gmail.com" },
                    { key: "App", icon: Smartphone, label: "Authenticator App", desc: "Google Authenticator or Authy" },
                  ] as { key: "SMS"|"Email"|"App"; icon: typeof Phone; label: string; desc: string }[]).map(m => (
                    <button key={m.key} onClick={() => { setTwoFAMethod(m.key); setTwoFAStep("phone"); setTwoFAInput(""); }}
                      className="w-full flex items-center gap-4 p-4 bg-gray-900 rounded-xl hover:bg-gray-800 transition text-left">
                      <div className="w-10 h-10 bg-purple-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                        <m.icon size={20} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">{m.label}</p>
                        <p className="text-gray-500 text-xs">{m.desc}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {twoFAEnabled && (
                <div className="p-4 bg-green-900/20 border border-green-800/40 rounded-xl">
                  <p className="text-green-400 font-semibold text-sm">2FA is active</p>
                  <p className="text-gray-400 text-xs mt-1">Your account is protected with {twoFAMethod} verification.</p>
                </div>
              )}
            </div>
          )}
          {twoFAStep === "phone" && (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">{twoFAMethod === "SMS" ? "Enter your phone number:" : twoFAMethod === "Email" ? "Confirm your email:" : "Scan this QR code with your authenticator app, then enter the 6-digit code:"}</p>
              {twoFAMethod !== "App" ? (
                <input value={twoFAInput} onChange={e => setTwoFAInput(e.target.value)}
                  placeholder={twoFAMethod === "SMS" ? "+1 (555) 000-0000" : "your@email.com"}
                  className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-purple-500 transition" />
              ) : (
                <div className="w-40 h-40 bg-white rounded-xl mx-auto flex items-center justify-center">
                  <div className="grid grid-cols-5 gap-0.5">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className={`w-4 h-4 ${Math.random() > 0.5 ? "bg-black" : "bg-white"}`} />
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setTwoFAStep("code")} disabled={twoFAMethod !== "App" && !twoFAInput.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-40">
                {twoFAMethod === "App" ? "I've scanned the code" : "Send Code"}
              </button>
              <button onClick={() => setTwoFAStep("choose")} className="w-full text-gray-500 text-sm py-2">← Back</button>
            </div>
          )}
          {twoFAStep === "code" && (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">Enter the 6-digit verification code:</p>
              <input value={twoFACode} onChange={e => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000" maxLength={6}
                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl text-sm text-center tracking-[0.5em] text-lg font-bold outline-none focus:border-purple-500 transition" />
              <button onClick={() => { setTwoFAEnabled(true); setTwoFAStep("done"); }} disabled={twoFACode.length < 6}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-40">
                Verify
              </button>
              <button onClick={() => setTwoFAStep("phone")} className="w-full text-gray-500 text-sm py-2">Resend code</button>
            </div>
          )}
          {twoFAStep === "done" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-16 h-16 bg-green-900/30 border border-green-700/50 rounded-full flex items-center justify-center">
                <Check size={28} className="text-green-400" />
              </div>
              <p className="text-white font-bold text-lg">2FA Enabled!</p>
              <p className="text-gray-400 text-sm text-center">Your account is now protected with two-factor authentication.</p>
              <button onClick={() => setShow2FA(false)} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition mt-2">
                Done
              </button>
            </div>
          )}
        </div>
      </Sheet>

      {/* ── PUSH NOTIFICATIONS ── */}
      <Sheet show={showPushNotif} onClose={() => setShowPushNotif(false)} title="Push Notifications">
        <div className="divide-y divide-gray-800">
          {/* Browser-level push notification permission */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell size={17} className="text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Browser push notifications</p>
                <p className="text-gray-500 text-xs">
                  {browserNotifPermission === "granted"
                    ? "Enabled — you'll receive notifications when the tab is in the background"
                    : browserNotifPermission === "denied"
                    ? "Blocked by browser — enable in browser site settings"
                    : "Not yet enabled"}
                </p>
              </div>
              {browserNotifPermission !== "granted" && browserNotifPermission !== "denied" && (
                <button
                  onClick={requestBrowserNotif}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded-lg transition flex-shrink-0"
                >
                  Enable
                </button>
              )}
              {browserNotifPermission === "granted" && (
                <Check size={16} className="text-green-400 flex-shrink-0" />
              )}
            </div>
          </div>
          {([
            { icon: Heart, label: "Likes", desc: "When someone likes your post", on: pn_likes, toggle: () => setPnLikes(p => !p) },
            { icon: MessageCircle, label: "Comments", desc: "When someone comments on your post", on: pn_comments, toggle: () => setPnComments(p => !p) },
            { icon: UserPlus, label: "New Followers", desc: "When someone follows you", on: pn_follows, toggle: () => setPnFollows(p => !p) },
            { icon: AtSign, label: "Mentions", desc: "When someone tags you", on: pn_mentions, toggle: () => setPnMentions(p => !p) },
            { icon: Radio, label: "Live Streams", desc: "When accounts you follow go live", on: pn_live, toggle: () => setPnLive(p => !p) },
            { icon: MessageCircle, label: "Direct Messages", desc: "New messages in inbox", on: pn_dms, toggle: () => setPnDms(p => !p) },
            { icon: Users, label: "Collabs & Invites", desc: "Collaboration requests", on: pn_collabs, toggle: () => setPnCollabs(p => !p) },
          ]).map(item => (
            <div key={item.label} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                <item.icon size={17} className="text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{item.label}</p>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </div>
              <Toggle on={item.on} onChange={item.toggle} />
            </div>
          ))}
        </div>
      </Sheet>

      {/* ── EMAIL NOTIFICATIONS ── */}
      <Sheet show={showEmailNotif} onClose={() => setShowEmailNotif(false)} title="Email Notifications">
        <div className="divide-y divide-gray-800">
          {([
            { label: "Weekly Digest", desc: "Your weekly stats and highlights", on: en_digest, toggle: () => setEnDigest(p => !p) },
            { label: "Promotions & Offers", desc: "Special deals and announcements", on: en_promos, toggle: () => setEnPromos(p => !p) },
            { label: "Security Alerts", desc: "Login attempts and account changes", on: en_security, toggle: () => setEnSecurity(p => !p) },
            { label: "Creator Tips", desc: "Grow your audience with tips", on: en_creator, toggle: () => setEnCreator(p => !p) },
          ]).map(item => (
            <div key={item.label} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{item.label}</p>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </div>
              <Toggle on={item.on} onChange={item.toggle} />
            </div>
          ))}
          <div className="px-5 py-4">
            <p className="text-gray-600 text-xs">Emails sent to: nambingareiter05@gmail.com</p>
          </div>
        </div>
      </Sheet>

      {/* ── CONTENT PREFERENCES ── */}
      <Sheet show={showContentPrefs} onClose={() => setShowContentPrefs(false)} title="Content Preferences">
        <div className="p-5">
          <p className="text-gray-400 text-sm mb-4">Select the topics you enjoy. Your feed will be personalized.</p>
          <div className="flex flex-wrap gap-2">
            {CONTENT_CATEGORIES.map(c => (
              <button key={c} onClick={() => toggleCategory(c)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                  selectedCategories.has(c)
                    ? "bg-purple-600/20 border-purple-500 text-purple-300"
                    : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500"
                }`}>
                {selectedCategories.has(c) && <span className="mr-1">✓</span>}{c}
              </button>
            ))}
          </div>
          <button onClick={() => setShowContentPrefs(false)} className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition">
            Save Preferences
          </button>
        </div>
      </Sheet>

      {/* ── DOWNLOAD QUALITY ── */}
      <Sheet show={showDownloadQuality} onClose={() => setShowDownloadQuality(false)} title="Download Quality">
        <div className="px-5 py-3">
          <p className="text-gray-400 text-sm pb-3 border-b border-gray-800">Higher quality uses more storage and data.</p>
        </div>
        <RadioGroup
          options={["Auto", "1080p (HD)", "720p", "480p", "360p"]}
          value={downloadQuality}
          onChange={v => { setDownloadQuality(v); setShowDownloadQuality(false); }}
        />
      </Sheet>

      {/* ── HELP CENTER ── */}
      <Sheet show={showHelpCenter} onClose={() => setShowHelpCenter(false)} title="Help Center">
        <div className="p-5">
          <div className="space-y-2 mb-5">
            {FAQ.map((item, i) => (
              <div key={i} className="bg-gray-900 rounded-xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left">
                  <p className="text-white text-sm font-medium pr-4">{item.q}</p>
                  <ChevronDown size={16} className={`text-gray-500 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4">
                    <p className="text-gray-400 text-sm leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="p-4 bg-gray-900 rounded-xl">
            <p className="text-white font-semibold text-sm mb-1">Still need help?</p>
            <p className="text-gray-500 text-xs mb-3">Our support team typically responds within 24 hours.</p>
            <button onClick={() => { setShowHelpCenter(false); setShowReport(true); setReportSent(false); setReportCategory(""); setReportText(""); }}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition">
              Contact Support
            </button>
          </div>
        </div>
      </Sheet>

      {/* ── REPORT A PROBLEM ── */}
      <Sheet show={showReport} onClose={() => setShowReport(false)} title="Report a Problem">
        <div className="p-5">
          {reportSent ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-16 h-16 bg-green-900/30 border border-green-700/50 rounded-full flex items-center justify-center">
                <Check size={28} className="text-green-400" />
              </div>
              <p className="text-white font-bold text-lg">Report Sent!</p>
              <p className="text-gray-400 text-sm text-center">Thanks for your feedback. We'll look into this and get back to you within 48 hours.</p>
              <button onClick={() => setShowReport(false)} className="w-full bg-gray-900 border border-gray-700 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition mt-2">
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-xs mb-2">Category</p>
                <div className="relative">
                  <select value={reportCategory} onChange={e => setReportCategory(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-purple-500 transition appearance-none">
                    <option value="">Select a category...</option>
                    {REPORT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={16} className="text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-2">Describe the problem</p>
                <textarea value={reportText} onChange={e => setReportText(e.target.value)}
                  rows={5} placeholder="Please describe what happened, including any steps to reproduce the issue..."
                  className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-purple-500 transition resize-none placeholder-gray-600" />
              </div>
              <p className="text-gray-600 text-xs">Logs and device info may be included to help diagnose the issue.</p>
              <button
                onClick={() => setReportSent(true)}
                disabled={!reportCategory || reportText.trim().length < 10}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2">
                <Send size={15} /> Send Report
              </button>
            </div>
          )}
        </div>
      </Sheet>

      {/* ── UPGRADE ── */}
      <Sheet show={showUpgrade} onClose={() => setShowUpgrade(false)} title="Upgrade Your Plan">
        <div className="p-5 space-y-4">
          {[
            {
              tier: 1, name: "Basic", price: "Free", current: tier === 1,
              features: ["Feed, Reels, Stories", "Inbox & Community", "Basic KliqTube", "Marketplace browsing", "Amplify boosts (free)"],
              gradient: "from-gray-800 to-gray-900", border: "border-gray-700",
            },
            {
              tier: 2, name: "Plus", price: "$9.99/mo", current: tier === 2,
              features: ["Everything in Basic", "KliqStream access", "Advanced analytics", "Priority support", "Upload to KliqTube"],
              gradient: "from-purple-900/30 to-pink-900/30", border: "border-purple-700/50",
            },
            {
              tier: 3, name: "Pro", price: "$29.99/mo", current: tier === 3,
              features: ["Everything in Plus", "Marketplace storefront", "Marketplace analytics", "Partner program", "Custom branding", "Kliq Business tools"],
              gradient: "from-yellow-900/20 to-orange-900/20", border: "border-yellow-700/40",
            },
          ].map(plan => (
            <div key={plan.tier} className={`bg-gradient-to-br ${plan.gradient} border ${plan.border} rounded-2xl p-5 ${plan.current ? "ring-2 ring-purple-500" : ""}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-white font-bold text-base">Tier {plan.tier} — {plan.name}</span>
                  {plan.current && <span className="ml-2 text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold">CURRENT</span>}
                </div>
                <span className="text-white font-bold">{plan.price}</span>
              </div>
              <div className="space-y-1.5 mb-4">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <Check size={13} className="text-green-400 flex-shrink-0" />
                    <span className="text-gray-300 text-xs">{f}</span>
                  </div>
                ))}
              </div>
              {!plan.current && plan.tier > tier && (
                <button
                  disabled={upgrading}
                  onClick={async () => {
                    setUpgrading(true);
                    try {
                      const tierStr = plan.tier === 2 ? "plus" : "pro";
                      await api.post("/users/me/tier-upgrade", { tier: tierStr });
                      await refreshUser();
                      setTier(plan.tier as 1|2|3);
                      setShowUpgrade(false);
                      showToast(`Upgraded to ${plan.name}! ✨`);
                    } catch { showToast("Upgrade failed, please try again."); }
                    finally { setUpgrading(false); }
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition disabled:opacity-50">
                  {upgrading ? "Upgrading…" : `Upgrade to ${plan.name}`}
                </button>
              )}
              {plan.current && plan.tier < 3 && (
                <div className="text-center text-xs text-gray-500 py-1">Current plan</div>
              )}
            </div>
          ))}
        </div>
      </Sheet>

      {/* ── DELETE ACCOUNT ── */}
      <Sheet show={showDeleteAccount} onClose={() => setShowDeleteAccount(false)} title="Delete Account">
        <div className="p-5 space-y-4">
          <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl flex gap-3">
            <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm leading-relaxed">This is permanent and cannot be undone. All your posts, followers, earnings, and data will be deleted.</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-2">Why are you leaving?</p>
            <div className="relative">
              <select value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl text-sm outline-none appearance-none">
                <option value="">Select a reason...</option>
                <option>I don't use it enough</option>
                <option>Privacy concerns</option>
                <option>Too many notifications</option>
                <option>Found a better alternative</option>
                <option>Technical issues</option>
                <option>Other</option>
              </select>
              <ChevronDown size={16} className="text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-2">Type <span className="text-red-400 font-bold">DELETE</span> to confirm</p>
            <input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-red-500 transition" />
          </div>
          <button
            disabled={deleteConfirmText !== "DELETE" || !deleteReason}
            onClick={() => navigate("/login")}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-40">
            Permanently Delete Account
          </button>
          <button onClick={() => setShowDeleteAccount(false)} className="w-full border border-gray-700 text-white py-3 rounded-xl font-medium hover:bg-gray-900 transition">
            Cancel
          </button>
        </div>
      </Sheet>

      {/* ── PAGE ── */}
      <div className="max-w-2xl mx-auto">
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>

        {/* Profile avatar */}
        <div className="flex flex-col items-center pb-4 gap-2">
          <div
            className="w-20 h-20 rounded-full border-4 border-black overflow-hidden bg-gray-800 relative cursor-pointer"
            onClick={() => avatarInputRef.current?.click()}
          >
            <img
              src={resolveMediaUrl(user?.avatarUrl) ?? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"}
              alt="Profile"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full">
              {updatingAvatar
                ? <Loader2 size={18} className="animate-spin text-white" />
                : <Camera size={18} className="text-white" />}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-sm">{user?.displayName}</p>
            <p className="text-gray-500 text-xs">@{user?.username}</p>
          </div>
        </div>

        {/* Current plan card */}
        <div className="mx-4 mb-6 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-800/50 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs font-medium mb-0.5">Current Plan</p>
            <p className="text-white font-bold">Tier {tier} — {tier === 1 ? "Basic" : tier === 2 ? "Plus" : "Pro"}</p>
          </div>
          {tier < 3 && (
            <button onClick={() => setShowUpgrade(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold px-5 py-2 rounded-xl hover:opacity-90 transition flex items-center gap-1.5">
              <ExternalLink size={13} /> Upgrade
            </button>
          )}
        </div>

        {/* Wallet history link */}
        <div className="mx-4 mb-4">
          <button onClick={() => navigate("/wallet/history")} className="text-purple-400 text-sm hover:underline flex items-center gap-1">Wallet & transaction history →</button>
        </div>

        {/* Verification badge card */}
        <div className="mx-4 mb-6">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm flex items-center gap-2">
                  Verification Badge
                  {user?.isVerified && <span className="text-blue-400 text-xs">✓ Verified</span>}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">{user?.isVerified ? "Your account is verified" : "Get a verified badge on your profile"}</p>
              </div>
              {!user?.isVerified && (
                <button onClick={() => setBadgeModal(true)} className="text-blue-400 border border-blue-500/40 bg-blue-500/10 text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-blue-500/20 transition">
                  Apply
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tier upgrade cards */}
        <div className="mx-4 mb-6 space-y-3">
          {user?.tier === "free" && (
            <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-700/40 rounded-2xl p-4">
              <p className="text-white font-semibold mb-1">Upgrade to Plus</p>
              <p className="text-gray-400 text-sm mb-3">Unlock KliqStream, full analytics, and more.</p>
              <button onClick={() => { setUpgradeTarget("plus"); setUpgradeConfirm(true); }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition">
                Upgrade to Plus — $4.99/mo
              </button>
            </div>
          )}
          {user?.tier === "plus" && (
            <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-700/40 rounded-2xl p-4">
              <p className="text-white font-semibold mb-1">Upgrade to Pro</p>
              <p className="text-gray-400 text-sm mb-3">Unlock wallet display, token economy, and all Pro features.</p>
              <button onClick={() => { setUpgradeTarget("pro"); setUpgradeConfirm(true); }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition">
                Upgrade to Pro — $9.99/mo
              </button>
            </div>
          )}
          {user?.tier === "pro" && (
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium px-1">
              <span>✓</span><span>You're on Pro — the highest tier</span>
            </div>
          )}
        </div>

        {/* Upgrade confirmation modal */}
        {upgradeConfirm && upgradeTarget && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-white font-bold text-lg mb-2">Confirm Upgrade</h3>
              <p className="text-gray-400 text-sm mb-6">Upgrade to <strong className="text-white capitalize">{upgradeTarget}</strong>? This will be charged to your account.</p>
              <div className="flex gap-3">
                <button onClick={() => setUpgradeConfirm(false)}
                  className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition">Cancel</button>
                <button
                  disabled={upgrading}
                  onClick={async () => {
                    setUpgrading(true);
                    try {
                      await api.post("/users/me/tier-upgrade", { tier: upgradeTarget });
                      await refreshUser();
                      setUpgradeConfirm(false);
                      showToast(`Welcome to ${upgradeTarget}!`);
                    } finally { setUpgrading(false); }
                  }}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2.5 rounded-xl text-sm hover:opacity-90 transition disabled:opacity-50">
                  {upgrading ? "Upgrading…" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings sections */}
        {SETTINGS_SECTIONS.map((section) => (
          <div key={section.title} className="mb-6">
            <p className="px-4 text-gray-600 text-xs font-semibold uppercase tracking-widest mb-2">{section.title}</p>
            <div className="mx-4 bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-800">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isLocked = (item as { locked?: boolean }).locked;
                return (
                  <button key={item.label} onClick={item.action}
                    className={`w-full flex items-center gap-4 p-4 transition text-left ${isLocked ? "opacity-60 hover:bg-gray-900/30" : "hover:bg-gray-900/50"}`}>
                    <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className={isLocked ? "text-gray-600" : "text-gray-400"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium flex items-center gap-1.5 ${isLocked ? "text-gray-400" : "text-white"}`}>
                        {item.label}
                        {isLocked && <Lock size={11} className="text-gray-600" />}
                      </p>
                      <p className="text-gray-600 text-xs mt-0.5">{item.desc}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-700 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Privacy & Safety section */}
        <div className="mb-6">
          <p className="px-4 text-gray-600 text-xs font-semibold uppercase tracking-widest mb-2">Privacy & Safety</p>
          <div className="mx-4 space-y-2">
            {[
              { label: "Privacy", desc: "Control who can message you and see your profile", path: "/privacy-settings", icon: "🔒" },
              { label: "Blocked Accounts", desc: "Manage accounts you've blocked", path: "/blocked-users", icon: "🚫" },
              { label: "Muted Accounts", desc: "Manage accounts you've muted", path: "/muted-users", icon: "🔇" },
              { label: "Notifications", desc: "Choose what you get notified about", path: "/notification-prefs", icon: "🔔" },
            ].map(item => (
              <button key={item.path} onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 bg-gray-950 border border-gray-800 rounded-2xl px-4 py-3.5 hover:border-gray-700 transition text-left">
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{item.label}</p>
                  <p className="text-gray-500 text-xs">{item.desc}</p>
                </div>
                <span className="text-gray-600">›</span>
              </button>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="mx-4 mb-8 space-y-3">
          <button onClick={() => navigate("/login")}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 border border-gray-800 text-white font-medium py-3.5 rounded-xl hover:bg-gray-800 transition">
            <LogOut size={18} className="text-gray-400" /> Sign Out
          </button>
          <button onClick={() => { setDeleteConfirmText(""); setDeleteReason(""); setShowDeleteAccount(true); }}
            className="w-full flex items-center justify-center gap-2 bg-red-950/30 border border-red-900/50 text-red-500 font-medium py-3.5 rounded-xl hover:bg-red-950/50 transition">
            <Trash2 size={18} /> Delete Account
          </button>
        </div>

        <p className="text-center text-gray-700 text-xs pb-8">Kliq v3.0.0 &bull; Terms &bull; Privacy</p>
      </div>

      {/* Badge verification modal */}
      {badgeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center" onClick={() => setBadgeModal(false)}>
          <div className="w-full max-w-lg bg-gray-950 border border-gray-800 rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg">Apply for Verification</h3>
            <p className="text-gray-400 text-sm">Tell us why you should be verified. Include your public presence, follower count, or notable work.</p>
            <textarea value={badgeReason} onChange={e => setBadgeReason(e.target.value)} rows={4}
              placeholder="I am a public figure with..."
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
            {badgeDone ? (
              <p className="text-center text-green-400 font-medium py-2">✓ Application submitted! We'll review within 48 hours.</p>
            ) : (
              <button disabled={badgeSubmitting || badgeReason.length < 20}
                onClick={async () => {
                  setBadgeSubmitting(true);
                  try { await api.post("/users/me/badge-request", { reason: badgeReason }); setBadgeDone(true); }
                  catch {} finally { setBadgeSubmitting(false); }
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl disabled:opacity-40 transition">
                {badgeSubmitting ? "Submitting…" : "Submit Application"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
