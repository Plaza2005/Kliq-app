import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Grid, Play, Tv, Store, Users, Share2, MessageCircle, ShoppingBag, Loader2, Heart, X, MoreHorizontal } from "lucide-react";
import { api, resolveAvatarUrl, resolveMediaUrl } from "../api/client";
import { useSocial } from "../context/SocialContext";
import { ShareSheet } from "../components/ShareSheet";

type Tab = "Posts" | "Reels" | "KliqTube" | "KliqStream" | "Marketplace" | "Community";

const TABS: { label: Tab; icon: typeof Grid }[] = [
  { label: "Posts",       icon: Grid  },
  { label: "Reels",       icon: Play  },
  { label: "KliqTube",   icon: Play  },
  { label: "KliqStream", icon: Tv    },
  { label: "Marketplace", icon: Store },
  { label: "Community",   icon: Users },
];

const FALLBACK_IMGS = [
  "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1587620962725-abab7fe55159?q=80&w=400&auto=format&fit=crop",
];

interface UserProfileData {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string;
  coverUrl: string | null;
  tier: string;
  isVerified: boolean;
  status: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
  subPrice: number | null;
  isSubscribed: boolean;
}

interface PostItem {
  id: string;
  body: string;
  mediaUrl: string | null;
  postType: string;
  likeCount: number;
  viewCount: number;
}

interface CommunityItem {
  id: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  memberCount: number;
  role: string;
  isOwner: boolean;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("Posts");
  const [showShare, setShowShare] = useState(false);
  const [profile, setProfile]         = useState<UserProfileData | null>(null);
  const [tipModal, setTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState(50);
  const [tipMessage, setTipMessage] = useState("");
  const [tipping, setTipping] = useState(false);
  const [tipSuccess, setTipSuccess] = useState(false);
  const [posts, setPosts]             = useState<PostItem[]>([]);
  const [reels, setReels]             = useState<PostItem[]>([]);
  const [tubePosts, setTubePosts]     = useState<PostItem[]>([]);
  const [streamPosts, setStreamPosts] = useState<PostItem[]>([]);
  const [marketPosts, setMarketPosts] = useState<PostItem[]>([]);
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const { isFollowing, toggleFollow: toggleFollowCtx, seedFollowing } = useSocial();
  const [followLoading, setFollowLoading] = useState(false);
  const [mktItem, setMktItem] = useState<PostItem | null>(null);
  const [purchaseToast, setPurchaseToast] = useState(false);
  const showPurchaseToast = () => { setPurchaseToast(true); setTimeout(() => setPurchaseToast(false), 2500); };

  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [reportUserModal, setReportUserModal] = useState(false);
  const [reportUserReason, setReportUserReason] = useState("");
  const [reportingUser, setReportingUser] = useState(false);
  const [reportUserDone, setReportUserDone] = useState(false);

  const USER_REPORT_REASONS = ["Spam or fake account", "Harassment or bullying", "Hate speech", "Impersonation", "Inappropriate content", "Other"];

  useEffect(() => {
    if (!username) return;
    setLoadingProfile(true);
    api.get<UserProfileData>(`/users/${username}`).then(data => {
      setProfile(data);
      seedFollowing(data.username, data.isFollowing);
      setSubscribed(data.isSubscribed);
    }).catch(() => {}).finally(() => setLoadingProfile(false));

    api.get<PostItem[]>(`/users/${username}/posts`).then(setPosts).catch(() => {});
    api.get<PostItem[]>(`/users/${username}/posts?type=reel`).then(setReels).catch(() => {});
    api.get<PostItem[]>(`/users/${username}/posts?type=tube`).then(setTubePosts).catch(() => {});
    api.get<PostItem[]>(`/users/${username}/posts?type=stream`).then(setStreamPosts).catch(() => {});
    api.get<PostItem[]>(`/users/${username}/posts?type=marketplace`).then(setMarketPosts).catch(() => {});
    setLoadingCommunities(true);
    api.get<CommunityItem[]>(`/communities/user/${username}`)
      .then(setCommunities).catch(() => {}).finally(() => setLoadingCommunities(false));
  }, [username, seedFollowing]);

  const following = username ? isFollowing(username) : false;

  const toggleFollow = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    const wasFollowing = following;
    try {
      await toggleFollowCtx(profile.username);
      setProfile(p => p ? {
        ...p,
        followerCount: wasFollowing ? Math.max(0, p.followerCount - 1) : p.followerCount + 1,
      } : p);
    } catch { /* silent */ } finally {
      setFollowLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!profile || subscribing) return;
    setSubscribing(true);
    try {
      await api.post(`/subscriptions/creator/${profile.username}`, {});
      setSubscribed(true);
    } catch (e: unknown) {
      alert((e as Error).message ?? "Failed to subscribe");
    } finally {
      setSubscribing(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-full bg-black flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-purple-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-full bg-black flex flex-col items-center justify-center gap-3">
        <p className="text-white font-bold">User not found</p>
        <button onClick={() => navigate(-1)} className="text-purple-400 text-sm">Go back</button>
      </div>
    );
  }

  const cover = profile.coverUrl ?? `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop&sig=${username}`;

  return (
    <div className="pb-24 overflow-x-hidden bg-black min-h-full">
      {/* Back button */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3 bg-black/90 backdrop-blur-md border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full transition">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <span className="text-white font-bold flex-1">@{username}</span>
        {!profile?.isOwnProfile && (
          <div className="relative">
            <button onClick={() => setShowMoreMenu(v => !v)} className="p-2 hover:bg-gray-900 rounded-full transition">
              <MoreHorizontal size={20} className="text-gray-400" />
            </button>
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                  <button onClick={() => { setShowMoreMenu(false); setReportUserModal(true); }}
                    className="w-full text-left px-4 py-3 text-red-400 text-sm hover:bg-gray-800 transition">
                    Report @{username}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Cover */}
      <div className="h-40 md:h-56 bg-gray-900 w-full relative">
        <img src={cover} alt="Cover" className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 relative -mt-14">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-4">
            <div className="w-28 h-28 rounded-full border-4 border-black overflow-hidden bg-gray-800 z-10 relative shadow-xl">
              <img src={resolveAvatarUrl(profile.avatarUrl)} alt={username} className="w-full h-full object-cover bg-gray-800" />
            </div>
            <div className="text-center md:text-left z-10">
              <h1 className="text-2xl font-bold text-white">
                {profile.displayName}
                {profile.isVerified && <span className="ml-2 text-blue-400 text-base">✓</span>}
              </h1>
              <p className="text-gray-400 text-sm">@{username}</p>
              <div className="flex items-center gap-2 mt-1 justify-center md:justify-start">
                <span className="text-yellow-400 font-bold text-sm tracking-wider">
                  {"★".repeat(profile.tier === "pro" ? 3 : profile.tier === "plus" ? 2 : 1)}{"☆".repeat(profile.tier === "pro" ? 0 : profile.tier === "plus" ? 1 : 2)}
                </span>
                <span className="text-gray-500 text-xs capitalize">
                  {profile.tier === "pro" ? "Pro" : profile.tier === "plus" ? "Plus" : "Basic"}
                </span>
              </div>
            </div>
          </div>

          {!profile.isOwnProfile && (
            <div className="flex gap-3 justify-center z-10 flex-wrap">
              <button
                onClick={toggleFollow}
                disabled={followLoading}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition disabled:opacity-60 ${following
                  ? "bg-gray-800 border border-gray-700 text-white hover:bg-gray-700"
                  : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"}`}
              >
                {following ? "Following" : "Follow"}
              </button>
              <button
                onClick={() => navigate(`/chat/${username}`)}
                className="bg-gray-900 border border-gray-700 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-gray-800 transition"
              >
                <MessageCircle size={16} />
                Message
              </button>
              <button
                onClick={() => setShowShare(true)}
                className="bg-gray-900 border border-gray-700 text-white p-2.5 rounded-xl hover:bg-gray-800 transition"
              >
                <Share2 size={18} />
              </button>
              <button onClick={() => setTipModal(true)}
                className="flex items-center gap-1.5 border border-yellow-500/50 text-yellow-400 bg-yellow-500/10 px-4 py-2 rounded-full text-sm font-semibold hover:bg-yellow-500/20 transition">
                🪙 Tip
              </button>
              {profile.subPrice && (
                <button
                  onClick={handleSubscribe}
                  disabled={subscribing || subscribed}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition disabled:opacity-60 ${subscribed ? "border border-purple-500/50 text-purple-300 bg-purple-500/10" : "bg-purple-600 hover:bg-purple-500 text-white"}`}
                >
                  {subscribing ? <Loader2 size={14} className="animate-spin" /> : subscribed ? "✓ Subscribed" : `Subscribe · 🪙${profile.subPrice}/mo`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex justify-center md:justify-start gap-8 mb-5 text-center">
          <div>
            <span className="text-xl font-bold text-white">{profile.postCount}</span>
            <p className="text-gray-500 text-sm">Posts</p>
          </div>
          <div>
            <span className="text-xl font-bold text-white">{fmtNum(profile.followerCount)}</span>
            <p className="text-gray-500 text-sm">Followers</p>
          </div>
          <div>
            <span className="text-xl font-bold text-white">{fmtNum(profile.followingCount)}</span>
            <p className="text-gray-500 text-sm">Following</p>
          </div>
        </div>

        {profile.bio && <p className="text-gray-300 text-sm mb-6 text-center md:text-left">{profile.bio}</p>}

        {/* Tabs */}
        <div className="border-t border-gray-800 flex overflow-x-auto">
          {TABS.map(({ label }) => (
            <button
              key={label}
              onClick={() => setActiveTab(label)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-semibold border-t-2 transition-colors ${
                activeTab === label ? "border-white text-white" : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-4">
          {activeTab === "Posts" && (
            <div className="grid grid-cols-3 gap-1 md:gap-2">
              {posts.length === 0 ? (
                <p className="col-span-3 text-center py-16 text-gray-600 text-sm">No posts yet</p>
              ) : posts.map((p, i) => {
                const img = p.mediaUrl || FALLBACK_IMGS[i % FALLBACK_IMGS.length];
                return (
                  <div key={p.id} className="aspect-square bg-gray-800 cursor-pointer overflow-hidden group rounded-sm relative">
                    <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="text-white text-xs font-bold flex items-center gap-1"><Heart size={11} className="fill-white" /> {fmtNum(p.likeCount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "Reels" && (
            <div className="grid grid-cols-3 gap-1 md:gap-2">
              {reels.length === 0 ? (
                <p className="col-span-3 text-center py-16 text-gray-600 text-sm">No reels yet</p>
              ) : reels.map((p, i) => {
                const img = p.mediaUrl || FALLBACK_IMGS[i % FALLBACK_IMGS.length];
                return (
                  <div key={p.id} className="aspect-[9/16] bg-gray-800 cursor-pointer overflow-hidden group rounded-sm relative">
                    <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <div className="w-9 h-9 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play size={16} className="text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "KliqTube" && (
            <div className="space-y-4">
              {tubePosts.length === 0 ? (
                <p className="text-center py-16 text-gray-600 text-sm">No KliqTube videos yet</p>
              ) : tubePosts.map(v => (
                <div key={v.id} className="flex gap-3 cursor-pointer group">
                  <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                    {v.mediaUrl ? (
                      <img src={v.mediaUrl} alt={v.body} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <Play size={18} className="text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <p className="text-white font-semibold text-sm line-clamp-2 mb-1">{v.body || "Untitled video"}</p>
                    <p className="text-gray-500 text-xs">@{username}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{fmtNum(v.viewCount)} views</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "KliqStream" && (
            <div className="grid grid-cols-2 gap-3">
              {streamPosts.length === 0 ? (
                <p className="col-span-2 text-center py-16 text-gray-600 text-sm">No KliqStream content yet</p>
              ) : streamPosts.map(v => (
                <div key={v.id} className="cursor-pointer group">
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-800 mb-2">
                    {v.mediaUrl ? (
                      <img src={v.mediaUrl} alt={v.body} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <Tv size={20} className="text-gray-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-xs font-semibold line-clamp-1">{v.body || "Untitled"}</p>
                      <p className="text-gray-400 text-[10px]">{fmtNum(v.viewCount)} views</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "Marketplace" && (
            <div className="grid grid-cols-2 gap-3">
              {marketPosts.length === 0 ? (
                <div className="col-span-2 flex flex-col items-center justify-center py-16 gap-3">
                  <ShoppingBag size={32} className="text-gray-600" />
                  <p className="text-gray-500 text-sm">No marketplace listings yet</p>
                </div>
              ) : marketPosts.map(item => (
                <div key={item.id} onClick={() => setMktItem(item)} className="cursor-pointer group bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden hover:border-purple-700/50 transition">
                  <div className="aspect-square overflow-hidden">
                    {item.mediaUrl ? (
                      <img src={resolveMediaUrl(item.mediaUrl) ?? item.mediaUrl} alt={item.body} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <ShoppingBag size={24} className="text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-white text-sm font-semibold line-clamp-1 mb-1">{item.body || "Untitled listing"}</p>
                    <div className="w-full mt-2 flex items-center justify-center gap-1.5 bg-gray-800 text-white text-xs font-bold py-2 rounded-lg">
                      <ShoppingBag size={11} /> View
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "Community" && (
            loadingCommunities ? (
              <div className="flex justify-center py-16">
                <Loader2 size={24} className="animate-spin text-purple-400" />
              </div>
            ) : communities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Users size={32} className="text-gray-600" />
                <p className="text-gray-400 font-semibold text-sm">No communities yet</p>
                <p className="text-gray-600 text-xs">@{username} hasn't joined any communities</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {communities.map(c => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/community/${c.id}`)}
                    className="w-full text-left flex items-center gap-4 bg-gray-950 border border-gray-800 rounded-2xl p-4 hover:border-purple-800/60 hover:bg-gray-900/50 transition"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                      {c.avatarUrl ? (
                        <img src={resolveMediaUrl(c.avatarUrl) ?? ""} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-700 to-pink-700">
                          <Users size={22} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-white font-bold text-sm truncate">{c.name}</p>
                        {(c.isOwner || c.role === "admin") && (
                          <span className="flex-shrink-0 text-[10px] font-bold text-purple-300 bg-purple-900/40 border border-purple-700/50 px-1.5 py-0.5 rounded-full">
                            {c.isOwner ? "Owner" : "Admin"}
                          </span>
                        )}
                      </div>
                      {c.description && (
                        <p className="text-gray-500 text-xs leading-snug line-clamp-2 mb-1.5">{c.description}</p>
                      )}
                      <div className="flex items-center gap-1 text-gray-600 text-xs">
                        <Users size={11} />
                        <span>{fmtNum(c.memberCount)} members</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      <ShareSheet isOpen={showShare} onClose={() => setShowShare(false)} url={window.location.href} />

      {/* Report User Modal */}
      {reportUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center" onClick={() => { setReportUserModal(false); setReportUserDone(false); setReportUserReason(""); }}>
          <div className="w-full max-w-lg bg-gray-950 border border-gray-800 rounded-t-3xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">Report @{username}</h3>
              <button onClick={() => { setReportUserModal(false); setReportUserDone(false); setReportUserReason(""); }}><X size={20} className="text-gray-400" /></button>
            </div>
            {reportUserDone ? (
              <p className="text-center text-green-400 font-medium py-6">Report submitted. Thank you.</p>
            ) : (
              <div className="space-y-1">
                {USER_REPORT_REASONS.map(r => (
                  <button key={r} onClick={async () => {
                    setReportingUser(true);
                    try { await api.post(`/users/${username}/report`, { reason: r }); setReportUserDone(true); setTimeout(() => setReportUserModal(false), 2000); }
                    catch { setReportUserDone(true); setTimeout(() => setReportUserModal(false), 2000); } finally { setReportingUser(false); }
                  }} disabled={reportingUser} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-gray-900 rounded-xl transition">
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tipModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center" onClick={() => setTipModal(false)}>
          <div className="w-full max-w-lg bg-gray-950 border border-gray-800 rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Tip {profile?.displayName}</h3>
              <button onClick={() => setTipModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            {/* Quick amounts */}
            <div>
              <p className="text-gray-400 text-sm mb-2">Amount (tokens)</p>
              <div className="flex gap-2 flex-wrap">
                {[10, 50, 100, 250, 500, 1000].map(amt => (
                  <button key={amt} onClick={() => setTipAmount(amt)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${tipAmount === amt ? "bg-yellow-500 border-yellow-500 text-black" : "border-gray-700 text-gray-300 hover:border-gray-500"}`}>
                    {amt} 🪙
                  </button>
                ))}
              </div>
              <input type="number" value={tipAmount} onChange={e => setTipAmount(Number(e.target.value))}
                className="mt-2 w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                placeholder="Custom amount" min={1} />
            </div>

            <div>
              <p className="text-gray-400 text-sm mb-2">Message (optional)</p>
              <input value={tipMessage} onChange={e => setTipMessage(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                placeholder="Add a message..." maxLength={100} />
            </div>

            {tipSuccess ? (
              <div className="text-center py-4">
                <p className="text-yellow-400 font-bold text-lg">🎉 Tip sent!</p>
                <p className="text-gray-400 text-sm mt-1">{tipAmount} tokens sent to {profile?.displayName}</p>
              </div>
            ) : (
              <button disabled={tipping || tipAmount < 1} onClick={async () => {
                setTipping(true);
                try {
                  await api.post(`/wallet/tip/${profile?.username}`, { amount: tipAmount, message: tipMessage || undefined });
                  setTipSuccess(true);
                  setTimeout(() => { setTipModal(false); setTipSuccess(false); setTipMessage(""); }, 2000);
                } catch { } finally { setTipping(false); }
              }}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold py-3.5 rounded-xl disabled:opacity-50">
                {tipping ? "Sending…" : `Send ${tipAmount} 🪙 Tokens`}
              </button>
            )}
          </div>
        </div>
      )}

      {purchaseToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-800 text-white px-5 py-3 rounded-xl text-sm font-medium">
          Purchase successful! The seller will be notified.
        </div>
      )}

      {mktItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center" onClick={() => setMktItem(null)}>
          <div className="w-full max-w-lg bg-gray-950 border border-gray-800 rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">{mktItem.body || "Item"}</h3>
              <button onClick={() => setMktItem(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            {mktItem.mediaUrl && <img src={resolveMediaUrl(mktItem.mediaUrl) ?? ""} className="w-full h-48 object-cover rounded-xl" />}
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  await api.post(`/posts/${mktItem.id}/purchase`, {});
                  setMktItem(null);
                  showPurchaseToast();
                }}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold py-3 rounded-xl"
              >
                Buy Now
              </button>
              <button
                onClick={() => { setMktItem(null); navigate(`/chat/${profile?.username}`); }}
                className="flex-1 bg-gray-800 border border-gray-700 text-white font-medium py-3 rounded-xl"
              >
                Message Seller
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
