-- ─────────────────────────────────────────────────────────────────────────────
-- ImbaFind — Landlord Verification Document Submission & Queue
-- Allows landlords to submit ID / proof of ownership documents for admin review.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.verification_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null check (document_type in ('national_id', 'passport', 'title_deed', 'utility_bill', 'management_mandate')),
  document_url text not null,
  document_notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.verification_requests enable row level security;

drop policy if exists "Users can view own verification requests" on public.verification_requests;
create policy "Users can view own verification requests"
  on public.verification_requests for select
  using (auth.uid() = user_id or (select coalesce(is_admin, false) from public.profiles where id = auth.uid()));

drop policy if exists "Users can submit own verification requests" on public.verification_requests;
create policy "Users can submit own verification requests"
  on public.verification_requests for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and admin_notes is null
  );

drop policy if exists "Admins can update verification requests" on public.verification_requests;
create policy "Admins can update verification requests"
  on public.verification_requests for update
  using ((select coalesce(is_admin, false) from public.profiles where id = auth.uid()))
  with check ((select coalesce(is_admin, false) from public.profiles where id = auth.uid()));

drop policy if exists "Admins can delete verification requests" on public.verification_requests;
create policy "Admins can delete verification requests"
  on public.verification_requests for delete
  using ((select coalesce(is_admin, false) from public.profiles where id = auth.uid()));
