-- ─────────────────────────────────────────────────────────────────────────────
-- 018: Database Security Hardening
-- Closes critical database vulnerabilities:
-- 1. Chat impersonation (drop "for all" policy; allow sending ONLY via send_chat_message)
-- 2. Tenant listings (require role = 'landlord' to insert properties)
-- 3. Forged viewings (trigger enforces landlord from property & forces status to 'pending')
-- 4. Fake ratings (block direct changes to rating and reviews_count; auto-calculate from reviews)
-- 5. Safe profile access (allow signed-in users to read name, avatar, phone, role, verified; never email or push_token)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Fix Chat Impersonation ────────────────────────────────────────────────
-- Drop the permissive "for all" policy from 001 that allowed arbitrary inserts/updates
drop policy if exists "Conversation participants can access messages" on public.messages;
drop policy if exists "Conversation participants can read messages" on public.messages;
drop policy if exists "Recipients can mark messages as read" on public.messages;

-- Reading messages: only conversation participants
create policy "Conversation participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.tenant_id = auth.uid() or c.landlord_id = auth.uid())
    )
  );

-- Updating messages: only recipients can mark messages as read
create policy "Recipients can mark messages as read"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.tenant_id = auth.uid() or c.landlord_id = auth.uid())
    )
    and sender_id != auth.uid()
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.tenant_id = auth.uid() or c.landlord_id = auth.uid())
    )
    and sender_id != auth.uid()
  );

-- Direct client inserts into messages are prohibited;
-- sending messages is strictly enforced through the send_chat_message() RPC.
revoke insert on public.messages from authenticated, anon, public;


-- ── 2. Block Tenant Listings ─────────────────────────────────────────────────
-- Only users with profile role = 'landlord' can insert property listings
drop policy if exists "Landlords can insert properties" on public.properties;
create policy "Landlords can insert properties"
  on public.properties for insert
  with check (
    auth.uid() = landlord_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'landlord'
    )
  );


-- ── 3. Block Forged Viewings ─────────────────────────────────────────────────
-- Trigger function that sets landlord from the property and forces initial status to 'pending'
create or replace function public.enforce_viewing_request_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prop_landlord_id uuid;
begin
  -- Enforce tenant is the authenticated caller
  if auth.uid() is not null then
    new.tenant_id := auth.uid();
  end if;

  -- Resolve real landlord_id from the property
  select landlord_id into prop_landlord_id
  from public.properties
  where id = new.property_id;

  if prop_landlord_id is null then
    raise exception 'Property does not exist or has no landlord assigned.';
  end if;

  -- Block landlord from booking viewing on own property
  if new.tenant_id = prop_landlord_id then
    raise exception 'Cannot book a viewing for your own listing.';
  end if;

  -- Set true landlord and force pending status
  new.landlord_id := prop_landlord_id;
  new.status := 'pending';

  return new;
end;
$$;

drop trigger if exists trg_enforce_viewing_request_integrity on public.viewing_requests;
create trigger trg_enforce_viewing_request_integrity
  before insert on public.viewing_requests
  for each row execute function public.enforce_viewing_request_integrity();

-- Separate tenant policies on viewing_requests so tenants cannot forge 'confirmed' status
drop policy if exists "Tenants manage own viewings" on public.viewing_requests;
drop policy if exists "Tenants can read own viewings" on public.viewing_requests;
drop policy if exists "Tenants can insert own viewings" on public.viewing_requests;
drop policy if exists "Tenants can update own viewings" on public.viewing_requests;

create policy "Tenants can read own viewings"
  on public.viewing_requests for select
  using (auth.uid() = tenant_id);

create policy "Tenants can insert own viewings"
  on public.viewing_requests for insert
  with check (auth.uid() = tenant_id);

create policy "Tenants can update own viewings"
  on public.viewing_requests for update
  using (auth.uid() = tenant_id)
  with check (
    auth.uid() = tenant_id
    and status in ('pending', 'cancelled')
  );


-- ── 4. Block Fake Ratings and Auto-Recalculate ────────────────────────────────
-- Revoke column-level updates on rating and reviews_count from client roles
revoke update (rating, reviews_count) on public.properties from authenticated, anon, public;

-- Update the property column protection trigger to prevent fake ratings
create or replace function public.protect_privileged_property_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- On INSERT, new listings must start unverified with zero ratings
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not public.is_imba_admin() then
      new.verified := false;
    else
      new.verified := coalesce(new.verified, false);
    end if;

    new.rating := 0.00;
    new.reviews_count := 0;
    return new;
  end if;

  -- On UPDATE, prevent direct client tampering with verified, rating, or reviews_count
  if tg_op = 'UPDATE' then
    if auth.uid() is not null and not public.is_imba_admin() then
      if new.verified is distinct from old.verified then
        raise exception 'Only administrators can modify property verification status.';
      end if;

      -- Allow rating / reviews_count update only when invoked via internal triggers (pg_trigger_depth > 1)
      if pg_trigger_depth() <= 1 then
        if new.rating is distinct from old.rating then
          raise exception 'Property rating cannot be manually modified.';
        end if;
        if new.reviews_count is distinct from old.reviews_count then
          raise exception 'Property reviews count cannot be manually modified.';
        end if;
      end if;
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_privileged_property_columns on public.properties;
create trigger trg_protect_privileged_property_columns
  before insert or update on public.properties
  for each row execute function public.protect_privileged_property_columns();

-- Auto-recalculate average rating and review count from reviews table
create or replace function public.recalculate_property_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  avg_val numeric(3,2);
  cnt int;
begin
  target_id := coalesce(new.property_id, old.property_id);

  select coalesce(round(avg(rating)::numeric, 2), 0.00), count(*)
  into avg_val, cnt
  from public.reviews
  where property_id = target_id;

  update public.properties
  set rating = avg_val,
      reviews_count = cnt
  where id = target_id;

  return null;
end;
$$;

drop trigger if exists trg_recalculate_property_rating on public.reviews;
create trigger trg_recalculate_property_rating
  after insert or update or delete on public.reviews
  for each row execute function public.recalculate_property_rating();


-- ── 5. Safe Profile Access (Landlord details on listings) ────────────────────
-- Allow signed-in users to view profile details required for listings, chats, and viewings
drop policy if exists "Authenticated users can view public profile details" on public.profiles;
create policy "Authenticated users can view public profile details"
  on public.profiles for select
  to authenticated
  using (true);

-- Restrict columns: grant SELECT only on safe public fields, never email or push_token
revoke select on public.profiles from authenticated, anon, public;
grant select (id, full_name, avatar_url, phone, role, verified, is_admin, created_at, updated_at)
  on public.profiles to authenticated, anon;
