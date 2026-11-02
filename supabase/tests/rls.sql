-- =============================================================================
-- ImbaFind — RLS & privileged-column tests (pgTAP)
--
-- Run with: supabase test db      (requires the local Supabase stack running)
--
-- The file creates two throwaway auth users inside a transaction, switches the
-- Postgres role/claims to impersonate them, and then rolls everything back.
-- =============================================================================

begin;

select plan(12);

-- ─── Fixtures ────────────────────────────────────────────────────────────────
-- Inserting into auth.users fires public.handle_new_user(), which creates the
-- matching public.profiles row.
insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'rls.landlord@imbafind.test', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', 'RLS Landlord', 'role', 'landlord'),
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'rls.stranger@imbafind.test', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', 'RLS Stranger', 'role', 'tenant'),
    now(), now(), '', '', '', ''
  );

-- A listing that is not publicly visible and a saved-property row owned by the
-- landlord. Created as the superuser, which bypasses RLS.
insert into public.properties (
  id, landlord_id, title, property_type, price, city, suburb, province, available
) values (
  'cccccccc-0000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'RLS Test Home', 'house', 100, 'Harare', 'Avondale', 'Harare', false
);

insert into public.saved_properties (id, user_id, property_id) values (
  'dddddddd-0000-0000-0000-000000000004',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'cccccccc-0000-0000-0000-000000000003'
);

-- ─── Observations as the landlord ───────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

do $$
begin
  -- The owner can still read a listing that is hidden from the public.
  perform set_config(
    'tests.landlord_reads_own',
    (
      select count(*)::text
      from public.properties
      where id = 'cccccccc-0000-0000-0000-000000000003'
    ),
    true
  );

  -- A landlord may create their own listing, but asking for verified = true
  -- must be ignored by the before-insert trigger.
  insert into public.properties (
    id, landlord_id, title, property_type, price,
    city, suburb, province, available, verified
  ) values (
    'eeeeeeee-0000-0000-0000-000000000005',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Self verified listing', 'house', 120,
    'Harare', 'Avondale', 'Harare', true, true
  );

  perform set_config(
    'tests.inserted_listing',
    (
      select count(*)::text
      from public.properties
      where id = 'eeeeeeee-0000-0000-0000-000000000005'
    ),
    true
  );

  perform set_config(
    'tests.inserted_verified',
    (
      select verified::text
      from public.properties
      where id = 'eeeeeeee-0000-0000-0000-000000000005'
    ),
    true
  );

  -- Flipping verified on an existing listing must either be rejected outright
  -- or silently leave the stored value untouched.
  begin
    update public.properties
    set verified = true
    where id = 'cccccccc-0000-0000-0000-000000000003';
  exception when others then
    null;
  end;

  perform set_config(
    'tests.updated_verified',
    (
      select verified::text
      from public.properties
      where id = 'cccccccc-0000-0000-0000-000000000003'
    ),
    true
  );
end $$;

-- ─── Observations as an unrelated signed-in user ────────────────────────────
set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}';

do $$
begin
  perform set_config(
    'tests.stranger_profiles',
    (
      select count(*)::text
      from public.profiles
      where id = 'aaaaaaaa-0000-0000-0000-000000000001'
    ),
    true
  );

  perform set_config(
    'tests.stranger_saved',
    (select count(*)::text from public.saved_properties),
    true
  );

  perform set_config(
    'tests.stranger_listing',
    (
      select count(*)::text
      from public.properties
      where id = 'cccccccc-0000-0000-0000-000000000003'
    ),
    true
  );

  perform set_config(
    'tests.stranger_update',
    (
      with updated as (
        update public.properties
        set title = 'hijacked'
        where id = 'cccccccc-0000-0000-0000-000000000003'
        returning 1
      )
      select count(*)::text from updated
    ),
    true
  );
end $$;

-- ─── Observation as an anonymous visitor ────────────────────────────────────
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
begin
  begin
    insert into public.properties (
      landlord_id, title, property_type, price, city, suburb, province
    ) values (
      'aaaaaaaa-0000-0000-0000-000000000001',
      'Anon listing', 'house', 5, 'Harare', 'Avondale', 'Harare'
    );
  exception when others then
    null;
  end;
end $$;

reset role;

-- ─── Assertions ─────────────────────────────────────────────────────────────
select is(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  true,
  'RLS is enabled on public.profiles'
);

select is(
  (select relrowsecurity from pg_class where oid = 'public.properties'::regclass),
  true,
  'RLS is enabled on public.properties'
);

select is(
  (select relrowsecurity from pg_class where oid = 'public.saved_properties'::regclass),
  true,
  'RLS is enabled on public.saved_properties'
);

select is(
  current_setting('tests.landlord_reads_own')::int,
  1,
  'a landlord can read their own listing even when it is not publicly visible'
);

select is(
  current_setting('tests.inserted_listing')::int,
  1,
  'a landlord can create a listing they own'
);

select is(
  current_setting('tests.inserted_verified')::boolean,
  false,
  'a newly inserted listing is always created unverified'
);

select is(
  current_setting('tests.updated_verified')::boolean,
  false,
  'a landlord cannot flip verified on their own listing'
);

select is(
  current_setting('tests.stranger_profiles')::int,
  0,
  'a signed-in user cannot read another user profile'
);

select is(
  current_setting('tests.stranger_saved')::int,
  0,
  'a signed-in user cannot read another user saved listings'
);

select is(
  current_setting('tests.stranger_listing')::int,
  0,
  'a signed-in user cannot read a hidden listing they do not own'
);

select is(
  current_setting('tests.stranger_update')::int,
  0,
  'a signed-in user cannot update a listing they do not own'
);

select is(
  (select count(*)::int from public.properties where title = 'Anon listing'),
  0,
  'an anonymous visitor cannot insert a listing'
);

select * from finish();
rollback;
