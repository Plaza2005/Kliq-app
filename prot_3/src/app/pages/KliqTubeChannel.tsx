import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Loader2, ListVideo } from "lucide-react";
import { api, resolveAvatarUrl, resolveMediaUrl } from "../api/client";
import { MediaImg } from "../components/media/MediaImg";
import { useSocial } from "../context/SocialContext";

interface ChannelData {
  username: string; displayName: string; bio: string | null;
  avatarUrl: string; coverUrl: string | null; followerCount: number; postCount: number;
  isVerified: boolean; createdAt: string; isLive?: boolean; liveStreamTitle?: string | null;
}
interface VideoItem {
  id: string; body: string; mediaUrl: string | null; thumbUrl: string | null;
  viewCount: number; createdAt: string; duration?: number | null;
}
interface PlaylistItem { id: string; name: string; itemCount: number; createdAt: string; }
interface CommunityPost {
  id: string; body: string; mediaUrl: string | null; mediaType: string | null;
  likeCount: number; commentCount: number; createdAt: string;
}

const TABS = ["Videos", "Shorts", "Live", "Playlists", "Community", "About"] as const;
type Tab = (typeof TABS)[number];

const fmtN = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : n.toString();
const tAgo = (d: string) => { const m = Math.floor((Date.now() - new Date(d).getTime()) / 6e4); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`; };
const fmtD = (s: number) => { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, "0")}`; };
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "long", year: "numeric" });

export function KliqTubeChannel() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { isFollowing, toggleFollow } = useSocial();
  const [ch, setCh] = useState<ChannelData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Videos");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [shorts, setShorts] = useState<VideoItem[]>([]);
  const [liveVideos, setLiveVideos] = useState<VideoItem[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [community, setCommunity] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const loaded = useRef(new Set<Tab>(["Videos"]));

  useEffect(() => {
    if (!username) return;
    Promise.all([
      api.get<ChannelData>(`/users/${username}`),
      api.get<VideoItem[]>(`/users/${username}/posts?type=tube`),
    ]).then(([c, v]) => { setCh(c); setVideos(v); }).catch(() => {}).finally(() => setLoading(false));
  }, [username]);

  const loadTab = async (tab: Tab) => {
    if (!username || loaded.current.has(tab)) return;
    loaded.current.add(tab);
    if (tab === "Shorts") {
      const data = await api.get<VideoItem[]>(`/users/${username}/posts?type=reel`).catch(() => []);
      setShorts(data);
    } else if (tab === "Live") {
      const data = await api.get<VideoItem[]>(`/users/${username}/posts?type=live`).catch(() => []);
      setLiveVideos(data);
    } else if (tab === "Playlists") {
      const data = await api.get<PlaylistItem[]>(`/users/${username}/playlists`).catch(() => []);
      setPlaylists(data);
    } else if (tab === "Community") {
      const data = await api.get<CommunityPost[]>(`/users/${username}/posts?type=post`).catch(() => []);
      setCommunity(data);
    }
  };

  const handleTab = (tab: Tab) => {
    setActiveTab(tab);
    loadTab(tab);
  };

  if (loading) return <div className="min-h-full bg-[#0f0f0f] flex items-center justify-center"><Loader2 size={28} className="animate-spin text-gray-600" /></div>;
  if (!ch) return null;
  const following = isFollowing(ch.username);

  return (
    <div className="min-h-full bg-[#0f0f0f] pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-[#0f0f0f]/95 backdrop-blur border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full"><ArrowLeft size={20} className="text-white" /></button>
        <span className="text-white font-bold">{ch.displayName}</span>
        {ch.isLive && <span className="ml-auto bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">LIVE</span>}
      </div>

      <div className="h-28 bg-gray-800 relative overflow-hidden">
        {ch.coverUrl && <img src={ch.coverUrl} className="w-full h-full object-cover opacity-50" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent" />
      </div>

      <div className="px-4 -mt-8 relative z-10 mb-4">
        <div className="relative inline-block mb-3">
          <img src={resolveAvatarUrl(ch.avatarUrl)} className="w-16 h-16 rounded-full border-4 border-[#0f0f0f] object-cover bg-gray-800" />
          {ch.isLive && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">LIVE</span>
          )}
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-white font-bold text-lg">{ch.displayName}</h1>
              {ch.isVerified && <span className="text-blue-400 text-sm">✓</span>}
            </div>
            <p className="text-gray-500 text-xs">@{ch.username} · {fmtN(ch.followerCount)} subscribers · {ch.postCount} videos</p>
          </div>
          <button
            onClick={() => toggleFollow(ch.username)}
            className={`flex-shrink-0 font-semibold text-sm px-4 py-2 rounded-full transition mt-1 ${following ? "bg-gray-800 text-white" : "bg-white text-black hover:bg-gray-200"}`}
          >
            {following ? "Subscribed" : "Subscribe"}
          </button>
        </div>
        {ch.bio && <p className="text-gray-400 text-sm mt-2 line-clamp-2">{ch.bio}</p>}
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-800 mb-4">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => handleTab(tab)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab ? "text-white border-b-2 border-white -mb-px" : "text-gray-500 hover:text-gray-300"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Videos */}
      {activeTab === "Videos" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4">
          {videos.length === 0 && <p className="text-gray-600 text-sm col-span-2 text-center py-8">No videos yet</p>}
          {videos.map(v => <VideoCard key={v.id} v={v} onClick={() => navigate(`/klixtube/watch/${v.id}`)} />)}
        </div>
      )}

      {/* Shorts */}
      {activeTab === "Shorts" && (
        <div className="grid grid-cols-3 gap-1 px-4">
          {shorts.length === 0 && <p className="text-gray-600 text-sm col-span-3 text-center py-8">No shorts yet</p>}
          {shorts.map(v => (
            <div key={v.id} onClick={() => navigate(`/klixtube/watch/${v.id}`)} className="cursor-pointer aspect-[9/16] relative rounded-lg overflow-hidden bg-gray-900">
              {(v.thumbUrl ?? v.mediaUrl) && (
                <MediaImg src={resolveMediaUrl(v.thumbUrl ?? v.mediaUrl ?? "") ?? ""} className="w-full h-full object-cover" context={`shorts:${v.id}`} />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-white text-[10px] font-medium line-clamp-2 drop-shadow">{v.body || "Short"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live */}
      {activeTab === "Live" && (
        <div className="px-4">
          {ch.isLive && ch.liveStreamTitle && (
            <div
              onClick={() => navigate(`/live/${ch.username}`)}
              className="cursor-pointer mb-6 relative aspect-video rounded-xl overflow-hidden bg-gray-900"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded animate-pulse">● LIVE</span>
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white font-semibold">{ch.liveStreamTitle}</p>
                <p className="text-gray-300 text-sm">{ch.displayName}</p>
              </div>
            </div>
          )}
          {liveVideos.length === 0 && !ch.isLive && (
            <p className="text-gray-600 text-sm text-center py-8">No live content yet</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {liveVideos.map(v => <VideoCard key={v.id} v={v} onClick={() => navigate(`/klixtube/watch/${v.id}`)} badge="Recorded" />)}
          </div>
        </div>
      )}

      {/* Playlists */}
      {activeTab === "Playlists" && (
        <div className="grid grid-cols-2 gap-4 px-4">
          {playlists.length === 0 && <p className="text-gray-600 text-sm col-span-2 text-center py-8">No playlists yet</p>}
          {playlists.map(pl => (
            <div key={pl.id} className="cursor-pointer group">
              <div className="aspect-video bg-gray-800 rounded-xl mb-2 flex flex-col items-center justify-center relative overflow-hidden border border-gray-700 group-hover:border-gray-500 transition-colors">
                <ListVideo size={28} className="text-gray-600 mb-1" />
                <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">{pl.itemCount}</span>
              </div>
              <p className="text-white text-sm font-medium line-clamp-1">{pl.name}</p>
              <p className="text-gray-500 text-xs">Playlist · {pl.itemCount} {pl.itemCount === 1 ? "video" : "videos"}</p>
            </div>
          ))}
        </div>
      )}

      {/* Community */}
      {activeTab === "Community" && (
        <div className="px-4 space-y-4">
          {community.length === 0 && <p className="text-gray-600 text-sm text-center py-8">No community posts yet</p>}
          {community.map(post => (
            <div key={post.id} className="bg-gray-900 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <img src={resolveAvatarUrl(ch.avatarUrl)} className="w-8 h-8 rounded-full object-cover" />
                <div>
                  <p className="text-white text-sm font-medium">{ch.displayName}</p>
                  <p className="text-gray-500 text-xs">{tAgo(post.createdAt)}</p>
                </div>
              </div>
              {post.body && <p className="text-white text-sm mb-3 leading-relaxed">{post.body}</p>}
              {post.mediaUrl && (
                <div className="rounded-lg overflow-hidden mb-3">
                  <MediaImg src={resolveMediaUrl(post.mediaUrl) ?? ""} className="w-full max-h-80 object-cover" context={`community:${post.id}`} />
                </div>
              )}
              <p className="text-gray-500 text-xs">{fmtN(post.likeCount)} likes · {fmtN(post.commentCount)} comments</p>
            </div>
          ))}
        </div>
      )}

      {/* About */}
      {activeTab === "About" && (
        <div className="px-4 space-y-6">
          {ch.bio ? (
            <div>
              <h3 className="text-white font-semibold mb-2">Description</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{ch.bio}</p>
            </div>
          ) : (
            <p className="text-gray-600 text-sm">No description provided.</p>
          )}
          <div>
            <h3 className="text-white font-semibold mb-3">Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-gray-400 text-sm">Subscribers</span>
                <span className="text-white text-sm font-medium">{fmtN(ch.followerCount)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-800">
                <span className="text-gray-400 text-sm">Videos</span>
                <span className="text-white text-sm font-medium">{ch.postCount}</span>
              </div>
              {ch.createdAt && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400 text-sm">Joined</span>
                  <span className="text-white text-sm font-medium">{fmtDate(ch.createdAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoCard({ v, onClick, badge }: { v: VideoItem; onClick: () => void; badge?: string }) {
  return (
    <div onClick={onClick} className="cursor-pointer group">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 mb-2">
        {(v.thumbUrl ?? v.mediaUrl) && (
          <MediaImg
            src={resolveMediaUrl(v.thumbUrl ?? v.mediaUrl ?? "") ?? ""}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            context={`ch-video:${v.id}`}
          />
        )}
        {v.duration != null && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">{fmtD(v.duration)}</span>
        )}
        {badge && (
          <span className="absolute top-2 left-2 bg-gray-800/90 text-white text-xs px-1.5 py-0.5 rounded">{badge}</span>
        )}
      </div>
      <p className="text-white font-medium text-sm line-clamp-2 mb-1">{v.body || "Untitled"}</p>
      <p className="text-gray-500 text-xs">{fmtN(v.viewCount)} views · {tAgo(v.createdAt)}</p>
    </div>
  );
}
