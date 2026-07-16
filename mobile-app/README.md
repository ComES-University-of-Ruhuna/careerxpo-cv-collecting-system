# CareerXpo Mobile

Expo React Native mobile app for the **student flow** of CareerXpo — sign in with Google, complete your profile, browse companies + bid on jobs, view LinkedIn jobs, and submit the registration-fee bank slip.

**Runs on Expo SDK 57** (React 19.2 / React Native 0.86).

Points at the production API at `https://careerxpo.comesuor.lk` by default. Edit `app.json → expo.extra.apiBaseUrl` to point elsewhere (e.g. `http://192.168.1.10:3000` when running the Next.js backend locally on the same LAN).

## What's included

| Screen | File |
|---|---|
| Google sign-in | `app/login.js` |
| Dashboard | `app/(tabs)/dashboard.js` |
| Companies + bidding | `app/(tabs)/companies.js` |
| LinkedIn jobs | `app/(tabs)/linkedin.js` |
| Profile + CV + payment slip | `app/(tabs)/profile.js` |
| Payment slip modal | `src/components/PaymentSlipModal.js` |

Auth uses `expo-auth-session` to obtain a Google ID token, which is POSTed to the new backend endpoint `POST /api/auth/mobile/google` (added to the Next.js app). The endpoint verifies the token against Google and issues a JWT that the app stores in `expo-secure-store`.

## Prerequisites

1. Node 20+
2. Expo CLI available via `npx expo`
3. A Google Cloud project with **three** OAuth 2.0 client IDs:
   - **Web** — required so `expo-auth-session` can register a redirect URI for Expo Go / development
   - **iOS** — bundle id `lk.comesuor.careerxpo`
   - **Android** — package `lk.comesuor.careerxpo`

## Configure

Open `app.json` and replace the placeholders under `expo.extra`:

```jsonc
"extra": {
  "apiBaseUrl": "https://careerxpo.comesuor.lk",
  "googleWebClientId": "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
  "googleIosClientId": "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
  "googleAndroidClientId": "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
  "bankName": "Bank of Ceylon",
  "bankBranch": "Peradeniya",
  "bankAccountName": "CareerXpo",
  "bankAccountNumber": "1234567890"
}
```

Then on the **backend** (Next.js), add these env vars in `.env.local` and redeploy:

```
GOOGLE_MOBILE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
GOOGLE_MOBILE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID.apps.googleusercontent.com
GOOGLE_MOBILE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com
```

The mobile endpoint whitelists any of these audiences plus the existing `GOOGLE_CLIENT_ID` used by the web flow.

## Run

```sh
cd mobile-app
npm install
npx expo start
```

Then press **i** (iOS simulator), **a** (Android emulator), or scan the QR code with **Expo Go** on a physical device.

> `expo-secure-store`, `expo-document-picker`, and `expo-auth-session` are all supported in Expo Go, so no dev build is required for testing.

## Notes

- All mobile API calls go through `src/lib/api.js`, which prepends the base URL and attaches the `Authorization: Bearer <token>` header.
- The JWT is stored in `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android).
- The payment-slip toggle from the admin dashboard is respected — when disabled, the "Registration Fee" section is hidden (unless the student has an existing submission).
- Company job listings are gated by `profile_completed` on the backend, so students see a "Complete your profile" card in that tab until they've finished onboarding.
- The `assets/` folder is intentionally empty — drop `icon.png`, `adaptive-icon.png`, and `splash.png` (1024×1024 for icons) before publishing a build. Expo will fall back to defaults if they're missing during development.

## Not included (yet)

- Admin flow — the app currently only serves the student role.
- Push notifications, offline caching, and job description Markdown rendering (descriptions render as plain text).
