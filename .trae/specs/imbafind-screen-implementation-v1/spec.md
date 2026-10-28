# ImbaFind - Full Screen Implementation PRD

## Overview
- **Summary**: Implement and polish every screen in ImbaFind to match the final 16-screen design mockup, fix all crashes, dead buttons, lint/type errors, and connect all UI interactions so the app behaves as a fully-functional prototype.
- **Purpose**: Deliver a working, demoable mobile app where every on-screen element functions correctly, with matching design, data flow, and interactions.
- **Target Users**: Tenants searching for Zimbabwe accommodation + Landlords listing/managing properties + ImbaFind demo evaluators.

## Goals
- Match the exact UI/layout of all 16 screens in the design mockup
- Eliminate all TypeScript errors and ESLint errors (warnings acceptable)
- Every button, tap target, filter, form, and interaction must be functional (no "dead" UI)
- AppContext state must be consistent across screens (save buttons, role, filters, messages, viewings)
- No crashes when tapping any element
- Clean up duplicate/unused code (remove stale src/ directory)

## Non-Goals
- Supabase backend integration / network persistence (kept as AppContext in-memory state for this spec)
- Authentication / user accounts (kept as choose-account role selection)
- Push notifications, native image picker, date picker, maps — keep UI prototypes only with working fallbacks
- OTA, EAS builds, deployment

## Background & Context
- Current repo uses Expo 57, Expo Router (routes in root `app/`), TypeScript strict mode
- `context/AppContext.tsx` central state works but has naming mismatches with components
- A stale duplicate codebase exists under `src/` — never imported but triggers lint errors
- Current lint errors: 13; TS errors: 11; warnings: 23
- Reference design: 16-screen mockup (Splash → Onboarding ×3 → Choose Account → Home → Explore → Location Selector → Property Details → Saved → Post Request → Messages → Chat → Book Viewing → My Activity → Landlord Dashboard → Add Property → Profile/Settings)

## Functional Requirements

### Core Fixes & Code Health
- **FR-1**: All TypeScript type errors resolved so `npx tsc --noEmit` passes (exit code 0)
- **FR-2**: All ESLint errors resolved so `npx expo lint` reports 0 errors (warnings allowed)
- **FR-3**: Remove stale duplicate `src/` directory and any dead imports from `App.tsx` / `index.ts` fallbacks that aren't used
- **FR-4**: AppContext interface matches component usage — correct method/field naming for save/unsave

### Onboarding Flow
- **FR-5**: Splash (1) → auto-redirects to tabs after delay + allows tap-to-enter; matches design colors/typography/logo shield
- **FR-6**: Onboarding (2a/2b/2c) — 3 slides with images, paging dots, Skip + Next progressive button ending with "Get Started"
- **FR-7**: Choose Account Type (3) — two big cards "I'm looking for accommodation" (Find a Home CTA) + "I'm a landlord" (List a Property CTA); updates AppContext.userRole and navigates to tabs

### Home / Discover Screen (4)
- **FR-8**: Top greeting with user name, notification bell (navigates to settings/notifications screen or placeholder toast), search bar navigates to Explore
- **FR-9**: Location row ("Where do you want to live?") with filter chip counts (Location, Beds, Budget, Top) + "View all" link
- **FR-10**: "Available near you" horizontal carousel of PropertyCards with heart-save toggle, price, bed/bath/people, availability badge
- **FR-11**: "Popular locations" chip grid with 6 city chips (Harare, Bulawayo, Gweru, Mutare, Masvingo, Victoria Falls) — tapping filters Explore via AppContext

### Explore / Search Results (5)
- **FR-12**: Top search input (works — filters properties by title/city/suburb/description)
- **FR-13**: 4 top filters: Location (opens Location Selector), Filters (opens FilterModal with beds/budget/type/amenities), Sort (opens simple sort sheet: price-low/high, newest, rating), List/Map view toggle (visual state toggle)
- **FR-14**: Results count ("142 properties found") with property type chips (All, House, Apartment, Room, Flat, Cottage) that toggle AppContext filter
- **FR-15**: Vertical PropertyCard list with working heart save + empty state (matches design)

### Location Selector (6)
- **FR-16**: 3-level drill-down (Province → City → Suburb) expandable accordion using locations data
- **FR-17**: Search field filters the tree
- **FR-18**: Selected location commits to AppContext filters and navigates back

### Property Details (7)
- **FR-19**: Image carousel (paging), counter (1/6), top back/share/save icons (share: opens ShareSheet or toast fallback; back: pop; save: toggle)
- **FR-20**: Price + title + verified badge, bed/bath/people/deposit spec row, amenities grid, description, landlord card with rating/verified, safety banner
- **FR-21**: Sticky bottom Message Landlord (starts conversation, navigates to chat) + Book Viewing (opens booking modal) CTAs

### Saved Properties (8)
- **FR-22**: Count header, grid/column of saved PropertyCards (only savedPropertyIds), heart toggle for unsave
- **FR-23**: Empty state illustration (heart icon), "You haven't saved any properties yet" copy + CTA button to Explore

### Post Accommodation Request (9)
- **FR-24**: Header banner ("Tell us what you're looking for"), form sections: Location → Property Type dropdown/chips → People dropdown → Bedrooms dropdown → Budget ($250-$350 range) → Move-in date → Furnished toggle → Amenities multi-select → Notes textarea
- **FR-25**: Submit commits addRequest() + Alert confirmation + back nav

### Messages (10)
- **FR-26**: Search input (filters conversation list by name/property), new-message FAB (toast placeholder)
- **FR-27**: Conversation rows with avatar (initials fallback), name, last message preview, timestamp, unread badge, property context tag
- **FR-28**: Tap → navigate to Chat screen (app/chat.tsx) with selectedConversationId

### Chat / Messages Detail
- **FR-29**: Header with back + avatar + "Active now" + call button (toast) + property preview card (tap → property details)
- **FR-30**: Bubbles (me = right/terracotta, them = left/navy), timestamps, auto-scroll to bottom on send
- **FR-31**: Input + send button actually pushes messages via sendMessage() in AppContext and persists to state

### Book a Viewing (11)
- **FR-32**: Property preview card at top
- **FR-33**: Date selector (6 date pills, visual selected state), time selector (7 time slots, selected), people counter (+/-), optional message TextArea
- **FR-34**: "Request Viewing" CTA → addViewing() → success screen → auto-back after delay

### My Activity (13)
- **FR-35**: 3 tabs (Requests / Viewings / Applications) — top segmented control
- **FR-36**: Requests tab: RequestCards with status badge, location, budget, beds, people, "3 landlords responded" count pulled from AppContext.requests (replaced fake copy if none)
- **FR-37**: Viewings tab: ViewingCards, status badge, date/time, property preview, Cancel / View Details CTA buttons work (Details → property-details, Cancel updates status)
- **FR-38**: Applications tab: Either a real application list or a clean "No applications yet" empty state (remove hardcoded fake card)

### Landlord Dashboard (14)
- **FR-39**: Welcome banner (with user name), Add Property CTA button
- **FR-40**: 2×2 stats grid: Total Listings (real myListings.length), Available (real count of myListings where status=available), Viewing Requests (real viewings filter for myListings), Tenant Inquiries (real conversations where property in myListings) — **no fake/hardcoded numbers**
- **FR-41**: Quick actions (3 chips: Manage Listings, View Requests, View Messages) — navigate to correct screens
- **FR-42**: My Listings card list with availability badges, Manage button (opens details)

### Add / Manage Property (15)
- **FR-43**: Full form: Title, City+Suburb dropdown, property type chips (All/House/Apt/Room/Flat/Cottage — add bedsitter if in type), numeric rent + deposit, bedrooms/bathrooms/maxOccupants counters, cover photo picker (4 tiles — selected state outlined), 12 amenity multi-select chips, description TextArea
- **FR-44**: Publish → addProperty() with selected values → Alert confirm → nav back to dashboard

### Profile & Settings (16)
- **FR-45**: Top avatar (initials) + name + Tenant/Landlord pill + Member since + 3 stats row (role-aware: Saved/Viewings/Requests for tenant, Listings/Inquiries/Viewings for landlord — real counts)
- **FR-46**: Menu: My Profile (toast), My Activity (nav), Saved Properties (nav), My Listings (nav for landlord only, hidden for tenant), Notifications (nav to settings), Privacy & Security (nav), Help & Support (nav), Report a Problem (toast), Switch Account Type (updates role, navs back), Log Out (nav to choose-account)

## Non-Functional Requirements
- **NFR-1**: Cross-platform — screens render correctly on both iOS + Android (Expo Go compatible)
- **NFR-2**: Nav correctness — every screen nav target exists and routes via `expo-router`
- **NFR-3**: No unused imports / variables that cause errors; clean lint output
- **NFR-4**: Performance — flat lists render efficiently, no lag on carousel
- **NFR-5**: Design fidelity — colors use Brand palette (Navy #1B2A4A, Terracotta, Cream) consistently via Colors constants

## Constraints
- **Technical**: Must use existing Expo 57 + Expo Router stack; no native modules beyond installed set
- **Business**: Zimbabwe locale; all cities/provinces match existing locations data
- **Dependencies**: Continue using root-level `context/AppContext.tsx`; no new state libs (no Redux/Zustand)

## Assumptions
- Images from Unsplash/randomuser.me URLs in mockData are acceptable; no local asset generation needed
- Toast / share / call placeholders acceptable via native Alert or expo-notifications toast alternatives when native lib not available
- Map view toggle visual-only (no maps module); applications tab empty-state-or-fake acceptable
- No backend: all state is in-memory AppContext and resets on app reload is expected behavior for prototype

## Acceptance Criteria

### AC-1: TypeScript Type Check Passes
- **Type**: `rule`
- **Given**: Dependencies installed
- **When**: Run `npx tsc --noEmit`
- **Then**: Exit code = 0, zero TS errors
- **Pass Condition**: Zero TypeScript errors reported
- **Evidence**: Terminal output of `npx tsc --noEmit`

### AC-2: ESLint Errors Resolved
- **Type**: `rule`
- **Given**: Dependencies installed
- **When**: Run `npx expo lint`
- **Then**: Only warnings remain, zero error-level entries
- **Pass Condition**: 0 lint errors (error severity)
- **Evidence**: Terminal output of `npx expo lint`

### AC-3: No Duplicate / Dead src/ Folder
- **Type**: `rule`
- **Given**: Project root
- **When**: Listing directory `src/`
- **Then**: `src/` folder does not exist, or contains no TSX/TS files referenced by lint
- **Pass Condition**: `src/` removed or all lint entries for `src/*` gone
- **Evidence**: `ls src/` output + lint output

### AC-4: Save Property Works (No Crash)
- **Type**: `rule`
- **Given**: Tabs Home / Explore / Saved screens
- **When**: Tapping heart icon on any PropertyCard
- **Then**: Visual state toggles; Saved screen updates; no red screen / no TypeError for missing `toggleSaveProperty`
- **Pass Condition**: PropertyCard uses correct AppContext method names and state flows to Saved screen
- **Evidence**: Code diff of PropertyCard.tsx + AppContext, plus manual tap test passes

### AC-5: Explore Filter & Sort Buttons Are Functional
- **Type**: `rule`
- **Given**: Explore screen top right
- **When**: Tapping filter icon → FilterModal opens with working controls; tapping sort → sort options; tapping List/Map → toggles visual state
- **Then**: All 3 buttons have working onPress handlers
- **Pass Condition**: No dead buttons in Explore header
- **Evidence**: Code diff of explore.tsx onPress handlers

### AC-6: Home Search/Notification Buttons Work
- **Type**: `rule`
- **Given**: Home screen
- **When**: Tapping the notification bell (toast or settings nav), search bar (nav to explore), location chips (filter jump)
- **Then**: Every tap target responds with navigation or feedback
- **Pass Condition**: All home interactive elements have handlers

### AC-7: Booking Request → Appends to My Activity
- **Type**: `rule`
- **Given**: Property details → Book Viewing
- **When**: Complete form → Submit
- **Then**: New viewing is in AppContext.viewings; My Activity → Viewings tab shows it; Landlord Dashboard stats reflect it
- **Pass Condition**: Viewing count in context incremented by 1 after submit
- **Evidence**: AppContext.viewings.length before vs after submit

### AC-8: New Chat Message Persists to State
- **Type**: `rule`
- **Given**: Chat screen open
- **When**: User types text and taps send
- **Then**: Bubble appears aligned right; messages length increases; returning to Messages → Last message preview updates
- **Pass Condition**: sendMessage() writes to AppContext conversation
- **Evidence**: Context state diff + visible bubble

### AC-9: Landlord Stats Are Real (No Fake Numbers)
- **Type**: `rule`
- **Given**: Landlord Dashboard
- **When**: Viewing the 4 grid stats
- **Then**: All 4 numbers derived from AppContext state (myListings.length, available count, viewings for listings, conversations for listings); no "12" / "8" hardcoded
- **Pass Condition**: No hardcoded numeric literals for stat values in dashboard
- **Evidence**: Code grep of dashboard — no hardcoded stat numbers

### AC-10: Choose Account → Role Persists Across Screens
- **Type**: `rule`
- **Given**: Choose account
- **When**: Tap Tenant → Tabs Profile shows Tenant pill + Landlord Dashboard NOT accessible from tabs (role-aware menu)
- **Then**: Role value consistent; switching via Settings → role updates pills and menu visibility
- **Pass Condition**: Profile/Settings/MyActivity/Landlord nav all reflect current role

### AC-11: Design Fidelity (Visual)
- **Type**: `rubric`
- **Dimension**: Overall UI fidelity to the design mockup across 16 screens
- **Scale**: 1-5
- **Anchors**: 1 = 5+ screens look clearly different/wrong; 3 = 10+ screens mostly right but some chips/colors off; 5 = All 16 screens' layout, colors, typography, components match mockup within reasonable mobile variance
- **Pass Threshold**: >= 4
- **Evidence**: Side-by-side of each screen (Home/Explore/Details/Saved/Book Viewing/Dashboard/Profile) matches design's components, color usage (navy/terracotta/cream), card shapes, badges, CTAs

### AC-12: Interaction Completeness (No Dead UI)
- **Type**: `rubric`
- **Dimension**: Proportion of tappable elements with working behavior
- **Scale**: 1-5
- **Anchors**: 1 = 6+ placeholder/dead buttons; 3 = 2-3 minor items still dead; 5 = Every visible button, chip, CTA, tab, toggle, icon responds with correct navigation, state change, or toast placeholder
- **Pass Threshold**: >= 4
- **Evidence**: Manual checklist of every visible tap target across all 16 screens

## Open Questions
- [ ] Should applications tab have a real empty state or remove the tab entirely for MVP?
- [ ] Confirm all city images for onboarding slides match Zimbabwe properties (using current Unsplash URLs is OK?)
