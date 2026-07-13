/**
 * Reference catalog aggregates. See architecture §9 and §10.1.
 * Pure value objects — no I/O. The Postgres implementations live in
 * `@xivmitplan/persistence/repositories/abilities` (etc.).
 */
import type { AbilityId, JobId, RoleId, EncounterId, ExpansionId, RaidId } from '../ids/index.js';
import type { AbilityMode, Role } from '@xivmitplan/validation/ability';

/** A mitigation ability (or heal, shield, or invuln). One row per (jobId, abilityId, mode). */
export interface Ability {
  readonly id: AbilityId;
  readonly jobId: JobId;
  readonly abilityId: string; // Stable game-data ID across patches
  readonly mode: AbilityMode;
  readonly name: string;
  readonly description: string | null;
  /** 0-100, the multiplicative mit percentage. null for non-mits. */
  readonly effectPct: number | null;
  /** Recast in seconds. */
  readonly recastS: number | null;
  /** Range in meters. */
  readonly rangeM: number | null;
  /** Duration in seconds. */
  readonly durationS: number | null;
  readonly isInvuln: boolean;
  readonly isHeal: boolean;
  readonly isShield: boolean;
  readonly effectiveFrom: string; // patch version
  readonly effectiveTo: string | null; // null = currently effective
}

/** A class in FFXIV (PLD, WAR, SCH, AST, ...). */
export interface Job {
  readonly id: JobId;
  readonly name: string; // e.g. "Paladin"
  readonly abbreviation: string; // e.g. "PLD"
  readonly roleId: RoleId;
  /** True if the job exists only in REBORN/EVOLVED mode (8.0). */
  readonly evolvedOnly: boolean;
  /** True if the job is in the new 8.0 release. */
  readonly isNew: boolean;
}

/** A role (tank, healer, melee, ranged, caster). */
export interface Role_ {
  readonly id: RoleId;
  readonly name: Role;
  readonly abbreviation: string;
}

/** A boss encounter in a raid tier. */
export interface Encounter {
  readonly id: EncounterId;
  readonly raidId: RaidId;
  readonly name: string; // e.g. "Light Rampant"
  readonly slug: string; // e.g. "fru-p1"
  readonly patchVersion: string;
  readonly bossNpcSourceId: number | null; // FFLogs source ID
  /** Effective from patch version. */
  readonly effectiveFrom: string;
  /** Effective to patch version. */
  readonly effectiveTo: string | null;
}

/** A raid tier (FRU, M1S-M4S, etc.). */
export interface Raid {
  readonly id: RaidId;
  readonly expansionId: ExpansionId;
  readonly name: string;
  readonly slug: string;
  readonly patchVersion: string;
  readonly tier: number;
}

/** A game expansion. */
export interface Expansion {
  readonly id: ExpansionId;
  readonly name: string; // e.g. "Dawntrail", "Evercold"
  readonly slug: string;
  readonly releasePatch: string; // e.g. "7.0", "8.0"
}
