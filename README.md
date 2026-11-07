# ImbaFind

> **Find a place. Make it home.**

ImbaFind is a mobile app (Expo / React Native, with Supabase) that helps people in Zimbabwe find rental accommodation and helps landlords list it. Tenants can search and filter listings, save favourites, book viewings, chat with landlords and post accommodation requests. Landlords can add and manage properties and handle viewing requests. Listings from verified landlords carry a verified badge.

This repository is the **Capstone Project** submission (full-stack app with AI integration).

## The problem

Finding rental housing in Zimbabwe often relies on word of mouth, scattered social media posts and agents. Searching is slow, listings are inconsistent, and scams are a real risk. ImbaFind puts listings, landlord verification, viewings and messaging in one place, and uses AI to make searching and listing easier.

## Features

- Tenant and landlord accounts, with landlord verification handled by an administrator
- Browse and search listings by city, suburb, type, bedrooms, budget, furnishing and amenities
- Saved properties, viewing bookings with slot-conflict protection, in-app chat, push notifications
- Report listings and users
- Post an accommodation request that landlords can respond to
- **AI search:** turn a plain-English request into filters for real listings
- **AI trust check:** combine price and listing checks with cautious AI description warnings; it cannot verify ownership
- **Request matching:** rank active listings by location, budget, bedrooms, amenities, and move-in date; AI may explain the top match
- **AI listing helper:** landlords can draft a description from entered details, then edit it; unusual prices are flagged

## AI integration (summary)

| Feature             | What it does                                                                                                                  | Model / API                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| AI search           | Converts a plain-English search into structured filters                                                                       | Google Gemini API, called through the `ai-search` Supabase Edge Function   |
| Listing trust check | Adds description-quality warning signals to rule-based checks; it does not verify ownership or remove listings                | Google Gemini API, called through the `ai-trust` Supabase Edge Function    |
| Request matching    | Ranks current listings by request criteria and move-in date; AI can phrase the top match reason but never changes the ranking | Google Gemini API, called through the `ai-match` Supabase Edge Function    |
| AI listing helper   | Drafts a short description from the landlord's own listing details                                                            | Google Gemini API, called through the `ai-describe` Supabase Edge Function |

The Gemini API key is stored only as a Supabase secret and is never in the app. Full details, limitations and testing are in [docs/AI_INTEGRATION.md](docs/AI_INTEGRATION.md). The ethical and responsible AI statement is in [docs/ETHICAL_AI_STATEMENT.md](docs/ETHICAL_AI_STATEMENT.md).

## Web Preview & Hosting

ImbaFind runs cross-platform on Android, iOS, and Web.

- **Exported Web Application:** The app is configured for static web export (`npm run export:web` writes all app routes into `dist/`).
- **Local Web Preview:** Run `npm run web` or preview the static build via `npx serve dist`.


## Screenshots & Visual Walkthrough

Visual walkthroughs and mobile screen references are documented in [docs/screenshots/](docs/screenshots/README.md):

- **Explore & Search:** Main discovery feed with real-time filters and natural language AI search chip.
- **Listing Details & Trust Check:** Photo gallery, verified landlord badge, safety indicators, and viewing slot booking.
- **AI Listing Helper:** Assisted property description generation based on entered facts.
- **In-App Messaging & Viewing Requests:** Direct communication between verified parties.

## Setup and run

### Prerequisites

- Node.js 22.13 or newer and npm
- A phone with the Expo Go app, or an Android emulator / iOS simulator
- Optional, for the live backend and AI: a free [Supabase](https://supabase.com) project, the [Supabase CLI](https://supabase.com/docs/guides/cli), and a [Gemini API key](https://aistudio.google.com/apikey)

### 1. Install

```sh
git clone https://github.com/FadzaiMumbariki/accommodation.git
cd accommodation
npm ci
```

### 2. Run without a backend (sample data)

No credentials are needed to browse. Without Supabase values the app shows built-in sample listings in read-only mode; sign-in and sign-up are unavailable, AI search falls back to a local keyword parser, and the listing helper drafts from the entered facts instead of calling Gemini. To sign in and use the live features, complete step 3.

```sh
npm start        # then press a (Android), i (iOS) or w (web), or scan the QR code with Expo Go
```

### 3. Run with the live backend

1. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and anon key. Use the anon key only, never the service-role key.
2. Apply the database schema from `supabase/migrations/`. Either run `supabase link --project-ref YOUR_PROJECT_REF` followed by `supabase db push` from the project root, or paste each file into the **SQL Editor** in numeric order (`001_initial_schema.sql` first, and so on up to the highest number). `011_google_oauth_profile.sql` and `012_signup_phone.sql` install the sign-up trigger that creates profiles for email and Google accounts. The migrations are idempotent and can also be applied to an existing schema. Optionally run `supabase/seed_properties.sql` afterwards for sample listings (see Database setup files below). Do not run the local test-user seed on a real project: it creates accounts with a known password and is for local testing only (kept at `docs/testing/create_test_users.sql`, gitignored).
3. In the Supabase dashboard, open **Authentication → URL Configuration**. Set the Site URL to `imbafind://` and add `imbafind://**`, `exp://**`, `http://localhost:8081/**`, and `https://imbafind.web.app/auth/callback` as redirect URLs, so that confirmation, password-reset and Google links open the app. `exp://**` is only needed for Expo Go development — remove it once you test against a development build, and never add a bare `**` or an unrelated domain. A redirect allow-list that accepts arbitrary URLs lets an attacker receive another user's auth code.
4. Under **Authentication → Providers → Email**, either turn off "Confirm email", or set up custom SMTP under **Project Settings → Authentication**. Supabase's built-in email service only sends a few emails per hour, so sign-ups that need a confirmation email start failing with a rate-limit error after a couple of attempts.
5. Start the app with `npm start`. Without `.env.local` the app browses sample listings only: email sign-in and sign-up are unavailable until you add your Supabase credentials.

### 4. Enable the AI features

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_KEY
# optional: supabase secrets set GEMINI_MODEL=gemini-3.1-flash-lite
supabase functions deploy ai-search
supabase functions deploy ai-trust
supabase functions deploy ai-match
supabase functions deploy ai-describe
```

All AI functions require a signed-in user. The database limits each account to 30 AI requests per rolling hour across features. If an AI service is unavailable, search and trust checks retain their local rule-based behavior, and the listing helper uses a factual local draft based only on the entered details.

### Tests and checks

```sh
npm test               # Jest unit and component tests
npm run test:coverage  # Jest with coverage (fails below the thresholds in package.json)
npm run lint           # ESLint
npm run typecheck      # TypeScript
npm run format:check   # Prettier
```

Unit and component tests sit next to the code they cover (`lib/*.test.ts`, `components/**/*.test.tsx`, `hooks/*.test.ts`) and run in the `jest-expo` environment. `jest.setup.js` stubs the icon font so components using `@expo/vector-icons` render headlessly. The coverage gate in `package.json` is measured over all reusable code (`lib/`, `components/`, `hooks/`, `context/`); screens in `app/` are covered by the E2E flows instead.

End-to-end tests run against a real build on a device or emulator:

- **Maestro** flows in `.maestro/` — install [Maestro](https://maestro.mobile.dev), then run `maestro test .maestro`. `smoke.yaml` and `auth-validation.yaml` need no account; `auth-signin.yaml` requires `-e E2E_EMAIL=... -e E2E_PASSWORD=...`.
- **Detox** (`.detoxrc.js` plus `e2e/`) drives a native debug build: `npm run e2e:build:android` then `npm run e2e:test:android`. The iOS equivalents (`e2e:build:ios`, `e2e:test:ios`) need macOS with Xcode.

Database policy tests live in `supabase/tests/` (pgTAP) and run with `supabase test db`, which needs the Supabase CLI and Docker.

GitHub Actions runs lint, typecheck and `test:coverage` on every push and pull request, plus a job that applies `supabase/migrations/` from scratch against an empty local database, lints it and runs the RLS tests. See [.github/workflows/ci.yml](.github/workflows/ci.yml).

## Project structure

```
app/            Screens (Expo Router)
components/     Reusable UI components
context/        App state (auth, properties, chat, saved, activity)
hooks/          Shared React hooks
lib/            Data access, filters, notifications, AI helpers (ai.ts, aiFilters.ts)
e2e/            Detox end-to-end tests
.maestro/       Maestro end-to-end flows
supabase/       SQL migrations, RLS tests and Edge Functions (ai-search, ai-trust, ai-match, ai-describe)
docs/           AI integration notes, ethical AI statement, screenshots
```

## Screenshots and demo

<!-- Add real screenshots to docs/screenshots/ and uncomment the lines below.
![Home](docs/screenshots/home.png)
![AI search](docs/screenshots/ai-search.png)
![Property details](docs/screenshots/property-details.png)
![Landlord dashboard](docs/screenshots/landlord-dashboard.png)
-->

Screenshots live in [docs/screenshots](docs/screenshots). Live link / demo video: see the submission email.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [ADR 0001: AI via Supabase Edge Functions](docs/adr/0001-ai-via-supabase-edge-functions.md)
- [AI integration](docs/AI_INTEGRATION.md)
- [Ethical and responsible AI statement](docs/ETHICAL_AI_STATEMENT.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Play Store readiness guide](docs/PLAY_STORE_READINESS_GUIDE.md)
- [Play Store data safety answers](docs/PLAY_STORE_DATA_SAFETY.md)

## Operations and release notes

### Database setup files

`supabase/migrations/` is the single source of truth for the database. Apply it with `supabase db push` (or by pasting the files into the SQL Editor in numeric order).

| Path                            | Purpose                                                                                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/001`–`022` | **Canonical.** Incremental, idempotent schema changes. Apply in numeric order.                                                                                               |
| `supabase/seed_properties.sql`  | **Optional.** Sample listings for demos; run manually after the migrations. It creates the demo host account it needs.                                                       |
| `supabase/seed.sql`             | Empty placeholder run automatically by `supabase db reset` (referenced from `config.toml`). Do not put sample data here.                                                     |
| `supabase/legacy/`              | Superseded one-shot scripts (`setup_complete.sql`, `create_and_seed.sql`, `reload_schema_and_permissions.sql`). Reference only — never run. See `supabase/legacy/README.md`. |

Note: there is no `002_*.sql` migration; the set jumps from `001_initial_schema.sql` to `003_reports.sql`.

### Verifying landlords

Landlord verification is an administrative action. In the Supabase SQL Editor, set the profile's `verified` flag using the account's auth UUID:

```sql
update public.profiles
set verified = true
where id = 'REPLACE_WITH_AUTH_USER_UUID';
```

The client intentionally has no action that can set `verified`.

Apply the full numbered set in `supabase/migrations/` (`001` through `022`) in order. `003_reports.sql` enables reports, chat message writes, and viewing-slot conflict protection; `022_enable_pg_net.sql` enables the HTTP extension used by push delivery.

### Push notifications setup

Push notifications in ImbaFind are powered by Expo Push Notifications and delivered via Supabase database triggers:

- **EAS Project ID:** Push tokens require an EAS Project ID. Configure your project with `npx eas-cli@latest init`, or ensure `EXPO_PUBLIC_EAS_PROJECT_ID` / `extra.eas.projectId` in `app.json` is set to your project's UUID.
- **Android Google Services:** Production Android builds require Firebase Cloud Messaging (FCM v1). Download your `google-services.json` from the Firebase Console and upload the FCM v1 Service Account Key to Expo with `npx eas-cli@latest credentials`. The file is gitignored: local builds pick it up from the repo root, and EAS cloud builds must provide it through a `GOOGLE_SERVICES_JSON` **file** environment variable, which [app.config.ts](app.config.ts) reads as a path.
- **Postgres HTTP extension:** Applying `supabase/migrations/022_enable_pg_net.sql` enables `pg_net` (guarded). Without it, `notify_recipient()` silently skips delivery — the trigger checks that the extension exists before calling `net.http_post()`. Confirm it is enabled under Supabase Dashboard → Database → Extensions.
- **Database Triggers:** Applying `supabase/migrations/008_push_notifications.sql`, `016_push_notifications_hardening.sql` and `022_enable_pg_net.sql` configures automatic push dispatch for chat messages and viewing requests. Triggers strictly ensure:
  1. Messages never notify their sender.
  2. Notifications are silenced if either the sender or recipient has blocked the other in `public.blocked_users`.
  3. Notifications fail gracefully if the recipient does not have a registered device token.
- **Security Note:** The unauthenticated `push-notify` Edge Function has been decommissioned to prevent open-relay abuse. Push notifications are triggered internally through vetted database hooks or authenticated admin endpoints only. If `push-notify` was previously deployed to your Supabase project, delete it via:
  ```bash
  npx supabase functions delete push-notify
  ```

### Web deploy and App Links

The web build is deployed to Firebase Hosting, but the checked-in `public/.well-known/` files contain `REPLACE_WITH` placeholders and must be completed first:

1. Put the EAS/Play App Signing SHA-256 fingerprints into [assetlinks.json](public/.well-known/assetlinks.json).
2. Put the 10-character Apple Team ID into [apple-app-site-association](public/.well-known/apple-app-site-association).
3. Make `imbafind.co.zw` resolve and serve both files over HTTPS with `Content-Type: application/json` (see [docs/deep-linking-setup.md](docs/deep-linking-setup.md)).
4. Run:

```sh
npm run export:web
npm run check:release   # fails on placeholders, missing dist, or missing well-known files
npm run deploy:web      # firebase deploy --only hosting
```

`npm run deploy:web` runs the same check automatically through the `predeploy:web` hook. The check also warns when [.firebaserc](.firebaserc) and `google-services.json` name different Firebase projects; confirm which project owns the `imbafind.web.app` site before deploying.

### Over-the-air updates

`expo-updates` is not installed, so the app ships without OTA updates and [eas.json](eas.json) deliberately declares no `channel`. Add `expo-updates` (with an `updates.url` and a `runtimeVersion`) if you want `eas update` to deliver JS updates without a new store build.

### Environment variables & EAS build configuration

The following environment variables are used by ImbaFind across local development, preview builds, and production:

| Variable                          | Required In                 | Purpose                                              | Exposure / Scope        |
| --------------------------------- | --------------------------- | ---------------------------------------------------- | ----------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`        | Live / Production           | Supabase project URL (`https://xyz.supabase.co`)     | Public (client-bundled) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`   | Live / Production           | Supabase anonymous public key                        | Public (client-bundled) |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional / Recommended      | Google Maps API key for Android/iOS native map tiles | Public (client-bundled) |
| `EXPO_PUBLIC_EAS_PROJECT_ID`      | Production / Preview        | EAS project UUID for push notifications              | Public (client-bundled) |
| `EXPO_PUBLIC_SENTRY_ENABLED`      | Production (`true`/`false`) | Enables/disables Sentry native & error reporting     | Public (client-bundled) |
| `EXPO_PUBLIC_SENTRY_DSN`          | If Sentry enabled           | Sentry Project DSN                                   | Public (client-bundled) |
| `EXPO_PUBLIC_SUPPORT_PHONE`       | Production                  | Phone number shown on the Help screen                | Public (client-bundled) |
| `EXPO_PUBLIC_SUPPORT_WHATSAPP`    | Production                  | WhatsApp number shown on the Help screen             | Public (client-bundled) |
| `EXPO_PUBLIC_SUPPORT_EMAIL`       | Production                  | Support email shown on the Help screen               | Public (client-bundled) |
| `EXPO_PUBLIC_SUPPORT_HOURS`       | Optional                    | Support hours label (defaults to `8am - 6pm CAT`)    | Public (client-bundled) |
| `SENTRY_ORG`                      | Build time (if Sentry)      | Sentry Organization slug                             | EAS Environment / CI    |
| `SENTRY_PROJECT`                  | Build time (if Sentry)      | Sentry Project slug                                  | EAS Environment / CI    |
| `SENTRY_AUTH_TOKEN`               | Build time (if Sentry)      | Sentry authentication token for source maps          | Secret (Never public!)  |

#### Configuring with EAS CLI (`eas env:create` / `eas env:set`)

Public build variables for the `preview` and `production` profiles are declared in [eas.json](eas.json), so the repository is the single source of truth for them. Omit a support variable entirely to hide that channel on the Help screen — EAS rejects empty-string env values, so do not set `EXPO_PUBLIC_SUPPORT_PHONE` or `EXPO_PUBLIC_SUPPORT_WHATSAPP` to `""`. Omitting `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` leaves the native map without a key, and omitting `EXPO_PUBLIC_EAS_PROJECT_ID` disables push registration. Fill them in before shipping.

The Google Maps key is a **public client key** (like the Supabase anon key), not a server secret. It is declared in [eas.json](eas.json) for the preview and production profiles so cloud builds are reproducible. [app.config.ts](app.config.ts) adds the `react-native-maps` config plugin only when `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is set, using the plugin's `androidGoogleMapsApiKey` / `iosGoogleMapsApiKey` props. An unrestricted key can be used by anyone and billed to the project, so restrict it in Google Cloud to the `com.imbafind.app` package name plus each signing certificate SHA-1 (local debug, EAS, and Play App Signing), and enable only the Maps SDK for Android/iOS.

For EAS Build environments (`preview` and `production`), set variables using the EAS CLI:

```sh
# Create / set public environment variables for production
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://YOUR_PROJECT.supabase.co --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value YOUR_SUPABASE_ANON_KEY --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value YOUR_GOOGLE_MAPS_KEY --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_EAS_PROJECT_ID --value YOUR_EAS_PROJECT_ID --visibility plaintext

# Sentry release tracking (Optional)
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SENTRY_ENABLED --value true --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN --value YOUR_SENTRY_DSN --visibility plaintext
npx eas-cli@latest env:create --environment production --name SENTRY_ORG --value YOUR_SENTRY_ORG --visibility plaintext
npx eas-cli@latest env:create --environment production --name SENTRY_PROJECT --value YOUR_SENTRY_PROJECT --visibility plaintext
npx eas-cli@latest secret:create --name SENTRY_AUTH_TOKEN --value YOUR_SENTRY_AUTH_TOKEN --scope project
```

Repeat with `--environment preview` for internal testing builds. Never commit secret tokens or credentials to source control. For local development, copy `.env.example` to `.env.local` and fill in the public Supabase values. With no credentials, the app continues to use mock mode.
