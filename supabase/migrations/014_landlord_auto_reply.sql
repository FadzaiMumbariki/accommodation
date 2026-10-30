-- 014: live chat replies + clearly-labelled automated replies for the demo landlord.
--
-- Why messages got no reply:
--   * Listings seeded by seed_properties.sql belong to a placeholder landlord profile that
--     nobody can log in as, so nobody ever answers.
--   * The messages table may not be in the Realtime publication, so even a real landlord's
--     reply would not appear until the chat is reopened.

-- 1. Make sure new messages are pushed live to the app.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- 2. Build an automated answer from the listing's real data (never invents facts).
create or replace function public.demo_landlord_reply(p_text text, p_property_id uuid)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_text text := lower(coalesce(p_text, ''));
  v_prop public.properties%rowtype;
  v_body text;
begin
  select * into v_prop from public.properties where id = p_property_id;

  if v_text ~ '\y(hello|hi|hey|howzit|good (morning|afternoon|evening))\y' then
    v_body := 'Hello! Thanks for your interest. Ask me about the rent, deposit, availability, location or viewings.';
  elsif v_text ~ '\y(thanks|thank you|cheers|appreciate)\y' then
    v_body := 'You''re welcome! Let me know if you have any other questions.';
  elsif v_prop.id is not null and v_text ~ '(deposit)' then
    v_body := format('The deposit for this listing is $%s.', v_prop.deposit);
  elsif v_prop.id is not null and v_text ~ '(rent|price|cost|how much|monthly|per month)' then
    v_body := format('Rent is $%s per month%s.', v_prop.price,
                     case when v_prop.deposit is not null then format(', with a $%s deposit', v_prop.deposit) else '' end);
  elsif v_prop.id is not null and v_text ~ '(available|vacant|taken|occupied)' then
    v_body := case when v_prop.available
                then 'This listing is currently marked as available. You can book a viewing from the property page.'
                else 'This listing is currently marked as not available.' end;
  elsif v_prop.id is not null and v_text ~ '(where|location|address|suburb|area|near)' then
    v_body := format('%s is in %s, %s. The map on the property page shows the location.',
                     v_prop.title, v_prop.suburb, v_prop.city);
  elsif v_prop.id is not null and v_text ~ '(bedroom|bathroom|rooms?\y|size)' then
    v_body := format('%s has %s bedroom(s) and %s bathroom(s).', v_prop.title, v_prop.bedrooms, v_prop.bathrooms);
  elsif v_text ~ '(view|visit|tour|see the)' then
    v_body := 'You can request a viewing from the property page by choosing a date and time.';
  else
    v_body := 'Thanks for your message. For details I can''t answer here, please check the property page or ask about rent, deposit, availability, location or viewings.';
  end if;

  return 'Automated reply: ' || v_body;
end;
$$;

-- 3. Same send function as before, plus an automated reply when the landlord is the demo profile.
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
