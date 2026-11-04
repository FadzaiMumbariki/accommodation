# ImbaFind Screen Showcase

This directory stores reference mobile screenshots of the core ImbaFind user journey for documentation, store listings, and Phase 2 project demonstration.

## Screen Catalog

| Screen                         | File                                 | Description                                                                                                                     |
| ------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Explore & Discovery**        | `01-explore-feed.png`                | Main listings feed showing Zimbabwe property cards, pricing in USD, suburb filters, and verified landlord badges.               |
| **Property Details & Trust**   | `02-property-details.png`            | Comprehensive listing view with image gallery, verified landlord contact, amenities, and booking slot requests.                 |
| **AI Natural Language Search** | `03-ai-search-filter.png`            | User inputting plain-English housing requests ("2 bed cottage in Avondale under $400") translated into structured filter chips. |
| **AI Listing Assistant**       | `04-landlord-description-helper.png` | Landlord property creation flow highlighting the AI description generator drafting clear facts.                                 |

## Capturing New Screenshots

To capture fresh screenshots directly from the web export or a connected emulator:

### 1. Web Preview

```bash
npx expo export -p web
npx serve dist
```

Open Chrome DevTools (`Ctrl+Shift+I` or `Cmd+Opt+I`), toggle the device toolbar (`Ctrl+Shift+M`), select **iPhone 14 / Pixel 7**, and capture full-size screenshots.

### 2. Android Device / Emulator

```bash
npx expo run:android
adb exec-out screencap -p > docs/screenshots/01-explore-feed.png
```
