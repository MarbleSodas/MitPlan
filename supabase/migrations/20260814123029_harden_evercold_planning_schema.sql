-- Harden the normalized Evercold planning boundary without coupling encounter
-- timelines to the selected job-action mode.

-- ALL is a catalog-only mode. Plans always execute in one concrete runtime
-- mode, and historical rows predate mode selection so CURRENT is appropriate.
update public.plans
set mode = 'CURRENT'
where mode = 'ALL';

alter table public.plans
  add constraint plans_runtime_ability_mode_check
  check (mode in ('CURRENT', 'REBORN', 'EVOLVED'));

-- Postgres does not create indexes for foreign keys. These support plan
-- deletion cascades and owner invite/preferences lookups.
create index if not exists user_plan_preferences_plan_id_idx
  on public.user_plan_preferences(plan_id);
create index if not exists plan_invite_links_plan_id_idx
  on public.plan_invite_links(plan_id);

-- The unique constraint on (plan_id, event_key, assignment_key) already
-- supports lookups by its (plan_id, event_key) prefix.
drop index if exists public.plan_assignments_plan_event_idx;

-- Reusable invite links do not have a redeemed_at field. Revocation disables
-- every active link for the plan.
create or replace function private.revoke_plan_invites(p_plan_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not private.plan_is_owner(p_plan_id, v_user_id) then
    raise exception 'revoke_plan_invites: owner access required'
      using errcode = '42501';
  end if;

  update public.plan_invite_links
  set revoked_at = now()
  where plan_id = p_plan_id
    and revoked_at is null;

  return true;
end;
$$;

-- Validate optimistic concurrency while holding the same plan lock used by
-- the mutation. Idempotent retries remain valid after later revisions commit.
create or replace function public.apply_plan_operation(
  p_plan_id uuid,
  p_operation_id uuid,
  p_base_revision bigint,
  p_operation jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_revision bigint;
begin
  if v_user_id is null then
    raise exception 'apply_plan_operation: forbidden' using errcode = '42501';
  end if;

  select p.revision
  into v_revision
  from public.plans p
  where p.id = p_plan_id
  for update;

  if not found then
    raise exception 'apply_plan_operation: plan not found' using errcode = 'P0002';
  end if;

  if not private.plan_can_edit(p_plan_id, v_user_id) then
    raise exception 'apply_plan_operation: forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.plan_changes pc
    where pc.plan_id = p_plan_id
      and pc.operation_id = p_operation_id
  ) and p_base_revision is distinct from v_revision then
    raise exception
      'apply_plan_operation: revision conflict; expected %, current %',
      p_base_revision,
      v_revision
      using errcode = '40001';
  end if;

  return private.apply_plan_operation(
    p_plan_id,
    p_operation_id,
    p_base_revision,
    p_operation
  );
end;
$$;

-- The public loader performs the authorization check. Run it as the guarded
-- privilege boundary so callers never need direct access to workspace_json.
alter function public.load_plan_workspace(uuid, bigint) security definer;
revoke execute on function private.plan_workspace_json(uuid) from authenticated;
revoke execute on function private.apply_plan_operation(uuid, uuid, bigint, jsonb)
  from authenticated;

-- Account merging is an administrative operation that mutates auth.users.
revoke all on function public.merge_auth_users(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.merge_auth_users(uuid, uuid, uuid)
  to service_role;
alter function public.merge_auth_users(uuid, uuid, uuid)
  set search_path = pg_catalog, public;

-- Current Supabase projects do not auto-expose new objects. Grant only the
-- table operations used by security-invoker RPCs and direct profile access;
-- RLS remains the row-level authorization boundary.
grant select on table
  public.plans,
  public.plan_access,
  public.encounters
to authenticated;
grant select, update on table public.profiles to authenticated;

-- Cache auth.uid() once per statement on the main browser query paths.
drop policy if exists plans_read on public.plans;
create policy plans_read
on public.plans
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1
    from public.plan_access pa
    where pa.plan_id = plans.id
      and pa.user_id = (select auth.uid())
  )
);

drop policy if exists plan_access_read on public.plan_access;
create policy plan_access_read
on public.plan_access
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.plans p
    where p.id = plan_access.plan_id
      and p.owner_id = (select auth.uid())
  )
);

drop policy if exists profiles_read on public.profiles;
create policy profiles_read
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

revoke all on function public.apply_plan_operation(uuid, uuid, bigint, jsonb)
  from public, anon;
grant execute on function public.apply_plan_operation(uuid, uuid, bigint, jsonb)
  to authenticated;
