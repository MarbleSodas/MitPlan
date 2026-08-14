-- Public timelines accept likes from authenticated users, but their content
-- remains owner-managed. Use a narrow RPC for the like mutation and remove
-- the previous row-wide public write exception.

create or replace function public.app_is_plan_owner(p_plan_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.app_documents d
    where d.collection = 'plans'
      and d.key = p_plan_key
      and (d.data ->> 'ownerId' = auth.uid()::text or d.data ->> 'userId' = auth.uid()::text)
  )
$$;

revoke all on function public.app_is_plan_owner(text) from public, anon, authenticated;

create or replace function public.app_can_write_document(
  p_collection text,
  p_key text,
  p_data jsonb
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid text := auth.uid()::text;
  v_plan_key text;
  v_share jsonb;
  v_timeline jsonb;
begin
  if v_uid is null then
    return false;
  end if;

  case p_collection
    when 'userProfiles', 'userCollections' then
      return p_key = v_uid;
    when 'plans' then
      return (not exists (
          select 1 from public.app_documents d
          where d.collection = 'plans' and d.key = p_key
        ) and (p_data ->> 'ownerId' = v_uid or p_data ->> 'userId' = v_uid))
        or public.app_has_plan_access(p_key, true);
    when 'planCollaboration' then
      v_plan_key := case when p_key like 'plan:%' then substring(p_key from 6) else p_key end;
      return public.app_has_plan_access(v_plan_key, true);
    when 'planSnapshots' then
      return public.app_has_plan_access(p_key, true);
    when 'planShareViews' then
      return public.app_is_plan_owner(p_data ->> 'planId');
    when 'planShareViewTracking' then
      select d.data into v_share
      from public.app_documents d
      where d.collection = 'planShareViews' and d.key = p_key;
      return public.app_is_plan_owner(v_share ->> 'planId');
    when 'timelines' then
      select d.data into v_timeline
      from public.app_documents d
      where d.collection = 'timelines' and d.key = p_key;
      if v_timeline is null then
        return p_data ->> 'ownerId' = v_uid or p_data ->> 'userId' = v_uid;
      end if;
      return v_timeline ->> 'ownerId' = v_uid or v_timeline ->> 'userId' = v_uid;
    when 'planCollaborationsByUser' then
      return true;
    else
      return false;
  end case;
end;
$$;

create or replace function public.toggle_timeline_like(p_timeline_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_uid_text text := auth.uid()::text;
  v_timeline jsonb;
  v_liked_by jsonb;
  v_liked boolean;
  v_like_count integer;
  v_now bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  if v_uid is null then
    raise exception 'You must be signed in to like a timeline.' using errcode = '42501';
  end if;

  select data into v_timeline
  from public.app_documents
  where collection = 'timelines' and key = p_timeline_key
  for update;

  if v_timeline is null then
    raise exception 'Timeline not found.' using errcode = 'P0002';
  end if;

  if not coalesce((v_timeline ->> 'isPublic')::boolean, false)
    and coalesce(v_timeline ->> 'ownerId', '') <> v_uid_text
    and coalesce(v_timeline ->> 'userId', '') <> v_uid_text then
    raise exception 'This timeline is not available.' using errcode = '42501';
  end if;

  v_liked_by := coalesce(v_timeline -> 'likedBy', '{}'::jsonb);
  if v_liked_by ? v_uid_text then
    v_liked_by := v_liked_by - v_uid_text;
    v_liked := false;
  else
    v_liked_by := jsonb_set(
      v_liked_by,
      array[v_uid_text],
      jsonb_build_object('timestamp', v_now, 'userId', v_uid_text),
      true
    );
    v_liked := true;
  end if;
  v_like_count := jsonb_object_length(v_liked_by);

  update public.app_documents
  set data = jsonb_set(
      jsonb_set(data, '{likedBy}', v_liked_by, true),
      '{likeCount}',
      to_jsonb(v_like_count),
      true
    ),
    updated_at = now()
  where collection = 'timelines' and key = p_timeline_key;

  return jsonb_build_object('liked', v_liked, 'likeCount', v_like_count);
end;
$$;

revoke all on function public.toggle_timeline_like(text) from public, anon;
grant execute on function public.toggle_timeline_like(text) to authenticated;
