# 0001. Route all Gemini calls through Supabase Edge Functions

- Status: Accepted
- Date: 2026-11-02

## Context

ImbaFind uses four AI features: AI search (`lib/aiFilters.ts`, `supabase/functions/ai-search`), the AI trust check (`lib/trustCheck.ts`, `supabase/functions/ai-trust`), accommodation-request matching (`lib/smartMatching.ts`, `supabase/functions/ai-match`), and the AI listing helper (`supabase/functions/ai-describe`). All four call the Google Gemini API.

A Gemini API key in a mobile client cannot be kept secret: Expo bundles are shipped to devices and can be inspected, so any key embedded in the app must be treated as public. The app also cannot be trusted to enforce usage limits, since a determined user controls the device. We needed a design that keeps the key off the client, limits abuse, and contains the risk of the model returning unwanted output.

## Decision

All Gemini calls go through Supabase Edge Functions. The app never calls Gemini directly and never holds the key.

- **Key isolation.** `GEMINI_API_KEY` is stored only as a Supabase secret and read inside the functions via `supabase/functions/_shared/gemini.ts`. The model defaults to `gemini-3.1-flash-lite` and can be changed with the `GEMINI_MODEL` secret.
- **Authentication and per-user rate limit.** Each function requires a signed-in user and calls the `consume_ai_request` RPC (`supabase/migrations/006_ai_request_limits.sql`), which enforces a shared limit of 30 AI requests per account per rolling hour across all four features. The check is server-side, so the client cannot bypass it.
- **Prompt-injection guidance.** The system prompt instructs the model to treat the user's text strictly as a search request and never as instructions to it, and forbids filtering by the user's race, religion, nationality, gender, family status or any personal trait.
- **Server-side input caps.** The function validates input before calling Gemini — for example, `ai-search` rejects a query that is not a non-empty string of at most 200 characters — and settings such as `maxOutputTokens` and a JSON response schema bound the request and response.
- **Client-side output sanitisation.** Model output is treated as untrusted. `sanitizeAiFilters` in `lib/aiFilters.ts` keeps only known fields, enforces types and sane ranges, clamps numbers, fixes swapped budget bounds, rejects property types outside the allowed list, and drops any city that is not a real city in the app's data. Similar per-feature validation applies to the other responses.
- **Privacy.** PII such as phone numbers and emails is stripped before text is sent to Gemini, and the app never stores AI queries or responses in its own database.

## Consequences

Benefits:

- The API key is never exposed to the client, and usage limits are enforced where the user cannot tamper with them.
- All AI traffic is funnelled through one place, so safeguards (input caps, prompt-injection guidance, output validation) are applied consistently and are easy to review and change.
- The client degrades gracefully: when a function is unreachable or the app is in demo mode, AI search falls back to the local keyword parser (`parseQueryLocally`) and the listing helper uses a factual local draft.

Trade-offs and costs:

- **Added latency and an extra hop.** Each AI request is app → Edge Function → Gemini → Edge Function → app, which is slower than a direct call.
- **Cold starts.** Edge Functions in Deno may need to start before serving a request, which can add variable delay on the first call after a quiet period.
- **Operating cost and quota.** Calls consume the Gemini quota and cost money; a monthly budget alert on the Gemini key is recommended before public launch. The 30-requests-per-hour limit is the only cost control built in so far.
- **Advisory output only.** AI results are guidance, not fact. Filter sanitising and result labelling mean the AI cannot invent listings, verify ownership or remove a listing, and AI warnings are not proof of fraud. Landlords remain responsible for the accuracy of AI-drafted descriptions.
- **Dependency on infrastructure.** The features need a working Supabase project and Gemini key and quota. Deployed rate limits and live Gemini behaviour still require manual verification against a real project.

## References

- [AI integration](../AI_INTEGRATION.md)
- [Architecture overview](../ARCHITECTURE.md)
- [Ethical and responsible AI statement](../ETHICAL_AI_STATEMENT.md)
