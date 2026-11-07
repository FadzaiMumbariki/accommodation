-- ─────────────────────────────────────────────────────────────────────────────
-- 022: Enable pg_net for push-notification dispatch
-- ─────────────────────────────────────────────────────────────────────────────
-- `public.notify_recipient()` (migrations 008/016) only sends an Expo push
-- request when the `pg_net` extension is installed:
--
--   if exists (select 1 from pg_extension where extname = 'pg_net') then
--     perform net.http_post(...);
--   end if;
--
-- Without the extension the trigger silently does nothing, so chat and viewing
-- notifications never leave the database. Supabase ships pg_net as an
-- available extension; enable it here so a fresh database can deliver pushes.
--
-- The guard keeps `supabase db push` / `db reset` working on a Postgres image
-- where pg_net has not been provisioned (the notice explains the consequence).

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    execute 'create extension if not exists pg_net with schema extensions';
  else
    raise notice
      'pg_net is not available; push notifications will be skipped until it is enabled.';
  end if;
end
$$;
