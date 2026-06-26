import { Edit3, Grid, Share2, Play, Tv, ShoppingBag, Users, X, Lock, Eye, EyeOff, UserCheck, Loader2, Heart, Camera, Bookmark, QrCode, Repeat2, Pin } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useUser } from "../context/UserContext";
import type { TabKey } from "../context/UserContext";
import { useAuth } from "../context/AuthContext";
import { useSocial } from "../context/SocialContext";
import { api, resolveMediaUrl } from "../api/client";
import { ShareSheet } from "../components/ShareSheet";

const FALLBACK_IMGS = [
  "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=400&auto=format&fit=crop",
];

const TAB_META: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "Posts",       label: "Posts",       icon: <Grid size={14} /> },
  { key: "Reposts",    label: "Reposts",     icon: <Repeat2 size={14} /> },
  { key: "Reels",       label: "Reels",       icon: <Play size={14} /> },
  { key: "KliqTube",   label: "KliqTube",    icon: <Play size={14} /> },
  { key: "KliqStream", label: "KliqStream",  icon: <Tv size={14} /> },
  { key: "Marketplace",label: "Marketplace", icon: <ShoppingBag size={14} /> },
  { key: "Community",  label: "Community",   icon: <Users size={14} /> },
];

const TIER_STARS = (tier: number) => "★".repeat(tier) + "☆".repeat(3 - tier);

interface PostItem {
  id: string;
  body: string;
  mediaUrl: string | null;
  postType: string;
  likeCount: number;
  viewCount: number;
  pinnedAt?: string | null;
}

interface RepostItem extends PostItem {
  author: { username: string; displayName: string; avatarUrl: string };
}

interface FollowUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string | null;
}

type ListModal = "followers" | "following" | null;

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function tierNum(t: string): number {
  return t === "pro" ? 3 : t === "plus" ? 2 : 1;
}

export function Profile() {
  const { tier, tabVisibility } = useUser();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>("Posts");
  const [showShare, setShowShare] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [listModal, setListModal] = useState<ListModal>(null);
  const [followersVisible, setFollowersVisible] = useState(true);
  const [followingVisible, setFollowingVisible] = useState(true);
  const [followList, setFollowList] = useState<FollowUser[]>([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);
  const [posts, setPosts]         = useState<PostItem[]>([]);
  const [reels, setReels]         = useState<PostItem[]>([]);
  const [tubePosts, setTubePosts] = useState<PostItem[]>([]);
  const [streamPosts, setStreamPosts] = useState<PostItem[]>([]);
  const [marketPosts, setMarketPosts] = useState<PostItem[]>([]);
  const [repostItems, setRepostItems] = useState<RepostItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const { isFollowing, toggleFollow } = useSocial();
  const [walletData, setWalletData] = useState<{ balance: number; tokens: number; diamonds: number; showWalletBalance: boolean } | null>(null);
  const [walletVisible, setWalletVisible] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get<PostItem[]>(`/users/${user.username}/posts`)
      .then(setPosts).catch(() => {}).finally(() => setLoadingPosts(false));
    api.get<PostItem[]>(`/users/${user.username}/posts?type=reel`).then(setReels).catch(() => {});
    api.get<PostItem[]>(`/users/${user.username}/posts?type=tube`).then(setTubePosts).catch(() => {});
    api.get<PostItem[]>(`/users/${user.username}/posts?type=stream`).then(setStreamPosts).catch(() => {});
    api.get<PostItem[]>(`/users/${user.username}/posts?type=marketplace`).then(setMarketPosts).catch(() => {});
    api.get<RepostItem[]>(`/users/${user.username}/reposts`).then(setRepostItems).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (user?.tier !== "pro") return;
    api.get<{ balance: number; tokens: number; diamonds: number }>("/wallet/me")
      .then(d => setWalletData(d as { balance: number; tokens: number; diamonds: number; showWalletBalance: boolean }))
      .catch(() => {});
    api.get<{ showWalletBalance: boolean }>("/users/me")
      .then(d => setWalletVisible(d.showWalletBalance))
      .catch(() => {});
  }, [user?.tier]);

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

  const toggleWalletVisibility = async (v: boolean) => {
    setWalletVisible(v);
    await api.patch("/users/me/settings", { showWalletBalance: v }).catch(() => {});
  };

  useEffect(() => {
    if (!listModal || !user) return;
    setLoadingFollowList(true);
    const path = listModal === "followers"
      ? `/users/${user.username}/followers`
      : `/users/${user.username}/following`;
    api.get<FollowUser[]>(path)
      .then(setFollowList).catch(() => {}).finally(() => setLoadingFollowList(false));
  }, [listModal, user]);

  const visibleTabs = TAB_META.filter(t => tabVisibility[t.key] !== "Hidden");
  const resolvedTab = visibleTabs.find(t => t.key === activeTab)?.key ?? visibleTabs[0]?.key ?? "Posts";

  const listData  = followList;
  const listTitle = listModal === "followers"
    ? `Followers (${fmtNum(user?.followerCount ?? 0)})`
    : `Following (${fmtNum(user?.followingCount ?? 0)})`;
  const listVisible = listModal === "followers" ? followersVisible : followingVisible;
  const setListVis  = listModal === "followers" ? setFollowersVisible : setFollowingVisible;

  const myTier = user ? tierNum(user.tier) : tier;

  return (
    <div className="pb-24 overflow-x-hidden bg-black min-h-full">

      {/* FOLLOWERS / FOLLOWING MODAL */}
      {listModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end">
          <div className="w-full bg-gray-950 border-t border-gray-800 rounded-t-3xl max-h-[75vh] flex flex-col max-w-xl mx-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
              <h3 className="text-white font-bold text-base">{listTitle}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setListVis(!listVisible)} className="p-2 hover:bg-gray-800 rounded-full transition">
                  {listVisible ? <Eye size={16} className="text-gray-400" /> : <EyeOff size={16} className="text-purple-400" />}
                </button>
                <button onClick={() => { setListModal(null); setFollowList([]); }} className="p-1.5 hover:bg-gray-800 rounded-full transition">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
            </div>
            {!listVisible ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Lock size={32} className="text-gray-600" />
                <p className="text-gray-400 text-sm">This list is hidden from others</p>
                <button onClick={() => setListVis(true)} className="text-purple-400 text-sm font-semibold">Make visible</button>
              </div>
            ) : loadingFollowList ? (
              <div className="flex justify-center py-16">
                <Loader2 size={24} className="animate-spin text-purple-400" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {listData.length === 0 ? (
                  <p className="text-center text-gray-600 py-8 text-sm">No users yet</p>
                ) : listData.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-3 hover:bg-gray-900/50 rounded-xl transition">
                    <button onClick={() => { setListModal(null); navigate(`/user/${u.username}`); }}>
                      <img src={resolveMediaUrl(u.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} alt={u.username} className="w-11 h-11 rounded-full bg-gray-800 object-cover" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => { setListModal(null); navigate(`/user/${u.username}`); }} className="text-white font-semibold text-sm hover:text-purple-300 transition text-left block">
                        @{u.username}
                      </button>
                      <p className="text-gray-500 text-xs truncate">{u.bio ?? u.displayName}</p>
                    </div>
                    <button onClick={() => toggleFollow(u.username)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex-shrink-0 ${isFollowing(u.username) ? "bg-gray-800 border border-gray-700 text-gray-300" : "bg-gradient-to-r from-purple-600 to-pink-600 text-white"}`}>
                      {isFollowing(u.username) ? "Following" : "Follow"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cover */}
      <div className="h-48 md:h-64 bg-gray-900 w-full relative">
        {user?.coverUrl ? (
          <img src={user.coverUrl} alt="Cover" className="w-full h-full object-cover opacity-70" />
        ) : (
          <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop" alt="Cover" className="w-full h-full object-cover opacity-70" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-8 relative -mt-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
            <div
              className="w-32 h-32 rounded-full border-4 border-black overflow-hidden bg-gray-800 z-10 relative shadow-xl shadow-purple-900/30 cursor-pointer"
              onClick={() => avatarInputRef.current?.click()}
            >
              <img src={resolveMediaUrl(user?.avatarUrl) ?? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"} alt="Profile" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full">
                {updatingAvatar
                  ? <Loader2 size={20} className="animate-spin text-white" />
                  : <Camera size={20} className="text-white" />}
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="text-center md:text-left z-10">
              <h1 className="text-3xl font-bold text-white">{user?.displayName ?? "Loading..."}</h1>
              <p className="text-gray-400">@{user?.username}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-yellow-400 font-bold text-base tracking-wider">{TIER_STARS(myTier)}</span>
                <span className="text-gray-500 text-xs">Tier {myTier} {myTier === 1 ? "Basic" : myTier === 2 ? "Plus" : "Pro"}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-center z-10">
            <button onClick={() => navigate("/edit-profile")}
              className="bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
              <Edit3 size={16} /> Edit Profile
            </button>
            <button onClick={() => navigate("/saved")} className="bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white p-2 rounded-lg transition-colors" title="Saved Posts">
              <Bookmark size={18} />
            </button>
            <button onClick={() => setShowQr(true)} className="bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white p-2 rounded-lg transition-colors" title="QR Code">
              <QrCode size={18} />
            </button>
            <button onClick={() => setShowShare(true)} className="bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white p-2 rounded-lg transition-colors">
              <Share2 size={18} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-center md:justify-start gap-8 mb-6 text-center">
          <div>
            <span className="text-xl font-bold text-white">{user?.postCount ?? 0}</span>
            <p className="text-gray-500 text-sm">Posts</p>
          </div>
          <button onClick={() => setListModal("followers")} className="text-center hover:opacity-80 transition">
            <span className="text-xl font-bold text-white block">{fmtNum(user?.followerCount ?? 0)}</span>
            <p className="text-gray-500 text-sm flex items-center gap-1 justify-center">
              Followers {!followersVisible && <EyeOff size={11} className="text-gray-600" />}
            </p>
          </button>
          <button onClick={() => setListModal("following")} className="text-center hover:opacity-80 transition">
            <span className="text-xl font-bold text-white block">{fmtNum(user?.followingCount ?? 0)}</span>
            <p className="text-gray-500 text-sm flex items-center gap-1 justify-center">
              Following {!followingVisible && <EyeOff size={11} className="text-gray-600" />}
            </p>
          </button>
        </div>

        {user?.tier === "pro" && walletData && (
          <div className="flex items-center justify-center gap-4 mb-4 text-sm">
            {walletVisible ? (
              <>
                <span className="text-gray-300">💎 {walletData.diamonds.toLocaleString()} Diamonds</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-300">🪙 {walletData.tokens.toLocaleString()} Tokens</span>
                <button onClick={() => toggleWalletVisibility(false)} className="text-gray-600 text-xs hover:text-gray-400 transition">Hide</button>
              </>
            ) : (
              <button onClick={() => toggleWalletVisibility(true)} className="text-gray-600 text-xs hover:text-gray-400 transition">Show wallet balance</button>
            )}
            <button onClick={() => navigate("/wallet/history")} className="text-purple-400 text-xs hover:underline">View history →</button>
          </div>
        )}

        {user?.bio && (
          <p className="max-w-2xl text-center md:text-left text-gray-300 mb-8">{user.bio}</p>
        )}

        {/* Tabs */}
        <div className="border-t border-gray-800 overflow-x-auto">
          <div className="flex min-w-max md:min-w-0">
            {visibleTabs.map(tab => {
              const vis = tabVisibility[tab.key];
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 py-3 px-3 md:px-4 border-t-2 font-medium transition-colors whitespace-nowrap text-sm ${
                    resolvedTab === tab.key ? "border-white text-white" : "border-transparent text-gray-500 hover:text-gray-300"
                  }`}>
                  {tab.icon}{tab.label}
                  {vis === "Friends" && <UserCheck size={10} className="text-purple-400 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="mt-4">
          {resolvedTab === "Posts" && (
            loadingPosts ? (
              <div className="flex justify-center py-16">
                <Loader2 size={24} className="animate-spin text-purple-400" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 md:gap-3">
                {posts.length === 0 ? (
                  <p className="col-span-3 text-center py-16 text-gray-600 text-sm">No posts yet</p>
                ) : posts.map((p, i) => {
                  const img = p.mediaUrl || FALLBACK_IMGS[i % FALLBACK_IMGS.length];
                  return (
                    <div key={p.id} className="aspect-[3/4] bg-gray-800 cursor-pointer overflow-hidden group rounded-sm relative">
                      <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      {p.pinnedAt && (
                        <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm rounded-full p-1">
                          <Pin size={10} className="text-yellow-400 fill-yellow-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="text-white text-xs font-bold flex items-center gap-1"><Heart size={11} className="fill-white" /> {fmtNum(p.likeCount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {resolvedTab === "Reposts" && (
            repostItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Repeat2 size={32} className="text-gray-700" />
                <p className="text-gray-500 text-sm">No reposts yet</p>
                <p className="text-gray-600 text-xs text-center">Posts you repost will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 md:gap-3">
                {repostItems.map((p, i) => {
                  const img = p.mediaUrl || FALLBACK_IMGS[i % FALLBACK_IMGS.length];
                  return (
                    <div key={p.id} className="aspect-[3/4] bg-gray-800 cursor-pointer overflow-hidden group rounded-sm relative">
                      <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-1.5 left-1.5">
                        <div className="bg-black/60 backdrop-blur-sm rounded-full p-1">
                          <Repeat2 size={10} className="text-green-400" />
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1">
                        <span className="text-white text-xs font-bold flex items-center gap-1"><Heart size={11} className="fill-white" /> {fmtNum(p.likeCount)}</span>
                        <span className="text-gray-300 text-[10px]">@{p.author.username}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {resolvedTab === "Reels" && (
            <div className="grid grid-cols-3 gap-1 md:gap-3">
              {reels.length === 0 ? (
                <p className="col-span-3 text-center py-16 text-gray-600 text-sm">No reels yet</p>
              ) : reels.map((p, i) => {
                const img = p.mediaUrl || FALLBACK_IMGS[i % FALLBACK_IMGS.length];
                return (
                  <div key={p.id} className="aspect-[9/16] bg-gray-800 cursor-pointer overflow-hidden group rounded-sm relative">
                    <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute bottom-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition">
                      <Play size={16} className="text-white fill-white drop-shadow" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {resolvedTab === "KliqTube" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tubePosts.length === 0 ? (
                <p className="col-span-2 text-center py-16 text-gray-600 text-sm">No KliqTube videos yet</p>
              ) : tubePosts.map(v => (
                <button key={v.id} onClick={() => navigate(`/klixtube/watch/${v.id}`)} className="text-left group">
                  <div className="aspect-video rounded-xl overflow-hidden bg-gray-900 mb-2 relative">
                    {v.mediaUrl ? (
                      <img src={v.mediaUrl} alt={v.body} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <Play size={24} className="text-gray-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <div className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play size={20} className="text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <p className="text-white text-sm font-medium line-clamp-2">{v.body || "Untitled video"}</p>
                  <p className="text-gray-500 text-xs">{fmtNum(v.viewCount)} views</p>
                </button>
              ))}
            </div>
          )}

          {resolvedTab === "KliqStream" && (
            myTier < 2 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Lock size={32} className="text-gray-600" />
                <p className="text-white font-semibold">KliqStream requires Tier 2+</p>
                <button onClick={() => navigate("/settings")} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition">
                  Upgrade
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {streamPosts.length === 0 ? (
                  <p className="col-span-2 text-center py-16 text-gray-600 text-sm">No KliqStream content yet</p>
                ) : streamPosts.map(v => (
                  <button key={v.id} onClick={() => navigate(`/stream/watch/${v.id}`)} className="text-left group">
                    <div className="aspect-video rounded-xl overflow-hidden bg-gray-900 mb-2">
                      {v.mediaUrl ? (
                        <img src={v.mediaUrl} alt={v.body} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <Tv size={24} className="text-gray-600" />
                        </div>
                      )}
                    </div>
                    <p className="text-white text-sm font-medium line-clamp-1">{v.body || "Untitled"}</p>
                  </button>
                ))}
              </div>
            )
          )}

          {resolvedTab === "Marketplace" && (
            myTier < 3 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <ShoppingBag size={32} className="text-gray-600" />
                <p className="text-white font-semibold">Marketplace storefront requires Tier 3 Pro</p>
                <p className="text-gray-500 text-sm text-center">Upgrade to sell products and digital goods</p>
                <button onClick={() => navigate("/settings")} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition">
                  Upgrade to Pro
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {marketPosts.length === 0 ? (
                  <div className="col-span-2 flex flex-col items-center justify-center py-16 gap-3">
                    <ShoppingBag size={32} className="text-gray-600" />
                    <p className="text-gray-500 text-sm">No marketplace listings yet</p>
                    <button onClick={() => navigate("/marketplace")} className="text-purple-400 text-sm font-semibold">Browse Marketplace</button>
                  </div>
                ) : marketPosts.map(item => (
                  <button key={item.id} onClick={() => navigate("/marketplace")} className="text-left group">
                    <div className="aspect-square rounded-xl overflow-hidden bg-gray-900 mb-2">
                      {item.mediaUrl ? (
                        <img src={item.mediaUrl} alt={item.body} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <ShoppingBag size={24} className="text-gray-600" />
                        </div>
                      )}
                    </div>
                    <p className="text-white text-sm font-medium line-clamp-2">{item.body || "Untitled listing"}</p>
                    <p className="text-purple-400 text-xs font-bold">{fmtNum(item.likeCount)} likes</p>
                  </button>
                ))}
              </div>
            )
          )}

          {resolvedTab === "Community" && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users size={32} className="text-gray-600" />
              <p className="text-gray-400 font-semibold text-sm">Communities coming soon</p>
              <p className="text-gray-600 text-xs">Join and manage communities from the app</p>
            </div>
          )}
        </div>
      </div>

      <ShareSheet isOpen={showShare} onClose={() => setShowShare(false)} url={`https://kliq.app/@${user?.username}`} />

      {showQr && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6" onClick={() => setShowQr(false)}>
          <div className="bg-white p-6 rounded-3xl text-center max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://kliq.app/user/${user?.username}`)}`}
              alt="Profile QR" className="w-48 h-48 mx-auto mb-4 rounded-xl" />
            <p className="text-gray-800 font-bold text-lg">{user?.displayName}</p>
            <p className="text-gray-500 text-sm">@{user?.username}</p>
            <button onClick={() => setShowQr(false)} className="mt-4 text-gray-400 text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
