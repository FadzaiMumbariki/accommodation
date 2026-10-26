# ImbaFind - Implementation Plan

## Task 1: Code Health Cleanup (Delete src/, Fix Imports, Buffer polyfill import order)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Delete stale duplicate `src/` folder (old screens/components/context/types — never used by routes)
  - Remove all unused imports flagged by lint (View, StyleSheet, TextInput, Image, SectionList, Rect, colors, searchText, emailEnabled, setEmailEnabled, useEffect, ChatMessage, Property, setBathrooms, Ionicons)
  - Fix app/_layout.tsx Buffer polyfill import ordering (imports after side-effects — move to proper order or use `import at top with declare`)
  - Fix 8 unescaped apostrophe/quote JSX errors (react/no-unescaped-entities) in choose-account, help, my-activity, RequestCard — escape with &apos;/&quot;
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `rule` TR-1.1: After cleanup, `npx expo lint` reports 0 `error` level entries; warnings OK. Evidence: terminal output
  - `rule` TR-1.2: `src/screens`, `src/components`, `src/context` folders no longer exist. Evidence: `ls src/` fails
- **Notes**: Quickest win; removes ~36 duplicate lint warnings/errors

## Task 2: Fix TypeScript Type Errors (AppContext naming mismatches, union types)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - `components/property/PropertyCard.tsx`: fix `isPropertySaved` → `isSaved(property.id)` and `toggleSaveProperty` → `toggleSaved(property.id)` (or add missing methods to AppContextValue interface to match components)
  - Fix PropertyCard rating optional: property.rating ?? 0 fallback
  - Fix PropertyCard availability undefined: give default to Available or type narrow
  - `components/chat/ChatBubble.tsx`: viewing_confirmed/viewing_request comparison — either expand ChatMessage.type union or remove dead branch; align with ChatMessage type
  - `components/request/RequestCard.tsx`: add `'paused'` to StatusBadge allowed ViewingStatus union
  - `components/search/FilterModal.tsx`: align FilterState type to include availableNowOnly/furnishedOnly/selectedAmenities OR remove mismatched fields from component
  - `components/common/AvailabilityBadge.tsx`: fix unused colors import
- **Acceptance Criteria Addressed**: AC-1, AC-4
- **Test Requirements**:
  - `rule` TR-2.1: `npx tsc --noEmit` exits with code 0 (zero TS errors). Evidence: full terminal output
  - `rule` TR-2.2: Heart save tap on PropertyCard does not throw TypeError; console shows no error, state toggles. Evidence: AppContext.savedPropertyIds includes/removes id after tap

## Task 3: Fix AppContext - Method Naming & Filter Logic (furnished + amenities)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Ensure AppContextValue exports exactly the methods components call. Preferred: rename in AppContext to add friendly aliases. Add both names: `toggleSaveProperty` + `isPropertySaved` as aliases
  - In `filteredProperties` computation, actually check: `furnished` toggle (if filters.hasFurnishedOnly → only properties.furnished === true), and `amenities` (if filters.selectedAmenities array > 0 → property.amenities must include all selected)
  - My Activity → Applications tab: remove hardcoded 1 fake card; replace with EmptyState "No applications yet" with CTA to Browse Properties; or remove tab if not used
  - Hardcoded landlord 'l5': keep for now (since no auth) but add a comment — not changing scope of this spec
- **Acceptance Criteria Addressed**: AC-4, AC-7, AC-8, AC-9
- **Test Requirements**:
  - `rule` TR-3.1: Setting filters.furnishedOnly=true and filter.amenities=['WiFi'] filters properties correctly to furnished ones with WiFi. Evidence: filtered count decreases.
  - `rule` TR-3.2: Applications tab either removed OR shows a real EmptyState (no hardcoded card). Evidence: screen render shows no hardcoded single card.

## Task 4: Explore Screen — Wire Up Filter, Sort, List/Map Buttons + Search Improvements
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, Task 3
- **Description**:
  - Filter icon (options) button onPress: open FilterModal component or location-selector. Best: open a modal that wraps existing FilterModal (currently standalone component) with sheet presentation, apply button commits filters
  - Sort button onPress: show simple ActionSheet via Alert (Price: Low to High / Price: High to Low / Newest / Rating) and sort filteredProperties accordingly
  - List/Map view toggle: add useState visual toggle; swap between vertical cards (list) → if Map → show placeholder banner "Map view coming soon" with list still below (since no maps module)
  - Expand explore search beyond just city: filter also by title, description, suburb. Text search `q` → `properties.filter(p => p.title.includes(q) || p.city.includes(q) || p.suburb.includes(q) || p.description?.includes(q))`
  - Property type chips (All/House/Apt/Room/Flat/Cottage): connect working toggle of filter.propertyType
- **Acceptance Criteria Addressed**: AC-5, AC-6
- **Test Requirements**:
  - `rule` TR-4.1: All 4 top-right/top icons (search input, filter, sort, list/map) have onPress handlers and actually DO something observable. Evidence: code diff of explore.tsx shows non-empty onPress for each; manual test changes state
  - `rule` TR-4.2: Type in search finds property by title substring (e.g. search "Modern" → includes "Modern 2 Bedroom House"). Evidence: visible results filtered

## Task 5: Home Screen - Wire All Dead Buttons (Bell, Search, Popular Cities, Quick Filters)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - Top-right notification 🔔 bell onPress: navigate to /settings or show Alert/toast "Notifications: You're up to date!"
  - Search bar wrapper onPress: router.push('/(tabs)/explore')
  - "Where do you want to live?" row + "View all": router.push('/(tabs)/explore')
  - Quick filter chips (Location, Beds, Budget, Top): at minimum navigate to Explore with pre-selected type chip highlight
  - Popular locations city chips: tap chip → set AppContext filter.city = chip → navigate to Explore, results filtered by that city
  - PropertyCards in carousel: tap → property-details, heart → toggle saved
- **Acceptance Criteria Addressed**: AC-6, AC-10
- **Test Requirements**:
  - `rule` TR-5.1: Every interactive element on Home has handler and behaves correctly (bell, search bar row, view all, 4 quick filters, 6 popular cities, cards in carousel, hearts). Evidence: onPress handlers all non-null

## Task 6: Messages + Chat — Working Search, FAB, Message Persistence, Active Now Visuals
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 2
- **Description**:
  - Messages screen: search TextInput → actually filter conversations (name + lastMessage + property context)
  - Messages screen: FAB "+ new message" onPress: Alert "New conversation" / startConversation with a default landlord or navigate to Explore to pick property
  - Chat screen: Make send button fully push messages via `sendMessage()`. After 2s simulate a simple auto-reply with setTimeout to feel alive (reply like "Thanks for your message!")
  - Call button (📞) in chat header onPress: Alert "Calling landlord..." toast placeholder
  - "Active now" text below name: keep it; no changes needed since no real presence API
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `rule` TR-6.1: Send typed chat message → message appears as my-bubble right aligned, conversations[].messages array grows by 1. Evidence: AppContext state length before/after
  - `rule` TR-6.2: Messages search input filters conversation rows when typing a landlord name like "Thandiwe". Evidence: visible rows filter

## Task 7: Book Viewing Flow — Fix Success + Make Cancel/Confirm Work in My Activity
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 3
- **Description**:
  - Book Viewing submit: after addViewing() success screen → auto-route back to Property Details or My Activity after delay
  - My Activity → Viewings tab: CTA buttons "Cancel" works: set viewing.status='cancelled' via AppContext method updateViewingStatus(id, status); "View Details" navigates to property-details
  - My Activity → Requests tab: replace fake "Responses from 3 landlords" static text with computed based on mock data (e.g. keep at 3 if you can't compute, but make dynamic not hardcoded; or append real linked conversations that exist for that request)
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `rule` TR-7.1: After booking a viewing, My Activity Viewings count increases by 1. Evidence: viewings.length before/after submit
  - `rule` TR-7.2: Cancel CTA tap → viewing badge changes to Cancelled. Evidence: visual status badge updates

## Task 8: Landlord Dashboard — Replace Fake Stats with Real Computed Values
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3, Task 7
- **Description**:
  - Total Listings: use `myListings.length` directly
  - Available: `myListings.filter(p => p.status==='available').length` (NOT displayProperties.length - 1 || 1 — remove that buggy formula)
  - Viewing Requests: compute from AppContext.viewings — filter where viewing.propertyId belongs to one of myListings → count
  - Tenant Inquiries: compute from AppContext.conversations — filter where conversation.propertyId belongs to myListings → count
  - My Listings section: show Manage button → goes to property-details (at minimum); or add simple Alert with "Edit/Delete coming soon" options. No read-only mislead.
  - Quick action chips: Manage Listings → scroll down OR to My Activity Viewings? Map to correct existing routes; don't leave dead
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `rule` TR-8.1: No hardcoded numeric literals (8, 12) in dashboard stats. Evidence: `Select-String -Path app/landlord-dashboard.tsx -Pattern '8|12'` returns only non-stat matches
  - `rule` TR-8.2: All 3 quick action chips have onPress that navigates. Evidence: handlers present

## Task 9: Add Property — Fix Commercial Mismatch, Add Bedsitter Chip, Province Derivation
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 2
- **Description**:
  - Property type chips: include `bedsitter` (missing from chips but in PropertyType union); remove or rename `Commercial` to a type that exists in PropertyType, or add `commercial` to PropertyType union in types/index.ts
  - Province auto-derivation: only does Bulawayo/Harare → extend to all cities per locations data (Gweru → Midlands, Mutare → Manicaland, Masvingo → Masvingo, etc.)
  - Photo picker: 4 sample Unsplash tiles work fine, ensure selected one has outlined highlight and is actually passed into addProperty()
  - Amenities: ensure multi-selection returns selected amenities array to addProperty call
- **Acceptance Criteria Addressed**: AC-1, AC-12
- **Test Requirements**:
  - `rule` TR-9.1: Every property type chip value present in PropertyType union. Evidence: typecheck passes
  - `rule` TR-9.2: Publish button actually creates a property with correct values (landlord l5, type, city, price). Evidence: after submit properties.length increments by 1 and dashboard Total Listings increments

## Task 10: Profile & Settings — Persist Toggles (Local), Wire Dead Menu Items, Role Consistency
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 8
- **Description**:
  - Notification toggles (Push, Viewing Reminders, SMS): wire local useState to Settings screen; reflect toggles (at least visual state survives within session; full persistence via AsyncStorage out of scope per non-goals but if easy can store via window.expo?)
  - EmailEnabled state: remove or wire into a toggle (currently unused causing lint warning — Task 1)
  - Menu items: My Profile (Alert "Edit Profile coming soon"), My Activity (nav: /my-activity), Saved Properties (nav: /(tabs)/saved), My Listings (only if landlord role: nav: /landlord-dashboard), Notifications (nav: /settings), Help (nav: /help), Report a Problem (Alert), Switch Account Type (role switch + toast)
  - Profile avatar camera icon: Alert "Upload Avatar coming soon" placeholder (or image picker if expo-image-picker added — out of scope so Alert OK)
  - Clear Cache button: confirm Alert, then reset filters/savedIds/viewings/messages back to mockData defaults
- **Acceptance Criteria Addressed**: AC-10, AC-12
- **Test Requirements**:
  - `rule` TR-10.1: Every Profile menu row has working onPress handler (9+ rows). Evidence: handlers all present and correct
  - `rule` TR-10.2: Switch Account Type → Tenant → Landlord pill updates → Landlord menu items visible. Evidence: pill label updates after tap

## Task 11: Property Details — Share Button, Reviews Fallback, Map Placeholder
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 5
- **Description**:
  - Share button (↗): onPress: `Alert.alert('Share', 'Share this property link', [{text:'Copy Link', onPress:()=>{}},{text:'Cancel'}])` placeholder
  - Image carousel counter "1/6": ensure matches actual photos array length
  - Reviews section: even without real reviews, add "No reviews yet" placeholder section (matches design detail context)
  - Landlord card Message button: navigate to chat with same startConversation flow
- **Acceptance Criteria Addressed**: AC-12
- **Test Requirements**:
  - `rule` TR-11.1: Share + Back + Save + Message Landlord + Book Viewing all 5 CTAs on Property Details have onPress handlers and show feedback/navigate. Evidence: code diff + manual test

## Task 12: Post Request — Fix Commercial Chip, Improve Form Validations
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 2
- **Description**:
  - Property type `Commercial` same as Task 9: align with PropertyType union
  - Move-in date: keep TextInput or add Date (no picker); at minimum placeholder "DD/MM/YYYY"
  - Budget min/max: ensure values actually passed into filters when request created
  - Amenities chip +5 overflow: if >5 selected show "+ N more" — ensure the number is accurate from selectedAmenities.length - 5
  - Submit: ensure addRequest() actually receives furnished boolean + amenities + budget min/max + city + suburb
- **Acceptance Criteria Addressed**: AC-1, AC-12
- **Test Requirements**:
  - `rule` TR-12.1: Submit Post Request → AppContext.requests.length increases by 1. Evidence: before/after length check
  - `rule` TR-12.2: All property type chip values valid per PropertyType. Evidence: typecheck passes

## Task 13: Onboarding Slides — Ensure Design Images/Messaging Match 3-Slide Flow
- **Status**: `pending`
- **Priority**: low
- **Depends On**: Task 1
- **Description**:
  - Onboarding screens: ensure 3 slides copy exactly "Find available accommodation / Find a place that fits / Connect with landlords" + Skip + Next + Last CTA Get Started
  - Images: update URIs if needed to show houses, couple (matching design mockup imagery)
  - Paging dots: update dots indicator to match design (orange/terracotta active)
- **Acceptance Criteria Addressed**: AC-11
- **Test Requirements**:
  - `rule` TR-13.1: All 3 onboarding slides render with correct text + paging dots + Skip/Next/Get Started progressiveness. Evidence: visible during manual test
  - `rubric` TR-13.2: Visual match with mockup slide images & layout. Scale 1-5; anchors 1=wrong text/flow 3=close but missing images 5=exact text+images+CTA flow; threshold >=4; Evidence=visual side-by-side comparison

## Task 14: Run Full Final Verification (lint + tsc + smoke test)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 1-13
- **Description**:
  - Run `npx tsc --noEmit` — must be 0 errors
  - Run `npx expo lint` — 0 errors (warnings OK)
  - Smoke test: start expo server, simulate nav through all 16 screens, tap every CTA once via code review
  - Confirm all Tasks 1-13 TRs have evidence filled
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `rule` TR-14.1: `tsc --noEmit` exit code 0. Evidence: output
  - `rule` TR-14.2: `expo lint` error count 0. Evidence: output
  - `rubric` TR-14.3: Overall app demoable quality. Scale 1-5; 1 = crashes; 3 = works but 2+ minor dead items remain; 5 = every screen + interaction works, smooth prototype. Threshold >= 4. Evidence: smoke test summary
