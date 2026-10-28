-- ─────────────────────────────────────────────────────────────────────────────
-- ImbaFind — Admin-controlled verified badges (Phase 1 proposal gap)
-- Adds an `is_admin` capability (independent of the tenant/landlord role) and
-- security-definer RPCs so verification staff can mark listings and landlords as
-- verified. Applying this is additive and safe for existing data.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Admin capability, kept separate from `role` so an admin is still a normal user.
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2. Helper: is the current caller a verification admin?
create or replace function public.is_imba_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin
  );
$$;

-- 3. Admins need to read every listing and profile to build the verification queue,
--    including properties that are not currently available.
drop policy if exists "Admins can read all properties" on public.properties;
create policy "Admins can read all properties"
  on public.properties for select
  using (public.is_imba_admin());

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_imba_admin());

-- 4. Verification RPCs. Security definer so the write bypasses the normal
--    landlord-only update policy, but the admin check runs inside.
create or replace function public.admin_set_property_verified(
  p_property_id uuid,
  p_verified boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_imba_admin() then
    raise exception 'Only ImbaFind admins can verify listings.';
  end if;

  update public.properties
    set verified = p_verified
    where id = p_property_id;

  if not found then
    raise exception 'Property % was not found.', p_property_id;
  end if;
end;
$$;

create or replace function public.admin_set_user_verified(
  p_user_id uuid,
  p_verified boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_imba_admin() then
    raise exception 'Only ImbaFind admins can verify landlords.';
  end if;

  update public.profiles
    set verified = p_verified
    where id = p_user_id;

  if not found then
    raise exception 'Profile % was not found.', p_user_id;
  end if;
end;
$$;

revoke all on function public.admin_set_property_verified(uuid, boolean) from public;
revoke all on function public.admin_set_user_verified(uuid, boolean) from public;
grant execute on function public.admin_set_property_verified(uuid, boolean) to authenticated;
grant execute on function public.admin_set_user_verified(uuid, boolean) to authenticated;

-- 5. Promote the marketplace owner to admin. Change the email or run a similar
--    statement to grant the role to other verification staff.
update public.profiles
  set is_admin = true
  where lower(email) = 'fadzaimumbariki@gmail.com';
