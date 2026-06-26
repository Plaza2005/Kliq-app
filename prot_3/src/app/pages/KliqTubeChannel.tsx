import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api, resolveMediaUrl } from "../api/client";
import { useSocial } from "../context/SocialContext";

interface ChannelData {
  username: string; displayName: string; bio: string | null;
  avatarUrl: string; coverUrl: string | null; followerCount: number; postCount: number; isVerified: boolean;
}
interface VideoItem { id: string; body: string; mediaUrl: string | null; thumbUrl: string | null; viewCount: number; createdAt: string; duration?: number | null; }

const fmtN = (n: number) => n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(1)+"K" : n.toString();
const tAgo = (d: string) => { const m = Math.floor((Date.now()-new Date(d).getTime())/6e4); return m<60?`${m}m ago`:m<1440?`${Math.floor(m/60)}h ago`:`${Math.floor(m/1440)}d ago`; };
const fmtD = (s: number) => { const m=Math.floor(s/60); return `${m}:${String(s%60).padStart(2,"0")}`; };

export function KliqTubeChannel() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { isFollowing, toggleFollow } = useSocial();
  const [ch, setCh] = useState<ChannelData | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    Promise.all([
      api.get<ChannelData>(`/users/${username}`),
      api.get<VideoItem[]>(`/users/${username}/posts?type=tube`),
    ]).then(([c, v]) => { setCh(c); setVideos(v); }).catch(() => {}).finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="min-h-full bg-[#0f0f0f] flex items-center justify-center"><Loader2 size={28} className="animate-spin text-gray-600" /></div>;
  if (!ch) return null;
  const following = isFollowing(ch.username);

  return (
    <div className="min-h-full bg-[#0f0f0f] pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-[#0f0f0f]/95 backdrop-blur border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full"><ArrowLeft size={20} className="text-white" /></button>
        <span className="text-white font-bold">{ch.displayName}</span>
      </div>
      <div className="h-28 bg-gray-800 relative overflow-hidden">
        {ch.coverUrl && <img src={ch.coverUrl} className="w-full h-full object-cover opacity-50" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent" />
      </div>
      <div className="px-4 -mt-8 relative z-10 mb-6">
        <img src={resolveMediaUrl(ch.avatarUrl) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${ch.username}`} className="w-16 h-16 rounded-full border-4 border-[#0f0f0f] object-cover bg-gray-800 mb-3" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-white font-bold text-lg">{ch.displayName}</h1>
              {ch.isVerified && <span className="text-blue-400 text-sm">✓</span>}
            </div>
            <p className="text-gray-500 text-xs">@{ch.username} · {fmtN(ch.followerCount)} subscribers · {ch.postCount} videos</p>
          </div>
          <button onClick={() => toggleFollow(ch.username)}
            className={`flex-shrink-0 font-semibold text-sm px-4 py-2 rounded-full transition mt-1 ${following ? "bg-gray-800 text-white" : "bg-white text-black hover:bg-gray-200"}`}>
            {following ? "Subscribed" : "Subscribe"}
          </button>
        </div>
        {ch.bio && <p className="text-gray-400 text-sm mt-2">{ch.bio}</p>}
      </div>
      <div className="border-b border-gray-800 px-4 pb-3 mb-4">
        <span className="text-white font-semibold text-sm border-b-2 border-white pb-3">Videos</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4">
        {videos.map(v => (
          <div key={v.id} onClick={() => navigate(`/klixtube/watch/${v.id}`)} className="cursor-pointer group">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 mb-2">
              {(v.thumbUrl ?? v.mediaUrl) && <img src={resolveMediaUrl(v.thumbUrl ?? v.mediaUrl ?? "") ?? ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
              {v.duration != null && <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">{fmtD(v.duration)}</span>}
            </div>
            <p className="text-white font-medium text-sm line-clamp-2 mb-1">{v.body || "Untitled"}</p>
            <p className="text-gray-500 text-xs">{fmtN(v.viewCount)} views · {tAgo(v.createdAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
