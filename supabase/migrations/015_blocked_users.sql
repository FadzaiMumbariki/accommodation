-- 015_blocked_users.sql
-- Create blocked_users table and prevent blocked users from sending messages

create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocked_users_no_self_block check (blocker_id != blocked_id)
);

create index if not exists idx_blocked_users_blocked_id on public.blocked_users(blocked_id);

alter table public.blocked_users enable row level security;

-- Drop old policies if they exist for idempotency
drop policy if exists "Users can view blocks they created or where they are blocked" on public.blocked_users;
drop policy if exists "Users can block other users" on public.blocked_users;
drop policy if exists "Users can unblock users they blocked" on public.blocked_users;

create policy "Users can view blocks they created or where they are blocked"
  on public.blocked_users for select
  to authenticated
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

create policy "Users can block other users"
  on public.blocked_users for insert
  to authenticated
  with check (auth.uid() = blocker_id);

create policy "Users can unblock users they blocked"
  on public.blocked_users for delete
  to authenticated
  using (auth.uid() = blocker_id);

-- Update send_chat_message to check if either party is blocked
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
  v_conv public.conversations%rowtype;
  v_recipient uuid;
  v_demo_landlord constant uuid := '00000000-0000-0000-0000-000000000001';
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to send a message.';
  end if;

  if v_text = '' or length(v_text) > 5000 then
    raise exception 'Messages must contain between 1 and 5000 characters.';
  end if;

  select * into v_conv
  from public.conversations c
  where c.id = p_conversation_id
    and auth.uid() in (c.tenant_id, c.landlord_id);

  if not found then
    raise exception 'You are not a participant in this conversation.';
  end if;

  -- Determine other participant
  v_recipient := case when v_conv.tenant_id = auth.uid() then v_conv.landlord_id else v_conv.tenant_id end;

  -- Check if either party has blocked the other
  if exists (
    select 1 from public.blocked_users
    where (blocker_id = auth.uid() and blocked_id = v_recipient)
       or (blocker_id = v_recipient and blocked_id = auth.uid())
  ) then
    raise exception 'Cannot send message to this user.';
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

  -- The demo landlord has no real account, so answer on their behalf (clearly labelled).
  if v_conv.landlord_id = v_demo_landlord and auth.uid() = v_conv.tenant_id then
    declare
      v_reply text := public.demo_landlord_reply(v_text, v_conv.property_id);
      v_reply_at timestamptz := v_message.created_at + interval '1 second';
    begin
      insert into public.messages (conversation_id, sender_id, text, created_at)
      values (p_conversation_id, v_demo_landlord, v_reply, v_reply_at);

      update public.conversations c
      set last_message = v_reply,
          last_message_at = v_reply_at,
          tenant_unread = c.tenant_unread + 1
      where c.id = p_conversation_id;
    end;
  end if;

  return next v_message;
end;
$$;

revoke all on function public.send_chat_message(uuid, text) from public;
grant execute on function public.send_chat_message(uuid, text) to authenticated;
