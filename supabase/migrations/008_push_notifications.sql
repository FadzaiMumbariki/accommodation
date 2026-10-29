-- ─────────────────────────────────────────────────────────────────────────────
-- ImbaFind — Push Notification Trigger Pipeline
-- Enables automated push notification delivery on chat messages & viewing status.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Helper function to invoke the push-notify Edge Function or log event
create or replace function public.notify_recipient(
  p_recipient_id uuid,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_push_token text;
begin
  select push_token into v_push_token
  from public.profiles
  where id = p_recipient_id;

  -- Only attempt if recipient has a registered Expo token
  if v_push_token is null or v_push_token = '' then
    return;
  end if;

  -- If pg_net extension is enabled, dispatch HTTP request asynchronously to Expo
  if exists (select 1 from pg_extension where extname = 'pg_net') then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Accept', 'application/json'
      ),
      body := jsonb_build_object(
        'to', v_push_token,
        'title', p_title,
        'body', p_body,
        'data', p_data,
        'sound', 'default',
        'channelId', 'default'
      )
    );
  end if;
end;
$$;

-- 2. Trigger on new chat messages to automatically notify the other participant
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

  -- Get sender display name
  select coalesce(full_name, 'Someone') into v_sender_name
  from public.profiles
  where id = new.sender_id;

  if v_recipient_id is not null then
    perform public.notify_recipient(
      v_recipient_id,
      'New message from ' || v_sender_name,
      case
        when length(new.text) > 80 then substring(new.text from 1 for 77) || '...'
        else new.text
      end,
      jsonb_build_object('conversationId', new.conversation_id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_new_message_notify on public.messages;
create trigger on_new_message_notify
  after insert on public.messages
  for each row execute function public.trigger_on_new_chat_message();

-- 3. Trigger on viewing requests to notify landlord on booking and tenant on confirmation
create or replace function public.trigger_on_viewing_request_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_title text;
  v_landlord_id uuid;
begin
  select title, landlord_id into v_property_title, v_landlord_id
  from public.properties
  where id = new.property_id;

  if tg_op = 'INSERT' then
    -- Notify landlord of new request
    perform public.notify_recipient(
      coalesce(new.landlord_id, v_landlord_id),
      'New Viewing Request',
      'A tenant requested to view "' || coalesce(v_property_title, 'your listing') || '" on ' || new.viewing_date || ' at ' || new.viewing_time,
      jsonb_build_object('viewingId', new.id)
    );
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    -- Notify tenant of status change
    perform public.notify_recipient(
      new.tenant_id,
      'Viewing ' || initcap(new.status),
      'Your viewing request for "' || coalesce(v_property_title, 'the property') || '" has been ' || new.status,
      jsonb_build_object('viewingId', new.id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_viewing_request_notify on public.viewing_requests;
create trigger on_viewing_request_notify
  after insert or update on public.viewing_requests
  for each row execute function public.trigger_on_viewing_request_update();
