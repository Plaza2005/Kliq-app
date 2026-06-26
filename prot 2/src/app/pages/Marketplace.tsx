import { Search, MapPin, Tag } from "lucide-react";

const PRODUCTS = [
  { id: 1, title: "Sony A7III Camera", price: "$1,200", location: "New York, NY", img: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=400&auto=format&fit=crop" },
  { id: 2, title: "MacBook Pro M1", price: "$950", location: "Brooklyn, NY", img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=400&auto=format&fit=crop" },
  { id: 3, title: "Vintage Leather Jacket", price: "$85", location: "Queens, NY", img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=400&auto=format&fit=crop" },
  { id: 4, title: "Nike Air Max 97", price: "$120", location: "Newark, NJ", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400&auto=format&fit=crop" },
  { id: 5, title: "Coffee Maker", price: "$45", location: "Manhattan, NY", img: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=400&auto=format&fit=crop" },
  { id: 6, title: "Electric Guitar", price: "$350", location: "Hoboken, NJ", img: "https://images.unsplash.com/photo-1511330965-728b78d2b910?q=80&w=400&auto=format&fit=crop" },
];

const CATEGORIES = ["All", "Electronics", "Vehicles", "Apparel", "Home", "Hobbies"];

export function Marketplace() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <p className="text-zinc-400 mt-1 flex items-center gap-1"><MapPin size={16} /> New York Area (Within 20 mi)</p>
        </div>
        
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
          + Sell Item
        </button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto hidden-scrollbar mb-8 pb-2">
        {CATEGORIES.map((cat, i) => (
          <button 
            key={cat} 
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${i === 0 ? "bg-white text-black" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {PRODUCTS.map(product => (
          <div key={product.id} className="bg-zinc-900 rounded-xl overflow-hidden cursor-pointer group">
            <div className="aspect-square bg-zinc-800 relative overflow-hidden">
              <img src={product.img} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
            <div className="p-4">
              <div className="text-xl font-bold text-white mb-1">{product.price}</div>
              <h3 className="text-sm text-zinc-300 line-clamp-1 mb-2">{product.title}</h3>
              <p className="text-xs text-zinc-500">{product.location}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
