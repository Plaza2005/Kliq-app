import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { getWsUrl } from "../api/client";

export type RTEvent =
  | { type: "post:like";    postId: string; likeCount: number; likedBy: string; isLiked: boolean }
  | { type: "post:comment"; postId: string; comment: unknown; commentCount: number }
  | { type: "post:view";    postId: string; viewCount: number }
  | { type: "message:new";  threadId: string; id: string; body: string; mediaUrl?: string; createdAt: string; isMine: boolean; sender: { id: string; username: string; displayName: string; avatarUrl: string } }
  | { type: "community:message"; communityId: string; message: { id: string; body: string; createdAt: string; author: { username: string; displayName: string; avatarUrl: string }; replyTo?: { id: string; author: { username: string }; body: string } } }
  | { type: "notification:new"; notification: unknown }
  | { type: "connected" }
  | { type: "live:chunk";  streamId: string; chunk: string }
  | { type: "live:chat";   streamId: string; body: string; sender: { username: string; displayName: string; avatarUrl: string }; id: string; createdAt: string }
  | { type: "live:end";    streamId: string }
  | { type: "live:viewers"; streamId: string; viewerCount: number };

type Listener = (event: RTEvent) => void;

interface RealtimeCtx {
  connected: boolean;
  subscribe:      (fn: Listener) => () => void;
  sendMessage:    (data: unknown) => void;
}

const Ctx = createContext<RealtimeCtx>({ connected: false, subscribe: () => () => {}, sendMessage: () => {} });

export function RealtimeProvider({ children, token }: { children: ReactNode; token: string | null }) {
  const [connected, setConnected] = useState(false);
  const listeners = useRef<Set<Listener>>(new Set());
  const wsRef     = useRef<WebSocket | null>(null);
  const retryRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emit = useCallback((event: RTEvent) => {
    listeners.current.forEach(fn => fn(event));
  }, []);

  useEffect(() => {
    if (!token) return;

    let alive = true;

    function connect() {
      if (!alive) return;
      const ws = new WebSocket(`${getWsUrl()}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as RTEvent;
          emit(event);

          // Browser push notifications when tab is hidden
          if (
            document.visibilityState === "hidden" &&
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            if (event.type === "notification:new") {
              const n = event.notification as Record<string, string> | null;
              new Notification("New notification", {
                body: n?.body ?? n?.message ?? "",
                icon: "/favicon.ico",
              });
            } else if (event.type === "message:new") {
              new Notification(event.sender.username, {
                body: event.body,
                icon: "/favicon.ico",
              });
            } else if (event.type === "post:like") {
              new Notification("New like", {
                body: `${event.likedBy} liked your post`,
                icon: "/favicon.ico",
              });
            } else if (event.type === "post:comment") {
              const c = event.comment as Record<string, unknown> | null;
              const fromUsername = (c?.author as Record<string, string> | undefined)?.username ?? "Someone";
              const body = (c as Record<string, string> | null)?.body ?? "";
              new Notification("New comment", {
                body: `${fromUsername}: ${body}`,
                icon: "/favicon.ico",
              });
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        if (alive) retryRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      alive = false;
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [token, emit]);

  const subscribe = useCallback((fn: Listener) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return <Ctx.Provider value={{ connected, subscribe, sendMessage }}>{children}</Ctx.Provider>;
}

export const useRealtime = () => useContext(Ctx);
