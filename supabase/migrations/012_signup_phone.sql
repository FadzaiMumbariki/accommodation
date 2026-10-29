-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 012: Save the phone number entered at sign-up
-- The app sends `phone` in the sign-up metadata, but handle_new_user never
-- copied it into public.profiles. Same as migration 011, plus phone.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_full_name text;
  v_avatar_url text;
  v_phone text;
  v_role text;
begin
  -- Resolve full name from Google metadata ('name' or 'full_name') or email fallback
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- Resolve avatar from Google metadata ('avatar_url' or 'picture')
  v_avatar_url := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  v_phone := nullif(trim(new.raw_user_meta_data->>'phone'), '');

  -- Resolve role (default 'tenant')
  v_role := coalesce(new.raw_user_meta_data->>'role', 'tenant');
  if v_role not in ('tenant', 'landlord') then
    v_role := 'tenant';
  end if;

  insert into public.profiles (id, full_name, email, phone, avatar_url, role)
  values (new.id, v_full_name, new.email, v_phone, v_avatar_url, v_role)
  on conflict (id) do update set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    phone = coalesce(public.profiles.phone, excluded.phone),
    email = coalesce(public.profiles.email, excluded.email);

  return new;
exception
  when others then
    -- Never block authentication even if profile insertion encounters an unexpected issue
    raise warning 'handle_new_user profile creation warning for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill phones for accounts created before this migration
update public.profiles p
set phone = nullif(trim(u.raw_user_meta_data->>'phone'), '')
from auth.users u
where u.id = p.id
  and p.phone is null
  and nullif(trim(u.raw_user_meta_data->>'phone'), '') is not null;
