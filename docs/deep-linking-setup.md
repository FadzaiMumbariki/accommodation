# ImbaFind — Deep Linking & Domain Verification Setup

ImbaFind supports Universal Links on iOS and App Links on Android for:

- `https://imbafind.co.zw/property/<property-id>`
- `https://imbafind.co.zw/viewing/<viewing-id>`

Both mobile platforms require domain ownership verification files to be served over HTTPS with valid certificates directly from `https://imbafind.co.zw/.well-known/`.

> **Before deploying:** the repository files still contain `REPLACE_WITH...` placeholders, and an arbitrary example fingerprint in this document is not a valid value. Replace the placeholders with the real EAS/Play App Signing SHA-256 fingerprints and Apple Team ID, then run `npm run check:release`. The check (and `npm run deploy:web`) refuses to publish while placeholders remain. The custom domain must also resolve — `imbafind.co.zw` currently has no DNS records.

---

## 1. Android Digital Asset Links (`assetlinks.json`)

Android verifies App Links by fetching:

```
https://imbafind.co.zw/.well-known/assetlinks.json
```

### Template File

The template file is located at `public/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.imbafind.app",
      "sha256_cert_fingerprints": [
        "14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5"
      ]
    }
  }
]
```

### Finding your SHA-256 Fingerprint:

1. **From EAS Credentials**:
   ```bash
   npx eas-cli credentials
   ```
   Select `Android` -> `Keystore: Manage everything` -> view the SHA-256 fingerprint.
2. **From Google Play Console** (if Play App Signing is enabled):
   Navigate to **Release** -> **Setup** -> **App signing** -> copy the **App signing key certificate** SHA-256 fingerprint.

### Verification:

Test with Google's Digital Asset Links tool:

```bash
curl -I https://imbafind.co.zw/.well-known/assetlinks.json
# Ensure Content-Type is application/json and status is 200 OK
```

---

## 2. Apple Universal Links (`apple-app-site-association`)

iOS verifies Universal Links by fetching:

```
https://imbafind.co.zw/.well-known/apple-app-site-association
```

_(and optionally `https://imbafind.co.zw/apple-app-site-association`)_

### Template File

The template file is located at `public/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "<APPLE_TEAM_ID>.com.imbafind.app",
        "paths": ["/property/*", "/viewing/*"]
      }
    ]
  },
  "webcredentials": {
    "apps": ["<APPLE_TEAM_ID>.com.imbafind.app"]
  }
}
```

### Notes for iOS:

- Must be served with `Content-Type: application/json`.
- Do **not** append `.json` extension to the URL.
- Replace `<APPLE_TEAM_ID>` with your 10-character Apple Developer Team ID (visible in developer.apple.com under Membership).
- In `app.json`, `ios.associatedDomains` is configured as:
  `["applinks:imbafind.co.zw"]`

---

## 3. Hosting on `imbafind.co.zw`

If hosting via Vercel, Netlify, Cloudflare Pages, or Nginx:

- Ensure the `.well-known` folder is not blocked or hidden by webserver rules.
- Add proper CORS headers (`Access-Control-Allow-Origin: *`) if necessary.
- Return HTTP 200 with `Content-Type: application/json` without redirects.
