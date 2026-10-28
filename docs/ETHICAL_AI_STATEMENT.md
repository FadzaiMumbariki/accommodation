# Ethical and Responsible AI Statement

ImbaFind uses AI to interpret a plain-language search, add cautious listing-description warnings, explain a request match, and draft a listing description for a landlord to edit. People stay in control of every decision. This statement explains how we handle data privacy, bias and transparency.

## Data privacy

- **What is sent to the AI:** for AI search, the text the user typed and a list of city names; for trust analysis, listing facts and description text; for matching, structured request criteria and facts about the top candidate; for the description helper, the property facts the landlord entered.
- **What is not sent:** names, phone numbers, email addresses, photos, chat messages, saved properties, viewing bookings or account details.
- **Where it goes:** the app calls a Supabase Edge Function, which calls the Google Gemini API. Google processes the text under its API terms. Users should not type personal details into the search box, and the app tells them what the AI does.
- **Keys and access:** the Gemini key exists only as a server-side Supabase secret. The functions require a signed-in user.
- **Storage:** ImbaFind does not store AI search text or AI responses in its own database. Server logs record errors only, not the text users typed.
- **Regulation:** this is a student project. Before a public launch the team would review Zimbabwe's Cyber and Data Protection Act, the Gemini API data-use terms, and the in-app privacy policy.

## Bias and fairness

Housing is a sensitive area where discrimination is a real risk, so the design limits what the AI can influence:

- AI search outputs filters, and results come from the app's own listings. Matching is ranked by explicit request criteria in the app; AI can only phrase the reason for the top candidate.
- The search prompt forbids filtering by race, religion, nationality, gender, family status or any personal trait, and the app only accepts a fixed set of filter fields, so extra fields are discarded even if the model returns them.
- The description prompt forbids describing the kind of tenant wanted, and forbids mentioning protected characteristics.
- AI trust analysis can add labelled, advisory description-quality warnings; rule-based checks remain visible and AI cannot verify ownership or remove a listing. Landlord verification remains a manual administrator action.
- Known limitation: language models can understand some English phrasing, spellings and place names better than others. Shona and Ndebele input is untested, and users who write differently may get weaker results. The basic filters and manual search remain available to everyone.

## Transparency

- AI search results are labelled: "AI understood: ..." with a note that it is AI-generated, and the user can clear the filters in one tap. When the AI is not used, the label says "Basic search understood".
- The description helper labels whether a draft came from AI or the local factual fallback. Landlords must check and publish it themselves; nothing is published automatically.
- Trust-check results distinguish AI signals from rule-based checks and are guidance, not a finding of fraud.
- The AI features are optional. All search and listing functions work without them.
- Limitations are documented in [AI_INTEGRATION.md](AI_INTEGRATION.md).

## Safety, accountability and honesty about limits

- Output from the model is treated as untrusted. It is validated and clamped before use, and only whitelisted fields can affect the app.
- Landlords remain responsible for the accuracy of their listings, including AI-drafted text.
- AI can be wrong. Trust warnings are not proof of fraud or a safety certification; users should inspect a property in person and never pay a deposit before viewing (see the safety banner on property pages).
- Feedback route: users can report listings and contact support from within the app. AI problems can be raised the same way.
- Accounts are limited to 30 AI requests per rolling hour across features. Output quality still needs evaluation against a labelled set of real and deliberately suspicious test listings, as well as testing with Shona and Ndebele.
