-- Normalized, server-authoritative collaborative planning runtime.
--
-- This migration deliberately leaves public.app_documents intact as a
-- recovery/backfill source. New clients use the RPC surface defined below and
-- never subscribe to app_documents for plan collaboration.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Immutable timeline versions and normalized plan workspace tables
-- ---------------------------------------------------------------------------

create table if not exists public.timeline_versions (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  timeline_key text not null,
  version_label text not null,
  game_patch text,
  schema_version integer not null default 1 check (schema_version > 0),
  content_hash text not null,
  status text not null default 'draft'
    check (status in ('draft', 'candidate', 'published', 'deprecated')),
  source_type text not null default 'custom'
    check (source_type in ('official', 'community', 'custom', 'legacy')),
  route_ids text[] not null default array['default']::text[],
  document jsonb not null,
  provenance jsonb not null default '{}'::jsonb,
  validation_report jsonb not null default '{}'::jsonb,
  mutable_plan_id uuid unique references public.plans(id) on delete cascade,
  created_by uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (encounter_id, timeline_key, version_label)
);

create index if not exists timeline_versions_encounter_status_idx
  on public.timeline_versions(encounter_id, status);
create index if not exists timeline_versions_hash_idx
  on public.timeline_versions(content_hash);

create or replace function private.protect_published_timeline_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.status in ('published', 'deprecated') then
    raise exception 'Published timeline versions cannot be deleted';
  end if;
  if tg_op = 'UPDATE' and old.status in ('published', 'deprecated') and (
    new.timeline_key is distinct from old.timeline_key
    or new.version_label is distinct from old.version_label
    or new.game_patch is distinct from old.game_patch
    or new.schema_version is distinct from old.schema_version
    or new.content_hash is distinct from old.content_hash
    or new.route_ids is distinct from old.route_ids
    or new.document is distinct from old.document
    or new.provenance is distinct from old.provenance
    or new.validation_report is distinct from old.validation_report
  ) then
    raise exception 'Published timeline version content is immutable';
  end if;
  if tg_op = 'UPDATE'
    and old.status = 'published'
    and new.status not in ('published', 'deprecated')
  then
    raise exception 'Published timeline versions may only be deprecated';
  end if;
  if tg_op = 'UPDATE' and old.status = 'deprecated' and new.status <> 'deprecated' then
    raise exception 'Deprecated published timeline versions cannot be reopened';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists protect_published_timeline_version on public.timeline_versions;
create trigger protect_published_timeline_version
  before update or delete on public.timeline_versions
  for each row execute function private.protect_published_timeline_version();

alter table public.plans
  add column if not exists description text not null default '',
  add column if not exists encounter_key text,
  add column if not exists timeline_version_id uuid references public.timeline_versions(id),
  add column if not exists route_id text not null default 'default',
  add column if not exists schema_version integer not null default 1,
  add column if not exists revision bigint not null default 0,
  add column if not exists health_settings jsonb not null default '{}'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists legacy_key text,
  add column if not exists last_modified_by uuid;

create unique index if not exists plans_legacy_key_idx
  on public.plans(legacy_key) where legacy_key is not null;
create index if not exists plans_timeline_version_idx
  on public.plans(timeline_version_id);

create table if not exists public.party_slots (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  slot_index smallint not null check (slot_index between 0 and 23),
  role_key text not null,
  job_key text not null,
  job_data jsonb not null default '{}'::jsonb,
  player_user_id uuid,
  player_label text,
  tank_position text check (tank_position in ('mainTank', 'offTank')),
  entity_revision bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, slot_index)
);

create index if not exists party_slots_plan_role_idx
  on public.party_slots(plan_id, role_key, slot_index);

create table if not exists public.plan_assignments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  event_key text not null,
  assignment_key text not null,
  ability_key text not null,
  caster_slot_index smallint,
  target_slot_index smallint,
  payload jsonb not null,
  entity_revision bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, event_key, assignment_key)
);

create index if not exists plan_assignments_plan_event_idx
  on public.plan_assignments(plan_id, event_key);
create index if not exists plan_assignments_plan_ability_idx
  on public.plan_assignments(plan_id, ability_key);

create table if not exists public.plan_timeline_overrides (
  plan_id uuid primary key references public.plans(id) on delete cascade,
  phase_overrides jsonb not null default '{}'::jsonb,
  custom_events jsonb not null default '[]'::jsonb,
  entity_revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_changes (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  operation_id uuid not null,
  revision bigint not null,
  base_revision bigint,
  actor_id uuid not null,
  operation_kind text not null,
  target_type text not null default 'plan',
  target_key text,
  before_data jsonb not null,
  after_data jsonb not null,
  inverse_operation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (plan_id, operation_id),
  unique (plan_id, revision)
);

create index if not exists plan_changes_plan_created_idx
  on public.plan_changes(plan_id, created_at desc);

create table if not exists public.user_plan_preferences (
  user_id uuid not null,
  plan_id uuid not null references public.plans(id) on delete cascade,
  last_phase_id text,
  last_event_key text,
  filters jsonb not null default '{}'::jsonb,
  panel_ratio numeric(5,4) not null default 0.66
    check (panel_ratio between 0.40 and 0.80),
  zoom numeric(5,2) not null default 1.00
    check (zoom between 0.50 and 2.00),
  density text not null default 'comfortable'
    check (density in ('compact', 'comfortable')),
  last_opened_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, plan_id)
);

create index if not exists user_plan_preferences_recent_idx
  on public.user_plan_preferences(user_id, last_opened_at desc);

create table if not exists public.plan_share_links (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  token_hash text not null unique,
  enabled boolean not null default true,
  expires_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists plan_share_links_plan_idx
  on public.plan_share_links(plan_id, enabled);

create table if not exists public.plan_invite_links (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  token_hash text not null unique,
  role public.plan_access_role not null default 'EDITOR',
  enabled boolean not null default true,
  expires_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.plan_backfill_reports (
  legacy_key text primary key,
  plan_id uuid,
  status text not null check (status in ('migrated', 'skipped', 'failed')),
  timeline_version_id uuid,
  assignment_count integer not null default 0,
  unresolved_keys jsonb not null default '[]'::jsonb,
  source_checksum text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- plan_access remains the canonical membership table. This security-invoker
-- view gives the new runtime the plan_members vocabulary without duplicating
-- membership state.
create or replace view public.plan_members
with (security_invoker = true)
as
select
  p.id as plan_id,
  p.owner_id as user_id,
  'OWNER'::public.plan_access_role as role,
  false as via_share_token,
  p.created_at as granted_at
from public.plans p
union all
select pa.plan_id, pa.user_id, pa.role, pa.via_share_token, pa.granted_at
from public.plan_access pa
where not exists (
  select 1
  from public.plans p
  where p.id = pa.plan_id and p.owner_id = pa.user_id
);

-- ---------------------------------------------------------------------------
-- Authorization and workspace read model
-- ---------------------------------------------------------------------------

create or replace function private.plan_can_read(p_plan_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and exists (
    select 1
    from public.plans p
    where p.id = p_plan_id
      and (
        p.owner_id = p_user_id
        or exists (
          select 1
          from public.plan_access pa
          where pa.plan_id = p.id
            and pa.user_id = p_user_id
            and pa.role in ('OWNER', 'EDITOR', 'VIEWER')
        )
      )
  );
$$;

create or replace function private.plan_can_edit(p_plan_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and exists (
    select 1
    from public.plans p
    where p.id = p_plan_id
      and (
        p.owner_id = p_user_id
        or exists (
          select 1
          from public.plan_access pa
          where pa.plan_id = p.id
            and pa.user_id = p_user_id
            and pa.role in ('OWNER', 'EDITOR')
        )
      )
  );
$$;

create or replace function private.plan_is_owner(p_plan_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and exists (
    select 1 from public.plans
    where id = p_plan_id and owner_id = p_user_id
  );
$$;

create or replace function private.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create or replace function private.plan_workspace_json(p_plan_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with selected_jobs as (
    select coalesce(
      jsonb_object_agg(grouped.role_key, grouped.jobs),
      '{}'::jsonb
    ) as value
    from (
      select
        ps.role_key,
        jsonb_agg(
          case
            when ps.job_data = '{}'::jsonb then to_jsonb(ps.job_key)
            else ps.job_data
          end
          order by ps.slot_index
        ) as jobs
      from public.party_slots ps
      where ps.plan_id = p_plan_id
      group by ps.role_key
    ) grouped
  ),
  tank_positions as (
    select jsonb_build_object(
      'mainTank', max(ps.job_key) filter (where ps.tank_position = 'mainTank'),
      'offTank', max(ps.job_key) filter (where ps.tank_position = 'offTank')
    ) as value
    from public.party_slots ps
    where ps.plan_id = p_plan_id
  ),
  assignments as (
    select coalesce(
      jsonb_object_agg(grouped.event_key, grouped.items),
      '{}'::jsonb
    ) as value
    from (
      select
        pa.event_key,
        jsonb_agg(pa.payload order by pa.assignment_key) as items
      from public.plan_assignments pa
      where pa.plan_id = p_plan_id
      group by pa.event_key
    ) grouped
  ),
  slots as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', ps.id,
          'slotIndex', ps.slot_index,
          'roleKey', ps.role_key,
          'jobKey', ps.job_key,
          'jobData', ps.job_data,
          'playerUserId', ps.player_user_id,
          'playerLabel', ps.player_label,
          'tankPosition', ps.tank_position,
          'entityRevision', ps.entity_revision
        )
        order by ps.slot_index
      ),
      '[]'::jsonb
    ) as value
    from public.party_slots ps
    where ps.plan_id = p_plan_id
  ),
  recent_changes as (
    select coalesce(
      jsonb_agg(change_row order by (change_row ->> 'revision')::bigint),
      '[]'::jsonb
    ) as value
    from (
      select jsonb_build_object(
        'id', pc.id,
        'operationId', pc.operation_id,
        'revision', pc.revision,
        'baseRevision', pc.base_revision,
        'actorId', pc.actor_id,
        'operationKind', pc.operation_kind,
        'targetType', pc.target_type,
        'targetKey', pc.target_key,
        'createdAt', pc.created_at,
        'undoEligible', not exists (
          select 1
          from public.plan_changes later
          where later.plan_id = pc.plan_id
            and later.revision > pc.revision
            and later.target_type = pc.target_type
            and later.target_key is not distinct from pc.target_key
        )
      ) as change_row
      from public.plan_changes pc
      join public.plans p on p.id = pc.plan_id
      where pc.plan_id = p_plan_id
      order by pc.revision desc
      limit 50
    ) latest
  )
  select jsonb_build_object(
    'plan',
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'description', p.description,
      'bossId', coalesce(p.encounter_key, e.slug),
      'selectedJobs', sj.value,
      'assignments', a.value,
      'tankPositions', tp.value,
      'healthSettings', p.health_settings,
      'ownerId', p.owner_id,
      'userId', p.owner_id,
      'createdAt', extract(epoch from p.created_at) * 1000,
      'updatedAt', extract(epoch from p.updated_at) * 1000,
      'schemaVersion', p.schema_version,
      'revision', p.revision,
      'lastModifiedBy', p.last_modified_by,
      'timelineVersionId', p.timeline_version_id,
      'routeId', p.route_id,
      'sourceTimelineId', p.metadata ->> 'sourceTimelineId',
      'sourceTimelineName', p.metadata ->> 'sourceTimelineName',
      'bossTags', coalesce(tv.document -> 'bossTags', p.metadata -> 'bossTags', '[]'::jsonb),
      'bossMetadata', coalesce(tv.document -> 'bossMetadata', p.metadata -> 'bossMetadata'),
      'phaseOverrides', coalesce(pto.phase_overrides, '{}'::jsonb),
      'customEvents', coalesce(pto.custom_events, '[]'::jsonb),
      'timelineLayout', tv.document,
      'accessLevel',
        case
          when p.owner_id = auth.uid() then 'owner'
          else lower(coalesce((
            select pa.role::text
            from public.plan_access pa
            where pa.plan_id = p.id and pa.user_id = auth.uid()
          ), 'VIEWER'))
        end,
      'shareMode',
        case
          when p.owner_id = auth.uid() then 'owned'
          when exists (
            select 1 from public.plan_access pa
            where pa.plan_id = p.id
              and pa.user_id = auth.uid()
              and pa.role in ('OWNER', 'EDITOR')
          ) then 'edit'
          else 'view'
        end,
      'metadata', p.metadata
    ),
    'timelineVersion',
      case when tv.id is null then null else jsonb_build_object(
        'id', tv.id,
        'timelineKey', tv.timeline_key,
        'versionLabel', tv.version_label,
        'gamePatch', tv.game_patch,
        'schemaVersion', tv.schema_version,
        'contentHash', tv.content_hash,
        'status', tv.status,
        'sourceType', tv.source_type,
        'routeIds', tv.route_ids,
        'document', tv.document,
        'provenance', tv.provenance,
        'validationReport', tv.validation_report
      ) end,
    'partySlots', s.value,
    'assignments', a.value,
    'revision', p.revision,
    'permissions', jsonb_build_object(
      'canRead', private.plan_can_read(p.id),
      'canEdit', private.plan_can_edit(p.id),
      'canAdmin', private.plan_is_owner(p.id)
    ),
    'preference', case when upp.user_id is null then null else jsonb_build_object(
      'lastPhaseId', upp.last_phase_id,
      'lastEventKey', upp.last_event_key,
      'filters', upp.filters,
      'panelRatio', upp.panel_ratio,
      'zoom', upp.zoom,
      'density', upp.density,
      'lastOpenedAt', upp.last_opened_at
    ) end,
    'changes', rc.value
  )
  from public.plans p
  join public.encounters e on e.id = p.encounter_id
  left join public.timeline_versions tv on tv.id = p.timeline_version_id
  left join public.plan_timeline_overrides pto on pto.plan_id = p.id
  left join public.user_plan_preferences upp
    on upp.plan_id = p.id and upp.user_id = auth.uid()
  cross join selected_jobs sj
  cross join tank_positions tp
  cross join assignments a
  cross join slots s
  cross join recent_changes rc
  where p.id = p_plan_id;
$$;

create or replace function private.populate_plan_payload(
  p_plan_id uuid,
  p_payload jsonb,
  p_revision bigint default 0
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role record;
  v_job jsonb;
  v_slot_index smallint := 0;
  v_event record;
  v_assignment jsonb;
  v_ordinal integer;
  v_job_key text;
  v_assignment_key text;
  v_tank_positions jsonb := coalesce(p_payload -> 'tankPositions', '{}'::jsonb);
  v_timeline_layout jsonb := p_payload -> 'timelineLayout';
  v_timeline_version_id uuid;
  v_requested_timeline_version_id uuid := private.try_uuid(p_payload ->> 'timelineVersionId');
  v_plan public.plans%rowtype;
begin
  select * into v_plan from public.plans where id = p_plan_id;
  if not found then
    raise exception 'populate_plan_payload: plan not found';
  end if;

  update public.plans
  set
    name = coalesce(nullif(p_payload ->> 'name', ''), nullif(p_payload ->> 'title', ''), name),
    description = coalesce(p_payload ->> 'description', description),
    encounter_key = coalesce(
      v_timeline_layout ->> 'bossId',
      p_payload ->> 'bossId',
      p_payload #>> '{selectedBoss,id}',
      encounter_key
    ),
    route_id = coalesce(
      p_payload ->> 'routeId',
      v_timeline_layout #>> '{resolution,defaultBranchId}',
      route_id
    ),
    schema_version = coalesce((p_payload ->> 'schemaVersion')::integer, schema_version),
    health_settings = coalesce(p_payload -> 'healthSettings', health_settings),
    metadata = metadata || jsonb_strip_nulls(jsonb_build_object(
      'sourceTimelineId', p_payload ->> 'sourceTimelineId',
      'sourceTimelineName', p_payload ->> 'sourceTimelineName',
      'bossTags', coalesce(v_timeline_layout -> 'bossTags', p_payload -> 'bossTags'),
      'bossMetadata', coalesce(v_timeline_layout -> 'bossMetadata', p_payload -> 'bossMetadata')
    )),
    revision = greatest(revision, p_revision),
    updated_at = now()
  where id = p_plan_id;

  if v_requested_timeline_version_id is not null then
    select tv.id into v_timeline_version_id
    from public.timeline_versions tv
    where tv.id = v_requested_timeline_version_id
      and tv.encounter_id = v_plan.encounter_id
      and (
        tv.status = 'published'
        or tv.mutable_plan_id = p_plan_id
        or tv.created_by = v_plan.owner_id
      )
      and coalesce(
        p_payload ->> 'routeId',
        (select route_id from public.plans where id = p_plan_id)
      ) = any(tv.route_ids);

    if v_timeline_version_id is null then
      raise exception 'populate_plan_payload: invalid timeline version or route'
        using errcode = '22023';
    end if;

    update public.plans
    set timeline_version_id = v_timeline_version_id
    where id = p_plan_id;
  end if;

  delete from public.party_slots where plan_id = p_plan_id;
  for v_role in
    select key as role_key, value as jobs
    from jsonb_each(coalesce(p_payload -> 'selectedJobs', '{}'::jsonb))
  loop
    if jsonb_typeof(v_role.jobs) = 'array' then
      for v_job in select value from jsonb_array_elements(v_role.jobs)
      loop
        v_job_key := case
          when jsonb_typeof(v_job) = 'string' then trim(both '"' from v_job::text)
          else coalesce(v_job ->> 'id', v_job ->> 'jobId', v_job ->> 'abbreviation')
        end;
        if v_job_key is not null and v_slot_index <= 23 then
          insert into public.party_slots (
            plan_id, slot_index, role_key, job_key, job_data, tank_position, entity_revision
          ) values (
            p_plan_id,
            v_slot_index,
            v_role.role_key,
            v_job_key,
            case when jsonb_typeof(v_job) = 'object' then v_job else jsonb_build_object('id', v_job_key) end,
            case
              when v_tank_positions ->> 'mainTank' = v_job_key then 'mainTank'
              when v_tank_positions ->> 'offTank' = v_job_key then 'offTank'
              else null
            end,
            p_revision
          );
          v_slot_index := v_slot_index + 1;
        end if;
      end loop;
    end if;
  end loop;

  delete from public.plan_assignments where plan_id = p_plan_id;
  for v_event in
    select key as event_key, value as items
    from jsonb_each(coalesce(
      p_payload -> 'assignments',
      p_payload -> 'assignedMitigations',
      '{}'::jsonb
    ))
  loop
    if jsonb_typeof(v_event.items) = 'array' then
      v_ordinal := 0;
      for v_assignment in select value from jsonb_array_elements(v_event.items)
      loop
        v_ordinal := v_ordinal + 1;
        v_assignment_key := concat_ws(
          ':',
          coalesce(v_assignment ->> 'id', 'assignment'),
          coalesce(v_assignment ->> 'instanceId', ''),
          v_ordinal::text
        );
        insert into public.plan_assignments (
          plan_id,
          event_key,
          assignment_key,
          ability_key,
          caster_slot_index,
          target_slot_index,
          payload,
          entity_revision
        ) values (
          p_plan_id,
          v_event.event_key,
          v_assignment_key,
          coalesce(v_assignment ->> 'id', 'unknown'),
          null,
          null,
          v_assignment,
          p_revision
        );
      end loop;
    end if;
  end loop;

  insert into public.plan_timeline_overrides (
    plan_id, phase_overrides, custom_events, entity_revision, updated_at
  ) values (
    p_plan_id,
    coalesce(p_payload -> 'phaseOverrides', '{}'::jsonb),
    coalesce(p_payload -> 'customEvents', '[]'::jsonb),
    p_revision,
    now()
  )
  on conflict (plan_id) do update set
    phase_overrides = excluded.phase_overrides,
    custom_events = excluded.custom_events,
    entity_revision = excluded.entity_revision,
    updated_at = excluded.updated_at;

  if v_requested_timeline_version_id is null
    and v_timeline_layout is not null
    and jsonb_typeof(v_timeline_layout) = 'object'
  then
    select id into v_timeline_version_id
    from public.timeline_versions
    where mutable_plan_id = p_plan_id;

    if v_timeline_version_id is null then
      insert into public.timeline_versions (
        encounter_id,
        timeline_key,
        version_label,
        game_patch,
        schema_version,
        content_hash,
        status,
        source_type,
        route_ids,
        document,
        provenance,
        validation_report,
        mutable_plan_id,
        created_by
      ) values (
        v_plan.encounter_id,
        'plan:' || p_plan_id::text,
        'Plan timeline',
        v_timeline_layout #>> '{bossMetadata,patch}',
        coalesce((v_timeline_layout ->> 'schemaVersion')::integer, 1),
        md5(v_timeline_layout::text),
        'draft',
        case when p_payload ->> 'sourceTimelineId' is null then 'custom' else 'legacy' end,
        array[coalesce(
          p_payload ->> 'routeId',
          v_timeline_layout #>> '{resolution,defaultBranchId}',
          'default'
        )],
        v_timeline_layout,
        coalesce(v_timeline_layout -> 'analysisSources', '[]'::jsonb),
        '{}'::jsonb,
        p_plan_id,
        v_plan.owner_id
      )
      returning id into v_timeline_version_id;
    else
      update public.timeline_versions
      set
        document = v_timeline_layout,
        schema_version = coalesce((v_timeline_layout ->> 'schemaVersion')::integer, schema_version),
        content_hash = md5(v_timeline_layout::text),
        route_ids = array[coalesce(
          p_payload ->> 'routeId',
          v_timeline_layout #>> '{resolution,defaultBranchId}',
          'default'
        )],
        updated_at = now()
      where id = v_timeline_version_id
        and status = 'draft';
    end if;

    update public.plans
    set timeline_version_id = v_timeline_version_id
    where id = p_plan_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public RPC surface
-- ---------------------------------------------------------------------------

create or replace function public.load_plan_workspace(
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
  v_changes jsonb;
begin
  if not private.plan_can_read(p_plan_id) then
    raise exception 'load_plan_workspace: forbidden' using errcode = '42501';
  end if;

  v_workspace := private.plan_workspace_json(p_plan_id);
  if v_workspace is null then
    raise exception 'load_plan_workspace: not found' using errcode = 'P0002';
  end if;

  if p_after_revision is not null then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', pc.id,
          'operationId', pc.operation_id,
          'revision', pc.revision,
          'baseRevision', pc.base_revision,
          'actorId', pc.actor_id,
          'operationKind', pc.operation_kind,
          'targetType', pc.target_type,
          'targetKey', pc.target_key,
          'afterData', pc.after_data,
          'createdAt', pc.created_at
        )
        order by pc.revision
      ),
      '[]'::jsonb
    )
    into v_changes
    from public.plan_changes pc
    where pc.plan_id = p_plan_id
      and pc.revision > p_after_revision;

    v_workspace := v_workspace || jsonb_build_object('changesSinceRevision', v_changes);
  end if;

  return v_workspace;
end;
$$;

create or replace function private.create_normalized_plan(p_plan jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid := coalesce(private.try_uuid(p_plan ->> 'id'), gen_random_uuid());
  v_boss_id text := coalesce(
    p_plan #>> '{timelineLayout,bossId}',
    p_plan ->> 'bossId',
    p_plan #>> '{selectedBoss,id}',
    'legacy-import-sentinel'
  );
  v_encounter_id uuid;
begin
  if v_user_id is null then
    raise exception 'create_normalized_plan: not authenticated' using errcode = '42501';
  end if;

  select id into v_encounter_id
  from public.encounters
  where slug = v_boss_id
  limit 1;

  if v_encounter_id is null then
    select id into v_encounter_id
    from public.encounters
    where slug = 'legacy-import-sentinel'
    limit 1;
  end if;

  if v_encounter_id is null then
    raise exception 'create_normalized_plan: no encounter or legacy sentinel exists';
  end if;

  insert into public.plans (
    id,
    owner_id,
    name,
    description,
    encounter_id,
    encounter_key,
    mode,
    is_legacy,
    schema_version,
    revision,
    health_settings,
    metadata,
    last_modified_by
  ) values (
    v_plan_id,
    v_user_id,
    coalesce(nullif(p_plan ->> 'name', ''), nullif(p_plan ->> 'title', ''), 'Untitled Plan'),
    coalesce(p_plan ->> 'description', ''),
    v_encounter_id,
    v_boss_id,
    'CURRENT',
    false,
    coalesce((p_plan ->> 'schemaVersion')::integer, 1),
    0,
    coalesce(p_plan -> 'healthSettings', '{}'::jsonb),
    '{}'::jsonb,
    v_user_id
  );

  perform private.populate_plan_payload(v_plan_id, p_plan, 0);
  return private.plan_workspace_json(v_plan_id);
end;
$$;

create or replace function public.create_normalized_plan(p_plan jsonb)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.create_normalized_plan(p_plan);
$$;

create or replace function public.list_published_timeline_versions(
  p_encounter_key text
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', tv.id,
        'timelineKey', tv.timeline_key,
        'versionLabel', tv.version_label,
        'gamePatch', tv.game_patch,
        'schemaVersion', tv.schema_version,
        'contentHash', tv.content_hash,
        'status', tv.status,
        'sourceType', tv.source_type,
        'routeIds', tv.route_ids
      )
      order by tv.published_at desc nulls last, tv.created_at desc
    ),
    '[]'::jsonb
  )
  from public.timeline_versions tv
  join public.encounters e on e.id = tv.encounter_id
  where auth.uid() is not null
    and tv.status = 'published'
    and (e.slug = p_encounter_key or tv.timeline_key = p_encounter_key);
$$;

create or replace function private.preview_timeline_upgrade(
  p_plan_id uuid,
  p_target_version_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_current jsonb;
  v_target jsonb;
begin
  if auth.uid() is null or not private.plan_can_read(p_plan_id, auth.uid()) then
    raise exception 'preview_timeline_upgrade: forbidden' using errcode = '42501';
  end if;

  select tv.document into v_current
  from public.plans p
  join public.timeline_versions tv on tv.id = p.timeline_version_id
  where p.id = p_plan_id;

  select tv.document into v_target
  from public.timeline_versions tv
  join public.plans p on p.id = p_plan_id and p.encounter_id = tv.encounter_id
  where tv.id = p_target_version_id and tv.status = 'published';

  if v_current is null or v_target is null then
    raise exception 'preview_timeline_upgrade: compatible published version not found'
      using errcode = 'P0002';
  end if;

  return (
    with current_events as (
      select
        coalesce(value ->> 'eventKey', value ->> 'id') as event_key,
        value as event,
        count(*) over (
          partition by coalesce(value ->> 'eventKey', value ->> 'id')
        ) as key_count
      from jsonb_array_elements(coalesce(v_current -> 'actions', '[]'::jsonb))
    ),
    target_events as (
      select
        coalesce(value ->> 'eventKey', value ->> 'id') as event_key,
        value as event,
        count(*) over (
          partition by coalesce(value ->> 'eventKey', value ->> 'id')
        ) as key_count
      from jsonb_array_elements(coalesce(v_target -> 'actions', '[]'::jsonb))
    ),
    compared as (
      select
        coalesce(c.event_key, t.event_key) as event_key,
        c.event as current_event,
        t.event as target_event,
        greatest(coalesce(c.key_count, 0), coalesce(t.key_count, 0)) as key_count,
        case
          when c.event_key is null then 'added'
          when t.event_key is null then 'removed'
          when greatest(c.key_count, t.key_count) > 1 then 'ambiguous'
          when c.event = t.event then 'unchanged'
          when (c.event - 'time' - 'timeMs' - 'canonicalTimeMs' - 'phaseOffsetMs') =
               (t.event - 'time' - 'timeMs' - 'canonicalTimeMs' - 'phaseOffsetMs')
            then 'moved'
          else 'metadata_changed'
        end as classification
      from current_events c
      full join target_events t using (event_key)
    )
    select jsonb_build_object(
      'planId', p_plan_id,
      'targetVersionId', p_target_version_id,
      'unchanged', coalesce(jsonb_agg(event_key order by event_key)
        filter (where classification = 'unchanged'), '[]'::jsonb),
      'moved', coalesce(jsonb_agg(event_key order by event_key)
        filter (where classification = 'moved'), '[]'::jsonb),
      'metadataChanged', coalesce(jsonb_agg(event_key order by event_key)
        filter (where classification = 'metadata_changed'), '[]'::jsonb),
      'added', coalesce(jsonb_agg(event_key order by event_key)
        filter (where classification = 'added'), '[]'::jsonb),
      'removed', coalesce(jsonb_agg(event_key order by event_key)
        filter (where classification = 'removed'), '[]'::jsonb),
      'ambiguous', coalesce(jsonb_agg(event_key order by event_key)
        filter (where classification = 'ambiguous'), '[]'::jsonb)
    )
    from compared
  );
end;
$$;

create or replace function public.preview_timeline_upgrade(
  p_plan_id uuid,
  p_target_version_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.preview_timeline_upgrade(p_plan_id, p_target_version_id);
$$;

create or replace function public.publish_timeline_version(
  p_timeline_version_id uuid,
  p_human_approval jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.timeline_versions%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'publish_timeline_version: service role required' using errcode = '42501';
  end if;
  if coalesce(p_human_approval ->> 'reviewedBy', '') = ''
    or coalesce(p_human_approval ->> 'approvedAt', '') = ''
  then
    raise exception 'publish_timeline_version: named human approval is required'
      using errcode = '22023';
  end if;

  select * into v_row
  from public.timeline_versions
  where id = p_timeline_version_id
  for update;

  if not found or v_row.status <> 'candidate' then
    raise exception 'publish_timeline_version: candidate not found' using errcode = 'P0002';
  end if;
  if coalesce((v_row.validation_report ->> 'publishable')::boolean, false) is false
    or jsonb_array_length(coalesce(v_row.validation_report -> 'blockers', '[]'::jsonb)) > 0
  then
    raise exception 'publish_timeline_version: validation blockers remain'
      using errcode = '22023';
  end if;

  update public.timeline_versions
  set
    status = 'published',
    published_at = now(),
    validation_report = validation_report || jsonb_build_object(
      'humanApproval', p_human_approval
    ),
    updated_at = now()
  where id = p_timeline_version_id
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'contentHash', v_row.content_hash,
    'publishedAt', v_row.published_at
  );
end;
$$;

create or replace function private.apply_plan_operation(
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
  v_plan public.plans%rowtype;
  v_existing jsonb;
  v_before jsonb;
  v_after jsonb;
  v_payload jsonb := coalesce(p_operation -> 'payload', '{}'::jsonb);
  v_operation_kind text := coalesce(p_operation ->> 'kind', 'patch_plan');
  v_event record;
  v_assignment jsonb;
  v_ordinal integer;
  v_assignment_key text;
  v_next_revision bigint;
begin
  if v_user_id is null or not private.plan_can_edit(p_plan_id, v_user_id) then
    raise exception 'apply_plan_operation: forbidden' using errcode = '42501';
  end if;

  select * into v_plan
  from public.plans
  where id = p_plan_id
  for update;

  if not found then
    raise exception 'apply_plan_operation: plan not found' using errcode = 'P0002';
  end if;

  -- Check idempotency under the same plan lock used to serialize revisions so
  -- simultaneous retries cannot race the unique operation constraint.
  select pc.after_data
  into v_existing
  from public.plan_changes pc
  where pc.plan_id = p_plan_id
    and pc.operation_id = p_operation_id;

  if found then
    return v_existing || jsonb_build_object('idempotentReplay', true);
  end if;

  v_before := private.plan_workspace_json(p_plan_id);
  v_next_revision := v_plan.revision + 1;

  update public.plans
  set
    name = case when v_payload ? 'name' then coalesce(nullif(v_payload ->> 'name', ''), name) else name end,
    description = case when v_payload ? 'description' then coalesce(v_payload ->> 'description', '') else description end,
    health_settings = case when v_payload ? 'healthSettings' then coalesce(v_payload -> 'healthSettings', '{}'::jsonb) else health_settings end,
    route_id = case when v_payload ? 'routeId' then coalesce(v_payload ->> 'routeId', route_id) else route_id end,
    metadata = metadata || coalesce(v_payload -> 'metadata', '{}'::jsonb),
    revision = v_next_revision,
    last_modified_by = v_user_id,
    updated_at = now()
  where id = p_plan_id;

  if v_payload ? 'routeId'
    and (
      v_operation_kind not in ('set_route', 'upgrade_timeline')
      or coalesce((v_payload ->> 'reviewApproved')::boolean, false) is false
    )
  then
    raise exception 'apply_plan_operation: route changes require reviewed preview'
      using errcode = '22023';
  end if;

  if v_payload ? 'routeId'
    and v_operation_kind <> 'upgrade_timeline'
    and not exists (
    select 1
    from public.timeline_versions tv
    join public.plans p on p.timeline_version_id = tv.id
    where p.id = p_plan_id and (v_payload ->> 'routeId') = any(tv.route_ids)
  ) then
    raise exception 'apply_plan_operation: route is not available in the pinned timeline'
      using errcode = '22023';
  end if;

  if v_operation_kind = 'upgrade_timeline' then
    if private.try_uuid(v_payload ->> 'timelineVersionId') is null
      or coalesce((v_payload ->> 'reviewApproved')::boolean, false) is false
    then
      raise exception 'apply_plan_operation: reviewed timeline version is required'
        using errcode = '22023';
    end if;

    update public.plans p
    set timeline_version_id = tv.id
    from public.timeline_versions tv
    where p.id = p_plan_id
      and tv.id = private.try_uuid(v_payload ->> 'timelineVersionId')
      and tv.encounter_id = p.encounter_id
      and tv.status = 'published';

    if not found then
      raise exception 'apply_plan_operation: compatible published version not found'
        using errcode = 'P0002';
    end if;

    if not exists (
      select 1
      from public.plans p
      join public.timeline_versions tv on tv.id = p.timeline_version_id
      where p.id = p_plan_id and p.route_id = any(tv.route_ids)
    ) then
      raise exception 'apply_plan_operation: reviewed route is not available in the target timeline'
        using errcode = '22023';
    end if;
  end if;

  if v_payload ? 'selectedJobs' or v_payload ? 'tankPositions' then
    perform private.populate_plan_payload(
      p_plan_id,
      jsonb_build_object(
        'selectedJobs',
          coalesce(v_payload -> 'selectedJobs', v_before #> '{plan,selectedJobs}'),
        'tankPositions',
          coalesce(v_payload -> 'tankPositions', v_before #> '{plan,tankPositions}'),
        'assignments', v_before #> '{plan,assignments}',
        'phaseOverrides', v_before #> '{plan,phaseOverrides}',
        'customEvents', v_before #> '{plan,customEvents}'
      ),
      v_next_revision
    );
  end if;

  if v_payload ? 'assignmentEvents' then
    for v_event in
      select key as event_key, value as items
      from jsonb_each(coalesce(v_payload -> 'assignmentEvents', '{}'::jsonb))
    loop
      delete from public.plan_assignments
      where plan_id = p_plan_id and event_key = v_event.event_key;

      if jsonb_typeof(v_event.items) = 'array' then
        v_ordinal := 0;
        for v_assignment in select value from jsonb_array_elements(v_event.items)
        loop
          v_ordinal := v_ordinal + 1;
          v_assignment_key := concat_ws(
            ':',
            coalesce(v_assignment ->> 'id', 'assignment'),
            coalesce(v_assignment ->> 'instanceId', ''),
            v_ordinal::text
          );
          insert into public.plan_assignments (
            plan_id,
            event_key,
            assignment_key,
            ability_key,
            payload,
            entity_revision
          ) values (
            p_plan_id,
            v_event.event_key,
            v_assignment_key,
            coalesce(v_assignment ->> 'id', 'unknown'),
            v_assignment,
            v_next_revision
          );
        end loop;
      end if;
    end loop;
  end if;

  if v_payload ? 'phaseOverrides' or v_payload ? 'customEvents' then
    insert into public.plan_timeline_overrides (
      plan_id, phase_overrides, custom_events, entity_revision, updated_at
    ) values (
      p_plan_id,
      coalesce(v_payload -> 'phaseOverrides', v_before #> '{plan,phaseOverrides}', '{}'::jsonb),
      coalesce(v_payload -> 'customEvents', v_before #> '{plan,customEvents}', '[]'::jsonb),
      v_next_revision,
      now()
    )
    on conflict (plan_id) do update set
      phase_overrides = excluded.phase_overrides,
      custom_events = excluded.custom_events,
      entity_revision = excluded.entity_revision,
      updated_at = excluded.updated_at;
  end if;

  if v_payload ? 'timelineLayout' then
    perform private.populate_plan_payload(
      p_plan_id,
      jsonb_build_object(
        'selectedJobs', v_before #> '{plan,selectedJobs}',
        'tankPositions', v_before #> '{plan,tankPositions}',
        'assignments', v_before #> '{plan,assignments}',
        'phaseOverrides', coalesce(v_payload -> 'phaseOverrides', v_before #> '{plan,phaseOverrides}'),
        'customEvents', v_before #> '{plan,customEvents}',
        'timelineLayout', v_payload -> 'timelineLayout',
        'routeId', coalesce(v_payload ->> 'routeId', v_plan.route_id),
        'sourceTimelineId', coalesce(v_payload ->> 'sourceTimelineId', v_before #>> '{plan,sourceTimelineId}'),
        'sourceTimelineName', coalesce(v_payload ->> 'sourceTimelineName', v_before #>> '{plan,sourceTimelineName}')
      ),
      v_next_revision
    );
  end if;

  -- populate_plan_payload preserves the new revision with greatest().
  update public.plans
  set revision = v_next_revision, last_modified_by = v_user_id, updated_at = now()
  where id = p_plan_id;

  insert into public.plan_changes (
    plan_id,
    operation_id,
    revision,
    base_revision,
    actor_id,
    operation_kind,
    target_type,
    target_key,
    before_data,
    after_data,
    inverse_operation
  ) values (
    p_plan_id,
    p_operation_id,
    v_next_revision,
    p_base_revision,
    v_user_id,
    v_operation_kind,
    coalesce(p_operation ->> 'targetType', 'plan'),
    p_operation ->> 'targetKey',
    v_before,
    '{}'::jsonb,
    jsonb_build_object('kind', 'restore_workspace', 'changeRevision', v_next_revision)
  );

  -- Build the canonical result after the change row exists so Activity includes
  -- this revision and undo eligibility reflects entity commit order.
  v_after := private.plan_workspace_json(p_plan_id);
  update public.plan_changes
  set after_data = v_after
  where plan_id = p_plan_id and operation_id = p_operation_id;

  return v_after || jsonb_build_object(
    'committedChange',
    jsonb_build_object(
      'operationId', p_operation_id,
      'revision', v_next_revision,
      'actorId', v_user_id,
      'operationKind', v_operation_kind
    )
  );
end;
$$;

create or replace function public.apply_plan_operation(
  p_plan_id uuid,
  p_operation_id uuid,
  p_base_revision bigint,
  p_operation jsonb
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.apply_plan_operation(
    p_plan_id,
    p_operation_id,
    p_base_revision,
    p_operation
  );
$$;

create or replace function private.undo_plan_change(
  p_plan_id uuid,
  p_change_id uuid,
  p_operation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan public.plans%rowtype;
  v_change public.plan_changes%rowtype;
  v_restore jsonb;
  v_before jsonb;
  v_after jsonb;
  v_next_revision bigint;
  v_assignment jsonb;
  v_ordinal integer;
  v_assignment_key text;
begin
  if v_user_id is null or not private.plan_can_edit(p_plan_id, v_user_id) then
    raise exception 'undo_plan_change: forbidden' using errcode = '42501';
  end if;

  select * into v_plan
  from public.plans
  where id = p_plan_id
  for update;

  select * into v_change
  from public.plan_changes
  where id = p_change_id and plan_id = p_plan_id;

  if not found then
    raise exception 'undo_plan_change: change not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.plan_changes later
    where later.plan_id = p_plan_id
      and later.revision > v_change.revision
      and later.target_type = v_change.target_type
      and later.target_key is not distinct from v_change.target_key
  ) then
    raise exception 'undo_plan_change: this entity changed after the selected revision'
      using errcode = '40001';
  end if;

  if exists (
    select 1 from public.plan_changes
    where plan_id = p_plan_id and operation_id = p_operation_id
  ) then
    return private.plan_workspace_json(p_plan_id) ||
      jsonb_build_object('idempotentReplay', true);
  end if;

  v_before := private.plan_workspace_json(p_plan_id);
  v_restore := v_change.before_data #> '{plan}';
  v_next_revision := v_plan.revision + 1;

  if v_change.target_type = 'assignment' and v_change.target_key is not null then
    delete from public.plan_assignments
    where plan_id = p_plan_id and event_key = v_change.target_key;

    v_ordinal := 0;
    for v_assignment in
      select value
      from jsonb_array_elements(coalesce(
        v_restore #> array['assignments', v_change.target_key],
        '[]'::jsonb
      ))
    loop
      v_ordinal := v_ordinal + 1;
      v_assignment_key := concat_ws(
        ':',
        coalesce(v_assignment ->> 'id', 'assignment'),
        coalesce(v_assignment ->> 'instanceId', ''),
        v_ordinal::text
      );
      insert into public.plan_assignments (
        plan_id, event_key, assignment_key, ability_key, payload, entity_revision
      ) values (
        p_plan_id,
        v_change.target_key,
        v_assignment_key,
        coalesce(v_assignment ->> 'id', 'unknown'),
        v_assignment,
        v_next_revision
      );
    end loop;
  elsif v_change.target_type = 'party' then
    perform private.populate_plan_payload(
      p_plan_id,
      jsonb_build_object(
        'selectedJobs', v_restore -> 'selectedJobs',
        'tankPositions', v_restore -> 'tankPositions',
        'assignments', v_before #> '{plan,assignments}',
        'phaseOverrides', v_before #> '{plan,phaseOverrides}',
        'customEvents', v_before #> '{plan,customEvents}'
      ),
      v_next_revision
    );
  elsif v_change.target_type = 'timeline_overrides' then
    insert into public.plan_timeline_overrides (
      plan_id, phase_overrides, custom_events, entity_revision, updated_at
    ) values (
      p_plan_id,
      coalesce(v_restore -> 'phaseOverrides', '{}'::jsonb),
      '[]'::jsonb,
      v_next_revision,
      now()
    )
    on conflict (plan_id) do update set
      phase_overrides = excluded.phase_overrides,
      entity_revision = excluded.entity_revision,
      updated_at = excluded.updated_at;
  elsif v_change.target_type = 'timeline_version' then
    update public.plans
    set
      timeline_version_id = coalesce(
        private.try_uuid(v_restore ->> 'timelineVersionId'),
        timeline_version_id
      ),
      route_id = coalesce(v_restore ->> 'routeId', route_id)
    where id = p_plan_id;
  else
    update public.plans
    set
      name = coalesce(v_restore ->> 'name', name),
      description = coalesce(v_restore ->> 'description', description),
      health_settings = coalesce(v_restore -> 'healthSettings', health_settings),
      route_id = coalesce(v_restore ->> 'routeId', route_id),
      metadata = coalesce(v_restore -> 'metadata', metadata)
    where id = p_plan_id;
  end if;

  update public.plans
  set revision = v_next_revision, last_modified_by = v_user_id, updated_at = now()
  where id = p_plan_id;

  insert into public.plan_changes (
    plan_id, operation_id, revision, base_revision, actor_id,
    operation_kind, target_type, target_key, before_data, after_data,
    inverse_operation
  ) values (
    p_plan_id, p_operation_id, v_next_revision, v_plan.revision, v_user_id,
    'undo', v_change.target_type, v_change.target_key, v_before, '{}'::jsonb,
    jsonb_build_object('kind', 'restore_workspace', 'changeRevision', v_next_revision)
  );

  v_after := private.plan_workspace_json(p_plan_id);
  update public.plan_changes
  set after_data = v_after
  where plan_id = p_plan_id and operation_id = p_operation_id;

  return v_after || jsonb_build_object(
    'committedChange',
    jsonb_build_object(
      'operationId', p_operation_id,
      'revision', v_next_revision,
      'actorId', v_user_id,
      'operationKind', 'undo'
    )
  );
end;
$$;

create or replace function public.undo_plan_change(
  p_plan_id uuid,
  p_change_id uuid,
  p_operation_id uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.undo_plan_change(p_plan_id, p_change_id, p_operation_id);
$$;

create or replace function private.save_plan_preferences(
  p_plan_id uuid,
  p_preferences jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.user_plan_preferences%rowtype;
begin
  if v_user_id is null or not private.plan_can_read(p_plan_id, v_user_id) then
    raise exception 'save_plan_preferences: forbidden' using errcode = '42501';
  end if;

  select * into v_row
  from public.user_plan_preferences
  where user_id = v_user_id and plan_id = p_plan_id;

  insert into public.user_plan_preferences (
    user_id,
    plan_id,
    last_phase_id,
    last_event_key,
    filters,
    panel_ratio,
    zoom,
    density,
    last_opened_at,
    updated_at
  ) values (
    v_user_id,
    p_plan_id,
    coalesce(p_preferences ->> 'lastPhaseId', v_row.last_phase_id),
    coalesce(p_preferences ->> 'lastEventKey', v_row.last_event_key),
    coalesce(p_preferences -> 'filters', v_row.filters, '{}'::jsonb),
    coalesce((p_preferences ->> 'panelRatio')::numeric, v_row.panel_ratio, 0.66),
    coalesce((p_preferences ->> 'zoom')::numeric, v_row.zoom, 1.00),
    coalesce(p_preferences ->> 'density', v_row.density, 'comfortable'),
    now(),
    now()
  )
  on conflict (user_id, plan_id) do update set
    last_phase_id = excluded.last_phase_id,
    last_event_key = excluded.last_event_key,
    filters = excluded.filters,
    panel_ratio = excluded.panel_ratio,
    zoom = excluded.zoom,
    density = excluded.density,
    last_opened_at = excluded.last_opened_at,
    updated_at = excluded.updated_at
  returning * into v_row;

  return jsonb_build_object(
    'lastPhaseId', v_row.last_phase_id,
    'lastEventKey', v_row.last_event_key,
    'filters', v_row.filters,
    'panelRatio', v_row.panel_ratio,
    'zoom', v_row.zoom,
    'density', v_row.density,
    'lastOpenedAt', v_row.last_opened_at
  );
end;
$$;

create or replace function public.save_plan_preferences(
  p_plan_id uuid,
  p_preferences jsonb
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.save_plan_preferences(p_plan_id, p_preferences);
$$;

create or replace function public.list_normalized_plans()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'list_normalized_plans: not authenticated' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'description', p.description,
        'bossId', coalesce(p.encounter_key, e.slug),
        'ownerId', p.owner_id,
        'userId', p.owner_id,
        'timelineVersionId', p.timeline_version_id,
        'timelineVersionLabel', tv.version_label,
        'timelineStatus', tv.status,
        'routeId', p.route_id,
        'schemaVersion', p.schema_version,
        'revision', p.revision,
        'updatedAt', extract(epoch from p.updated_at) * 1000,
        'createdAt', extract(epoch from p.created_at) * 1000,
        'lastAccessedAt', extract(epoch from coalesce(upp.last_opened_at, p.updated_at)) * 1000,
        'lastModifiedBy', p.last_modified_by,
        'selectedJobs', coalesce((
          select jsonb_object_agg(grouped.role_key, grouped.jobs)
          from (
            select ps.role_key, jsonb_agg(
              case when ps.job_data = '{}'::jsonb then to_jsonb(ps.job_key) else ps.job_data end
              order by ps.slot_index
            ) as jobs
            from public.party_slots ps
            where ps.plan_id = p.id
            group by ps.role_key
          ) grouped
        ), '{}'::jsonb),
        'accessLevel', case
          when p.owner_id = auth.uid() then 'owner'
          else lower(coalesce(pa.role::text, 'VIEWER'))
        end,
        'shareMode', case
          when p.owner_id = auth.uid() then 'owned'
          when pa.role in ('OWNER', 'EDITOR') then 'edit'
          else 'view'
        end
      )
      order by coalesce(upp.last_opened_at, p.updated_at) desc
    ),
    '[]'::jsonb
  )
  into v_result
  from public.plans p
  join public.encounters e on e.id = p.encounter_id
  left join public.timeline_versions tv on tv.id = p.timeline_version_id
  left join public.plan_access pa
    on pa.plan_id = p.id and pa.user_id = auth.uid()
  left join public.user_plan_preferences upp
    on upp.plan_id = p.id and upp.user_id = auth.uid()
  where p.owner_id = auth.uid() or pa.user_id = auth.uid();

  return v_result;
end;
$$;

create or replace function private.delete_normalized_plan(p_plan_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.plan_is_owner(p_plan_id) then
    raise exception 'delete_normalized_plan: owner access required' using errcode = '42501';
  end if;

  delete from public.plans where id = p_plan_id;
  return found;
end;
$$;

create or replace function public.delete_normalized_plan(p_plan_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.delete_normalized_plan(p_plan_id);
$$;

-- ---------------------------------------------------------------------------
-- Share and invite capability links
-- ---------------------------------------------------------------------------

create or replace function private.hash_capability_token(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(convert_to(p_token, 'utf8'), 'sha256'), 'hex');
$$;

create or replace function private.create_plan_share_link(
  p_plan_id uuid,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text;
  v_link_id uuid;
begin
  if v_user_id is null or not private.plan_is_owner(p_plan_id, v_user_id) then
    raise exception 'create_plan_share_link: owner access required' using errcode = '42501';
  end if;

  update public.plan_share_links
  set enabled = false, revoked_at = now()
  where plan_id = p_plan_id and enabled = true and revoked_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.plan_share_links (
    plan_id, token_hash, enabled, expires_at, created_by
  ) values (
    p_plan_id, private.hash_capability_token(v_token), true, p_expires_at, v_user_id
  )
  returning id into v_link_id;

  return jsonb_build_object('id', v_link_id, 'token', v_token, 'expiresAt', p_expires_at);
end;
$$;

create or replace function private.revoke_plan_share_links(p_plan_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.plan_is_owner(p_plan_id, auth.uid()) then
    raise exception 'revoke_plan_share_links: owner access required' using errcode = '42501';
  end if;

  update public.plan_share_links
  set enabled = false, revoked_at = now()
  where plan_id = p_plan_id and enabled = true and revoked_at is null;
  return true;
end;
$$;

create or replace function public.revoke_plan_share_links(p_plan_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.revoke_plan_share_links(p_plan_id);
$$;

create or replace function public.create_plan_share_link(
  p_plan_id uuid,
  p_expires_at timestamptz default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.create_plan_share_link(p_plan_id, p_expires_at);
$$;

create or replace function private.get_shared_plan(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_plan_id uuid;
  v_workspace jsonb;
begin
  if p_token is null or length(p_token) < 48 then
    raise exception 'get_shared_plan: invalid token' using errcode = '42501';
  end if;

  select psl.plan_id into v_plan_id
  from public.plan_share_links psl
  where psl.token_hash = private.hash_capability_token(p_token)
    and psl.enabled = true
    and psl.revoked_at is null
    and (psl.expires_at is null or psl.expires_at > now())
  limit 1;

  if v_plan_id is null then
    raise exception 'get_shared_plan: unavailable' using errcode = '42501';
  end if;

  v_workspace := private.plan_workspace_json(v_plan_id);
  return jsonb_build_object(
    'plan', (v_workspace -> 'plan') - array[
      'metadata',
      'ownerId',
      'userId',
      'lastModifiedBy',
      'accessLevel',
      'shareMode'
    ],
    'timelineVersion', v_workspace -> 'timelineVersion',
    'partySlots', (
      select coalesce(
        jsonb_agg(slot - array['playerUserId']),
        '[]'::jsonb
      )
      from jsonb_array_elements(
        coalesce(v_workspace -> 'partySlots', '[]'::jsonb)
      ) as public_slots(slot)
    ),
    'revision', v_workspace -> 'revision',
    'snapshotCreatedAt', extract(epoch from now()) * 1000
  );
end;
$$;

create or replace function public.get_shared_plan(p_token text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_shared_plan(p_token);
$$;

create or replace function private.create_plan_invite(
  p_plan_id uuid,
  p_role public.plan_access_role default 'EDITOR',
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text;
  v_link_id uuid;
begin
  if v_user_id is null or not private.plan_is_owner(p_plan_id, v_user_id) then
    raise exception 'create_plan_invite: owner access required' using errcode = '42501';
  end if;
  if p_role not in ('EDITOR', 'VIEWER') then
    raise exception 'create_plan_invite: unsupported role';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.plan_invite_links (
    plan_id, token_hash, role, enabled, expires_at, created_by
  ) values (
    p_plan_id, private.hash_capability_token(v_token), p_role, true, p_expires_at, v_user_id
  )
  returning id into v_link_id;

  return jsonb_build_object('id', v_link_id, 'token', v_token, 'role', p_role, 'expiresAt', p_expires_at);
end;
$$;

create or replace function public.create_plan_invite(
  p_plan_id uuid,
  p_role public.plan_access_role default 'EDITOR',
  p_expires_at timestamptz default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.create_plan_invite(p_plan_id, p_role, p_expires_at);
$$;

create or replace function private.revoke_plan_invites(p_plan_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.plan_is_owner(p_plan_id, auth.uid()) then
    raise exception 'revoke_plan_invites: owner access required' using errcode = '42501';
  end if;
  update public.plan_invite_links
  set revoked_at = now()
  where plan_id = p_plan_id and revoked_at is null and redeemed_at is null;
  return true;
end;
$$;

create or replace function public.revoke_plan_invites(p_plan_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.revoke_plan_invites(p_plan_id);
$$;

create or replace function private.redeem_plan_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.plan_invite_links%rowtype;
begin
  if v_user_id is null then
    raise exception 'redeem_plan_invite: sign in required' using errcode = '42501';
  end if;

  select * into v_invite
  from public.plan_invite_links pil
  where pil.token_hash = private.hash_capability_token(p_token)
    and pil.enabled = true
    and pil.revoked_at is null
    and (pil.expires_at is null or pil.expires_at > now())
  limit 1;

  if not found then
    raise exception 'redeem_plan_invite: unavailable' using errcode = '42501';
  end if;

  insert into public.plan_access (plan_id, user_id, role, via_share_token, granted_at)
  values (v_invite.plan_id, v_user_id, v_invite.role, true, now())
  on conflict (plan_id, user_id) do update set
    role = case
      when public.plan_access.role = 'OWNER' then 'OWNER'::public.plan_access_role
      when public.plan_access.role = 'EDITOR' or excluded.role = 'EDITOR' then 'EDITOR'::public.plan_access_role
      else excluded.role
    end,
    via_share_token = true;

  return jsonb_build_object('planId', v_invite.plan_id, 'role', v_invite.role);
end;
$$;

create or replace function public.redeem_plan_invite(p_token text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.redeem_plan_invite(p_token);
$$;

-- ---------------------------------------------------------------------------
-- Realtime Broadcast + Presence authorization
-- ---------------------------------------------------------------------------

create or replace function private.plan_topic_id()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_topic text := realtime.topic();
begin
  if v_topic !~ '^plan:[0-9a-fA-F-]{36}$' then
    return null;
  end if;
  return split_part(v_topic, ':', 2)::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create or replace function private.plan_topic_can_read()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.plan_can_read(private.plan_topic_id(), auth.uid());
$$;

create or replace function private.plan_topic_can_edit()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.plan_can_edit(private.plan_topic_id(), auth.uid());
$$;

create or replace function private.broadcast_plan_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.broadcast_changes(
    'plan:' || new.plan_id::text,
    'plan_change',
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return null;
end;
$$;

drop trigger if exists broadcast_plan_change on public.plan_changes;
create trigger broadcast_plan_change
  after update of after_data on public.plan_changes
  for each row
  when (old.after_data is distinct from new.after_data)
  execute function private.broadcast_plan_change();

drop policy if exists xivmitplan_plan_receive on realtime.messages;
drop policy if exists xivmitplan_plan_publish on realtime.messages;
drop policy if exists mitplan_plan_receive on realtime.messages;
drop policy if exists mitplan_plan_presence_publish on realtime.messages;
drop policy if exists mitplan_plan_broadcast_publish on realtime.messages;

create policy mitplan_plan_receive
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and private.plan_topic_can_read()
);

create policy mitplan_plan_presence_publish
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'presence'
  and private.plan_topic_can_read()
);

create policy mitplan_plan_broadcast_publish
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and realtime.messages.event = 'cursor'
  and private.plan_topic_can_read()
);

-- ---------------------------------------------------------------------------
-- RLS, explicit grants, and API execution permissions
-- ---------------------------------------------------------------------------

alter table public.timeline_versions enable row level security;
alter table public.party_slots enable row level security;
alter table public.plan_assignments enable row level security;
alter table public.plan_timeline_overrides enable row level security;
alter table public.plan_changes enable row level security;
alter table public.user_plan_preferences enable row level security;
alter table public.plan_share_links enable row level security;
alter table public.plan_invite_links enable row level security;
alter table public.plan_backfill_reports enable row level security;

drop policy if exists timeline_versions_read on public.timeline_versions;
create policy timeline_versions_read
on public.timeline_versions
for select
to authenticated
using (
  status = 'published'
  or exists (
    select 1 from public.plans p
    where p.timeline_version_id = timeline_versions.id
      and private.plan_can_read(p.id)
  )
);

drop policy if exists party_slots_read on public.party_slots;
create policy party_slots_read
on public.party_slots
for select
to authenticated
using (private.plan_can_read(plan_id));

drop policy if exists plan_assignments_read on public.plan_assignments;
create policy plan_assignments_read
on public.plan_assignments
for select
to authenticated
using (private.plan_can_read(plan_id));

drop policy if exists plan_timeline_overrides_read on public.plan_timeline_overrides;
create policy plan_timeline_overrides_read
on public.plan_timeline_overrides
for select
to authenticated
using (private.plan_can_read(plan_id));

drop policy if exists plan_changes_read on public.plan_changes;
create policy plan_changes_read
on public.plan_changes
for select
to authenticated
using (private.plan_can_read(plan_id));

drop policy if exists user_plan_preferences_read on public.user_plan_preferences;
drop policy if exists user_plan_preferences_insert on public.user_plan_preferences;
drop policy if exists user_plan_preferences_update on public.user_plan_preferences;
create policy user_plan_preferences_read
on public.user_plan_preferences
for select
to authenticated
using ((select auth.uid()) = user_id and private.plan_can_read(plan_id));
create policy user_plan_preferences_insert
on public.user_plan_preferences
for insert
to authenticated
with check ((select auth.uid()) = user_id and private.plan_can_read(plan_id));
create policy user_plan_preferences_update
on public.user_plan_preferences
for update
to authenticated
using ((select auth.uid()) = user_id and private.plan_can_read(plan_id))
with check ((select auth.uid()) = user_id and private.plan_can_read(plan_id));

revoke all on public.timeline_versions from anon, authenticated;
revoke all on public.party_slots from anon, authenticated;
revoke all on public.plan_assignments from anon, authenticated;
revoke all on public.plan_timeline_overrides from anon, authenticated;
revoke all on public.plan_changes from anon, authenticated;
revoke all on public.user_plan_preferences from anon, authenticated;
revoke all on public.plan_share_links from anon, authenticated;
revoke all on public.plan_invite_links from anon, authenticated;
revoke all on public.plan_backfill_reports from anon, authenticated;
revoke all on public.plan_members from anon, authenticated;

grant select on public.timeline_versions to authenticated;
grant select on public.party_slots to authenticated;
grant select on public.plan_assignments to authenticated;
grant select on public.plan_timeline_overrides to authenticated;
grant select on public.plan_changes to authenticated;
grant select, insert, update on public.user_plan_preferences to authenticated;
grant select on public.plan_members to authenticated;

revoke all on function public.load_plan_workspace(uuid, bigint) from public;
revoke all on function public.create_normalized_plan(jsonb) from public;
revoke all on function public.list_published_timeline_versions(text) from public;
revoke all on function public.preview_timeline_upgrade(uuid, uuid) from public;
revoke all on function public.publish_timeline_version(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.apply_plan_operation(uuid, uuid, bigint, jsonb) from public;
revoke all on function public.undo_plan_change(uuid, uuid, uuid) from public;
revoke all on function public.save_plan_preferences(uuid, jsonb) from public;
revoke all on function public.list_normalized_plans() from public;
revoke all on function public.delete_normalized_plan(uuid) from public;
revoke all on function public.create_plan_share_link(uuid, timestamptz) from public;
revoke all on function public.revoke_plan_share_links(uuid) from public;
revoke all on function public.get_shared_plan(text) from public;
revoke all on function public.create_plan_invite(uuid, public.plan_access_role, timestamptz) from public;
revoke all on function public.revoke_plan_invites(uuid) from public;
revoke all on function public.redeem_plan_invite(text) from public;

grant execute on function public.load_plan_workspace(uuid, bigint) to authenticated;
grant execute on function public.create_normalized_plan(jsonb) to authenticated;
grant execute on function public.list_published_timeline_versions(text) to authenticated;
grant execute on function public.preview_timeline_upgrade(uuid, uuid) to authenticated;
grant execute on function public.publish_timeline_version(uuid, jsonb) to service_role;
grant execute on function public.apply_plan_operation(uuid, uuid, bigint, jsonb) to authenticated;
grant execute on function public.undo_plan_change(uuid, uuid, uuid) to authenticated;
grant execute on function public.save_plan_preferences(uuid, jsonb) to authenticated;
grant execute on function public.list_normalized_plans() to authenticated;
grant execute on function public.delete_normalized_plan(uuid) to authenticated;
grant execute on function public.create_plan_share_link(uuid, timestamptz) to authenticated;
grant execute on function public.revoke_plan_share_links(uuid) to authenticated;
grant execute on function public.get_shared_plan(text) to anon, authenticated;
grant execute on function public.create_plan_invite(uuid, public.plan_access_role, timestamptz) to authenticated;
grant execute on function public.revoke_plan_invites(uuid) to authenticated;
grant execute on function public.redeem_plan_invite(text) to authenticated;

revoke all on all functions in schema private from public;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
-- The public RPC wrappers are security-invoker functions. Grant only the
-- private implementations they call; the private schema is not exposed by
-- PostgREST, so these remain unavailable as direct Data API endpoints.
grant execute on function private.plan_can_read(uuid, uuid) to authenticated;
grant execute on function private.plan_can_edit(uuid, uuid) to authenticated;
grant execute on function private.plan_is_owner(uuid, uuid) to authenticated;
grant execute on function private.plan_workspace_json(uuid) to authenticated;
grant execute on function private.create_normalized_plan(jsonb) to authenticated;
grant execute on function private.preview_timeline_upgrade(uuid, uuid) to authenticated;
grant execute on function private.apply_plan_operation(uuid, uuid, bigint, jsonb) to authenticated;
grant execute on function private.undo_plan_change(uuid, uuid, uuid) to authenticated;
grant execute on function private.save_plan_preferences(uuid, jsonb) to authenticated;
grant execute on function private.delete_normalized_plan(uuid) to authenticated;
grant execute on function private.create_plan_share_link(uuid, timestamptz) to authenticated;
grant execute on function private.revoke_plan_share_links(uuid) to authenticated;
grant execute on function private.get_shared_plan(text) to anon, authenticated;
grant execute on function private.create_plan_invite(uuid, public.plan_access_role, timestamptz) to authenticated;
grant execute on function private.revoke_plan_invites(uuid) to authenticated;
grant execute on function private.redeem_plan_invite(text) to authenticated;
grant execute on function private.plan_topic_can_read() to authenticated;
grant execute on function private.plan_topic_can_edit() to authenticated;

-- Direct plan mutations now go through apply_plan_operation. Existing owner
-- and collaborator SELECT access remains available for list/read RPCs.
revoke insert, update, delete on public.plans from anon, authenticated;

-- ---------------------------------------------------------------------------
-- One-time app_documents backfill, callable only by postgres/service_role
-- ---------------------------------------------------------------------------

create or replace function public.backfill_normalized_plans()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document record;
  v_owner_id uuid;
  v_plan_id uuid;
  v_encounter_id uuid;
  v_boss_id text;
  v_workspace jsonb;
  v_collaborator record;
  v_collaborator_id uuid;
  v_timeline_version_id uuid;
  v_assignment_count integer;
  v_unresolved jsonb;
  v_migrated integer := 0;
  v_skipped integer := 0;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception 'backfill_normalized_plans: service role required' using errcode = '42501';
  end if;

  for v_document in
    select key, data
    from public.app_documents
    where collection = 'plans'
    order by key
  loop
    begin
      v_owner_id := private.try_uuid(coalesce(
        v_document.data ->> 'ownerId',
        v_document.data ->> 'userId'
      ));
      v_plan_id := private.try_uuid(v_document.key);

      if v_owner_id is null or v_plan_id is null then
        insert into public.plan_backfill_reports (
          legacy_key, plan_id, status, unresolved_keys, source_checksum, details
        ) values (
          v_document.key,
          v_plan_id,
          'skipped',
          jsonb_build_array('invalid-plan-or-owner-uuid'),
          md5(v_document.data::text),
          jsonb_build_object('ownerId', v_document.data ->> 'ownerId')
        )
        on conflict (legacy_key) do update set
          status = excluded.status,
          unresolved_keys = excluded.unresolved_keys,
          source_checksum = excluded.source_checksum,
          details = excluded.details,
          created_at = now();
        v_skipped := v_skipped + 1;
        continue;
      end if;

      v_boss_id := coalesce(
        v_document.data #>> '{timelineLayout,bossId}',
        v_document.data ->> 'bossId',
        v_document.data #>> '{selectedBoss,id}',
        'legacy-import-sentinel'
      );

      select id into v_encounter_id
      from public.encounters
      where slug = v_boss_id
      limit 1;

      if v_encounter_id is null then
        select id into v_encounter_id
        from public.encounters
        where slug = 'legacy-import-sentinel'
        limit 1;
      end if;

      insert into public.plans (
        id,
        owner_id,
        name,
        description,
        encounter_id,
        encounter_key,
        mode,
        is_legacy,
        schema_version,
        revision,
        health_settings,
        metadata,
        legacy_key,
        last_modified_by,
        created_at,
        updated_at
      ) values (
        v_plan_id,
        v_owner_id,
        coalesce(
          nullif(v_document.data ->> 'name', ''),
          nullif(v_document.data ->> 'title', ''),
          'Untitled Plan'
        ),
        coalesce(v_document.data ->> 'description', ''),
        v_encounter_id,
        v_boss_id,
        'CURRENT',
        true,
        coalesce((v_document.data ->> 'schemaVersion')::integer, 1),
        0,
        coalesce(v_document.data -> 'healthSettings', '{}'::jsonb),
        '{}'::jsonb,
        v_document.key,
        private.try_uuid(v_document.data ->> 'lastModifiedBy'),
        coalesce(
          to_timestamp((v_document.data ->> 'createdAt')::double precision / 1000),
          now()
        ),
        coalesce(
          to_timestamp((v_document.data ->> 'updatedAt')::double precision / 1000),
          now()
        )
      )
      on conflict (id) do update set
        legacy_key = excluded.legacy_key,
        encounter_key = excluded.encounter_key,
        description = excluded.description,
        updated_at = greatest(public.plans.updated_at, excluded.updated_at);

      perform private.populate_plan_payload(v_plan_id, v_document.data, 0);

      for v_collaborator in
        select key as user_id, value as collaborator
        from jsonb_each(coalesce(v_document.data -> 'collaborators', '{}'::jsonb))
      loop
        v_collaborator_id := private.try_uuid(v_collaborator.user_id);
        if v_collaborator_id is not null and v_collaborator_id <> v_owner_id then
          insert into public.plan_access (
            plan_id, user_id, role, via_share_token, granted_at
          ) values (
            v_plan_id,
            v_collaborator_id,
            'EDITOR',
            true,
            coalesce(
              to_timestamp((v_collaborator.collaborator ->> 'addedAt')::double precision / 1000),
              now()
            )
          )
          on conflict (plan_id, user_id) do update set role = 'EDITOR';
        end if;
      end loop;

      if coalesce((v_document.data #>> '{shareSettings,viewEnabled}')::boolean, false)
        and length(coalesce(v_document.data #>> '{shareSettings,viewToken}', '')) >= 32
      then
        insert into public.plan_share_links (
          plan_id, token_hash, enabled, created_by, created_at
        ) values (
          v_plan_id,
          private.hash_capability_token(v_document.data #>> '{shareSettings,viewToken}'),
          true,
          v_owner_id,
          now()
        )
        on conflict (token_hash) do nothing;
      end if;

      select count(*) into v_assignment_count
      from public.plan_assignments
      where plan_id = v_plan_id;

      select timeline_version_id into v_timeline_version_id
      from public.plans
      where id = v_plan_id;

      v_workspace := private.plan_workspace_json(v_plan_id);
      select coalesce(jsonb_agg(issue order by issue ->> 'type', issue ->> 'key'), '[]'::jsonb)
      into v_unresolved
      from (
        select distinct jsonb_build_object(
          'type', 'ability',
          'key', pa.ability_key
        ) as issue
        from public.plan_assignments pa
        where pa.plan_id = v_plan_id
          and not exists (
            select 1 from public.abilities ability
            where ability.ability_id = pa.ability_key
          )
        union
        select distinct jsonb_build_object(
          'type', 'event',
          'key', pa.event_key
        ) as issue
        from public.plan_assignments pa
        join public.timeline_versions tv on tv.id = v_timeline_version_id
        where pa.plan_id = v_plan_id
          and not exists (
            select 1
            from jsonb_array_elements(coalesce(tv.document -> 'actions', '[]'::jsonb)) event
            where coalesce(event ->> 'eventKey', event ->> 'id') = pa.event_key
          )
      ) unresolved;

      insert into public.plan_backfill_reports (
        legacy_key,
        plan_id,
        status,
        timeline_version_id,
        assignment_count,
        unresolved_keys,
        source_checksum,
        details
      ) values (
        v_document.key,
        v_plan_id,
        'migrated',
        v_timeline_version_id,
        v_assignment_count,
        v_unresolved,
        md5(v_document.data::text),
        jsonb_build_object(
          'workspaceChecksum', md5(v_workspace::text),
          'bossId', v_boss_id
        )
      )
      on conflict (legacy_key) do update set
        plan_id = excluded.plan_id,
        status = excluded.status,
        timeline_version_id = excluded.timeline_version_id,
        assignment_count = excluded.assignment_count,
        unresolved_keys = excluded.unresolved_keys,
        source_checksum = excluded.source_checksum,
        details = excluded.details,
        created_at = now();

      v_migrated := v_migrated + 1;
    exception when others then
      insert into public.plan_backfill_reports (
        legacy_key, plan_id, status, unresolved_keys, source_checksum, details
      ) values (
        v_document.key,
        v_plan_id,
        'failed',
        jsonb_build_array(sqlstate),
        md5(v_document.data::text),
        jsonb_build_object('message', sqlerrm)
      )
      on conflict (legacy_key) do update set
        plan_id = excluded.plan_id,
        status = excluded.status,
        unresolved_keys = excluded.unresolved_keys,
        source_checksum = excluded.source_checksum,
        details = excluded.details,
        created_at = now();
      v_skipped := v_skipped + 1;
    end;
  end loop;

  return jsonb_build_object(
    'migrated', v_migrated,
    'skippedOrFailed', v_skipped,
    'reports', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.legacy_key), '[]'::jsonb)
      from public.plan_backfill_reports r
    )
  );
end;
$$;

revoke all on function public.backfill_normalized_plans() from public, anon, authenticated;
grant execute on function public.backfill_normalized_plans() to service_role;
