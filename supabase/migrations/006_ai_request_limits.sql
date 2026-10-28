create table if not exists public.ai_usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (
    feature in ('ai-search', 'ai-describe', 'ai-match', 'ai-trust')
  ),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_user_created_idx
  on public.ai_usage_events (user_id, created_at);

alter table public.ai_usage_events enable row level security;
revoke all on table public.ai_usage_events from public, anon, authenticated;

create or replace function public.consume_ai_request(p_feature text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_count integer;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then
    raise exception 'You must be signed in to use AI features.';
  end if;

  if p_feature is null or p_feature not in ('ai-search', 'ai-describe', 'ai-match', 'ai-trust') then
    raise exception 'Invalid AI feature.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  delete from public.ai_usage_events
  where user_id = v_user_id
    and created_at <= v_now - interval '1 hour';

  select count(*) into v_request_count
  from public.ai_usage_events
  where user_id = v_user_id
    and created_at > v_now - interval '1 hour';

  if v_request_count >= 30 then
    return false;
  end if;

  insert into public.ai_usage_events (user_id, feature, created_at)
  values (v_user_id, p_feature, v_now);

  return true;
end;
$$;

revoke all on function public.consume_ai_request(text) from public, anon;
grant execute on function public.consume_ai_request(text) to authenticated;
