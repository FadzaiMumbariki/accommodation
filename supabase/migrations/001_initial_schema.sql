-- ─────────────────────────────────────────────────────────────────────────────
-- ImbaFind — Initial Supabase Schema
-- Run this in the Supabase SQL editor or via the CLI:
--   supabase db push
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension (already available in Supabase)
create extension if not exists "uuid-ossp";

-- ─── profiles ────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  email         text,
  phone         text,
  avatar_url    text,
  role          text not null default 'tenant' check (role in ('tenant', 'landlord')),
  verified      boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'tenant')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── properties ──────────────────────────────────────────────────────────────
create table if not exists properties (
  id                  uuid primary key default uuid_generate_v4(),
  landlord_id         uuid not null references profiles(id) on delete cascade,
  title               text not null,
  property_type       text not null check (property_type in ('house', 'apartment', 'room', 'cottage', 'flat', 'bedsitter')),
  price               numeric(10,2) not null,
  deposit             numeric(10,2),
  city                text not null,
  suburb              text not null,
  province            text not null,
  address             text,
  bedrooms            int not null default 1,
  bathrooms           int not null default 1,
  max_occupants       int not null default 1,
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

alter table properties enable row level security;

create policy "Anyone can read available properties"
  on properties for select using (available = true or landlord_id = auth.uid());

create policy "Landlords can insert properties"
  on properties for insert with check (auth.uid() = landlord_id);

create policy "Landlords can update own properties"
  on properties for update using (auth.uid() = landlord_id);

create policy "Landlords can delete own properties"
  on properties for delete using (auth.uid() = landlord_id);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger properties_updated_at
  before update on properties
  for each row execute function set_updated_at();

-- ─── saved_properties ────────────────────────────────────────────────────────
create table if not exists saved_properties (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references profiles(id) on delete cascade,
  property_id   uuid not null references properties(id) on delete cascade,
  saved_at      timestamptz not null default now(),
  unique (user_id, property_id)
);

alter table saved_properties enable row level security;

create policy "Users manage own saved properties"
  on saved_properties for all using (auth.uid() = user_id);

-- ─── accommodation_requests ──────────────────────────────────────────────────
create table if not exists accommodation_requests (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references profiles(id) on delete cascade,
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

alter table accommodation_requests enable row level security;

create policy "Users manage own requests"
  on accommodation_requests for all using (auth.uid() = user_id);

create policy "Landlords can read active requests"
  on accommodation_requests for select using (status = 'active');

create trigger accommodation_requests_updated_at
  before update on accommodation_requests
  for each row execute function set_updated_at();

-- ─── viewing_requests ────────────────────────────────────────────────────────
create table if not exists viewing_requests (
  id            uuid primary key default uuid_generate_v4(),
  property_id   uuid not null references properties(id) on delete cascade,
  tenant_id     uuid not null references profiles(id) on delete cascade,
  landlord_id   uuid not null references profiles(id) on delete cascade,
  viewing_date  date not null,
  viewing_time  time not null,
  attendees     int not null default 1,
  message       text,
  status        text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'paused', 'rejected')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table viewing_requests enable row level security;

create policy "Tenants manage own viewings"
  on viewing_requests for all using (auth.uid() = tenant_id);

create policy "Landlords can see viewings for their properties"
  on viewing_requests for select using (auth.uid() = landlord_id);

create policy "Landlords can update viewing status"
  on viewing_requests for update using (auth.uid() = landlord_id);

create trigger viewing_requests_updated_at
  before update on viewing_requests
  for each row execute function set_updated_at();

-- ─── conversations ───────────────────────────────────────────────────────────
create table if not exists conversations (
  id                uuid primary key default uuid_generate_v4(),
  tenant_id         uuid not null references profiles(id) on delete cascade,
  landlord_id       uuid not null references profiles(id) on delete cascade,
  property_id       uuid references properties(id) on delete set null,
  last_message      text,
  last_message_at   timestamptz,
  tenant_unread     int not null default 0,
  landlord_unread   int not null default 0,
  created_at        timestamptz not null default now(),
  unique (tenant_id, landlord_id, property_id)
);

alter table conversations enable row level security;

create policy "Participants can access conversations"
  on conversations for all using (auth.uid() = tenant_id or auth.uid() = landlord_id);

-- ─── messages ────────────────────────────────────────────────────────────────
create table if not exists messages (
  id                uuid primary key default uuid_generate_v4(),
  conversation_id   uuid not null references conversations(id) on delete cascade,
  sender_id         uuid not null references profiles(id) on delete cascade,
  text              text not null,
  read              boolean not null default false,
  type              text default 'text',
  created_at        timestamptz not null default now()
);

alter table messages enable row level security;

create policy "Conversation participants can access messages"
  on messages for all using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.tenant_id = auth.uid() or c.landlord_id = auth.uid())
    )
  );

-- ─── reviews ─────────────────────────────────────────────────────────────────
create table if not exists reviews (
  id            uuid primary key default uuid_generate_v4(),
  property_id   uuid not null references properties(id) on delete cascade,
  author_id     uuid not null references profiles(id) on delete cascade,
  author_name   text,
  rating        int not null check (rating between 1 and 5),
  text          text,
  created_at    timestamptz not null default now(),
  unique (property_id, author_id)
);

alter table reviews enable row level security;

create policy "Anyone can read reviews"
  on reviews for select using (true);

create policy "Tenants can write reviews"
  on reviews for insert with check (auth.uid() = author_id);

create policy "Authors can update own reviews"
  on reviews for update using (auth.uid() = author_id);
