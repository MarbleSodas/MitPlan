-- Record a caller's own shared-plan access without exposing the row's other
-- viewer IDs. The JSON compatibility table stores all viewers in one row, so
-- a normal nested client read would disclose more data than Firebase did.

create or replace function public.track_plan_share_view_access(p_view_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_uid_text text := auth.uid()::text;
  v_share jsonb;
  v_tracking jsonb;
  v_existing jsonb;
  v_viewer jsonb;
  v_plan_id text;
  v_access_count integer;
  v_now bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  if v_uid is null then
    raise exception 'You must be signed in to record a shared plan view.' using errcode = '42501';
  end if;

  select data into v_share
  from public.app_documents
  where collection = 'planShareViews' and key = p_view_token;

  if v_share is null or not coalesce((v_share ->> 'viewEnabled')::boolean, false) then
    raise exception 'This shared plan view is unavailable.' using errcode = '42501';
  end if;

  v_plan_id := v_share ->> 'planId';
  select data into v_tracking
  from public.app_documents
  where collection = 'planShareViewTracking' and key = p_view_token
  for update;

  v_tracking := coalesce(v_tracking, '{}'::jsonb);
  v_existing := v_tracking #> array['viewers', v_uid_text];
  v_access_count := coalesce((v_existing ->> 'accessCount')::integer, 0) + 1;
  v_viewer := jsonb_build_object(
    'firstViewedAt', coalesce(v_existing -> 'firstViewedAt', to_jsonb(v_now)),
    'lastViewedAt', v_now,
    'accessCount', v_access_count
  );
  v_tracking := public.app_jsonb_set_deep(
    v_tracking,
    array['viewers', v_uid_text],
    v_viewer
  );

  insert into public.app_documents (collection, key, data, updated_at)
  values ('planShareViewTracking', p_view_token, v_tracking, now())
  on conflict (collection, key) do update
    set data = excluded.data, updated_at = excluded.updated_at;

  return jsonb_build_object(
    'planId', v_plan_id,
    'accessCount', v_access_count,
    'firstViewedAt', v_viewer -> 'firstViewedAt',
    'lastViewedAt', v_now
  );
end;
$$;

revoke all on function public.track_plan_share_view_access(text) from public, anon;
grant execute on function public.track_plan_share_view_access(text) to authenticated;
