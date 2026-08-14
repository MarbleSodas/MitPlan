import type {
  AbilityMode,
  Job,
  MitigationAbility,
  PlanAbilityMode,
} from '../../types';

export const DEFAULT_PLAN_ABILITY_MODE: PlanAbilityMode = 'CURRENT';

export const PLAN_ABILITY_MODE_OPTIONS: ReadonlyArray<{
  value: PlanAbilityMode;
  label: string;
  description: string;
}> = [
  {
    value: 'CURRENT',
    label: 'Current (Dawntrail)',
    description: 'Use the live pre-Evercold job actions.',
  },
  {
    value: 'REBORN',
    label: 'Reborn (Evercold)',
    description: 'Use the Evercold mode based on the current combat system.',
  },
  {
    value: 'EVOLVED',
    label: 'Evolved (Evercold)',
    description: 'Use verified Evolved-only job actions as they are published.',
  },
] as const;

const PLAN_MODES = new Set<PlanAbilityMode>(['CURRENT', 'REBORN', 'EVOLVED']);

export function normalizePlanAbilityMode(
  value: unknown,
  fallback: PlanAbilityMode = DEFAULT_PLAN_ABILITY_MODE
): PlanAbilityMode {
  const normalized = typeof value === 'string' ? value.toUpperCase() : '';
  return PLAN_MODES.has(normalized as PlanAbilityMode)
    ? normalized as PlanAbilityMode
    : fallback;
}

export function getPlanAbilityModeLabel(value: unknown): string {
  const mode = normalizePlanAbilityMode(value);
  return PLAN_ABILITY_MODE_OPTIONS.find((option) => option.value === mode)?.label || mode;
}

export function getAbilityModes(ability: Pick<MitigationAbility, 'modes'>): AbilityMode[] {
  if (Array.isArray(ability.modes) && ability.modes.length > 0) {
    return [...new Set(ability.modes)];
  }

  // Reborn is explicitly based on the current battle system. This compatibility
  // rule keeps the existing catalog usable without claiming it is valid for
  // Evolved mode before the official job guides are available.
  return ['CURRENT', 'REBORN'];
}

export function isAbilityAvailableInMode(
  ability: Pick<MitigationAbility, 'modes'> | null | undefined,
  mode: PlanAbilityMode
): boolean {
  if (!ability) return false;
  const modes = getAbilityModes(ability);
  return modes.includes('ALL') || modes.includes(mode);
}

export function isJobAvailableInMode(
  job: Pick<Job, 'availableModes' | 'evolvedOnly'> | null | undefined,
  mode: PlanAbilityMode
): boolean {
  if (!job) return false;
  if (job.evolvedOnly) return mode === 'EVOLVED';
  if (!job.availableModes?.length) return true;
  return job.availableModes.includes(mode);
}
