# Legacy SQL scripts (do not use)

These files are **superseded and kept for reference only**. They are not part
of the supported setup path and are not run by `supabase db push` or
`supabase db reset`.

| File | Why it is here |
| --- | --- |
| `setup_complete.sql` | One-shot all-in-one schema. Duplicates everything in `../migrations/` and has already drifted from it. |
| `create_and_seed.sql` | Older all-in-one schema + seed. Also duplicates the migrations, with a different `profiles` definition (no `auth.users` foreign key). |
| `reload_schema_and_permissions.sql` | One-off PostgREST grant/cache refresh. The migrations and the Supabase CLI handle grants; use Studio's "Reload schema" if the API cache is stale. |

## The supported path

1. `supabase db push` (or `supabase db reset` locally) applies
   `../migrations/001`–`../migrations/017` in order.
2. `../seed_properties.sql` is an **optional, opt-in** script for sample
   listings. Run it manually in the SQL Editor after the migrations.

Never run a script from this folder against a real project.
