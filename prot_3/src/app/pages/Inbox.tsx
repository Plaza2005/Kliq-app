import { useEffect, useState, useRef, useCallback } from "react";
import { Heart, UserPlus, MessageCircle, Flame, AtSign, DollarSign, Loader2, PenSquare, X, Search, Share2, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import { useSocial } from "../context/SocialContext";
import { useNotifications, NotifType, Notification } from "../context/NotificationContext";
import { useRealtime } from "../context/RealtimeContext";
import { api, resolveAvatarUrl, resolveMediaUrl } from "../api/client";

type Tab = "Notifications" | "Chats" | "Groups";

interface Thread {
  threadId: string;
  updatedAt: string;
  other: { id: string; username: string; displayName: string; avatarUrl: string } | null;
  lastMessage: { body: string; createdAt: string } | null;
}

interface GroupThread {
  id: string;
  name: string;
  avatarUrl: string | null;
  members: { user: { id: string; username: string; avatarUrl: string | null } }[];
  messages: { body: string | null; createdAt: string; sender: { displayName: string } }[];
}

interface UserResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "now";
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return `${d}d`;
}

function timeUntilExpiry(createdAt: string): string | null {
  const created = new Date(createdAt).getTime();
  const expiresAt = created + 2 * 24 * 60 * 60 * 1000;
  const remaining = expiresAt - Date.now();
  if (remaining <= 0 || remaining > 6 * 60 * 60 * 1000) return null;
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const mins = Math.floor((remaining % (60 * 60 * 1000)) / 60000);
  return hours > 0 ? `Disappears in ${hours}h` : `Disappears in ${mins}m`;
}

const NOTIF_ICONS: Record<NotifType, React.ReactNode> = {
  like:    <Heart       size={14} className="fill-pink-500 text-pink-500" />,
  follow:  <UserPlus   size={14} className="text-purple-400" />,
  comment: <MessageCircle size={14} className="text-blue-400" />,
  mention: <AtSign     size={14} className="text-yellow-400" />,
  earn:    <DollarSign size={14} className="text-green-400" />,
  message: <MessageCircle size={14} className="text-cyan-400" />,
  dm:      <MessageCircle size={14} className="text-cyan-400" />,
  share:   <Share2     size={14} className="text-orange-400" />,
};

function FollowBackButton({ username }: { username: string }) {
  const { isFollowing, toggleFollow } = useSocial();
  const following = isFollowing(username);
  return (
    <button
      onClick={e => { e.stopPropagation(); toggleFollow(username); }}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition flex-shrink-0 ${
        following
          ? "border-gray-600 text-gray-400 bg-transparent"
          : "border-purple-500 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20"
      }`}
    >
      {following ? "Following" : "Follow Back"}
    </button>
  );
}

export function Inbox() {
  const navigate = useNavigate();
  const { notifications, markRead } = useNotifications();
  const { subscribe } = useRealtime();
  const [activeTab, setActiveTab] = useState<Tab>("Notifications");
  const [threads, setThreads]     = useState<Thread[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [groups, setGroups] = useState<GroupThread[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Compose new DM modal
  const [showCompose, setShowCompose] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    api.get<UserResult[]>(`/search/users?q=${encodeURIComponent(q)}`)
      .then(setSearchResults)
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, []);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => doSearch(searchQuery), 350);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [searchQuery, doSearch]);

  const openThread = (user: UserResult) => {
    setShowCompose(false);
    setSearchQuery("");
    setSearchResults([]);
    navigate(`/chat/${user.username}`);
  };

  useEffect(() => {
    if (activeTab === "Notifications") markRead();
  }, [activeTab, markRead]);

  useEffect(() => {
    if (activeTab === "Chats") {
      setLoadingChats(true);
      api.get<Thread[]>("/messages/threads")
        .then(setThreads)
        .catch(() => {})
        .finally(() => setLoadingChats(false));
    }
    if (activeTab === "Groups") {
      setLoadingGroups(true);
      api.get<GroupThread[]>("/groups")
        .then(setGroups)
        .catch(() => {})
        .finally(() => setLoadingGroups(false));
    }
  }, [activeTab]);

  // Real-time: bubble thread to top when a new message arrives
  useEffect(() => {
    return subscribe(event => {
      if (event.type === "message:new") {
        setThreads(prev => {
          const existing = prev.find(t => t.threadId === event.threadId);
          const updated: Thread = existing
            ? { ...existing, updatedAt: event.createdAt, lastMessage: { body: event.body, createdAt: event.createdAt } }
            : { threadId: event.threadId, updatedAt: event.createdAt, other: event.sender as Thread["other"], lastMessage: { body: event.body, createdAt: event.createdAt } };
          return [updated, ...prev.filter(t => t.threadId !== event.threadId)];
        });
      }
    });
  }, [subscribe]);

  function handleNotificationTap(notif: Notification) {
    // Mark as read first (non-blocking)
    api.patch(`/notifications/${notif.id}/read`, {}).catch(() => {});

    switch (notif.type) {
      case "follow":
        navigate(`/user/${notif.actorUsername ?? notif.user}`);
        break;
      case "like":
      case "comment":
      case "share":
        if (notif.targetId) navigate(`/post/${notif.targetId}`);
        break;
      case "message":
      case "dm":
        navigate(`/chat/${notif.actorUsername ?? notif.user}`);
        break;
      default:
        if (notif.targetId && notif.targetType === "post") navigate(`/post/${notif.targetId}`);
        else if (notif.actorUsername) navigate(`/user/${notif.actorUsername}`);
        else navigate(`/user/${notif.user}`);
        break;
    }
  }

  return (
    <div className="min-h-full bg-black pb-24">
      {/* Compose New DM Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
            <button onClick={() => { setShowCompose(false); setSearchQuery(""); setSearchResults([]); }}
              className="p-2 hover:bg-gray-900 rounded-full transition">
              <X size={20} className="text-white" />
            </button>
            <h2 className="text-white font-bold text-lg flex-1">New Message</h2>
          </div>
          <div className="px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-full px-4 py-2.5">
              <Search size={16} className="text-gray-500 flex-shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
              />
              {searching && <Loader2 size={16} className="animate-spin text-purple-400 flex-shrink-0" />}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {searchResults.length === 0 && searchQuery.trim() && !searching ? (
              <div className="py-12 text-center text-gray-600 text-sm">No users found</div>
            ) : searchResults.length === 0 && !searchQuery.trim() ? (
              <div className="py-12 text-center text-gray-600 text-sm">Search for someone to message</div>
            ) : (
              <div className="divide-y divide-gray-900/50">
                {searchResults.map(user => (
                  <button
                    key={user.id}
                    onClick={() => openThread(user)}
                    className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-900/30 transition text-left"
                  >
                    <img
                      src={resolveAvatarUrl(user.avatarUrl)}
                      alt={user.username}
                      className="w-12 h-12 rounded-full bg-gray-800 flex-shrink-0 object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm">{user.displayName}</p>
                      <p className="text-gray-500 text-xs">@{user.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-gray-900">
        <div className="px-4 pt-4 pb-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Inbox</h1>
            {activeTab === "Chats" && (
              <button
                onClick={() => setShowCompose(true)}
                className="p-2 hover:bg-gray-900 rounded-full transition"
                aria-label="New message"
              >
                <PenSquare size={22} className="text-white" />
              </button>
            )}
          </div>
          <div className="flex border-b border-gray-900">
            {(["Notifications", "Chats", "Groups"] as Tab[]).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab ? "border-white text-white" : "border-transparent text-gray-600 hover:text-gray-400"}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "Notifications" ? (
        <div className="divide-y divide-gray-900/50">
          {notifications.length === 0 ? (
            <div className="py-20 text-center text-gray-600 text-sm">No notifications yet</div>
          ) : notifications.map((notif) => {
            const expiry = timeUntilExpiry(notif.createdAt);
            return (
              <button
                key={notif.id}
                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-900/30 transition cursor-pointer text-left"
                onClick={() => handleNotificationTap(notif)}
              >
                <div className="relative flex-shrink-0">
                  <img src={notif.img} alt={notif.user} className="w-12 h-12 rounded-full bg-gray-800 object-cover" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-950 border border-gray-800 flex items-center justify-center">
                    {NOTIF_ICONS[notif.type] ?? <MessageCircle size={14} className="text-gray-400" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">
                    <span className="font-semibold">{notif.user}</span>{" "}
                    <span className="text-gray-400">{notif.msg}</span>
                  </p>
                  <p className="text-gray-600 text-xs mt-0.5">{notif.time}</p>
                  {expiry && (
                    <span className="text-amber-500/70 text-[10px]">{expiry}</span>
                  )}
                </div>
                {notif.type === "follow" && (
                  <FollowBackButton username={notif.actorUsername ?? notif.user} />
                )}
                <ChevronRight size={16} className="text-gray-700 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      ) : activeTab === "Chats" ? (
        <div className="divide-y divide-gray-900/50">
          {loadingChats ? (
            <div className="py-20 flex justify-center">
              <Loader2 size={24} className="animate-spin text-purple-400" />
            </div>
          ) : threads.length === 0 ? (
            <div className="py-20 text-center text-gray-600 text-sm">No messages yet</div>
          ) : threads.map((thread) => {
            const other = thread.other;
            if (!other) return null;
            return (
              <div
                key={thread.threadId}
                className="flex items-center gap-4 px-4 py-4 hover:bg-gray-900/30 transition cursor-pointer"
                onClick={() => navigate(`/chat/${other.username}`)}
              >
                <div className="relative flex-shrink-0">
                  <img src={resolveAvatarUrl(other.avatarUrl)} alt={other.username} className="w-12 h-12 rounded-full bg-gray-800" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-semibold text-white">{other.displayName}</p>
                    <span className="text-gray-600 text-xs">
                      {thread.lastMessage ? timeAgo(thread.lastMessage.createdAt) : ""}
                    </span>
                  </div>
                  <p className="text-xs truncate text-gray-600">
                    {thread.lastMessage?.body ?? "Start a conversation"}
                  </p>
                </div>
                <Flame size={14} className="text-gray-800 flex-shrink-0" />
              </div>
            );
          })}
        </div>
      ) : (
        /* Groups tab */
        <div className="divide-y divide-gray-900/50">
          {loadingGroups ? (
            <div className="py-20 flex justify-center">
              <Loader2 size={24} className="animate-spin text-purple-400" />
            </div>
          ) : groups.length === 0 ? (
            <div className="py-20 text-center text-gray-600 text-sm">No group chats yet</div>
          ) : groups.map(group => {
            const lastMsg = group.messages[0];
            return (
              <div
                key={group.id}
                className="flex items-center gap-4 px-4 py-4 hover:bg-gray-900/30 transition cursor-pointer"
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                <div className="w-12 h-12 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {group.avatarUrl
                    ? <img src={resolveAvatarUrl(group.avatarUrl)} className="w-full h-full object-cover" />
                    : <span className="text-xl font-bold text-gray-500">{group.name.charAt(0).toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-semibold text-white">{group.name}</p>
                    <span className="text-gray-600 text-xs">
                      {lastMsg ? timeAgo(lastMsg.createdAt) : ""}
                    </span>
                  </div>
                  <p className="text-xs truncate text-gray-600">
                    {lastMsg ? `${lastMsg.sender.displayName}: ${lastMsg.body ?? ""}` : `${group.members.length} members`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
