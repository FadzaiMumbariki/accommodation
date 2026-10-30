-- 016_push_notifications_hardening.sql
-- Harden push notification triggers: never notify the sender and respect blocked_users

-- 1. Trigger on new chat messages to automatically notify the other participant (if not blocked and not sender)
create or replace function public.trigger_on_new_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient_id uuid;
  v_sender_name text;
begin
  -- Identify recipient from conversation
  select
    case
      when c.tenant_id = new.sender_id then c.landlord_id
      else c.tenant_id
    end into v_recipient_id
  from public.conversations c
  where c.id = new.conversation_id;

  -- Never notify sender, and ensure recipient exists
  if v_recipient_id is null or v_recipient_id = new.sender_id then
    return new;
  end if;

  -- Ensure neither party blocked the other
  if exists (
    select 1 from public.blocked_users
    where (blocker_id = new.sender_id and blocked_id = v_recipient_id)
       or (blocker_id = v_recipient_id and blocked_id = new.sender_id)
  ) then
    return new;
  end if;

  -- Get sender display name
  select coalesce(full_name, 'Someone') into v_sender_name
  from public.profiles
  where id = new.sender_id;

  perform public.notify_recipient(
    v_recipient_id,
    'New message from ' || v_sender_name,
    case
      when length(new.text) > 80 then substring(new.text from 1 for 77) || '...'
      else new.text
    end,
    jsonb_build_object('conversationId', new.conversation_id)
  );

  return new;
end;
$$;

drop trigger if exists on_new_message_notify on public.messages;
create trigger on_new_message_notify
  after insert on public.messages
  for each row execute function public.trigger_on_new_chat_message();

-- 2. Trigger on viewing requests to notify landlord on booking and tenant on confirmation (respecting blocks & sender)
create or replace function public.trigger_on_viewing_request_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_title text;
  v_landlord_id uuid;
  v_recipient_id uuid;
begin
  select title, landlord_id into v_property_title, v_landlord_id
  from public.properties
  where id = new.property_id;

  if tg_op = 'INSERT' then
    v_recipient_id := coalesce(new.landlord_id, v_landlord_id);

    -- Never notify sender (e.g. if landlord books own listing)
    if v_recipient_id is not null and v_recipient_id != new.tenant_id then
      -- Check blocked
      if not exists (
        select 1 from public.blocked_users
        where (blocker_id = new.tenant_id and blocked_id = v_recipient_id)
           or (blocker_id = v_recipient_id and blocked_id = new.tenant_id)
      ) then
        perform public.notify_recipient(
          v_recipient_id,
          'New Viewing Request',
          'A tenant requested to view "' || coalesce(v_property_title, 'your listing') || '" on ' || new.viewing_date || ' at ' || new.viewing_time,
          jsonb_build_object('viewingId', new.id)
        );
      end if;
    end if;

  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    v_recipient_id := new.tenant_id;
    v_landlord_id := coalesce(new.landlord_id, v_landlord_id);

    -- Never notify if recipient is the landlord
    if v_recipient_id is not null and v_recipient_id != v_landlord_id then
      -- Check blocked
      if not exists (
        select 1 from public.blocked_users
        where (blocker_id = v_landlord_id and blocked_id = v_recipient_id)
           or (blocker_id = v_recipient_id and blocked_id = v_landlord_id)
      ) then
        perform public.notify_recipient(
          v_recipient_id,
          'Viewing ' || initcap(new.status),
          'Your viewing request for "' || coalesce(v_property_title, 'the property') || '" has been ' || new.status,
          jsonb_build_object('viewingId', new.id)
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_viewing_request_notify on public.viewing_requests;
create trigger on_viewing_request_notify
  after insert or update on public.viewing_requests
  for each row execute function public.trigger_on_viewing_request_update();
