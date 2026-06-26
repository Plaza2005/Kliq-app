import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Plus, ListVideo, Loader2, X } from "lucide-react";
import { api } from "../api/client";

interface Playlist { id: string; name: string; items: { contentId: string; contentType: string }[]; createdAt: string; }

export function KliqTubePlaylists() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    api.get<Playlist[]>("/kliqstream/playlists").then(setPlaylists).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const create = async () => {
    if (!newName.trim()) return;
    const pl = await api.post<Playlist>("/kliqstream/playlists", { name: newName.trim() });
    setPlaylists(prev => [pl, ...prev]);
    setNewName(""); setCreating(false);
  };

  return (
    <div className="min-h-full bg-[#0f0f0f] pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-[#0f0f0f]/95 backdrop-blur border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full"><ArrowLeft size={20} className="text-white" /></button>
        <h1 className="text-white font-bold">Playlists</h1>
        <button onClick={() => setCreating(true)} className="ml-auto p-2 hover:bg-gray-900 rounded-full"><Plus size={20} className="text-white" /></button>
      </div>

      {creating && (
        <div className="px-4 py-3 border-b border-gray-900 flex gap-2">
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && create()}
            placeholder="Playlist name..." className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
          <button onClick={create} className="bg-purple-600 text-white text-sm font-bold px-4 py-2 rounded-xl">Create</button>
          <button onClick={() => setCreating(false)} className="p-2 hover:bg-gray-800 rounded-xl"><X size={16} className="text-gray-400" /></button>
        </div>
      )}

      {loading ? <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-gray-500" /></div>
      : playlists.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <ListVideo size={40} className="text-gray-700" />
          <p className="text-gray-500">No playlists yet</p>
          <button onClick={() => setCreating(true)} className="bg-gray-800 text-white text-sm px-5 py-2.5 rounded-xl mt-1">Create playlist</button>
        </div>
      ) : (
        <div className="divide-y divide-gray-900">
          {playlists.map(pl => (
            <div key={pl.id} className="flex items-center gap-4 px-4 py-4 cursor-pointer hover:bg-gray-950 transition">
              <div className="w-16 h-12 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <ListVideo size={20} className="text-gray-600" />
              </div>
              <div>
                <p className="text-white font-medium">{pl.name}</p>
                <p className="text-gray-500 text-xs">{pl.items?.length ?? 0} videos</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
