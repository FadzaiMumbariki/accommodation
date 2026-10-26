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
