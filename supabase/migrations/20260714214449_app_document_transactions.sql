-- Compare-and-set support for the two legacy job-assignment transactions.
-- Row locking keeps concurrent collaborators from claiming the same slot.

create or replace function public.app_documents_compare_and_set(
  p_path text,
  p_expected jsonb,
  p_value jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_segments text[] := regexp_split_to_array(trim(both '/' from p_path), '/');
  v_collection text;
  v_key text;
  v_subpath text[];
  v_document jsonb;
  v_current jsonb;
  v_found boolean;
  v_delete boolean := p_value is null or jsonb_typeof(p_value) = 'null';
begin
  if coalesce(array_length(v_segments, 1), 0) < 2 then
    raise exception 'document paths require a collection and key' using errcode = '22023';
  end if;

  v_collection := v_segments[1];
  v_key := v_segments[2];
  v_subpath := v_segments[3:array_length(v_segments, 1)];

  select data into v_document
  from public.app_documents
  where collection = v_collection and key = v_key
  for update;
  v_found := found;

  if not v_found then
    v_current := null;
  elsif coalesce(array_length(v_subpath, 1), 0) = 0 then
    v_current := v_document;
  else
    v_current := v_document #> v_subpath;
  end if;

  if v_current is distinct from p_expected then
    return false;
  end if;

  if coalesce(array_length(v_subpath, 1), 0) = 0 then
    if v_delete then
      delete from public.app_documents
      where collection = v_collection and key = v_key;
    else
      insert into public.app_documents (collection, key, data, updated_at)
      values (v_collection, v_key, p_value, now())
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
      public.app_jsonb_set_deep('{}'::jsonb, v_subpath, p_value),
      now()
    )
    on conflict (collection, key) do update
      set data = public.app_jsonb_set_deep(public.app_documents.data, v_subpath, p_value),
          updated_at = excluded.updated_at;
  end if;

  return true;
end;
$$;

revoke all on function public.app_documents_compare_and_set(text, jsonb, jsonb) from public, anon;
grant execute on function public.app_documents_compare_and_set(text, jsonb, jsonb) to authenticated;
