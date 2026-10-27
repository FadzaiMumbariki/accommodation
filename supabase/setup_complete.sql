-- =============================================================================
-- ImbaFind — Complete Supabase Setup & Clean Recreation
-- Run this entire script in: Supabase Dashboard → SQL Editor → New Query → Run
-- =============================================================================

create extension if not exists "uuid-ossp";

-- 0. CLEAN RESET PREVIOUS PARTIAL TABLES (Ensures all columns exist cleanly)
drop table if exists public.reports cascade;
drop table if exists public.reviews cascade;
drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;
drop table if exists public.viewing_requests cascade;
drop table if exists public.accommodation_requests cascade;
drop table if exists public.saved_properties cascade;
drop table if exists public.property_images cascade;
drop table if exists public.inquiries cascade;
drop table if exists public.properties cascade;

-- 1. PROFILES
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  email         text,
  phone         text,
  avatar_url    text,
  role          text not null default 'tenant' check (role in ('tenant', 'landlord')),
  verified      boolean not null default false,
  push_token    text,
  created_at    timestamptz not null default now()
);

-- Ensure columns exist if profiles was created previously
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists role text not null default 'tenant';
alter table public.profiles add column if not exists verified boolean not null default false;
alter table public.profiles add column if not exists push_token text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'tenant')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(profiles.full_name, excluded.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. PROPERTIES (Recreated with all necessary columns)
create table public.properties (
  id                  uuid primary key default uuid_generate_v4(),
  landlord_id         uuid not null references public.profiles(id) on delete cascade,
  title               text not null,
  property_type       text not null check (property_type in ('house', 'apartment', 'room', 'cottage', 'flat', 'bedsitter', 'townhouse')),
  price               numeric(10,2) not null check (price >= 0),
  deposit             numeric(10,2),
  city                text not null,
  suburb              text not null,
  province            text not null,
  address             text,
  bedrooms            int not null default 1 check (bedrooms >= 0),
  bathrooms           int not null default 1 check (bathrooms >= 0),
  max_occupants       int not null default 1 check (max_occupants >= 1),
  images              text[] not null default '{}',
  amenities           text[] not null default '{}',
  description         text,
  available           boolean not null default true,
  availability_status text default 'available_now' check (availability_status in ('available_now', 'available_from', 'occupied')),
  available_from_date date,
  verified            boolean not null default false,
  rating              numeric(3,2),
  reviews_count       int default 0,
  lat                 numeric(10,7),
  lng                 numeric(10,7),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.properties enable row level security;

drop policy if exists "Anyone can read available properties" on public.properties;
create policy "Anyone can read available properties"
  on public.properties for select using (available = true or landlord_id = auth.uid());

drop policy if exists "Landlords can insert properties" on public.properties;
create policy "Landlords can insert properties"
  on public.properties for insert with check (auth.uid() = landlord_id);

drop policy if exists "Landlords can update own properties" on public.properties;
create policy "Landlords can update own properties"
  on public.properties for update using (auth.uid() = landlord_id);

drop policy if exists "Landlords can delete own properties" on public.properties;
create policy "Landlords can delete own properties"
  on public.properties for delete using (auth.uid() = landlord_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists properties_updated_at on public.properties;
create trigger properties_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

create index if not exists idx_properties_city on public.properties (city);
create index if not exists idx_properties_suburb on public.properties (suburb);
create index if not exists idx_properties_available on public.properties (available) where available = true;


-- 3. SAVED PROPERTIES (FAVORITES)
create table public.saved_properties (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  property_id   uuid not null references public.properties(id) on delete cascade,
  saved_at      timestamptz not null default now(),
  unique (user_id, property_id)
);

alter table public.saved_properties enable row level security;

drop policy if exists "Users manage own saved properties" on public.saved_properties;
create policy "Users manage own saved properties"
  on public.saved_properties for all using (auth.uid() = user_id);


-- 4. VIEWING REQUESTS
create table public.viewing_requests (
  id            uuid primary key default uuid_generate_v4(),
  property_id   uuid not null references public.properties(id) on delete cascade,
  tenant_id     uuid not null references public.profiles(id) on delete cascade,
  landlord_id   uuid references public.profiles(id) on delete cascade,
  viewing_date  date not null,
  viewing_time  time not null,
  attendees     int not null default 1,
  message       text,
  status        text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'paused', 'rejected')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Trigger to auto-fill landlord_id from property
create or replace function public.set_viewing_landlord_id()
returns trigger language plpgsql as $$
begin
  if new.landlord_id is null then
    select landlord_id into new.landlord_id from public.properties where id = new.property_id;
  end if;
  return new;
end;
$$;

drop trigger if exists set_viewing_landlord_trigger on public.viewing_requests;
create trigger set_viewing_landlord_trigger
  before insert on public.viewing_requests
  for each row execute function public.set_viewing_landlord_id();

alter table public.viewing_requests enable row level security;

drop policy if exists "Tenants manage own viewings" on public.viewing_requests;
create policy "Tenants manage own viewings"
  on public.viewing_requests for all using (auth.uid() = tenant_id);

drop policy if exists "Landlords view their property requests" on public.viewing_requests;
create policy "Landlords view their property requests"
  on public.viewing_requests for select using (auth.uid() = landlord_id);

drop policy if exists "Landlords update viewing status" on public.viewing_requests;
create policy "Landlords update viewing status"
  on public.viewing_requests for update using (auth.uid() = landlord_id);

create unique index if not exists viewing_requests_active_slot_unique
  on public.viewing_requests (property_id, viewing_date, viewing_time)
  where status in ('pending', 'confirmed');


-- 5. ACCOMMODATION REQUESTS
create table public.accommodation_requests (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  city              text not null,
  suburb            text,
  province          text not null,
  property_type     text not null default 'any',
  bedrooms          text not null default 'any',
  number_of_people  int not null default 1,
  min_budget        numeric(10,2) not null,
  max_budget        numeric(10,2) not null,
  move_in_date      date not null,
  furnished         text not null default 'any',
  amenities         text[] not null default '{}',
  additional_notes  text,
  status            text not null default 'active' check (status in ('active', 'paused', 'matched', 'closed', 'expired')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.accommodation_requests enable row level security;

drop policy if exists "Users manage own requests" on public.accommodation_requests;
create policy "Users manage own requests"
  on public.accommodation_requests for all using (auth.uid() = user_id);

drop policy if exists "Landlords can read active requests" on public.accommodation_requests;
create policy "Landlords can read active requests"
  on public.accommodation_requests for select using (status = 'active');


-- 6. CONVERSATIONS & MESSAGES
create table public.conversations (
  id                uuid primary key default uuid_generate_v4(),
  tenant_id         uuid not null references public.profiles(id) on delete cascade,
  landlord_id       uuid not null references public.profiles(id) on delete cascade,
  property_id       uuid references public.properties(id) on delete set null,
  last_message      text,
  last_message_at   timestamptz,
  tenant_unread     int not null default 0,
  landlord_unread   int not null default 0,
  created_at        timestamptz not null default now()
);

create unique index if not exists conversations_participants_property_unique
  on public.conversations (tenant_id, landlord_id, property_id) nulls not distinct;

alter table public.conversations enable row level security;

drop policy if exists "Participants can access conversations" on public.conversations;
create policy "Participants can access conversations"
  on public.conversations for all using (auth.uid() = tenant_id or auth.uid() = landlord_id);

create table public.messages (
  id                uuid primary key default uuid_generate_v4(),
  conversation_id   uuid not null references public.conversations(id) on delete cascade,
  sender_id         uuid not null references public.profiles(id) on delete cascade,
  text              text not null,
  read              boolean not null default false,
  type              text default 'text',
  created_at        timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "Conversation participants can access messages" on public.messages;
create policy "Conversation participants can access messages"
  on public.messages for all using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.tenant_id = auth.uid() or c.landlord_id = auth.uid())
    )
  );

create or replace function public.send_chat_message(
  p_conversation_id uuid,
  p_text text
)
returns setof public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.messages%rowtype;
  v_text text := btrim(coalesce(p_text, ''));
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to send a message.';
  end if;

  if v_text = '' or length(v_text) > 5000 then
    raise exception 'Messages must contain between 1 and 5000 characters.';
  end if;

  if not exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and auth.uid() in (c.tenant_id, c.landlord_id)
  ) then
    raise exception 'You are not a participant in this conversation.';
  end if;

  insert into public.messages (conversation_id, sender_id, text)
  values (p_conversation_id, auth.uid(), v_text)
  returning * into v_message;

  update public.conversations c
  set last_message = v_message.text,
      last_message_at = v_message.created_at,
      tenant_unread = c.tenant_unread
        + case when c.tenant_id = auth.uid() then 0 else 1 end,
      landlord_unread = c.landlord_unread
        + case when c.landlord_id = auth.uid() then 0 else 1 end
  where c.id = p_conversation_id;

  return next v_message;
end;
$$;

revoke all on function public.send_chat_message(uuid, text) from public;
grant execute on function public.send_chat_message(uuid, text) to authenticated;


-- 7. REVIEWS
create table public.reviews (
  id            uuid primary key default uuid_generate_v4(),
  property_id   uuid not null references public.properties(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  author_name   text,
  rating        int not null check (rating between 1 and 5),
  text          text,
  created_at    timestamptz not null default now(),
  unique (property_id, author_id)
);

alter table public.reviews enable row level security;

drop policy if exists "Anyone can read reviews" on public.reviews;
create policy "Anyone can read reviews"
  on public.reviews for select using (true);

drop policy if exists "Tenants can write reviews" on public.reviews;
create policy "Tenants can write reviews"
  on public.reviews for insert with check (auth.uid() = author_id);


-- 8. REPORTS
create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  reason text not null check (length(btrim(reason)) between 1 and 200),
  details text check (details is null or length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint reports_target_required check (property_id is not null or reported_user_id is not null)
);

alter table public.reports enable row level security;

drop policy if exists "Users can insert their own reports" on public.reports;
create policy "Users can insert their own reports"
  on public.reports for insert with check (auth.uid() = reporter_id);

drop policy if exists "Users can read their own reports" on public.reports;
create policy "Users can read their own reports"
  on public.reports for select using (auth.uid() = reporter_id);


-- 9. ACCOUNT DELETION RPC
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;


-- 10. STORAGE BUCKET FOR PROPERTY IMAGES
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

drop policy if exists "Public Access for property images" on storage.objects;
create policy "Public Access for property images"
  on storage.objects for select using (bucket_id = 'property-images');

-- Photos are stored as "<user-id>/<uuid>.jpg", so ownership is the first path
-- segment. Without this check any authenticated user could overwrite or delete
-- another landlord's photos.
drop policy if exists "Authenticated users can upload property images" on storage.objects;
drop policy if exists "Authenticated users can update/delete property images" on storage.objects;
drop policy if exists "Authenticated users can delete property images" on storage.objects;
drop policy if exists "Users can upload own property images" on storage.objects;
drop policy if exists "Users can update own property images" on storage.objects;
drop policy if exists "Users can delete own property images" on storage.objects;

create policy "Users can upload own property images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update own property images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete own property images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 11. STORAGE BUCKET FOR USER AVATARS
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Public Access for avatars" on storage.objects;
create policy "Public Access for avatars"
  on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Authenticated users can upload own avatar" on storage.objects;
create policy "Authenticated users can upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Authenticated users can update own avatar" on storage.objects;
create policy "Authenticated users can update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
