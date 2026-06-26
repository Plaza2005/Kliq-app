import { Play, Plus, Info } from "lucide-react";

const BANNERS = [
  {
    id: 1,
    title: "Stranger Worlds",
    category: "Sci-Fi Series",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop"
  }
];

const SECTIONS = [
  {
    title: "Trending Now",
    items: [
      { id: 1, img: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400&auto=format&fit=crop" },
      { id: 2, img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=400&auto=format&fit=crop" },
      { id: 3, img: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?q=80&w=400&auto=format&fit=crop" },
      { id: 4, img: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=400&auto=format&fit=crop" },
      { id: 5, img: "https://images.unsplash.com/photo-1604998103924-89e012e5265a?q=80&w=400&auto=format&fit=crop" },
    ]
  },
  {
    title: "Documentaries",
    items: [
      { id: 6, img: "https://images.unsplash.com/photo-1444464666168-49b626f49cb9?q=80&w=400&auto=format&fit=crop" },
      { id: 7, img: "https://images.unsplash.com/photo-1470071131384-001b85755536?q=80&w=400&auto=format&fit=crop" },
      { id: 8, img: "https://images.unsplash.com/photo-1505144808419-1957a94ca61e?q=80&w=400&auto=format&fit=crop" },
      { id: 9, img: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=400&auto=format&fit=crop" },
      { id: 10, img: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=400&auto=format&fit=crop" },
    ]
  }
];

export function Stream() {
  const hero = BANNERS[0];
  
  return (
    <div className="pb-24">
      {/* Hero Banner */}
      <div className="relative w-full h-[50vh] md:h-[60vh] bg-zinc-900">
        <div className="absolute inset-0">
          <img src={hero.image} alt={hero.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f13] via-[#0f0f13]/50 to-transparent" />
        </div>
        
        <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full md:w-2/3">
          <h4 className="text-indigo-400 font-bold tracking-widest text-sm mb-2">{hero.category}</h4>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">{hero.title}</h1>
          <div className="flex gap-3 mt-6">
            <button className="bg-white text-black px-6 py-2 rounded-md font-bold flex items-center gap-2 hover:bg-zinc-200 transition-colors">
              <Play size={20} fill="currentColor" /> Play
            </button>
            <button className="bg-zinc-500/50 text-white px-6 py-2 rounded-md font-bold flex items-center gap-2 hover:bg-zinc-500/70 transition-colors backdrop-blur-md">
              <Plus size={20} /> My List
            </button>
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="mt-8 space-y-12 px-6 md:px-12">
        {SECTIONS.map(section => (
          <div key={section.title}>
            <h3 className="text-xl font-bold mb-4">{section.title}</h3>
            <div className="flex gap-4 overflow-x-auto hidden-scrollbar pb-4 -mx-6 px-6 md:mx-0 md:px-0">
              {section.items.map(item => (
                <div key={item.id} className="min-w-[160px] md:min-w-[240px] aspect-[16/9] rounded-md overflow-hidden bg-zinc-800 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform duration-300">
                  <img src={item.img} className="w-full h-full object-cover" alt="" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
