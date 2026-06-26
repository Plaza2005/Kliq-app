import { useState } from "react";
import { Menu, TrendingUp, Target, Calendar, DollarSign, Users, Eye, BarChart } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { ActionPanel } from "../components/ActionPanel";

const activeCampaigns = [
  {
    id: 1,
    name: "Summer Sale Campaign",
    budget: "$250",
    spent: "$187",
    reach: "45.2K",
    engagement: "12.3%",
    status: "active",
  },
  {
    id: 2,
    name: "New Product Launch",
    budget: "$500",
    spent: "$123",
    reach: "23.1K",
    engagement: "8.7%",
    status: "active",
  },
];

export function Amplify() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [budget, setBudget] = useState("100");
  const [duration, setDuration] = useState("7");

  const estimatedReach = parseInt(budget) * 180;

  return (
    <div className="min-h-screen bg-black pb-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md z-40 border-b border-gray-800">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <button onClick={() => setIsPanelOpen(true)}>
            <Menu className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl text-white">Amplify</h1>
          <TrendingUp className="w-6 h-6 text-purple-500" />
        </div>
      </header>

      <div className="pt-14">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 p-6 border-b border-gray-800">
          <h2 className="text-2xl text-white mb-2">Boost Your Reach</h2>
          <p className="text-gray-300 text-sm">
            Promote your content to reach more people and grow your audience
          </p>
        </div>

        {/* Create Campaign */}
        <div className="p-4 space-y-4 border-b border-gray-800">
          <h3 className="text-white text-lg">Create New Campaign</h3>

          {/* Select Post */}
          <div className="space-y-2">
            <label className="text-gray-300 text-sm">Select Post to Promote</label>
            <div className="flex items-center gap-3 p-3 bg-gray-900/30 rounded-lg border border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded" />
              <div className="flex-1">
                <div className="text-white text-sm">Latest Post</div>
                <div className="text-gray-400 text-xs">12.3K views</div>
              </div>
              <button className="text-purple-400 text-sm">Change</button>
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <label className="text-gray-300 text-sm">Daily Budget</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-gray-300 text-sm">Campaign Duration</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-purple-500 appearance-none"
              >
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
            </div>
          </div>

          {/* Audience */}
          <div className="space-y-2">
            <label className="text-gray-300 text-sm">Target Audience</label>
            <div className="space-y-2">
              <button className="w-full p-3 bg-purple-600/20 border border-purple-500 text-purple-400 rounded-lg text-left">
                <div className="flex items-center justify-between">
                  <span>Similar Interests</span>
                  <span className="text-xs">Recommended</span>
                </div>
              </button>
              <button className="w-full p-3 bg-gray-900 border border-gray-700 text-white rounded-lg text-left">
                Followers
              </button>
              <button className="w-full p-3 bg-gray-900 border border-gray-700 text-white rounded-lg text-left">
                Custom (Age, Region, Gender)
              </button>
            </div>
          </div>

          {/* Estimated Reach */}
          <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400 text-sm">Estimated Reach</span>
            </div>
            <div className="text-3xl text-white mb-1">
              {estimatedReach.toLocaleString()}
            </div>
            <div className="text-gray-400 text-xs">
              Based on ${budget}/day for {duration} days
            </div>
          </div>

          {/* Launch Button */}
          <button className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition">
            Launch Campaign - ${parseInt(budget) * parseInt(duration)}
          </button>
        </div>

        {/* Active Campaigns */}
        <div className="p-4 space-y-4">
          <h3 className="text-white text-lg">Active Campaigns</h3>
          {activeCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-gray-900/30 border border-gray-800 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-white mb-1">{campaign.name}</h4>
                  <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded capitalize">
                    {campaign.status}
                  </span>
                </div>
                <button className="text-purple-400 text-sm">Manage</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-900 rounded">
                  <div className="text-gray-400 text-xs mb-1">Budget</div>
                  <div className="text-white">{campaign.budget}</div>
                  <div className="text-gray-500 text-xs">{campaign.spent} spent</div>
                </div>
                <div className="p-3 bg-gray-900 rounded">
                  <div className="text-gray-400 text-xs mb-1">Reach</div>
                  <div className="text-white">{campaign.reach}</div>
                  <div className="text-green-400 text-xs">{campaign.engagement} engagement</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition text-sm">
                  Pause
                </button>
                <button className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition text-sm">
                  View Stats
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
