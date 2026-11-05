# ImbaFind Screen Showcase

This directory stores reference mobile screenshots of the core ImbaFind user journey for documentation, store listings, and Phase 2 project demonstration.

## Screen Catalog

| Screen                          | File                        | Description                                                                                                                    |
| ------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Explore & Discovery**         | `01-explore-feed.png`       | Main listings feed showing Zimbabwe property cards, pricing in USD, suburb filters, and verified landlord badges.              |
| **Interactive Map & Locations** | `02-explore-map.png`        | Interactive location map and quick property preview cards with WhatsApp contact and neighborhood badges.                       |
| **AI Natural Language Search**  | `03-ai-search-filter.png`   | User inputting plain-English housing requests ("Cottage in Avondale under $500") translated into structured filter parameters. |
| **AI Fallback & Offline Mode**  | `03-ai-search-fallback.png` | Graceful fallback to deterministic search when AI quota/connection is unavailable with user guidance.                          |

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
