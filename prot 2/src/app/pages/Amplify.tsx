import { Megaphone, TrendingUp, Users, Link as LinkIcon, ChevronRight } from "lucide-react";
import { useState } from "react";

const POSTS = [
  { id: 1, views: "12K", img: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=400&auto=format&fit=crop" },
  { id: 2, views: "8.5K", img: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=400&auto=format&fit=crop" },
  { id: 3, views: "24K", img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop" }
];

export function Amplify() {
  const [selectedPost, setSelectedPost] = useState(POSTS[0].id);
  const [goal, setGoal] = useState("views");
  const [budget, setBudget] = useState(500); // in tokens

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
          <Megaphone size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Amplify</h1>
          <p className="text-zinc-400 mt-1">Boost your content to reach more people</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Step 1: Select Post */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">1. Select a post</h2>
            <button className="text-sm text-indigo-400 font-medium">View all</button>
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {POSTS.map(post => (
              <div 
                key={post.id}
                onClick={() => setSelectedPost(post.id)}
                className={`relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selectedPost === post.id ? 'border-indigo-500 scale-[1.02] shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'border-transparent opacity-70 hover:opacity-100'}`}
              >
                <img src={post.img} alt="Post thumbnail" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                  <TrendingUp size={12} /> {post.views}
                </div>
                {selectedPost === post.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center border-2 border-white">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Step 2: What is your goal? */}
        <section>
          <h2 className="text-xl font-bold mb-4">2. What is your goal?</h2>
          <div className="space-y-3">
            <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${goal === 'views' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${goal === 'views' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-400'}`}>
                  <TrendingUp size={20} />
                </div>
                <div>
                  <div className="font-bold text-white">More video views</div>
                  <div className="text-xs text-zinc-400">Get more people to watch your video</div>
                </div>
              </div>
              <input type="radio" name="goal" checked={goal === 'views'} onChange={() => setGoal('views')} className="w-5 h-5 accent-indigo-500" />
            </label>

            <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${goal === 'followers' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${goal === 'followers' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-400'}`}>
                  <Users size={20} />
                </div>
                <div>
                  <div className="font-bold text-white">More followers</div>
                  <div className="text-xs text-zinc-400">Grow your audience on Kliq</div>
                </div>
              </div>
              <input type="radio" name="goal" checked={goal === 'followers'} onChange={() => setGoal('followers')} className="w-5 h-5 accent-indigo-500" />
            </label>

            <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${goal === 'website' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${goal === 'website' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-400'}`}>
                  <LinkIcon size={20} />
                </div>
                <div>
                  <div className="font-bold text-white">More website visits</div>
                  <div className="text-xs text-zinc-400">Drive traffic to your link in bio</div>
                </div>
              </div>
              <input type="radio" name="goal" checked={goal === 'website'} onChange={() => setGoal('website')} className="w-5 h-5 accent-indigo-500" />
            </label>
          </div>
        </section>

        {/* Step 3: Audience */}
        <section>
          <h2 className="text-xl font-bold mb-4">3. Audience</h2>
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-zinc-800/80 transition-colors">
            <div>
              <div className="font-bold text-white">Automatic</div>
              <div className="text-sm text-zinc-400">Kliq chooses people interested in your content</div>
            </div>
            <ChevronRight className="text-zinc-500" />
          </div>
        </section>

        {/* Step 4: Budget */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">4. Budget & Duration</h2>
            <div className="text-indigo-400 font-bold">{budget} Tokens</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2 text-zinc-400">
                <span>100 🪙</span>
                <span>5000 🪙</span>
              </div>
              <input 
                type="range" 
                min="100" 
                max="5000" 
                step="100"
                value={budget} 
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full accent-indigo-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="bg-black/30 p-4 rounded-lg flex items-center justify-between">
              <span className="text-zinc-400 text-sm">Estimated Reach</span>
              <span className="font-bold text-lg text-white">{(budget * 15).toLocaleString()} - {(budget * 25).toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Action Button */}
        <button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all transform active:scale-[0.98]">
          Pay & Start Amplify
        </button>
      </div>
    </div>
  );
}
