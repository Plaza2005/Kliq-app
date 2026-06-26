import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Bookmark, Loader2 } from "lucide-react";
import { api, resolveMediaUrl } from "../api/client";

interface SavedPost {
  id: string; body: string; mediaUrl: string | null; thumbUrl: string | null;
  postType: string; likeCount: number; bookmarkedAt: string;
  author: { username: string; displayName: string; avatarUrl: string };
}

export function SavedPosts() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<SavedPost[]>("/bookmarks").then(setPosts).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h1 className="text-white font-bold">Saved Posts</h1>
      </div>
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-purple-400" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Bookmark size={40} className="text-gray-700" />
          <p className="text-gray-500">No saved posts yet</p>
          <p className="text-gray-700 text-sm text-center px-8">Tap the bookmark icon on any post to save it</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {posts.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/post/${p.id}`)}
              className="aspect-square bg-gray-900 cursor-pointer overflow-hidden relative"
            >
              {(p.thumbUrl ?? p.mediaUrl) ? (
                <img
                  src={resolveMediaUrl(p.thumbUrl ?? p.mediaUrl ?? "") ?? ""}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full p-2 flex items-center justify-center">
                  <p className="text-gray-400 text-xs text-center line-clamp-4">{p.body}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
