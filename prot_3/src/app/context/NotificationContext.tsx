import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { api } from "../api/client";
import { useRealtime } from "./RealtimeContext";

export type NotifType = "like" | "follow" | "comment" | "mention" | "earn" | "message" | "dm" | "share";

export interface Notification {
  id: string;
  type: NotifType;
  user: string;
  actorUsername: string | null;
  msg: string;
  time: string;
  img: string;
  readAt: string | null;
  targetId: string | null;
  targetType: string | null;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (type: NotifType, user: string, msg: string) => void;
  unreadCount: number;
  markRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface ApiNotif {
  id: string;
  type: string;
  actorName: string;
  actorUsername: string | null;
  actorAvatar: string;
  message: string;
  targetId: string | null;
  targetType: string | null;
  readAt: string | null;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "now";
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function mapApiNotif(n: ApiNotif): Notification {
  return {
    id:            n.id,
    type:          (n.type as NotifType) ?? "mention",
    user:          n.actorName,
    actorUsername: n.actorUsername ?? null,
    msg:           n.message,
    time:          timeAgo(n.createdAt),
    img:           n.actorAvatar,
    readAt:        n.readAt,
    targetId:      n.targetId ?? null,
    targetType:    n.targetType ?? null,
    createdAt:     n.createdAt,
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { subscribe } = useRealtime();

  useEffect(() => {
    api.get<{ notifications: ApiNotif[]; unreadCount: number }>("/notifications").then(data => {
      setNotifications(data.notifications.map(mapApiNotif));
      setUnreadCount(data.unreadCount);
    }).catch(() => {});
  }, []);

  // Real-time: prepend notification and bump unread count when notification arrives
  useEffect(() => {
    return subscribe(event => {
      if (event.type === "notification:new") {
        const n = event.notification as ApiNotif;
        if (n?.id) {
          setNotifications(prev => [
            {
              ...mapApiNotif(n),
              time: "now",
              img: n.actorAvatar ?? "/avatar-default.svg",
            },
            ...prev,
          ]);
        }
        setUnreadCount(prev => prev + 1);
      }
    });
  }, [subscribe]);

  const addNotification = useCallback((type: NotifType, user: string, msg: string) => {
    const now = new Date().toISOString();
    const notif: Notification = {
      id:            `local-${Date.now()}`,
      type,
      user,
      actorUsername: null,
      msg,
      time:          "now",
      img:           "/avatar-default.svg",
      readAt:        null,
      targetId:      null,
      targetType:    null,
      createdAt:     now,
    };
    setNotifications(prev => [notif, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  const markRead = useCallback(() => {
    setUnreadCount(0);
    api.patch("/notifications/read").catch(() => {});
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, unreadCount, markRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be within NotificationProvider");
  return ctx;
};
