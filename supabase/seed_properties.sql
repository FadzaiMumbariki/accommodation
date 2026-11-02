-- =============================================================================
-- ImbaFind — Sample Seed Properties (optional)
-- Run this in the Supabase SQL Editor AFTER the migrations have been applied
-- (supabase db push / supabase db reset). It is opt-in and never runs
-- automatically. Only use it on a project that is safe to populate with
-- sample data.
--
-- It creates a placeholder "demo host" account for the sample listings. That
-- account has no password, so nobody can sign in as it. Chat messages sent to
-- a demo-host listing are answered by the clearly-labelled automated reply
-- installed by migrations/014_landlord_auto_reply.sql.
-- =============================================================================

do $$
declare
  demo_landlord_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
begin
  -- 1. The demo host must exist as a real auth user first: public.profiles.id
  --    references auth.users(id), so a profile alone would violate the foreign
  --    key. Inserting the auth user triggers public.handle_new_user(), which
  --    creates the matching profile row.
  insert into auth.users (
    instance_id, id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    demo_landlord_id,
    'authenticated',
    'authenticated',
    'demo.host@imbafind.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', 'Tendai Makoni (Demo Host)', 'role', 'landlord'),
    now(), now(), '', '', '', ''
  )
  on conflict do nothing;

  -- 2. Mark the demo host as verified and give it a contact number. Running
  --    from the SQL editor (no auth.uid()) is allowed to set verified.
  update public.profiles
  set verified = true,
      phone = '+263 77 456 7890'
  where id = demo_landlord_id;

  -- 3. Sample properties owned by the demo host.
  insert into public.properties (
    id, landlord_id, title, description, property_type, price, deposit,
    city, suburb, province, bedrooms, bathrooms, max_occupants,
    amenities, images, available, availability_status, verified, rating, reviews_count
  ) values
  (
    '11111111-1111-1111-1111-111111111111'::uuid,
    demo_landlord_id,
    'Spacious 3 Bed Family Home',
    'Stunning 3-bedroom home in Borrowdale. Large garden, proximity to top schools and shopping centres.',
    'house',
    500.00,
    1000.00,
    'Harare',
    'Borrowdale',
    'Harare Province',
    3,
    2,
    6,
    array['water','electricity','security','parking','garden','wifi','dstv'],
    array['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'],
    true,
    'available_now',
    true,
    4.8,
    12
  ),
  (
    '22222222-2222-2222-2222-222222222222'::uuid,
    demo_landlord_id,
    'Executive 4 Bed Home with Solar & Borehole',
    'Top-tier executive residence in Mount Pleasant. Fully furnished with solar backup and generator.',
    'house',
    850.00,
    1700.00,
    'Harare',
    'Mount Pleasant',
    'Harare Province',
    4,
    3,
    8,
    array['water','electricity','solar','security','parking','garden','wifi','furnished','aircon'],
    array['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', 'https://images.unsplash.com/photo-1571939228382-b2f2b585ce15?w=800'],
    true,
    'available_now',
    true,
    4.9,
    18
  ),
  (
    '33333333-3333-3333-3333-333333333333'::uuid,
    demo_landlord_id,
    'Modern 2 Bed Apartment Avondale',
    'Clean, sunny 2-bed apartment in Avondale. Close to restaurants and shopping mall.',
    'apartment',
    320.00,
    640.00,
    'Harare',
    'Avondale',
    'Harare Province',
    2,
    1,
    4,
    array['water','electricity','wifi','security','parking'],
    array['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800'],
    true,
    'available_now',
    true,
    4.4,
    7
  ),
  (
    '44444444-4444-4444-4444-444444444444'::uuid,
    demo_landlord_id,
    'Modern 2 Bed House Nkulumane',
    'Beautiful modern 2-bed house in Nkulumane with solar, borehole and secure perimeter fence.',
    'house',
    350.00,
    700.00,
    'Bulawayo',
    'Nkulumane',
    'Bulawayo',
    2,
    1,
    4,
    array['water','electricity','solar','security','parking','garden','borehole','wifi'],
    array['https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800'],
    true,
    'available_now',
    true,
    4.8,
    9
  ),
  (
    '55555555-5555-5555-5555-555555555555'::uuid,
    demo_landlord_id,
    'Cozy Garden Cottage Greendale',
    'Peaceful cottage in Greendale with private garden. Pets welcome.',
    'cottage',
    290.00,
    580.00,
    'Harare',
    'Greendale',
    'Harare Province',
    2,
    1,
    4,
    array['water','electricity','solar','garden','parking'],
    array['https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=800', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800'],
    true,
    'available_now',
    true,
    4.2,
    5
  )
  on conflict (id) do nothing;
end $$;
