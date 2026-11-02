-- ─────────────────────────────────────────────────────────────────────────────
-- 017: Admin and security hardening
-- Prevents signed-in users from self-promoting to is_admin or verified,
-- restricts column-level privileges, and tightens RLS policies.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Helper: check if caller is an administrator
create or replace function public.is_imba_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  );
$$;

-- 2. Revoke direct column updates from unprivileged roles at database level
revoke update (is_admin, verified) on public.profiles from authenticated;
revoke update (is_admin, verified) on public.profiles from anon;
revoke update (verified) on public.properties from authenticated;
revoke update (verified) on public.properties from anon;

-- 3. Hardened trigger for profiles
create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- On INSERT, non-admins cannot self-promote to admin or verified
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not public.is_imba_admin() then
      new.is_admin := false;
      new.verified := false;
    end if;
    return new;
  end if;

  -- On UPDATE, non-admins cannot change is_admin or verified
  if tg_op = 'UPDATE' then
    if auth.uid() is not null and not public.is_imba_admin() then
      if new.is_admin is distinct from old.is_admin then
        raise exception 'Only administrators can modify is_admin status.';
      end if;
      if new.verified is distinct from old.verified then
        raise exception 'Only administrators can modify verified status.';
      end if;
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_privileged_profile_columns on public.profiles;
create trigger trg_protect_privileged_profile_columns
  before insert or update on public.profiles
  for each row execute function public.protect_privileged_profile_columns();

-- 4. Hardened trigger for properties
create or replace function public.protect_privileged_property_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- New listings always start unverified unless verified by admin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not public.is_imba_admin() then
      new.verified := false;
    else
      new.verified := coalesce(new.verified, false);
    end if;
    return new;
  end if;

  -- Updates: prevent non-admins from changing verified status
  if tg_op = 'UPDATE' then
    if auth.uid() is not null and not public.is_imba_admin() then
      if new.verified is distinct from old.verified then
        raise exception 'Only administrators can modify property verification status.';
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

-- 5. Tighten RLS update policy on public.profiles
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and (
      public.is_imba_admin()
      or (
        coalesce(is_admin, false) = false
        and verified = (select p.verified from public.profiles p where p.id = auth.uid())
      )
    )
  );
