# ImbaFind

## Verifying landlords

Landlord verification is an administrative action. In the Supabase SQL Editor, set the profile's `verified` flag using the account's auth UUID:

```sql
update public.profiles
set verified = true
where id = 'REPLACE_WITH_AUTH_USER_UUID';
```

The client intentionally has no action that can set `verified`.

Apply `supabase/migrations/003_reports.sql` after the existing schema and security migrations to enable reports, chat message writes, and viewing-slot conflict protection.

## Release environment setup

Apply `supabase/migrations/004_push_tokens.sql` after migration 003 to store Expo push tokens. Link the app to an EAS project with `npx eas-cli@latest init`; this adds the project ID used by push notifications.

Set the public Supabase URL and anon key in each EAS environment used by the `development`, `preview`, and `production` build profiles. The client must only contain the Supabase anon key, never a service-role key:

```sh
npx eas-cli@latest env:set --name EXPO_PUBLIC_SUPABASE_URL --value https://YOUR_PROJECT.supabase.co --environment production --visibility plaintext
npx eas-cli@latest env:set --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value YOUR_ANON_KEY --environment production --visibility plaintext
```

Repeat these commands with the appropriate environment name (`development` or `preview`) and values. These are public client configuration values; do not put a service-role key in an EAS environment or client bundle. For local development, copy `.env.example` to `.env.local` and fill in the public Supabase values. With no credentials, the app continues to use mock mode.

Crash reporting is disabled by default. To enable Sentry, create a Sentry project, then set `EXPO_PUBLIC_SENTRY_ENABLED=true`, `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, and `SENTRY_PROJECT` in the appropriate EAS environment. Add `SENTRY_AUTH_TOKEN` as an EAS secret for source-map uploads. Rebuild the native app after enabling the config plugin. The support contact values live in `constants/support.ts`; replace them with verified contacts before release.

For example, set production Sentry values with:

```sh
npx eas-cli@latest env:set --name EXPO_PUBLIC_SENTRY_ENABLED --value true --environment production --visibility plaintext
npx eas-cli@latest env:set --name EXPO_PUBLIC_SENTRY_DSN --value YOUR_SENTRY_DSN --environment production --visibility plaintext
npx eas-cli@latest env:set --name SENTRY_ORG --value YOUR_SENTRY_ORG --environment production --visibility plaintext
npx eas-cli@latest env:set --name SENTRY_PROJECT --value YOUR_SENTRY_PROJECT --environment production --visibility plaintext
npx eas-cli@latest env:set --name SENTRY_AUTH_TOKEN --value YOUR_SENTRY_AUTH_TOKEN --environment production --visibility secret
```

Repeat for other build environments if needed. Never commit the Sentry auth token.
