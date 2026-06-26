import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { UserProvider } from "./context/UserContext";
import { SocialProvider } from "./context/SocialContext";
import { NotificationProvider } from "./context/NotificationContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RealtimeProvider } from "./context/RealtimeContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useSessionTracker } from "./hooks/useSessionTracker";
import { useMediaPermissions } from "./hooks/useMediaPermissions";

function Inner() {
  const { token } = useAuth();
  useSessionTracker(!!token);
  useMediaPermissions();

  // Request browser notification permission after a short delay (post-interaction)
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    const timer = setTimeout(() => {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <RealtimeProvider token={token}>
      <UserProvider>
        <SocialProvider>
          <NotificationProvider>
            <RouterProvider router={router} />
          </NotificationProvider>
        </SocialProvider>
      </UserProvider>
    </RealtimeProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Inner />
      </AuthProvider>
    </ThemeProvider>
  );
}
