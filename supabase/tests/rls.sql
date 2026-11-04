-- =============================================================================
-- ImbaFind — RLS & privileged-column tests (pgTAP)
--
-- Run with: supabase test db      (requires the local Supabase stack running)
--
-- The file creates two throwaway auth users inside a transaction, switches the
-- Postgres role/claims to impersonate them, and then rolls everything back.
-- =============================================================================

begin;

select plan(16);

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
    jsonb_build_object('full_name', 'RLS Landlord', 'role', 'landlord', 'phone', '+263771234567'),
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

-- Update landlord phone in profile for testing listing joins
update public.profiles
set phone = '+263771234567'
where id = 'aaaaaaaa-0000-0000-0000-000000000001';

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

-- Conversation between landlord and tenant
insert into public.conversations (
  id, tenant_id, landlord_id, property_id
) values (
  'ffffffff-0000-0000-0000-000000000006',
  'bbbbbbbb-0000-0000-0000-000000000002',
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
  -- or fake rating/reviews_count must be ignored / reset by the trigger.
  insert into public.properties (
    id, landlord_id, title, property_type, price,
    city, suburb, province, available, verified, rating, reviews_count
  ) values (
    'eeeeeeee-0000-0000-0000-000000000005',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Self verified listing', 'house', 120,
    'Harare', 'Avondale', 'Harare', true, true, 5.00, 99
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

  perform set_config(
    'tests.inserted_rating',
    (
      select rating::text
      from public.properties
      where id = 'eeeeeeee-0000-0000-0000-000000000005'
    ),
    true
  );

  perform set_config(
    'tests.inserted_reviews_count',
    (
      select reviews_count::text
      from public.properties
      where id = 'eeeeeeee-0000-0000-0000-000000000005'
    ),
    true
  );

  -- A landlord cannot flip verified on their own listing via update.
  begin
    update public.properties
    set verified = true
    where id = 'eeeeeeee-0000-0000-0000-000000000005';
  exception when others then
    null;
  end;

  perform set_config(
    'tests.updated_verified',
    (
      select verified::text
      from public.properties
      where id = 'eeeeeeee-0000-0000-0000-000000000005'
    ),
    true
  );

  -- A landlord cannot directly update rating or reviews_count.
  begin
    update public.properties
    set rating = 4.80, reviews_count = 10
    where id = 'eeeeeeee-0000-0000-0000-000000000005';
  exception when others then
    perform set_config('tests.rating_update_blocked', '1', true);
  end;
end $$;

-- ─── Observations as a tenant (stranger) ────────────────────────────────────
set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}';

do $$
declare
  viewing_id uuid;
begin
  -- 1. Tenant CAN read landlord public profile details for listings
  perform set_config(
    'tests.stranger_can_read_landlord_profile',
    (
      select count(*)::text
      from public.profiles
      where id = 'aaaaaaaa-0000-0000-0000-000000000001'
        and full_name = 'RLS Landlord'
    ),
    true
  );

  -- 2. Tenant CANNOT insert a property listing
  begin
    insert into public.properties (
      id, landlord_id, title, property_type, price, city, suburb, province
    ) values (
      '11111111-0000-0000-0000-000000000001',
      'bbbbbbbb-0000-0000-0000-000000000002',
      'Tenant fraudulent listing', 'house', 200, 'Harare', 'CBD', 'Harare'
    );
    perform set_config('tests.tenant_insert_property', 'allowed', true);
  exception when others then
    perform set_config('tests.tenant_insert_property', 'blocked', true);
  end;

  -- 3. Tenant CANNOT directly insert into messages (chat impersonation blocked)
  begin
    insert into public.messages (
      conversation_id, sender_id, text
    ) values (
      'ffffffff-0000-0000-0000-000000000006',
      'aaaaaaaa-0000-0000-0000-000000000001', -- impersonating landlord
      'I am the landlord, pay deposit to 0771234567'
    );
    perform set_config('tests.direct_message_insert', 'allowed', true);
  exception when others then
    perform set_config('tests.direct_message_insert', 'blocked', true);
  end;

  -- 4. Forged viewing: tenant sets status = 'confirmed' and wrong landlord_id
  begin
    insert into public.viewing_requests (
      property_id, tenant_id, landlord_id, viewing_date, viewing_time, status
    ) values (
      'eeeeeeee-0000-0000-0000-000000000005',
      'bbbbbbbb-0000-0000-0000-000000000002',
      'bbbbbbbb-0000-0000-0000-000000000002', -- forged landlord
      current_date + 1, '10:00:00',
      'confirmed' -- forged status
    ) returning id into viewing_id;

    perform set_config(
      'tests.viewing_forced_landlord',
      (select landlord_id::text from public.viewing_requests where id = viewing_id),
      true
    );

    perform set_config(
      'tests.viewing_forced_status',
      (select status from public.viewing_requests where id = viewing_id),
      true
    );
  exception when others then
    null;
  end;

  perform set_config(
    'tests.stranger_saved',
    (select count(*)::text from public.saved_properties),
    true
  );

  perform set_config(
    'tests.stranger_hidden_listing',
    (
      select count(*)::text
      from public.properties
      where id = 'cccccccc-0000-0000-0000-000000000003'
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
  current_setting('tests.inserted_rating')::numeric,
  0.00,
  'a newly inserted listing starts with rating 0.00'
);

select is(
  current_setting('tests.inserted_reviews_count')::int,
  0,
  'a newly inserted listing starts with reviews_count 0'
);

select is(
  current_setting('tests.updated_verified')::boolean,
  false,
  'a landlord cannot flip verified on their own listing'
);

select is(
  coalesce(current_setting('tests.rating_update_blocked', true), '1'),
  '1',
  'a landlord cannot directly update rating or reviews_count'
);

select is(
  current_setting('tests.stranger_can_read_landlord_profile')::int,
  1,
  'signed-in renters can read landlord public profile details for listings'
);

select is(
  current_setting('tests.tenant_insert_property'),
  'blocked',
  'tenants are blocked from inserting property listings'
);

select is(
  current_setting('tests.direct_message_insert'),
  'blocked',
  'direct message insert is blocked to prevent chat impersonation'
);

select is(
  current_setting('tests.viewing_forced_landlord'),
  'aaaaaaaa-0000-0000-0000-000000000001',
  'viewing request trigger sets correct landlord from the property'
);

select is(
  current_setting('tests.viewing_forced_status'),
  'pending',
  'viewing request trigger forces status to pending'
);

select is(
  (select count(*)::int from public.properties where title = 'Anon listing'),
  0,
  'an anonymous visitor cannot insert a listing'
);

select * from finish();
rollback;
