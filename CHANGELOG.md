# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
