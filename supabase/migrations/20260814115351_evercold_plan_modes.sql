-- Complete the ability-mode seam that was reserved in the v1 schema.
--
-- V2 RPCs keep the deployed v1 signatures intact during a rolling frontend /
-- database release. Encounter timelines remain mode-neutral; a plan pins its
-- job-action mode independently from its immutable timeline version and route.

create or replace function private.create_normalized_plan_v2(p_plan jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mode public.ability_mode := upper(coalesce(p_plan ->> 'mode', 'CURRENT'))::public.ability_mode;
  v_workspace jsonb;
  v_plan_id uuid;
begin
  if v_mode not in ('CURRENT', 'REBORN', 'EVOLVED') then
    raise exception 'create_normalized_plan_v2: invalid plan ability mode'
      using errcode = '22023';
  end if;

  v_workspace := private.create_normalized_plan(p_plan);
  v_plan_id := private.try_uuid(v_workspace #>> '{plan,id}');

  if v_plan_id is null then
    raise exception 'create_normalized_plan_v2: plan creation returned an invalid id';
  end if;

  update public.plans
  set mode = v_mode
  where id = v_plan_id and owner_id = auth.uid();

  return jsonb_set(
    v_workspace,
    '{plan,mode}',
    to_jsonb(v_mode::text),
    true
  );
end;
$$;

create or replace function public.create_normalized_plan_v2(p_plan jsonb)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.create_normalized_plan_v2(p_plan);
$$;

create or replace function public.load_plan_workspace_v2(
  p_plan_id uuid,
  p_after_revision bigint default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_workspace jsonb;
  v_mode public.ability_mode;
begin
  v_workspace := public.load_plan_workspace(p_plan_id, p_after_revision);

  select p.mode into v_mode
  from public.plans p
  where p.id = p_plan_id;

  if v_mode is null then
    raise exception 'load_plan_workspace_v2: plan mode unavailable'
      using errcode = '42501';
  end if;

  return jsonb_set(
    v_workspace,
    '{plan,mode}',
    to_jsonb(v_mode::text),
    true
  );
end;
$$;

create or replace function public.list_normalized_plans_v2()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with listed as (
    select item, ordinal
    from jsonb_array_elements(public.list_normalized_plans())
      with ordinality as rows(item, ordinal)
  )
  select coalesce(
    jsonb_agg(
      listed.item || jsonb_build_object('mode', p.mode)
      order by listed.ordinal
    ),
    '[]'::jsonb
  )
  from listed
  join public.plans p
    on p.id = private.try_uuid(listed.item ->> 'id');
$$;

create or replace function private.get_shared_plan_v2(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_workspace jsonb;
  v_plan_id uuid;
  v_mode public.ability_mode;
begin
  v_workspace := private.get_shared_plan(p_token);
  v_plan_id := private.try_uuid(v_workspace #>> '{plan,id}');

  select p.mode into v_mode
  from public.plans p
  where p.id = v_plan_id;

  if v_mode is null then
    raise exception 'get_shared_plan_v2: unavailable' using errcode = '42501';
  end if;

  return jsonb_set(
    v_workspace,
    '{plan,mode}',
    to_jsonb(v_mode::text),
    true
  );
end;
$$;

create or replace function public.get_shared_plan_v2(p_token text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_shared_plan_v2(p_token);
$$;

revoke all on function private.create_normalized_plan_v2(jsonb) from public;
revoke all on function private.get_shared_plan_v2(text) from public;
grant execute on function private.create_normalized_plan_v2(jsonb) to authenticated;
grant execute on function private.get_shared_plan_v2(text) to anon, authenticated;

revoke all on function public.create_normalized_plan_v2(jsonb) from public, anon;
revoke all on function public.load_plan_workspace_v2(uuid, bigint) from public, anon;
revoke all on function public.list_normalized_plans_v2() from public, anon;
revoke all on function public.get_shared_plan_v2(text) from public;

grant execute on function public.create_normalized_plan_v2(jsonb) to authenticated;
grant execute on function public.load_plan_workspace_v2(uuid, bigint) to authenticated;
grant execute on function public.list_normalized_plans_v2() to authenticated;
grant execute on function public.get_shared_plan_v2(text) to anon, authenticated;

comment on function public.create_normalized_plan_v2(jsonb) is
  'Creates a normalized plan with an immutable CURRENT, REBORN, or EVOLVED ability mode.';
comment on function public.load_plan_workspace_v2(uuid, bigint) is
  'Loads the canonical plan workspace including its job-action mode.';
