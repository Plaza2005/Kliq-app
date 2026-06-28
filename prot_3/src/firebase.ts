/**
 * Firebase client SDK configuration.
 *
 * Set these in prot_3/.env:
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_STORAGE_BUCKET
 *   VITE_FIREBASE_MESSAGING_SENDER_ID
 *   VITE_FIREBASE_APP_ID
 *   VITE_FIREBASE_VAPID_KEY  (for push notifications)
 */
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId
);

export const firebaseApp = isConfigured
  ? (getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig))
  : null;

let messaging: Messaging | null = null;

export async function initMessaging(): Promise<string | null> {
  if (!firebaseApp) return null;
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    messaging = getMessaging(firebaseApp);
    // Firebase will auto-discover /firebase-messaging-sw.js at the root
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    return token ?? null;
  } catch {
    return null;
  }
}

export function onPushMessage(callback: (payload: unknown) => void) {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
