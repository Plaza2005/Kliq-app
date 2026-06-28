/**
 * Firebase Admin SDK initialization.
 * Used for: push notifications (FCM).
 *
 * Required env vars:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY   (the full PEM key, with literal \n for newlines)
 */
import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let firebaseApp: App | null = null;

export function getFirebaseApp(): App | null {
  if (firebaseApp) return firebaseApp;
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  try {
    firebaseApp = getApps().length > 0
      ? getApps()[0]
      : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } catch {
    firebaseApp = null;
  }
  return firebaseApp;
}

export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  const app = getFirebaseApp();
  if (!app) return false;
  try {
    await getMessaging(app).send({
      token: fcmToken,
      notification: { title, body },
      data,
    });
    return true;
  } catch {
    return false;
  }
}
