# Google Play Store Data Safety Questionnaire Guide

This document provides exact responses for completing the Google Play Console **Data safety questionnaire** for **ImbaFind** (`com.imbafind.app`). All statements below reflect verified application behavior in the codebase.

---

## 1. Overview & Declarations Summary

| Category | Collected? | Shared? | Purpose | Ephemeral? | User Opt-Out / Deletion? |
| --- | --- | --- | --- | --- | --- |
| **Approximate Location** | Yes | No | App functionality (Near me search) | Yes (used in memory) | Can deny permission |
| **Precise Location** | Yes | No | App functionality (Near me search) | Yes (used in memory) | Can deny permission |
| **Name** | Yes | No | Account management, profile, communications | No | Deleted on account deletion |
| **Email Address** | Yes | No | Account management, authentication | No | Deleted on account deletion |
| **Phone Number** | Yes | No | Communications, viewing contact, SMS alerts | No | Deleted on account deletion |
| **Photos & Videos** | Yes | No | Listing photos and profile avatars | No | Deleted on account deletion |
| **In-app Messages** | Yes | No | Communications between tenant and landlord | No | Deleted on account deletion |
| **Device or other IDs** | Yes | No | Push notifications (Expo push token) | No | Cleared on logout / settings toggle |

---

## 2. Detailed Data Category Breakdown

### A. Location
- **Data Types:** Approximate location (`ACCESS_COARSE_LOCATION`), Precise location (`ACCESS_FINE_LOCATION`).
- **Collected:** Yes, when the user explicitly taps "Near Me" on the Explore screen via `expo-location`.
- **Shared:** No. Location coordinates are never sent to external analytics or advertisers.
- **Ephemeral:** Yes. Location coordinates are processed in device memory to calculate distance in km to listings, and are not persistently stored in the user profile database.
- **Required or Optional:** Optional. Users can search and filter accommodation by city and suburb without granting device location permissions.

### B. Personal Information
- **Name:**
  - **Collected:** Yes, on sign-up / profile setup.
  - **Purpose:** App functionality, user identity on listings, requests, viewings, and chat.
  - **Shared:** No (visible to other users in context of listings/conversations only).
- **Email Address:**
  - **Collected:** Yes, on sign-up or Google OAuth.
  - **Purpose:** Account creation, authentication, password recovery.
  - **Shared:** No.
- **Phone Number:**
  - **Collected:** Yes, for Zimbabwean landlord and tenant contacts.
  - **Purpose:** Direct WhatsApp links, viewing confirmations, EcoCash/SMS alerts.
  - **Shared:** No (provided to the other party during viewing/inquiry connections).

### C. Photos and Videos
- **Data Types:** Photos (images).
- **Collected:** Yes, when landlords upload listing photos or users select profile avatars via `expo-image-picker`.
- **Purpose:** App functionality (displaying property accommodations and member avatars).
- **Storage:** Supabase Storage (`property-images` and `avatars` buckets).
- **Shared:** No third-party sharing. Publicly visible within the app for property browsing.

### D. Messages
- **Data Types:** In-app messages.
- **Collected:** Yes, direct messages between prospective tenants and landlords.
- **Purpose:** App functionality (coordinating rental inquiries, viewing times, and lease questions).
- **Storage:** Supabase Postgres (`public.messages` table).
- **Shared:** No. Visible only to conversation participants.

### E. Device or Other Identifiers
- **Data Types:** Push notification tokens (Expo Push Token).
- **Collected:** Yes, when the user enables push notifications.
- **Purpose:** Delivering push notifications for new messages, viewing updates, and inquiries.
- **Storage:** `public.profiles.push_token`.
- **Shared:** Dispatched through Expo's secure push service (`https://exp.host/--/api/v2/push/send`) to deliver notifications to Android/iOS device endpoints.

---

## 3. Security Practices

- **Data Encrypted in Transit:** Yes. All client-server communication uses HTTPS with TLS 1.3 encryption.
- **Independent Security Review:** No (unless specified by formal audit).
- **Data Deletion Mechanism:** Yes. Users can request immediate and permanent deletion of their account and all associated data directly within the app:
  - **In-App Flow:** `Settings` → `Delete account` (with destructive confirmation alert).
  - **Actions Taken:** 
    1. Removes all uploaded property images from Supabase Storage (`deleteAccountAndPropertyImages`).
    2. Deletes user profile, listings, viewing requests, messages, saved properties, and reports via database cascade.
    3. Clears local session and cached storage.
  - **External Request:** Users can also email `privacy@imbafind.co.zw` to request data deletion.

---

## 4. Privacy Policy Links

- **In-App Screen:** Accessible from `Settings` → `Privacy Policy` (route: `/legal/privacy`).
- **Public Hosted URL:** `https://imbafind.co.zw/privacy` (configured in `constants/links.ts`).
