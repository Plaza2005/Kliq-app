# "Continue with Google" — finishing the setup

The button, the Flutter flow (`Session.googleSignIn`), and the backend
endpoint (`POST /auth/google`) are all wired up. They stay dormant until you
supply Google OAuth credentials — which only you can create, because they live
in your Google Cloud / Firebase project (`kliq-9a57f`). Steps:

## 1. Create OAuth client IDs (Google Cloud console → APIs & Services → Credentials)
You need up to three, all under the **same** project:

- **Web client** — used by the server to verify tokens, and by the Flutter *web*
  build. Copy its **Client ID**.
- **Android client** — requires your app's **SHA-1** fingerprint. Get it with:
  ```
  cd kliq_flutter/android && ./gradlew signingReport
  ```
  (use the debug SHA-1 for testing; add the release SHA-1 before publishing).
  Package name: `com.example.kliq_flutter` (check `android/app/build.gradle`).
- **iOS client** — only if/when you build for iOS.

## 2. Server — verify tokens
Add the **Web client ID** to `server/.env`:
```
GOOGLE_CLIENT_ID="<your-web-client-id>.apps.googleusercontent.com"
```
Restart the API. Until this is set, `/auth/google` returns 503 and the app
shows "Google sign-in isn't set up yet."

## 3. Flutter client
- **Android**: put `google-services.json` (from Firebase console → project
  settings → your Android app) in `kliq_flutter/android/app/`. `google_sign_in`
  picks up the client ID from it automatically.
- **Web**: add this to `kliq_flutter/web/index.html` inside `<head>`:
  ```html
  <meta name="google-signin-client_id" content="<your-web-client-id>.apps.googleusercontent.com">
  ```
- **iOS**: add the iOS client's reversed client ID to `Info.plist` URL schemes.

## 4. Test
Rebuild the app (`flutter build apk --release --dart-define=API_URL=http://<lan-ip>:4000`
or `flutter build web --release ...`), tap **Continue with Google**, pick an
account. First sign-in auto-creates the KLIQ account from the Google email.

## Where the code lives
- Button + friendly errors: `kliq_flutter/lib/features/auth/auth_scaffold.dart`
- Client flow: `Session.googleSignIn()` in `kliq_flutter/lib/core/session.dart`
- Backend: `POST /auth/google` in `server/src/routes/auth.ts` (needs `GOOGLE_CLIENT_ID`)
