import { Outlet, NavLink } from "react-router";
import { 
  Home, 
  PlaySquare, 
  Store, 
  BarChart2, 
  Wallet, 
  User,
  Menu,
  Bell,
  Search,
  Megaphone
} from "lucide-react";
import { useState } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import kliqLogo from "../../imports/Kliq_logo.jpeg";
import { useUser } from "../context/UserContext";

export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { tier, setTier } = useUser();

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/marketplace", icon: Store, label: "Marketplace" },
    { to: "/studio", icon: BarChart2, label: "Studio" },
    { to: "/amplify", icon: Megaphone, label: "Amplify" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="flex h-screen bg-[#0f0f13] text-white font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#18181b] border-r border-zinc-800">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center">
             <ImageWithFallback src={kliqLogo} alt="Kliq Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">KLIQ</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive 
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg" 
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`
              }
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-zinc-800/50 bg-[#0f0f13]/80 backdrop-blur-md z-10">
          <div className="flex items-center md:hidden">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center mr-3">
              <ImageWithFallback src={kliqLogo} alt="Kliq Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold">KLIQ</span>
          </div>

          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text" 
                placeholder="Search Kliq..." 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Dev Tier Switcher */}
            <div className="hidden lg:flex bg-zinc-800 rounded-lg p-1 text-xs font-medium">
              {[1, 2, 3].map(t => (
                <button 
                  key={t}
                  onClick={() => setTier(t as any)}
                  className={`px-3 py-1 rounded-md transition-colors ${tier === t ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  Tier {t}
                </button>
              ))}
            </div>

            <button className="p-2 text-zinc-400 hover:text-white transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full"></span>
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px]">
              <div className="w-full h-full rounded-full border-2 border-[#0f0f13] overflow-hidden">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop" alt="User" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#18181b] border-t border-zinc-800 flex justify-around p-3 pb-safe z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                isActive ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
              }`
            }
          >
            <item.icon size={24} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
