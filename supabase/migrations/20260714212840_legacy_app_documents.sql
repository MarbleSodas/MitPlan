-- Compatibility storage for the feature-complete Firebase application.
--
-- Each former Realtime Database top-level child is stored as one JSONB row.
-- This keeps the current application data contract intact while moving auth,
-- persistence, authorization, and realtime notifications to Supabase.

create table public.app_documents (
  collection text not null check (collection ~ '^[A-Za-z][A-Za-z0-9_-]*$'),
  key text not null check (length(key) between 1 and 512),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (collection, key)
);

create index app_documents_updated_at_idx
  on public.app_documents (updated_at desc);

create index app_documents_owner_idx
  on public.app_documents (collection, (data ->> 'ownerId'));

create index app_documents_user_idx
  on public.app_documents (collection, (data ->> 'userId'));

alter table public.app_documents enable row level security;

create or replace function public.app_plan_document(p_plan_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select d.data
  from public.app_documents d
  where d.collection = 'plans' and d.key = p_plan_key
  limit 1
$$;

revoke all on function public.app_plan_document(text) from public, anon, authenticated;

create or replace function public.app_has_plan_access(
  p_plan_key text,
  p_write boolean default false
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid text := auth.uid()::text;
  v_plan jsonb;
  v_role text;
begin
  if v_uid is null then
    return false;
  end if;

  v_plan := public.app_plan_document(p_plan_key);
  if v_plan is null then
    return false;
  end if;

  if v_plan ->> 'ownerId' = v_uid or v_plan ->> 'userId' = v_uid then
    return true;
  end if;

  v_role := v_plan #>> array['collaborators', v_uid, 'role'];
  if v_role is not null then
    return not p_write or v_role in ('owner', 'editor', 'OWNER', 'EDITOR');
  end if;

  -- The legacy app's public plan links are editable by authenticated users.
  return coalesce((v_plan ->> 'isPublic')::boolean, false);
end;
$$;

create or replace function public.app_can_read_document(
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
begin
  case p_collection
    when 'userProfiles' then
      return v_uid is not null;
    when 'plans' then
      return public.app_has_plan_access(p_key, false);
    when 'planCollaboration' then
      v_plan_key := case when p_key like 'plan:%' then substring(p_key from 6) else p_key end;
      return public.app_has_plan_access(v_plan_key, false);
    when 'planSnapshots' then
      return public.app_has_plan_access(p_key, false);
    when 'planShareViews' then
      return coalesce((p_data ->> 'viewEnabled')::boolean, false)
        or public.app_has_plan_access(p_data ->> 'planId', false);
    when 'planShareViewTracking' then
      select d.data into v_share
      from public.app_documents d
      where d.collection = 'planShareViews' and d.key = p_key;
      return public.app_has_plan_access(v_share ->> 'planId', false);
    when 'timelines' then
      return coalesce((p_data ->> 'isPublic')::boolean, false)
        or (v_uid is not null and (p_data ->> 'ownerId' = v_uid or p_data ->> 'userId' = v_uid));
    when 'userCollections', 'planCollaborationsByUser' then
      return v_uid is not null and p_key = v_uid;
    else
      return false;
  end case;
end;
$$;

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
begin
  if v_uid is null then
    return false;
  end if;

  case p_collection
    when 'userProfiles', 'userCollections' then
      return p_key = v_uid;
    when 'plans' then
      -- New plans must be owned by the caller; existing plans use their
      -- stored ACL (including the legacy public-edit contract).
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
      return (p_data ->> 'ownerId' = v_uid)
        or public.app_has_plan_access(p_data ->> 'planId', true);
    when 'planShareViewTracking' then
      select d.data into v_share
      from public.app_documents d
      where d.collection = 'planShareViews' and d.key = p_key;
      return coalesce((v_share ->> 'viewEnabled')::boolean, false)
        or public.app_has_plan_access(v_share ->> 'planId', true);
    when 'timelines' then
      -- Authenticated users may update likes/collections on public timelines;
      -- owners remain the only users who can create or delete timeline rows.
      return (p_data ->> 'ownerId' = v_uid or p_data ->> 'userId' = v_uid)
        or exists (
          select 1 from public.app_documents d
          where d.collection = 'timelines' and d.key = p_key
            and coalesce((d.data ->> 'isPublic')::boolean, false)
        );
    when 'planCollaborationsByUser' then
      return true;
    else
      return false;
  end case;
end;
$$;

create policy app_documents_select
  on public.app_documents for select
  using (public.app_can_read_document(collection, key, data));

create policy app_documents_insert
  on public.app_documents for insert
  with check (public.app_can_write_document(collection, key, data));

create policy app_documents_update
  on public.app_documents for update
  using (public.app_can_write_document(collection, key, data))
  with check (public.app_can_write_document(collection, key, data));

create policy app_documents_delete
  on public.app_documents for delete
  using (public.app_can_write_document(collection, key, data));

-- jsonb_set does not create missing intermediate objects. This helper does,
-- which is required for Firebase-style writes such as presence/{sessionId}.
create or replace function public.app_jsonb_set_deep(
  p_target jsonb,
  p_path text[],
  p_value jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_result jsonb := coalesce(p_target, '{}'::jsonb);
  v_prefix text[] := '{}';
  v_index integer;
begin
  if coalesce(array_length(p_path, 1), 0) = 0 then
    return p_value;
  end if;

  if array_length(p_path, 1) > 1 then
    for v_index in 1..array_length(p_path, 1) - 1 loop
      v_prefix := v_prefix || p_path[v_index];
      if v_result #> v_prefix is null or jsonb_typeof(v_result #> v_prefix) <> 'object' then
        v_result := jsonb_set(v_result, v_prefix, '{}'::jsonb, true);
      end if;
    end loop;
  end if;

  return jsonb_set(v_result, p_path, p_value, true);
end;
$$;

create or replace function public.app_documents_mutate(p_operations jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_operation jsonb;
  v_segments text[];
  v_collection text;
  v_key text;
  v_subpath text[];
  v_value jsonb;
  v_delete boolean;
begin
  if jsonb_typeof(p_operations) <> 'array' then
    raise exception 'operations must be a JSON array' using errcode = '22023';
  end if;

  for v_operation in select value from jsonb_array_elements(p_operations) loop
    v_segments := regexp_split_to_array(trim(both '/' from v_operation ->> 'path'), '/');
    if coalesce(array_length(v_segments, 1), 0) < 2 then
      raise exception 'document paths require a collection and key' using errcode = '22023';
    end if;

    v_collection := v_segments[1];
    v_key := v_segments[2];
    v_subpath := v_segments[3:array_length(v_segments, 1)];
    v_value := v_operation -> 'value';
    v_delete := coalesce((v_operation ->> 'delete')::boolean, false)
      or v_value is null
      or jsonb_typeof(v_value) = 'null';

    if coalesce(array_length(v_subpath, 1), 0) = 0 then
      if v_delete then
        delete from public.app_documents
        where collection = v_collection and key = v_key;
      else
        insert into public.app_documents (collection, key, data, updated_at)
        values (v_collection, v_key, v_value, now())
        on conflict (collection, key) do update
          set data = excluded.data, updated_at = excluded.updated_at;
      end if;
    elsif v_delete then
      update public.app_documents
      set data = data #- v_subpath, updated_at = now()
      where collection = v_collection and key = v_key;
    else
      insert into public.app_documents (collection, key, data, updated_at)
      values (
        v_collection,
        v_key,
        public.app_jsonb_set_deep('{}'::jsonb, v_subpath, v_value),
        now()
      )
      on conflict (collection, key) do update
        set data = public.app_jsonb_set_deep(public.app_documents.data, v_subpath, v_value),
            updated_at = excluded.updated_at;
    end if;
  end loop;
end;
$$;

grant select, insert, update, delete on public.app_documents to anon, authenticated;
grant execute on function public.app_documents_mutate(jsonb) to anon, authenticated;

-- Supabase Realtime publishes row changes; clients refetch the requested
-- Firebase-style path and receive a normal DataSnapshot facade.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_documents'
  ) then
    alter publication supabase_realtime add table public.app_documents;
  end if;
end
$$;

create or replace function public.delete_legacy_app_account(p_confirm boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_uid_text text := auth.uid()::text;
  v_deleted_plans integer := 0;
  v_deleted_timelines integer := 0;
  v_scrubbed_plans integer := 0;
  v_scrubbed_timelines integer := 0;
  v_owned_plan_keys text[];
  v_owned_timeline_keys text[];
begin
  if v_uid is null then
    raise exception 'You must be signed in to delete your account.' using errcode = '42501';
  end if;
  if p_confirm is not true then
    raise exception 'Account deletion must be explicitly confirmed.' using errcode = '22023';
  end if;

  select coalesce(array_agg(key), '{}') into v_owned_plan_keys
  from public.app_documents
  where collection = 'plans'
    and (data ->> 'ownerId' = v_uid_text or data ->> 'userId' = v_uid_text);
  v_deleted_plans := coalesce(array_length(v_owned_plan_keys, 1), 0);

  select coalesce(array_agg(key), '{}') into v_owned_timeline_keys
  from public.app_documents
  where collection = 'timelines'
    and (data ->> 'ownerId' = v_uid_text or data ->> 'userId' = v_uid_text);
  v_deleted_timelines := coalesce(array_length(v_owned_timeline_keys, 1), 0);

  delete from public.app_documents
  where (collection = 'plans' and key = any(v_owned_plan_keys))
     or (collection = 'timelines' and key = any(v_owned_timeline_keys))
     or (collection = 'planCollaboration' and (
          key = any(v_owned_plan_keys)
          or (key like 'plan:%' and substring(key from 6) = any(v_owned_plan_keys))
          or key = any(v_owned_timeline_keys)
          or (key like 'timeline:%' and substring(key from 10) = any(v_owned_timeline_keys))
        ))
     or (collection = 'planSnapshots' and key = any(v_owned_plan_keys))
     or (collection = 'planShareViews' and (
          data ->> 'ownerId' = v_uid_text or data ->> 'planId' = any(v_owned_plan_keys)
        ))
     or (collection in ('userProfiles', 'userCollections', 'planCollaborationsByUser') and key = v_uid_text);

  update public.app_documents
  set data = case
      when data ->> 'lastModifiedBy' = v_uid_text
        then (data #- array['collaborators', v_uid_text] #- array['accessedBy', v_uid_text]) - 'lastModifiedBy'
      else data #- array['collaborators', v_uid_text] #- array['accessedBy', v_uid_text]
    end,
    updated_at = now()
  where collection = 'plans'
    and ((data -> 'collaborators') ? v_uid_text or (data -> 'accessedBy') ? v_uid_text or data ->> 'lastModifiedBy' = v_uid_text);
  get diagnostics v_scrubbed_plans = row_count;

  update public.app_documents
  set data = data #- array['likedBy', v_uid_text], updated_at = now()
  where collection = 'timelines' and (data -> 'likedBy') ? v_uid_text;
  get diagnostics v_scrubbed_timelines = row_count;

  update public.app_documents
  set data = data #- array['viewers', v_uid_text], updated_at = now()
  where collection = 'planShareViewTracking' and (data -> 'viewers') ? v_uid_text;

  delete from public.profiles where id = v_uid;
  delete from auth.users where id = v_uid;

  return jsonb_build_object(
    'deleted', true,
    'deletedPlans', v_deleted_plans,
    'deletedTimelines', v_deleted_timelines,
    'scrubbedPlans', v_scrubbed_plans,
    'scrubbedTimelines', v_scrubbed_timelines
  );
end;
$$;

revoke all on function public.delete_legacy_app_account(boolean) from public, anon;
grant execute on function public.delete_legacy_app_account(boolean) to authenticated;
