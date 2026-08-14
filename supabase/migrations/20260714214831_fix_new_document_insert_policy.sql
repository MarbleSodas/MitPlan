-- PostgreSQL evaluates INSERT policies against a speculative row before
-- resolving ON CONFLICT. The original compatibility RPC therefore saw a new
-- plan as already existing while checking its owner and rejected it. Split
-- create/update paths explicitly so RLS evaluates each operation against the
-- correct database state.

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
  v_exists boolean;
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

    select exists (
      select 1
      from public.app_documents
      where collection = v_collection and key = v_key
    ) into v_exists;

    if coalesce(array_length(v_subpath, 1), 0) = 0 then
      if v_delete then
        delete from public.app_documents
        where collection = v_collection and key = v_key;
      elsif v_exists then
        update public.app_documents
        set data = v_value, updated_at = now()
        where collection = v_collection and key = v_key;
      else
        insert into public.app_documents (collection, key, data, updated_at)
        values (v_collection, v_key, v_value, now());
      end if;
    elsif v_delete then
      update public.app_documents
      set data = data #- v_subpath, updated_at = now()
      where collection = v_collection and key = v_key;
    elsif v_exists then
      update public.app_documents
      set data = public.app_jsonb_set_deep(data, v_subpath, v_value),
          updated_at = now()
      where collection = v_collection and key = v_key;
    else
      insert into public.app_documents (collection, key, data, updated_at)
      values (
        v_collection,
        v_key,
        public.app_jsonb_set_deep('{}'::jsonb, v_subpath, v_value),
        now()
      );
    end if;
  end loop;
end;
$$;
