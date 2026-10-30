-- ─────────────────────────────────────────────────────────────────────────────
-- 013: Protect privileged columns (profiles.is_admin, profiles.verified, properties.verified)
-- Prevents signed-in non-admin users from escalating privileges or self-verifying,
-- and ensures newly created property listings always start unverified.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Helper: ensure is_imba_admin exists
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

-- 2. Trigger function to protect profiles.is_admin and profiles.verified
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

  -- On UPDATE, signed-in non-admins cannot change is_admin or verified
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

-- 3. Trigger function to protect properties.verified
create or replace function public.protect_privileged_property_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- New listings always start unverified
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not public.is_imba_admin() then
      new.verified := false;
    else
      -- Even for admins, default to unverified unless explicitly set
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
