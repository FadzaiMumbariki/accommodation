-- Scope property-image writes to the owner's own folder.
--
-- Previously every authenticated user could update or delete any object in the
-- `property-images` bucket, so one landlord could wipe another's photos.
-- Uploads are stored as "<user-id>/<uuid>.jpg" (see uploadPropertyImage in
-- lib/database.ts), so the folder name is the owner.
--
-- Safe to run repeatedly. Run this on projects created before the fix; fresh
-- projects already get it from supabase/setup_complete.sql.

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
