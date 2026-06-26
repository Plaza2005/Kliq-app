import { useState } from "react";
import { Menu, Search, Lock, Globe, Users, Plus } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { ActionPanel } from "../components/ActionPanel";

const communities = [
  {
    id: 1,
    name: "Fitness Enthusiasts",
    members: "12.5K",
    posts: "234",
    isPrivate: false,
    joined: true,
  },
  {
    id: 2,
    name: "Photography Club",
    members: "8.3K",
    posts: "567",
    isPrivate: true,
    joined: true,
  },
  {
    id: 3,
    name: "Tech Innovators",
    members: "15.2K",
    posts: "892",
    isPrivate: false,
    joined: false,
  },
  {
    id: 4,
    name: "Food Lovers",
    members: "20.1K",
    posts: "1.2K",
    isPrivate: false,
    joined: false,
  },
];

export function Community() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"joined" | "discover">("joined");

  const filteredCommunities = activeTab === "joined"
    ? communities.filter((c) => c.joined)
    : communities.filter((c) => !c.joined);

  return (
    <div className="min-h-screen bg-black pb-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md z-40 border-b border-gray-800">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <button onClick={() => setIsPanelOpen(true)}>
            <Menu className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl text-white">Communities</h1>
          <button>
            <Search className="w-6 h-6 text-white" />
          </button>
        </div>
      </header>

      <div className="pt-14">
        {/* Create Community Button */}
        <div className="p-4">
          <button className="w-full p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            Create Community
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab("joined")}
            className={`flex-1 py-4 ${
              activeTab === "joined"
                ? "text-white border-b-2 border-white"
                : "text-gray-400"
            }`}
          >
            My Communities
          </button>
          <button
            onClick={() => setActiveTab("discover")}
            className={`flex-1 py-4 ${
              activeTab === "discover"
                ? "text-white border-b-2 border-white"
                : "text-gray-400"
            }`}
          >
            Discover
          </button>
        </div>

        {/* Communities List */}
        <div className="p-4 space-y-3">
          {filteredCommunities.map((community) => (
            <div
              key={community.id}
              className="bg-gray-900/30 border border-gray-800 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white">{community.name}</h3>
                    {community.isPrivate ? (
                      <Lock className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Globe className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{community.members} members</span>
                    <span>{community.posts} posts</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {community.joined ? (
                  <>
                    <button className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition text-sm">
                      View
                    </button>
                    <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition text-sm">
                      Leave
                    </button>
                  </>
                ) : (
                  <button className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition text-sm">
                    {community.isPrivate ? "Request to Join" : "Join"}
                  </button>
                )}
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
