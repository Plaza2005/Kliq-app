import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Send, Users, Loader2 } from "lucide-react";
import { api, resolveAvatarUrl } from "../api/client";
import { useRealtime } from "../context/RealtimeContext";
import { useAuth } from "../context/AuthContext";

interface GroupInfo {
  id: string;
  name: string;
  avatarUrl: string | null;
  members: { user: { id: string; username: string; displayName: string; avatarUrl: string | null } }[];
}

interface GroupMessage {
  id: string;
  body: string | null;
  mediaUrl: string | null;
  createdAt: string;
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
}

const tAgo = (d: string) => {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 6e4);
  return m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
};

export function GroupChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribe } = useRealtime();

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<GroupInfo>(`/groups/${id}`),
      api.get<GroupMessage[]>(`/groups/${id}/messages`),
    ]).then(([g, msgs]) => {
      setGroup(g);
      setMessages([...msgs].reverse());
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages.length]);

  useEffect(() => {
    return subscribe(event => {
      if (event.type === "group:message" && event.groupId === id) {
        setMessages(prev => [...prev, event.message as GroupMessage]);
      }
    });
  }, [id, subscribe]);

  const send = async () => {
    if (!input.trim() || !id || sending) return;
    const body = input.trim();
    setInput("");
    setSending(true);
    try {
      const msg = await api.post<GroupMessage>(`/groups/${id}/messages`, { body });
      setMessages(prev => [...prev, msg]);
    } catch {
      setInput(body);
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="min-h-full bg-black flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-purple-400" />
    </div>
  );

  if (!group) return null;

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-30">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-black border-b border-gray-900">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-full">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold truncate">{group.name}</p>
          <p className="text-gray-500 text-xs">{group.members.length} members</p>
        </div>
        <button
          onClick={() => setShowMembers(s => !s)}
          className={`p-2 rounded-full transition ${showMembers ? "bg-gray-800" : "hover:bg-gray-900"}`}
        >
          <Users size={20} className={showMembers ? "text-white" : "text-gray-400"} />
        </button>
      </div>

      {/* Members panel */}
      {showMembers && (
        <div className="bg-gray-950 border-b border-gray-800 px-4 py-3">
          <h3 className="text-white font-semibold text-xs uppercase tracking-wide mb-3 text-gray-500">Members</h3>
          <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
            {group.members.map(m => (
              <div key={m.user.id} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <img
                  src={resolveAvatarUrl(m.user.avatarUrl)}
                  className="w-10 h-10 rounded-full object-cover bg-gray-800"
                  alt={m.user.username}
                />
                <p className="text-gray-400 text-[10px] max-w-[60px] truncate">@{m.user.username}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-gray-600 text-sm py-12">No messages yet — say hello!</p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender.id === user?.id;
          const showAvatar = !isMe && (i === 0 || messages[i - 1].sender.id !== msg.sender.id);
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
              <div className="w-7 flex-shrink-0">
                {showAvatar && !isMe && (
                  <img
                    src={resolveAvatarUrl(msg.sender.avatarUrl)}
                    className="w-7 h-7 rounded-full object-cover bg-gray-800"
                    alt={msg.sender.username}
                  />
                )}
              </div>
              <div className={`max-w-[72%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                {showAvatar && !isMe && (
                  <p className="text-gray-500 text-[10px] mb-0.5 ml-1">{msg.sender.displayName}</p>
                )}
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? "bg-purple-600 text-white rounded-tr-sm"
                    : "bg-gray-800 text-white rounded-tl-sm"
                }`}>
                  {msg.body}
                </div>
                <p className="text-gray-700 text-[10px] mt-0.5 mx-1">{tAgo(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-900 flex gap-2 bg-black">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          placeholder="Message..."
          className="flex-1 bg-gray-900 border border-gray-800 rounded-full px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 transition"
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center disabled:opacity-40 flex-shrink-0 transition"
        >
          {sending ? <Loader2 size={14} className="animate-spin text-white" /> : <Send size={16} className="text-white" />}
        </button>
      </div>
    </div>
  );
}
