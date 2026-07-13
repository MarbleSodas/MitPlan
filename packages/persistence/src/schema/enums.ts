/**
 * Postgres enums. Architecture §17.1, §19.2.
 */
import { pgEnum } from 'drizzle-orm/pg-core';

export const abilityModeEnum = pgEnum('ability_mode', [
  'REBORN',
  'EVOLVED',
  'CURRENT',
  'ALL',
]);

export const roleEnum = pgEnum('role_kind', [
  'TANK',
  'HEALER',
  'MELEE',
  'RANGED',
  'CASTER',
]);

export const timelineSourceEnum = pgEnum('timeline_source', [
  'CACTBOT',
  'TRIGGERNOMETRY',
  'FFLOGS',
  'MERGED',
  'MANUAL',
]);

export const snapshotReasonEnum = pgEnum('snapshot_reason', [
  'IDLE',
  'USER_SAVE',
  'ASSIGNMENT_DELETE',
  'REBUILD',
]);

export const planAccessRoleEnum = pgEnum('plan_access_role', ['OWNER', 'EDITOR', 'VIEWER']);
