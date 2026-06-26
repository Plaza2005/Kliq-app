import { Home, Users, PlusSquare, MessageCircle, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router";

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: Users, label: "Friends", path: "/friends" },
    { icon: PlusSquare, label: "Create", path: "/create" },
    { icon: MessageCircle, label: "Inbox", path: "/inbox" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center flex-1 h-full"
            >
              <Icon
                className={`w-6 h-6 ${
                  isActive ? "text-white" : "text-gray-400"
                }`}
              />
              <span
                className={`text-xs mt-1 ${
                  isActive ? "text-white" : "text-gray-400"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
