-- Chat support, viewing conflict protection, and private user reports.

-- PostgreSQL's default unique constraints treat NULL values as distinct, so
-- property-less conversations need NULLS NOT DISTINCT to prevent duplicates.
alter table public.conversations
  drop constraint if exists conversations_tenant_id_landlord_id_property_id_key;

create unique index if not exists conversations_participants_property_unique
  on public.conversations (tenant_id, landlord_id, property_id) nulls not distinct;

drop policy if exists "Chat participants can read participant profiles" on public.profiles;
create policy "Chat participants can read participant profiles"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.conversations c
      where (c.tenant_id = profiles.id or c.landlord_id = profiles.id)
        and (c.tenant_id = auth.uid() or c.landlord_id = auth.uid())
    )
  );

create or replace function public.send_chat_message(
  p_conversation_id uuid,
  p_text text
)
returns setof public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.messages%rowtype;
  v_text text := btrim(coalesce(p_text, ''));
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to send a message.';
  end if;

  if v_text = '' or length(v_text) > 5000 then
    raise exception 'Messages must contain between 1 and 5000 characters.';
  end if;

  if not exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and auth.uid() in (c.tenant_id, c.landlord_id)
  ) then
    raise exception 'You are not a participant in this conversation.';
  end if;

  insert into public.messages (conversation_id, sender_id, text)
  values (p_conversation_id, auth.uid(), v_text)
  returning * into v_message;

  update public.conversations c
  set last_message = v_message.text,
      last_message_at = v_message.created_at,
      tenant_unread = c.tenant_unread
        + case when c.tenant_id = auth.uid() then 0 else 1 end,
      landlord_unread = c.landlord_unread
        + case when c.landlord_id = auth.uid() then 0 else 1 end
  where c.id = p_conversation_id;

  return next v_message;
end;
$$;

revoke all on function public.send_chat_message(uuid, text) from public;
grant execute on function public.send_chat_message(uuid, text) to authenticated;

create unique index if not exists viewing_requests_active_slot_unique
  on public.viewing_requests (property_id, viewing_date, viewing_time)
  where status in ('pending', 'confirmed');

create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  reason text not null check (length(btrim(reason)) between 1 and 200),
  details text check (details is null or length(details) <= 1000),
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint reports_target_required
    check (property_id is not null or reported_user_id is not null)
);

alter table public.reports enable row level security;

drop policy if exists "Users can insert their own reports" on public.reports;
create policy "Users can insert their own reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "Users can read their own reports" on public.reports;
create policy "Users can read their own reports"
  on public.reports for select
  using (auth.uid() = reporter_id);
