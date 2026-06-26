import { NavLink } from "react-router";
import {
  LayoutDashboard, Users, ShieldCheck, Users2,
  BarChart2, Bell, Settings, ExternalLink, MessageSquare,
  Inbox, DollarSign, SlidersHorizontal, Film,
  Flag, Radio, BadgeCheck,
} from "lucide-react";

const NAV_MAIN = [
  { to: "/",              icon: LayoutDashboard, label: "Dashboard"    },
  { to: "/users",         icon: Users,           label: "Users"        },
  { to: "/content",       icon: ShieldCheck,     label: "Content"      },
  { to: "/communities",   icon: Users2,          label: "Communities"  },
  { to: "/analytics",     icon: BarChart2,       label: "Analytics"    },
  { to: "/messages",      icon: MessageSquare,   label: "Messages"     },
  { to: "/notifications", icon: Bell,            label: "Notifications"},
  { to: "/settings",      icon: Settings,        label: "App Settings" },
];

const NAV_MODERATION = [
  { to: "/moderation",            icon: Inbox,             label: "Queue"           },
  { to: "/auto-moderation",       icon: SlidersHorizontal, label: "Auto-Mod Rules"  },
  { to: "/revenue",               icon: DollarSign,        label: "Revenue"         },
  { to: "/kliqstream-catalogue",  icon: Film,              label: "KliqStream"      },
  { to: "/reports",               icon: Flag,              label: "Reports"         },
  { to: "/live-moderation",       icon: Radio,             label: "Live Streams"    },
  { to: "/badge-requests",        icon: BadgeCheck,        label: "Badge Requests"  },
];

const KLIQ_APP_URL = "http://localhost:5174";

export function Sidebar() {
  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <img src="/kliq_logo.jpeg" alt="KLIQ" className="w-10 h-10 rounded-xl object-cover" />
          <div>
            <p className="font-black text-sm leading-none bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">KLIQ</p>
            <p className="text-gray-500 text-[10px] mt-0.5">Control System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_MAIN.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gradient-to-r from-cyan-500/10 to-pink-500/10 text-white border border-cyan-500/20"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        {/* Moderation section */}
        <div className="pt-3 pb-1">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">Moderation</p>
        </div>
        {NAV_MODERATION.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gradient-to-r from-cyan-500/10 to-pink-500/10 text-white border border-cyan-500/20"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* View App link */}
      <div className="p-3 border-t border-gray-800">
        <a
          href={KLIQ_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <ExternalLink size={16} />
          Open KLIQ App
        </a>
      </div>
    </aside>
  );
}
