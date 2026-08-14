-- RLS intentionally filters an unauthorized UPDATE/DELETE to zero rows. Turn
-- that silent no-op into the permission error expected by the compatibility
-- client whenever the row was readable but not writable.

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
  v_row_count integer;
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
        get diagnostics v_row_count = row_count;
        if v_exists and v_row_count = 0 then
          raise exception 'permission denied for document mutation' using errcode = '42501';
        end if;
      elsif v_exists then
        update public.app_documents
        set data = v_value, updated_at = now()
        where collection = v_collection and key = v_key;
        get diagnostics v_row_count = row_count;
        if v_row_count = 0 then
          raise exception 'permission denied for document mutation' using errcode = '42501';
        end if;
      else
        insert into public.app_documents (collection, key, data, updated_at)
        values (v_collection, v_key, v_value, now());
      end if;
    elsif v_delete then
      update public.app_documents
      set data = data #- v_subpath, updated_at = now()
      where collection = v_collection and key = v_key;
      get diagnostics v_row_count = row_count;
      if v_exists and v_row_count = 0 then
        raise exception 'permission denied for document mutation' using errcode = '42501';
      end if;
    elsif v_exists then
      update public.app_documents
      set data = public.app_jsonb_set_deep(data, v_subpath, v_value),
          updated_at = now()
      where collection = v_collection and key = v_key;
      get diagnostics v_row_count = row_count;
      if v_row_count = 0 then
        raise exception 'permission denied for document mutation' using errcode = '42501';
      end if;
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
