# Architecture

This document describes how ImbaFind is put together: the client app, the Supabase backend, and how AI calls reach Google Gemini. Everything here is derived from the repository; where a detail is not confirmed by the code or SQL migrations it is left out rather than guessed.

- App: Expo (React Native) with Expo Router and TypeScript, running on Android, iOS and web.
- Backend: Supabase — Postgres with Row Level Security (RLS), Auth, Storage and Deno Edge Functions.
- AI: Google Gemini, reached only through Supabase Edge Functions.

## High-level component and data flow

```mermaid
flowchart TD
    subgraph Client["React Native app (Expo / Expo Router)"]
        UI["Screens and components"]
        CTX["App state contexts<br/>Auth, Property, Saved, Chat, Activity"]
        LIB["lib: database, ai, aiFilters, trustCheck, smartMatching, notifications"]
    end

    subgraph Supabase["Supabase project"]
        AUTH["Auth"]
        PG[("Postgres + RLS")]
        STORAGE["Storage<br/>property-images, avatars"]
        FN["Edge Functions (Deno)<br/>ai-search, ai-trust, ai-match, ai-describe"]
    end

    GEMINI["Google Gemini API"]

    UI --> CTX --> LIB
    LIB -->|"supabase-js auth"| AUTH
    LIB -->|"supabase-js reads/writes"| PG
    LIB -->|"uploads/downloads"| STORAGE
    LIB -->|"functions.invoke()"| FN
    FN -->|"consume_ai_request RPC"| PG
    FN -->|"GEMINI_API_KEY (Supabase secret)"| GEMINI
    FN -.->|"sanitised filters / draft text"| LIB

    AUTH -->|"handle_new_user trigger"| PG
```

The app talks to Supabase with the public anonymous key using `supabase-js`. Reads and writes go to Postgres and are filtered by RLS; files go to the `property-images` and `avatars` storage buckets. AI requests go to an Edge Function with `supabase.functions.invoke()`, and the function — not the app — calls Gemini.

**The Gemini key is never in the client.** `GEMINI_API_KEY` lives only as a Supabase secret and is read inside the Edge Functions (`supabase/functions/_shared/gemini.ts`). The app never receives it and has no code path that can call Gemini directly. See [AI integration](AI_INTEGRATION.md) and [ADR 0001](adr/0001-ai-via-supabase-edge-functions.md).

## Client state contexts

Application state is split into focused React contexts. `context/AppContext.tsx` is a thin compatibility layer that re-exports a combined `useApp()` hook, so existing screens keep working, while new code imports the focused contexts directly.

| Context | Owns |
| --- | --- |
| `AuthContext` | Session and user, email/password and Google sign-in, sign-up, sign-out, password reset and role changes. |
| `PropertyContext` | Properties, filter state, the signed-in landlord's listings, and add/update/delete. Fetches from Supabase when credentials are present and falls back to built-in sample data otherwise. |
| `SavedContext` | The saved property IDs and the toggle to save or unsave. |
| `ChatContext` | Conversations, message lists, sending, opening and Realtime subscription to new messages. |
| `ActivityContext` | Viewing requests and accommodation requests, plus the currently selected property. |

`AppContext.tsx` also keeps a small role context (`userRole`, `isAdmin`, `userName`) that reads the user's profile so the sub-providers can receive the role. When Supabase is not configured, the app runs in a read-only mock mode.

## Edge Function boundary

All AI work is isolated in four Deno Edge Functions:

- `supabase/functions/ai-search` — turns a plain-English search into structured filters.
- `supabase/functions/ai-trust` — adds cautious description-quality warnings to the rule-based trust checks.
- `supabase/functions/ai-match` — phrases an explanation for the top-ranked request match.
- `supabase/functions/ai-describe` — drafts a listing description from the landlord's entered facts.

Shared behaviour lives in `supabase/functions/_shared/gemini.ts`: CORS handling, the `callGeminiJson` helper, PII stripping before text is sent, and `enforceAiRateLimit`. Every function requires a signed-in user and enforces the per-account AI limit by calling the `consume_ai_request` RPC. The functions return structured JSON, and the client validates it before use (for example `sanitizeAiFilters` in `lib/aiFilters.ts`). Details of the safeguards are in [AI integration](AI_INTEGRATION.md).

## Row Level Security model

RLS is enabled on the application tables, so authorisation is enforced in the database rather than only in the app.

- **Ownership by column.** Users read and manage their own rows: `profiles` by `id`, `saved_properties` and `accommodation_requests` by `user_id`, and `viewing_requests` by `tenant_id`. Landlords see viewings and read active requests for their side.
- **Listings.** Anyone may read available listings, and a landlord may read their own unavailable ones; only the owning landlord may insert, update or delete a property.
- **Conversations and messages.** Only the two participants (tenant and landlord) can access a conversation, and messages are readable only to participants of the parent conversation. Sending is routed through the `send_chat_message` security-definer RPC, which also enforces message length and blocked-user checks.
- **Reviews and reports.** Reviews are publicly readable and writable by their author. Reports are private: a user can insert and read only their own.
- **Privileged columns are protected.** `profiles.is_admin`, `profiles.verified` and `properties.verified` cannot be changed by ordinary users — column-level privileges are revoked and triggers reset them. Verification is an administrator action performed through the `admin_set_property_verified` and `admin_set_user_verified` RPCs, guarded by `is_imba_admin()`.
- **AI usage.** `ai_usage_events` has RLS enabled and all direct access revoked; it is touched only through the `consume_ai_request` security-definer RPC.

## Postgres schema

The diagram below is derived from `supabase/migrations/001_initial_schema.sql` and the later migrations. `text_arr` marks a `text[]` array column. `auth.users` is the Supabase-managed auth table.

```mermaid
erDiagram
    auth_users ||--|| profiles : "id"
    auth_users ||--o{ ai_usage_events : "user_id"
    profiles ||--o{ properties : "landlord_id"
    profiles ||--o{ saved_properties : "user_id"
    properties ||--o{ saved_properties : "property_id"
    profiles ||--o{ accommodation_requests : "user_id"
    properties ||--o{ viewing_requests : "property_id"
    profiles ||--o{ viewing_requests : "tenant_id / landlord_id"
    properties ||--o{ conversations : "property_id"
    profiles ||--o{ conversations : "tenant_id / landlord_id"
    conversations ||--o{ messages : "conversation_id"
    profiles ||--o{ messages : "sender_id"
    properties ||--o{ reviews : "property_id"
    profiles ||--o{ reviews : "author_id"
    properties ||--o{ reports : "property_id"
    profiles ||--o{ reports : "reporter_id / reported_user_id"
    profiles ||--o{ blocked_users : "blocker_id / blocked_id"

    auth_users {
        uuid id PK
    }

    profiles {
        uuid id PK
        text full_name
        text email
        text phone
        text avatar_url
        text role
        boolean verified
        timestamptz created_at
        boolean is_admin
        text push_token
    }

    properties {
        uuid id PK
        uuid landlord_id FK
        text title
        text property_type
        numeric price
        numeric deposit
        text city
        text suburb
        text province
        text address
        int bedrooms
        int bathrooms
        int max_occupants
        text_arr images
        text_arr amenities
        text description
        boolean available
        text availability_status
        date available_from_date
        boolean verified
        numeric rating
        int reviews_count
        numeric lat
        numeric lng
        timestamptz created_at
        timestamptz updated_at
    }

    saved_properties {
        uuid id PK
        uuid user_id FK
        uuid property_id FK
        timestamptz saved_at
    }

    accommodation_requests {
        uuid id PK
        uuid user_id FK
        text city
        text suburb
        text province
        text property_type
        text bedrooms
        int number_of_people
        numeric min_budget
        numeric max_budget
        date move_in_date
        text furnished
        text_arr amenities
        text additional_notes
        text status
        timestamptz created_at
        timestamptz updated_at
    }

    viewing_requests {
        uuid id PK
        uuid property_id FK
        uuid tenant_id FK
        uuid landlord_id FK
        date viewing_date
        time viewing_time
        int attendees
        text message
        text status
        timestamptz created_at
        timestamptz updated_at
    }

    conversations {
        uuid id PK
        uuid tenant_id FK
        uuid landlord_id FK
        uuid property_id FK
        text last_message
        timestamptz last_message_at
        int tenant_unread
        int landlord_unread
        timestamptz created_at
    }

    messages {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        text text
        boolean read
        text type
        timestamptz created_at
    }

    reviews {
        uuid id PK
        uuid property_id FK
        uuid author_id FK
        text author_name
        int rating
        text text
        timestamptz created_at
    }

    reports {
        uuid id PK
        uuid reporter_id FK
        uuid property_id FK
        uuid reported_user_id FK
        text reason
        text details
        text status
        timestamptz created_at
    }

    ai_usage_events {
        bigint id PK
        uuid user_id FK
        text feature
        timestamptz created_at
    }

    blocked_users {
        uuid blocker_id PK
        uuid blocked_id PK
        timestamptz created_at
    }
```

Notes on the schema:

- `auth.users` — `profiles.id` references `auth.users.id` and is populated by the `handle_new_user` trigger on sign-up. `ai_usage_events.user_id` also references `auth.users.id`.
- `profiles` gained `push_token` (migration 004) and `is_admin` (migration 007) after the initial schema.
- `properties.images` and `properties.amenities`, and `accommodation_requests.amenities`, are `text[]` arrays (shown as `text_arr` above).
- `saved_properties` is unique on `(user_id, property_id)`; `reviews` is unique on `(property_id, author_id)`; and `conversations` has a null-distinct unique index on `(tenant_id, landlord_id, property_id)` so a property-less conversation cannot be duplicated.
- `conversations.property_id` and the two `reports` foreign keys use `on delete set null`; other foreign keys cascade on delete.
- RLS is enabled on every application table above; `ai_usage_events` has all direct access revoked and is used only through the `consume_ai_request` RPC.
