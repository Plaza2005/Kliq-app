import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Heart, Share2, MessageSquare, TrendingUp } from "lucide-react";
import { CommentSheet } from "../components/CommentSheet";
import { ShareSheet } from "../components/ShareSheet";

const POSTS: Record<string, {
  id: string; community: string; user: string; userImg: string; time: string;
  title: string; body: string; replies: number; upvotes: number;
}> = {
  "1": { id: "1", community: "Creator Hub", user: "alex_creates", userImg: "/avatar-default.svg", time: "1h ago", title: "Best tools for content planning in 2025?", body: "I've been using Notion but looking for something with better calendar views and automation. Anyone switched to something better lately? I'm open to paid tools as long as they save time. Currently spending 2+ hours a week just on scheduling and I know there has to be a better way.\n\nSpecifically looking for:\n- Good mobile app\n- Calendar/grid view\n- Analytics integration\n- Team collaboration\n\nWhat are you all using?", replies: 34, upvotes: 128 },
  "2": { id: "2", community: "Kliq Beats", user: "dj_kryptonite", userImg: "/avatar-default.svg", time: "3h ago", title: "Rate my new beat (link in comments)", body: "Just finished a chill lofi track. Been working on it for 3 days. Would love honest feedback from this community before I release it on KliqTube.\n\nThe vibe is late-night study session meets city rain. Sample pack is all royalty free. BPM is around 75 which felt right for the mood.\n\nDrop your thoughts below!", replies: 17, upvotes: 89 },
  "3": { id: "3", community: "Creator Hub", user: "mia_arts", userImg: "/avatar-default.svg", time: "6h ago", title: "Tier 2 vs Tier 3 - is the upgrade worth it?", body: "Just hit 50K followers and wondering if Kliq Tier 3 analytics are worth the price difference. Who's made the switch?\n\nThe main things I'm looking at are the detailed demographic data and the revenue analytics. Currently on Tier 2 and the basic charts just aren't giving me enough to make content decisions.\n\nAnyone who's upgraded - did it actually change how you approach content? Or is it mostly just numbers?", replies: 52, upvotes: 204 },
};

export function CommunityPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [upvoted, setUpvoted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const post = POSTS[id || "1"] || POSTS["1"];

  return (
    <div className="min-h-full bg-black pb-24">
      {/* Back bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur-md border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full transition">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <span className="text-purple-400 font-semibold text-sm">{post.community}</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Author */}
        <div className="flex items-center gap-3 mb-5">
          <img src={post.userImg} alt={post.user} className="w-11 h-11 rounded-full bg-gray-800" />
          <div>
            <p className="text-white font-semibold">{post.user}</p>
            <p className="text-gray-500 text-xs">{post.time}</p>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-white font-bold text-xl mb-4">{post.title}</h1>
        <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line mb-6">
          {post.body}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 py-4 border-t border-b border-gray-800 mb-6">
          <button
            onClick={() => setUpvoted(p => !p)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${upvoted ? "bg-purple-600/20 text-purple-300 border border-purple-500/50" : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-600"}`}
          >
            <TrendingUp size={16} />
            {post.upvotes + (upvoted ? 1 : 0)}
          </button>
          <button
            onClick={() => setShowComments(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-600 transition"
          >
            <MessageSquare size={16} />
            {post.replies} replies
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-600 transition ml-auto"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>

        {/* Comments preview */}
        <button
          onClick={() => setShowComments(true)}
          className="w-full py-4 bg-gray-900 border border-gray-800 rounded-2xl text-gray-400 hover:border-gray-600 transition text-sm"
        >
          View all {post.replies} comments →
        </button>
      </div>

      <CommentSheet isOpen={showComments} onClose={() => setShowComments(false)} count={String(post.replies)} />
      <ShareSheet isOpen={showShare} onClose={() => setShowShare(false)} />
    </div>
  );
}
