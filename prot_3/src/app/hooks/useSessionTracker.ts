import { useEffect, useRef } from "react";
import { api } from "../api/client";

export function useSessionTracker(isLoggedIn: boolean) {
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    // Start session
    api.post<{ sessionId: string }>("/sessions/start", { platform: "web" })
      .then(({ sessionId }) => {
        sessionIdRef.current = sessionId;

        // Heartbeat every 60s
        heartbeatRef.current = setInterval(() => {
          if (sessionIdRef.current) {
            api.post("/sessions/heartbeat", { sessionId: sessionIdRef.current }).catch(() => {});
          }
        }, 60000);
      })
      .catch(() => {});

    const endSession = () => {
      if (sessionIdRef.current) {
        const payload = JSON.stringify({ sessionId: sessionIdRef.current });
        // Use sendBeacon for reliability on page close
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon("/api/sessions/end", blob);
        } else {
          api.post("/sessions/end", { sessionId: sessionIdRef.current }).catch(() => {});
        }
        sessionIdRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") endSession();
      else if (document.visibilityState === "visible" && !sessionIdRef.current) {
        api.post<{ sessionId: string }>("/sessions/start", { platform: "web" })
          .then(({ sessionId }) => { sessionIdRef.current = sessionId; })
          .catch(() => {});
      }
    };

    window.addEventListener("beforeunload", endSession);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      endSession();
      window.removeEventListener("beforeunload", endSession);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isLoggedIn]);
}
