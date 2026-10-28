# ImbaFind Google Play Store Readiness & Publication Guide

This guide details the requirements, configuration, and step-by-step checklist for building and submitting **ImbaFind** to the Google Play Store using EAS (Expo Application Services).

---

## 1. App Identity & Configuration (`app.json`)

Ensure your `app.json` has complete Android production parameters:

- **Package Name**: `com.imbafind.app`
- **Version Code**: Auto-incremented via `eas.json` (`"autoIncrement": true`)
- **Adaptive Icon**: 
  - Foreground: `assets/android-icon-foreground.png` (432x432 PNG with transparent background)
  - Background: `assets/android-icon-background.png` (or solid `#E6F4FE`)
- **Permissions**:
  - `INTERNET` (standard network access)
  - No location permission is requested; property search uses user-selected locations.

---

## 2. Building the Android App Bundle (.aab) with EAS

Google Play Store requires an **Android App Bundle (.aab)** instead of a raw `.apk` for new releases.

```bash
# 1. Login to your Expo account
npx eas login

# 2. Configure EAS project credentials (first time only)
npx eas build:configure

# 3. Build production Android App Bundle
npx eas build --platform android --profile production
```

EAS will generate Google Play upload keystores securely in the cloud and output a downloadable `.aab` file link upon completion.

---

## 3. Google Play Console Setup

1. **Create App**:
   - Title: `ImbaFind - Zimbabwe Accommodation & Rentals`
   - Default language: `English (United States)` or `English (United Kingdom)`
   - App or Game: `App`
   - Free or Paid: `Free`

2. **Data Safety Declarations**:
   - **Location**: Not collected by device location APIs.
   - **Personal Info**: Account name, email address, and phone number.
   - **Messages**: In-app messages between tenants and landlords.
   - **Photos/Media**: Property photos uploaded by landlords; profile photos if provided.
   - **User-generated content**: Property listings, accommodation requests, viewing requests, and reviews.
   - **Device or other IDs**: Expo push token when the user enables notifications.
   - **Security Practices**: Data is encrypted in transit using HTTPS/TLS. Account data and user-generated content are stored in Supabase.

3. **Store Listing Assets**:
   - App Icon: 512 x 512 PNG (up to 1MB)
   - Feature Graphic: 1024 x 500 PNG/JPEG (no transparency)
   - Phone Screenshots: Minimum 2, recommended 4-8 screenshots (1080 x 2400 or 1080 x 1920) showcasing:
     1. Search & Discover accommodation across Zimbabwe
     2. Property details, photos & amenities
     3. Direct chat with verified landlords
     4. Booking property viewings
     5. Posting tenant requests

4. **Privacy Policy**:
   - Host the in-app privacy policy URL: `https://imbafind.co.zw/privacy` (matches `app/legal/privacy.tsx`)

---

## 4. Submitting with EAS

Once your Google Play Service Account key (`api-key.json`) is set up:

```bash
# Submit bundle directly to Closed Testing or Production
npx eas submit --platform android --profile production
```

---

## 5. EAS Project, Environment & Secrets Checklist

Run these once to make the project cloud-buildable. Your git-ignored `.env.local` never reaches the EAS builder, so production values must be stored in EAS.

```bash
# 1. Sign in and create/link the EAS project (writes extra.eas.projectId + owner)
npx eas login
npx eas init

# 2. Configure build credentials (keystores, signing)
npx eas build:configure

# 3. Store the required production env vars for the app build
npx eas config --autoupdate   # optional OTA updates
```

Set these **Environment variables / Secrets** for the **production** environment (EAS Dashboard → Project Settings → *Environment Variables* & *Secrets*, or `eas secret:put`):

| Variable | Required | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `EXPO_PUBLIC_SENTRY_ENABLED` | Optional (`true` to turn on) | Enables Sentry plugin |
| `EXPO_PUBLIC_SENTRY_DSN` | Optional (when Sentry on) | Sentry DSN |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Optional (when Sentry on) | Sentry project coords |
| `SENTRY_AUTH_TOKEN` | Optional (secret) | Upload source maps |

Edge Function secret `GEMINI_API_KEY` is already set with `supabase secrets set GEMINI_API_KEY=...` (server-side only).

Before building:

```bash
npx expo-doctor            # dependency/config diagnosis
npx expo install --fix     # align any incompatible versions
npx eas build --platform android --profile production
```

---

## 6. Push Notifications (FCM / APNs)

Android push requires Firebase Cloud Messaging credentials; without them `getExpoPushTokenAsync` cannot produce a token.

1. Create a Firebase project, add an Android app with package name `com.imbafind.app`, download **`google-services.json`**, and place it at the repo root.
2. Reference it in [app.json](app.json) under `expo.android`:
   ```json
   "android": {
     "package": "com.imbafind.app",
     "googleServicesFile": "./google-services.json"
   }
   ```
3. Upload the **FCM Server Key** (Google Cloud Console → Cloud Messaging) as an EAS/Supabase secret used by the push sender.
4. iOS push: generate an **APNs** key in Apple Developer and upload it via `npx eas credentials`.

The `expo-notifications` plugin already sets the Android notification accent color (`#C4622D`). Provide a dedicated small notification icon (`android.googleServicesFile` companion `icon`) if you want a custom shape instead of the app icon silhouette.

---

## 7. Admin-Controlled Verified Badges

The Phase 1 proposal's "admin-controlled verified badge" is implemented via [supabase/migrations/007_admin_verifications.sql](supabase/migrations/007_admin_verifications.sql):

- Adds a `profiles.is_admin` flag (separate from the tenant/landlord role).
- Adds security-definer RPCs `admin_set_property_verified` / `admin_set_user_verified` and read policies so admins see every listing/profile.
- The migration promotes the owner account (`fadzaimumbariki@gmail.com`) to admin. To add more staff, run:
  ```sql
  update public.profiles set is_admin = true where lower(email) = 'staff@example.com';
  ```
- Admins get a **Verify Listings & Landlords** entry on the Profile tab → `app/admin-verifications.tsx`.

Apply the migration with `npx supabase db push` (or `supabase db query --linked -f supabase/migrations/007_admin_verifications.sql`).
