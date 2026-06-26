import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Eye, TrendingUp, DollarSign, Upload, Lock } from 'lucide-react';
import { useUser } from '../context/UserContext';

const data = [
  { name: 'Mon', views: 4000, revenue: 2400 },
  { name: 'Tue', views: 3000, revenue: 1398 },
  { name: 'Wed', views: 2000, revenue: 9800 },
  { name: 'Thu', views: 2780, revenue: 3908 },
  { name: 'Fri', views: 1890, revenue: 4800 },
  { name: 'Sat', views: 2390, revenue: 3800 },
  { name: 'Sun', views: 3490, revenue: 4300 },
];

const STATS = [
  { label: "Total Views", value: "2.4M", change: "+14%", icon: Eye, color: "text-blue-500", tierReq: 1 },
  { label: "Followers", value: "124K", change: "+5%", icon: Users, color: "text-green-500", tierReq: 1 },
  { label: "Engagement", value: "8.2%", change: "+2%", icon: TrendingUp, color: "text-purple-500", tierReq: 1 },
  { label: "Est. Revenue", value: "$4,200", change: "+24%", icon: DollarSign, color: "text-yellow-500", tierReq: 2 },
];

export function Studio() {
  const { tier } = useUser();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Kliq Studio</h1>
          <p className="text-zinc-400 mt-1">Analytics and Content Manager</p>
        </div>
        <button className="bg-white text-black px-6 py-2 rounded-lg font-medium flex items-center gap-2 justify-center transition-colors hover:bg-zinc-200">
          <Upload size={18} /> Upload Video
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {STATS.map(stat => {
          const isLocked = tier < stat.tierReq;
          return (
            <div key={stat.label} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 relative overflow-hidden">
              {isLocked && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
                  <Lock size={20} className="text-zinc-400 mb-1" />
                  <span className="text-[10px] font-bold text-zinc-300">Tier {stat.tierReq} Required</span>
                </div>
              )}
              <div className={`transition-opacity ${isLocked ? 'opacity-30' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon size={18} className={stat.color} />
                  <span className="text-zinc-400 text-sm font-medium">{stat.label}</span>
                </div>
                <div className="text-2xl md:text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-xs text-green-400">{stat.change} vs last week</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <h3 className="text-lg font-bold mb-6">Views Overview</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="views" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 relative overflow-hidden">
          {tier < 3 && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center border border-zinc-700 m-[-1px] rounded-xl">
              <div className="bg-zinc-900 p-6 rounded-2xl flex flex-col items-center max-w-sm text-center border border-zinc-800 shadow-2xl">
                <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-full flex items-center justify-center mb-4">
                  <Lock size={28} className="text-white" />
                </div>
                <h4 className="text-xl font-bold mb-2">Advanced Analytics</h4>
                <p className="text-zinc-400 text-sm mb-6">Upgrade to Studio Tier 3 to unlock full revenue breakdowns, demographic insights, and competitor benchmarks.</p>
                <button className="bg-white text-black font-bold py-3 px-8 rounded-xl w-full hover:bg-zinc-200 transition-colors">
                  Upgrade to Tier 3
                </button>
              </div>
            </div>
          )}
          
          <h3 className="text-lg font-bold mb-6">Revenue Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
