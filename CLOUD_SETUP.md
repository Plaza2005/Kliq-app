# KLIQ cloud setup — Supabase Storage + Firebase push

The code for both is wired and dormant until you paste credentials into
`server/.env` (placeholders are already there, commented out). After editing
`.env`, restart the API. Nothing here is committed — `.env` is git-ignored.

---

## A. Supabase Storage (media uploads → Supabase instead of the server disk)

1. Supabase dashboard → your project (`rrkfhfddwpaqwbfcqhtu`) → **Storage** →
   **New bucket**. Name it **`media`**. Toggle **Public bucket = ON** (so image
   URLs are directly viewable). Create.
2. **Project Settings → API** → copy the **`service_role`** secret (NOT the anon
   key — the service_role key can write to storage).
3. In `server/.env`, uncomment/fill:
   ```
   SUPABASE_SERVICE_ROLE_KEY="<service_role key>"
   SUPABASE_STORAGE_BUCKET="media"
   ```
4. Restart the API. New uploads now go to Supabase Storage and return a public
   `…/storage/v1/object/public/media/<file>` URL. If the upload fails for any
   reason it automatically falls back to local disk, so nothing breaks.

Code: `server/src/index.ts` `POST /upload`.

---

## B. Firebase push notifications (deliver to real devices)

### B1. Server — send push (service account)
1. [Firebase console](https://console.firebase.google.com) → project
   **`kliq-9a57f`** → gear → **Project settings → Service accounts** →
   **Generate new private key** → downloads a JSON file.
2. From that JSON, copy into `server/.env`:
   ```
   FIREBASE_PROJECT_ID="kliq-9a57f"
   FIREBASE_CLIENT_EMAIL="<client_email from the JSON>"
   FIREBASE_PRIVATE_KEY="<private_key from the JSON — keep it one line with \n escapes>"
   ```
   (The `private_key` in the JSON already has `\n` escapes — paste it verbatim
   between the quotes.)
3. Restart the API. Test: `POST /notifications/test` (as a logged-in user with a
   registered device) should deliver a push.

Code: `server/src/firebase.ts` (already reads those 3 env vars).

### B2. Android client — receive push
1. Firebase console → **Project settings → General → Your apps** → add/select
   the **Android** app with package name **`com.example.kliq_flutter`**
   (confirm in `kliq_flutter/android/app/build.gradle`).
2. Download **`google-services.json`** → place it in
   **`kliq_flutter/android/app/google-services.json`**.
3. Ensure the Google Services Gradle plugin is applied (I'll wire the Gradle
   bits once the file is in place), then rebuild the APK.

### B3. iOS / web (later)
- iOS needs an APNs key uploaded to Firebase + `GoogleService-Info.plist`.
- Web push needs the VAPID key (already in `config.dart`) + a service worker.

---

## What to send me
- The **`service_role`** key + confirm the bucket name (for A).
- The **service-account JSON** values (or the file) for B1, and drop
  **`google-services.json`** into `kliq_flutter/android/app/` for B2.

Paste them and I'll fill `.env`, wire the Android Gradle plugin, restart, and
test end-to-end.
