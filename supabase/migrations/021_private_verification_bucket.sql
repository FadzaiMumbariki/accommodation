-- ─────────────────────────────────────────────────────────────────────────────
-- ImbaFind — Private Storage Bucket for Landlord Verification Documents
-- Documents (ID cards, passports, title deeds) are private and confidential.
-- Only the owner and verified admins can read/delete them.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create private storage bucket
insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do update set public = false;

-- 2. Landlord upload policy
drop policy if exists "Users can upload own verification documents" on storage.objects;
create policy "Users can upload own verification documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 3. Access policy (Landlords view own, Admins view all via signed URLs)
drop policy if exists "Users and admins can view verification documents" on storage.objects;
create policy "Users and admins can view verification documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-documents'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select coalesce(is_admin, false) from public.profiles where id = auth.uid())
    )
  );

-- 4. Deletion policy (Users can delete own, Admins can delete after decision)
drop policy if exists "Users and admins can delete verification documents" on storage.objects;
create policy "Users and admins can delete verification documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'verification-documents'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select coalesce(is_admin, false) from public.profiles where id = auth.uid())
    )
  );
