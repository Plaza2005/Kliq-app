import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";

const FEED_ITEMS = [
  {
    id: 1,
    user: "alex_creates",
    description: "Creating the ultimate studio setup! 🎧✨ #setup #creator",
    videoUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=800&auto=format&fit=crop", // Using image as placeholder for video
    likes: "124K",
    comments: "3.2K",
    shares: "1.1K"
  },
  {
    id: 2,
    user: "sarah_vlogs",
    description: "Day in the life in Tokyo 🗼🍜 #travel #tokyo",
    videoUrl: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=800&auto=format&fit=crop",
    likes: "89K",
    comments: "1.5K",
    shares: "800"
  }
];

export function Home() {
  return (
    <div className="h-full bg-black relative snap-y snap-mandatory overflow-y-auto hidden-scrollbar pb-16 md:pb-0">
      {FEED_ITEMS.map((item) => (
        <div key={item.id} className="h-full w-full snap-start relative flex justify-center items-center">
          <div className="relative w-full max-w-[450px] h-full md:h-[90%] md:rounded-2xl overflow-hidden bg-zinc-900 group">
            {/* Video Placeholder */}
            <img 
              src={item.videoUrl} 
              alt="Video thumbnail" 
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
            />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />

            {/* Content Bottom */}
            <div className="absolute bottom-0 left-0 right-16 p-4">
              <h3 className="font-bold text-lg mb-1">@{item.user}</h3>
              <p className="text-sm text-zinc-200 line-clamp-2">{item.description}</p>
            </div>

            {/* Right Action Bar */}
            <div className="absolute bottom-4 right-2 flex flex-col items-center gap-6 pb-4">
              <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden mb-2">
                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user}`} alt="Avatar" className="w-full h-full bg-zinc-800" />
              </div>
              
              <button className="flex flex-col items-center gap-1 group/btn">
                <div className="p-3 bg-zinc-800/50 rounded-full group-hover/btn:bg-zinc-700/50 backdrop-blur-sm transition-colors">
                  <Heart className="text-white" size={24} />
                </div>
                <span className="text-xs font-semibold">{item.likes}</span>
              </button>

              <button className="flex flex-col items-center gap-1 group/btn">
                <div className="p-3 bg-zinc-800/50 rounded-full group-hover/btn:bg-zinc-700/50 backdrop-blur-sm transition-colors">
                  <MessageCircle className="text-white" size={24} />
                </div>
                <span className="text-xs font-semibold">{item.comments}</span>
              </button>

              <button className="flex flex-col items-center gap-1 group/btn">
                <div className="p-3 bg-zinc-800/50 rounded-full group-hover/btn:bg-zinc-700/50 backdrop-blur-sm transition-colors">
                  <Share2 className="text-white" size={24} />
                </div>
                <span className="text-xs font-semibold">{item.shares}</span>
              </button>

              <button className="flex flex-col items-center gap-1 mt-2">
                <MoreHorizontal className="text-white" size={24} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
