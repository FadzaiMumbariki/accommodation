-- ─────────────────────────────────────────────────────────────────────────────
-- 019: Fix infinite recursion in public.profiles update RLS policy
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 017 added a subquery in "Users can update own profile" WITH CHECK:
--   verified = (select p.verified from public.profiles p where p.id = auth.uid())
-- Querying public.profiles inside the profiles UPDATE policy caused:
--   ERROR: 42P17: infinite recursion detected in policy for relation "profiles"
--
-- Note that protection of privileged columns is already strictly enforced by:
--   1. Column-level permissions: revoke update (is_admin, verified) on public.profiles
--   2. Before update trigger: trg_protect_privileged_profile_columns
--
-- Therefore, simplifying the policy to (auth.uid() = id) eliminates 42P17 recursion
-- while maintaining complete security against unauthorized privilege escalation.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
