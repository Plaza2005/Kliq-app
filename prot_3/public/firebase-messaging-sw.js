// Firebase Messaging Service Worker
// Handles background push notifications from FCM

// Handle push events from FCM directly (no Firebase SDK needed for display)
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: "Kliq", body: event.data.text() } };
  }

  const notif = payload.notification ?? {};
  const title = notif.title ?? payload.title ?? "Kliq";
  const body = notif.body ?? payload.body ?? "You have a new notification";
  const url = (payload.data ?? {}).url ?? "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && "focus" in c) return c.focus();
      }
      return clients.openWindow(event.notification.data?.url ?? "/");
    })
  );
});

// Notify Firebase SDK that this SW is ready to receive messages
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
