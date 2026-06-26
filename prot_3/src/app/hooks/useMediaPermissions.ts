import { useEffect } from "react";

export function useMediaPermissions() {
  useEffect(() => {
    // Request permissions on first load — browsers require user gesture,
    // but we can query status and show UI prompt
    const requestPermissions = async () => {
      try {
        // Camera + Mic — will trigger browser permission dialog
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(stream => {
            // Stop immediately after getting permission — just wanted the grant
            stream.getTracks().forEach(t => t.stop());
          })
          .catch(() => {
            // Permission denied — that's OK, app still works
          });
      } catch {
        // mediaDevices not supported
      }
    };

    // Only request if not already granted
    const checkAndRequest = async () => {
      if (!navigator.permissions) return;
      try {
        const [camStatus, micStatus] = await Promise.all([
          navigator.permissions.query({ name: "camera" as PermissionName }),
          navigator.permissions.query({ name: "microphone" as PermissionName }),
        ]);
        if (camStatus.state === "prompt" || micStatus.state === "prompt") {
          requestPermissions();
        }
      } catch {
        // permissions API not supported — skip
      }
    };

    // Delay slightly so app renders first
    const timer = setTimeout(checkAndRequest, 1500);
    return () => clearTimeout(timer);
  }, []);
}
