-- =============================================================================
-- ImbaFind — Sample Seed Properties
-- Run this in the Supabase SQL Editor AFTER running setup_complete.sql
-- =============================================================================

do $$
declare
  demo_landlord_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
begin
  -- Insert a mock landlord profile if not exists
  insert into public.profiles (id, full_name, role, verified, phone)
  values (demo_landlord_id, 'Tendai Makoni (Verified Host)', 'landlord', true, '+263 77 456 7890')
  on conflict (id) do nothing;

  -- Insert sample properties
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
