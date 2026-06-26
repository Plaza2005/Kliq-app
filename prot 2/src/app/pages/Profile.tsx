import { Settings, Edit3, Grid, Heart, Bookmark, Menu, Wallet, PlaySquare, ChevronRight, BarChart2, Video, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useUser } from "../context/UserContext";

export function Profile() {
  const [isActionPanelOpen, setIsActionPanelOpen] = useState(false);
  const { tier } = useUser();

  return (
    <div className="pb-24 overflow-x-hidden">
      {/* Action Panel Overlay */}
      {isActionPanelOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setIsActionPanelOpen(false)}
        />
      )}

      {/* Action Panel Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-[#18181b] border-l border-zinc-800 z-50 transform transition-transform duration-300 ease-in-out ${isActionPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between border-b border-zinc-800">
          <h2 className="text-xl font-bold">Action Panel</h2>
          <button onClick={() => setIsActionPanelOpen(false)} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-2">
          <Link to="/wallet" className="flex items-center justify-between p-4 rounded-xl hover:bg-zinc-800 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg group-hover:bg-indigo-500/30">
                <Wallet size={20} />
              </div>
              <span className="font-bold">Wallet</span>
            </div>
            <ChevronRight size={18} className="text-zinc-500 group-hover:text-white" />
          </Link>

          <Link to="/stream" className="flex items-center justify-between p-4 rounded-xl hover:bg-zinc-800 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg group-hover:bg-purple-500/30">
                <PlaySquare size={20} />
              </div>
              <span className="font-bold">Kliq Stream</span>
            </div>
            <ChevronRight size={18} className="text-zinc-500 group-hover:text-white" />
          </Link>

          <div className="flex items-center justify-between p-4 rounded-xl hover:bg-zinc-800 transition-colors group cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg group-hover:bg-zinc-700">
                <BarChart2 size={20} />
              </div>
              <span className="font-bold">Activity Centre</span>
            </div>
            <ChevronRight size={18} className="text-zinc-500 group-hover:text-white" />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl hover:bg-zinc-800 transition-colors group cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg group-hover:bg-zinc-700">
                <Video size={20} />
              </div>
              <span className="font-bold">Offline Videos</span>
            </div>
            <ChevronRight size={18} className="text-zinc-500 group-hover:text-white" />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl hover:bg-zinc-800 transition-colors group cursor-pointer border-t border-zinc-800 mt-4 pt-6 rounded-t-none">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg group-hover:bg-zinc-700">
                <Settings size={20} />
              </div>
              <span className="font-bold">Settings & Privacy</span>
            </div>
            <ChevronRight size={18} className="text-zinc-500 group-hover:text-white" />
          </div>

          <div className="mt-8 p-4 bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-xl border border-zinc-700">
            <div className="text-sm font-bold text-zinc-400 mb-1">Current Plan</div>
            <div className="text-xl font-extrabold text-white mb-3">Tier {tier} {tier === 1 ? 'Basic' : tier === 2 ? 'Creator' : 'Studio'}</div>
            {tier < 3 && (
              <button className="w-full bg-white text-black font-bold py-2 rounded-lg text-sm hover:bg-zinc-200">
                Upgrade Tier
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cover Image */}
      <div className="h-48 md:h-64 bg-zinc-800 w-full relative">
        <img 
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop" 
          alt="Cover" 
          className="w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f13] to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-8 relative -mt-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
            <div className="w-32 h-32 rounded-full border-4 border-[#0f0f13] overflow-hidden bg-zinc-800 z-10 relative">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop" alt="Profile" className="w-full h-full object-cover" />
            </div>
            
            <div className="text-center md:text-left z-10">
              <h1 className="text-3xl font-bold">Sarah Jenkins</h1>
              <p className="text-zinc-400">@sarah_vlogs</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center z-10">
            <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
              <Edit3 size={18} /> Edit Profile
            </button>
            <button 
              onClick={() => setIsActionPanelOpen(true)}
              className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        <div className="flex justify-center md:justify-start gap-8 mb-8 text-center md:text-left">
          <div>
            <span className="text-xl font-bold">142</span>
            <p className="text-zinc-500 text-sm">Posts</p>
          </div>
          <div>
            <span className="text-xl font-bold">89.4K</span>
            <p className="text-zinc-500 text-sm">Followers</p>
          </div>
          <div>
            <span className="text-xl font-bold">1,024</span>
            <p className="text-zinc-500 text-sm">Following</p>
          </div>
          <div>
            <span className="text-xl font-bold">1.2M</span>
            <p className="text-zinc-500 text-sm">Likes</p>
          </div>
        </div>

        <p className="max-w-2xl text-center md:text-left text-zinc-300 mb-8">
          Digital creator & traveler. Documenting my journey around the world. 🌍✈️<br/>
          Business inquiries: sarah@example.com
        </p>

        {/* Tabs */}
        <div className="border-t border-zinc-800 flex justify-center md:justify-start gap-8">
          <button className="flex items-center gap-2 py-4 border-t-2 border-white text-white font-medium">
            <Grid size={18} /> Posts
          </button>
          <button className="flex items-center gap-2 py-4 border-t-2 border-transparent text-zinc-500 hover:text-zinc-300 font-medium">
            <Heart size={18} /> Liked
          </button>
          <button className="flex items-center gap-2 py-4 border-t-2 border-transparent text-zinc-500 hover:text-zinc-300 font-medium">
            <Bookmark size={18} /> Saved
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-1 md:gap-4 mt-4">
          {[1,2,3,4,5,6,7,8,9].map(i => (
            <div key={i} className="aspect-[3/4] bg-zinc-800 cursor-pointer overflow-hidden group">
              <img 
                src={`https://images.unsplash.com/photo-${1500000000000 + i}?q=80&w=400&auto=format&fit=crop`} 
                alt="" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
