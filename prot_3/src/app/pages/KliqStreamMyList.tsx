import { useNavigate } from "react-router";
import { ArrowLeft, Play, X } from "lucide-react";
import { useSocial } from "../context/SocialContext";

const ALL_CONTENT = [
  { id: 1, title: "The Last Frontier", img: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400&auto=format&fit=crop", genre: "Action" },
  { id: 2, title: "Neon City", img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=400&auto=format&fit=crop", genre: "Thriller" },
  { id: 3, title: "Deep Blue", img: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?q=80&w=400&auto=format&fit=crop", genre: "Drama" },
  { id: 4, title: "Echo Chamber", img: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=400&auto=format&fit=crop", genre: "Mystery" },
  { id: 5, title: "Void Runner", img: "https://images.unsplash.com/photo-1604998103924-89e012e5265a?q=80&w=400&auto=format&fit=crop", genre: "Sci-Fi" },
  { id: 6, title: "Wild Earth", img: "https://images.unsplash.com/photo-1444464666168-49b626f49cb9?q=80&w=400&auto=format&fit=crop", genre: "Documentary" },
  { id: 11, title: "Iron Mind", img: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=400&auto=format&fit=crop", genre: "Sports" },
  { id: 13, title: "Black Mirror", img: "https://images.unsplash.com/photo-1511300636408-a63a89df3482?q=80&w=400&auto=format&fit=crop", genre: "Sci-Fi" },
];

export function KliqStreamMyList() {
  const navigate = useNavigate();
  const { myList, toggleMyList } = useSocial();

  const listed = ALL_CONTENT.filter(c => myList.has(c.id));

  return (
    <div className="min-h-full bg-black pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur-md border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full transition">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <span className="text-white font-bold text-lg">My List</span>
        <span className="text-gray-500 text-sm">({listed.length})</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {listed.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play size={32} className="text-gray-600" />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">Your list is empty</h3>
            <p className="text-gray-500 text-sm mb-6">Add movies and series to watch later by pressing + My List</p>
            <button onClick={() => navigate("/stream")}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition">
              Browse KliqStream
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listed.map(item => (
              <div key={item.id} className="relative group cursor-pointer">
                <div
                  onClick={() => navigate(`/stream/watch/${item.id}`)}
                  className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-900"
                >
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Play size={20} className="text-white fill-white ml-1" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleMyList(item.id)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition opacity-0 group-hover:opacity-100"
                >
                  <X size={14} className="text-white" />
                </button>
                <p className="text-white text-sm font-semibold mt-2 line-clamp-1">{item.title}</p>
                <p className="text-gray-500 text-xs">{item.genre}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
