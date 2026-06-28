import { useEffect, useRef } from "react";
import { api, BASE } from "../api/client";

function getToken() {
  return localStorage.getItem("kliq_token");
}

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
        const token = getToken();
        // keepalive: true allows the request to outlive the page
        fetch(`${BASE}/sessions/end`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
          keepalive: true,
        }).catch(() => {});
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
