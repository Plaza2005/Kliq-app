import { Megaphone, TrendingUp, Users, Link as LinkIcon, ChevronRight, CheckCircle, Zap, BarChart2, Play, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

interface PostItem { id: string; body: string; mediaUrl: string | null; viewCount: number; }

interface Campaign {
  id: string;
  postId: string;
  goal: string;
  budget: number;
  duration: number;
  status: string;
  createdAt: string;
}

function fmtViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export function Amplify() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [goal, setGoal] = useState("views");
  const [budget, setBudget] = useState(500);
  const [duration, setDuration] = useState(7);
  const [launched, setLaunched] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<PostItem[]>(`/users/${user.username}/posts`).then(data => {
      setPosts(data.slice(0, 6));
      if (data.length > 0) setSelectedPost(data[0].id);
    }).catch(() => {});

    api.get<Campaign[]>("/amplify/campaigns").then(data => {
      setCampaigns(data);
    }).catch(() => {});
  }, [user]);

  const handleLaunch = async () => {
    if (!selectedPost) return;
    setLaunching(true);
    setLaunchError(null);
    try {
      await api.post("/amplify/campaigns", {
        postId: selectedPost,
        goal,
        budget: parseInt(String(budget)),
        duration: parseInt(String(duration)),
      });
      // Refresh campaigns list
      const updated = await api.get<Campaign[]>("/amplify/campaigns").catch(() => campaigns);
      setCampaigns(updated);
      setLaunched(true);
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Failed to launch campaign.");
    } finally {
      setLaunching(false);
    }
  };

  if (launched) {
    const goalLabel = goal === "views" ? "More video views" : goal === "followers" ? "More followers" : "More website visits";
    return (
      <div className="min-h-full bg-black flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl shadow-purple-900/60">
              <Zap size={40} className="text-white fill-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-black">
              <CheckCircle size={16} className="text-white" />
            </div>
          </div>
          <h2 className="text-white font-black text-3xl mb-2">Campaign Live!</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Your Amplify campaign is now active and reaching new audiences across Kliq.
          </p>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-left mb-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Goal</span>
              <span className="text-white font-medium">{goalLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Budget</span>
              <span className="text-white font-medium">{budget.toLocaleString()} Tokens</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Duration</span>
              <span className="text-white font-medium">{duration} {duration === 1 ? "day" : "days"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Est. Reach</span>
              <span className="text-purple-400 font-semibold">{(budget * duration * 2).toLocaleString()}–{(budget * duration * 4).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className="text-green-400 font-semibold">Active ✓</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate("/analytics")}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-900 border border-gray-700 text-white font-semibold py-3.5 rounded-xl hover:bg-gray-800 transition">
              <BarChart2 size={16} /> Analytics
            </button>
            <button onClick={() => navigate("/")}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto pb-24 bg-black min-h-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
          <Megaphone size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Amplify</h1>
          <p className="text-gray-500 mt-1">Boost your content to reach more people</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Step 1 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">1. Select a post</h2>
            <button className="text-sm text-purple-400 font-medium hover:text-purple-300 transition">View all</button>
          </div>
          {posts.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">No posts to boost yet. Create a post first.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post.id)}
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selectedPost === post.id ? "border-purple-500 scale-[1.02] shadow-[0_0_15px_rgba(147,51,234,0.3)]" : "border-transparent opacity-70 hover:opacity-100"}`}
                >
                  {post.mediaUrl ? (
                    <img src={post.mediaUrl} alt={post.body} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <Play size={24} className="text-gray-600" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 text-white">
                    <TrendingUp size={10} /> {fmtViews(post.viewCount)}
                  </div>
                  {selectedPost === post.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Step 2 */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">2. What is your goal?</h2>
          <div className="space-y-3">
            {[
              { key: "views", Icon: TrendingUp, label: "More video views", desc: "Get more people to watch your video" },
              { key: "followers", Icon: Users, label: "More followers", desc: "Grow your audience on Kliq" },
              { key: "website", Icon: LinkIcon, label: "More website visits", desc: "Drive traffic to your link in bio" },
            ].map(({ key, Icon, label, desc }) => (
              <label
                key={key}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${goal === key ? "bg-purple-500/10 border-purple-500" : "bg-gray-900 border-gray-800 hover:border-gray-700"}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${goal === key ? "bg-purple-500/20 text-purple-400" : "bg-gray-800 text-gray-500"}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-white">{label}</div>
                    <div className="text-xs text-gray-500">{desc}</div>
                  </div>
                </div>
                <input
                  type="radio"
                  name="goal"
                  checked={goal === key}
                  onChange={() => setGoal(key)}
                  className="w-5 h-5 accent-purple-500"
                />
              </label>
            ))}
          </div>
        </section>

        {/* Step 3 */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">3. Audience</h2>
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-gray-800/60 transition-colors">
            <div>
              <div className="font-bold text-white">Automatic</div>
              <div className="text-sm text-gray-500">Kliq chooses people interested in your content</div>
            </div>
            <ChevronRight className="text-gray-600" size={18} />
          </div>
        </section>

        {/* Step 4 */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">4. Budget &amp; Duration</h2>
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-6">

            {/* Budget slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-300">Budget</span>
                <span className="text-purple-400 font-bold">{budget.toLocaleString()} Tokens</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 mb-2">
                <span>100</span>
                <span>5,000</span>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full accent-purple-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between gap-2 mt-3">
                {[500, 1000, 2500, 5000].map(v => (
                  <button
                    key={v}
                    onClick={() => setBudget(v)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition ${
                      budget === v ? "border-purple-500 bg-purple-600/20 text-purple-300" : "border-gray-700 text-gray-500 hover:border-gray-600"
                    }`}
                  >
                    {v >= 1000 ? `${v / 1000}K` : v}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-800" />

            {/* Duration slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-300">Duration</span>
                <span className="text-purple-400 font-bold">{duration} {duration === 1 ? "day" : "days"}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 mb-2">
                <span>1 day</span>
                <span>30 days</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-purple-500 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between gap-2 mt-3">
                {[3, 7, 14, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition ${
                      duration === d ? "border-purple-500 bg-purple-600/20 text-purple-300" : "border-gray-700 text-gray-500 hover:border-gray-600"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-800" />

            {/* Summary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Daily spend</span>
                <span className="text-white font-medium">{Math.round(budget / duration).toLocaleString()} Tokens/day</span>
              </div>
              <div className="bg-black/30 p-4 rounded-xl flex items-center justify-between">
                <span className="text-gray-500 text-sm">Est. total reach</span>
                <span className="font-bold text-lg text-white">
                  {(budget * duration * 2).toLocaleString()} – {(budget * duration * 4).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </section>

        {launchError && (
          <p className="text-red-400 text-sm text-center -mt-4">{launchError}</p>
        )}

        <button
          onClick={handleLaunch}
          disabled={launching || !selectedPost}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {launching ? (
            <><Loader2 size={20} className="animate-spin" /> Launching…</>
          ) : (
            "Pay & Start Amplify"
          )}
        </button>
      </div>
    </div>
  );
}
