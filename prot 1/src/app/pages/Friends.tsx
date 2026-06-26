import { useState } from "react";
import { Menu, Search, Heart, MessageCircle, Share2 } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { ActionPanel } from "../components/ActionPanel";

const stories = Array(8).fill(null).map((_, i) => ({
  id: i,
  username: `user${i + 1}`,
  hasStory: i < 5,
}));

const posts = [
  {
    id: 1,
    username: "@bestfriend",
    time: "2h ago",
    caption: "Amazing day at the beach! 🌊☀️",
    likes: "234",
    comments: "12",
  },
  {
    id: 2,
    username: "@closefriend",
    time: "5h ago",
    caption: "New project coming soon... 🎨",
    likes: "567",
    comments: "34",
  },
];

export function Friends() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black pb-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md z-40 border-b border-gray-800">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <button onClick={() => setIsPanelOpen(true)}>
            <Menu className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl text-white">Friends</h1>
          <button>
            <Search className="w-6 h-6 text-white" />
          </button>
        </div>
      </header>

      <div className="pt-14">
        {/* Stories */}
        <div className="p-4 border-b border-gray-800 overflow-x-auto">
          <div className="flex gap-4">
            {stories.map((story) => (
              <div key={story.id} className="flex flex-col items-center gap-2 flex-shrink-0">
                <div
                  className={`w-16 h-16 rounded-full p-0.5 ${
                    story.hasStory
                      ? "bg-gradient-to-tr from-purple-500 to-pink-500"
                      : "bg-gray-700"
                  }`}
                >
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 rounded-full" />
                </div>
                <span className="text-white text-xs truncate max-w-[4rem]">
                  {story.username}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-gray-900/30 border-b border-gray-800">
              {/* Post Header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full" />
                  <div>
                    <div className="text-white">{post.username}</div>
                    <div className="text-gray-400 text-xs">{post.time}</div>
                  </div>
                </div>
                <button className="text-white">•••</button>
              </div>

              {/* Post Image */}
              <div className="w-full aspect-square bg-gradient-to-br from-purple-900/30 to-pink-900/30" />

              {/* Post Actions */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button className="hover:opacity-70 transition">
                      <Heart className="w-6 h-6 text-white" />
                    </button>
                    <button className="hover:opacity-70 transition">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </button>
                    <button className="hover:opacity-70 transition">
                      <Share2 className="w-6 h-6 text-white" />
                    </button>
                  </div>
                </div>

                <div className="text-white text-sm">{post.likes} likes</div>

                <div className="text-white text-sm">
                  <span className="mr-2">{post.username}</span>
                  <span className="text-gray-300">{post.caption}</span>
                </div>

                <button className="text-gray-400 text-sm">
                  View all {post.comments} comments
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
      <ActionPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
    </div>
  );
}
