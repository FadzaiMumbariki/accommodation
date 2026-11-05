# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Component and UI tests with React Native Testing Library (`components/**/*.test.tsx`, `hooks/*.test.ts`), plus a shared `jest.setup.js` that stubs the icon font so `@expo/vector-icons` renders headlessly.
- Maestro E2E flows in `.maestro/` and a Detox E2E harness (`.detoxrc.js`, `e2e/`) with `e2e:*` npm scripts.
- pgTAP policy tests in `supabase/tests/rls.sql`, run in CI through `supabase test db`.

### Changed

- `ErrorBoundary` now uses `SafeAreaView` from `react-native-safe-area-context`, as the `react-native` one is deprecated.
- The Jest suite uses a 20s per-test timeout so the first React Native render in a suite is not cut off on a cold start.
- The coverage gate now measures every reusable module (`lib/`, `components/`, `hooks/`, `context/`) instead of `lib/` alone, so the reported number matches what it claims to cover.
- Public build variables for `preview` and `production` are declared in `eas.json`, giving the repository a single source of truth for them.

### Removed

- The hardcoded Google Maps API key in `app.json`. The `react-native-maps` config plugin expects `androidGoogleMapsApiKey` / `iosGoogleMapsApiKey`, so the committed `googleMapsApiKey` was a no-op; the key now comes from `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` via `app.config.ts`.
- The `channel` fields in `eas.json`, which had no effect because `expo-updates` is not installed.

## [1.0.0] - 2026-11-02

Initial phase-1 release of ImbaFind, a mobile app that helps people in Zimbabwe find rental accommodation and helps landlords list it.

### Added

- Tenant and landlord accounts with email/password and Google sign-in, plus role selection on sign-up.
- Listing browse and search, filterable by city, suburb, property type, bedrooms, budget, furnishing and amenities.
- Saved properties for tenants.
- Viewing bookings with slot-conflict protection, and status handling for tenants and landlords.
- In-app chat between tenants and landlords, including blocked-user protection.
- Push notifications for chat messages and viewing-request updates.
- Reporting of listings and users.
- Accommodation requests that landlords can respond to.
- Landlord and listing verification performed by an administrator.
- AI search: turns a plain-English request into structured filters for real listings, called through the `ai-search` Edge Function.
- AI trust check: combines rule-based price and listing checks with cautious AI description warnings; it cannot verify ownership. Called through the `ai-trust` Edge Function.
- Request matching: ranks active listings by location, budget, bedrooms, amenities and move-in date, with an AI-phrased explanation of the top match. Called through the `ai-match` Edge Function.
- AI listing helper: drafts a description from the landlord's entered details, with unusual prices flagged. Called through the `ai-describe` Edge Function.

[Unreleased]: https://github.com/FadzaiMumbariki/imbafind/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/FadzaiMumbariki/imbafind/releases/tag/v1.0.0
