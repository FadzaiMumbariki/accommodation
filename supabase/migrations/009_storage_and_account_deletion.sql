-- ─────────────────────────────────────────────────────────────────────────────
-- ImbaFind — Storage Buckets & Account Deletion RPC
-- Ensures property-images and avatars storage buckets exist with secure RLS,
-- and provisions the delete_my_account RPC for GDPR/privacy compliance.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Account Deletion RPC
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

-- 2. Storage Buckets: property-images & avatars
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3. Storage Policies: property-images
drop policy if exists "Public Access for property images" on storage.objects;
create policy "Public Access for property images"
  on storage.objects for select
  using (bucket_id = 'property-images');

drop policy if exists "Users can upload own property images" on storage.objects;
create policy "Users can upload own property images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can update own property images" on storage.objects;
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

drop policy if exists "Users can delete own property images" on storage.objects;
create policy "Users can delete own property images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 4. Storage Policies: avatars
drop policy if exists "Public Access for avatars" on storage.objects;
create policy "Public Access for avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

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

drop policy if exists "Authenticated users can delete own avatar" on storage.objects;
create policy "Authenticated users can delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
