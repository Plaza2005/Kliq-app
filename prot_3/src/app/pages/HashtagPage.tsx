import { useParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api, resolveMediaUrl } from "../api/client";

interface PostResult {
  id: string;
  body: string;
  mediaUrl: string | null;
  thumbUrl: string | null;
  postType: string;
  likeCount: number;
  viewCount: number;
  author: { username: string; displayName: string; avatarUrl: string };
}

export function HashtagPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [postCount, setPostCount] = useState(0);

  useEffect(() => {
    if (!name) return;
    // Search posts containing this hashtag via /search/posts
    api
      .get<PostResult[]>(`/search/posts?q=${encodeURIComponent("#" + name)}`)
      .then((data) => {
        setPosts(data);
        setPostCount(data.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [name]);

  return (
    <div className="min-h-full bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur border-b border-gray-900">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-900 rounded-full transition"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <div>
          <h1 className="text-white font-bold">#{name}</h1>
          <p className="text-gray-500 text-xs">{postCount.toLocaleString()} posts</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-purple-400" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-sm">No posts for #{name} yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {posts.map((p, idx) => (
            <div
              key={p.id}
              onClick={() => navigate(`/post/${p.id}`)}
              className="aspect-square bg-gray-900 cursor-pointer relative overflow-hidden group"
            >
              {(p.thumbUrl ?? p.mediaUrl) ? (
                <img
                  src={resolveMediaUrl(p.thumbUrl ?? p.mediaUrl) ?? ""}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div
                  className={`w-full h-full flex items-center justify-center p-2 ${
                    idx % 4 === 0
                      ? "bg-gradient-to-b from-purple-800 to-black"
                      : idx % 4 === 1
                      ? "bg-gradient-to-b from-pink-800 to-black"
                      : idx % 4 === 2
                      ? "bg-gradient-to-b from-blue-800 to-black"
                      : "bg-gradient-to-b from-indigo-800 to-black"
                  }`}
                >
                  <p className="text-gray-400 text-xs text-center line-clamp-3">{p.body}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
