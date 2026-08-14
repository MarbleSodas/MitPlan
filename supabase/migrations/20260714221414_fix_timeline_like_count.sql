-- PostgreSQL exposes jsonb_object_keys rather than jsonb_object_length.
-- Replace the like RPC with an explicit key count.

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
  select count(*)::integer into v_like_count
  from jsonb_object_keys(v_liked_by);

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
