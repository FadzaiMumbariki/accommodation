-- =============================================================================
-- Create Pre-Confirmed Test Accounts in Supabase Auth
-- Run this in your Supabase SQL Editor if you want to log in with real credentials
--
-- WARNING: these accounts share a well-known password ("password123"). Use them
-- for local testing only. Never run this against a production project, and
-- delete the accounts before going live.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create a Pre-Confirmed Tenant Account:
-- Email: tenant@imbafind.co.zw
-- Password: password123
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000002'::uuid,
  'authenticated',
  'authenticated',
  'tenant@imbafind.co.zw',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Farai Moyo (Tenant)","role":"tenant"}',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = now();

-- Ensure profile exists
INSERT INTO public.profiles (id, full_name, email, role, verified)
VALUES ('00000000-0000-0000-0000-000000000002'::uuid, 'Farai Moyo (Tenant)', 'tenant@imbafind.co.zw', 'tenant', true)
ON CONFLICT (id) DO UPDATE SET
  full_name = excluded.full_name,
  role = excluded.role;


-- 2. Create a Pre-Confirmed Landlord Account:
-- Email: landlord@imbafind.co.zw
-- Password: password123
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'authenticated',
  'authenticated',
  'landlord@imbafind.co.zw',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Tendai Makoni (Landlord)","role":"landlord"}',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = now();

-- Ensure profile exists
INSERT INTO public.profiles (id, full_name, email, role, verified, phone)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Tendai Makoni (Landlord)', 'landlord@imbafind.co.zw', 'landlord', true, '+263 77 456 7890')
ON CONFLICT (id) DO UPDATE SET
  full_name = excluded.full_name,
  role = excluded.role;

-- Verification
SELECT id, email, email_confirmed_at, raw_user_meta_data->>'role' as role FROM auth.users WHERE email IN ('tenant@imbafind.co.zw', 'landlord@imbafind.co.zw');
