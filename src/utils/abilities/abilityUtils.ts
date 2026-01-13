import type { MitigationAbility, SelectedJobs, JobId, Job } from '../../types';

type JobsArray = Job[] | JobId[];

const isJobIdArray = (jobs: JobsArray): jobs is JobId[] => {
  return jobs.length > 0 && typeof jobs[0] === 'string';
};

const isJobObjectArray = (jobs: JobsArray): jobs is Job[] => {
  return jobs.length > 0 && typeof jobs[0] === 'object' && jobs[0] !== null;
};

const findHighestLevel = (levelMap: Record<number, unknown>, maxLevel: number): number | null => {
  const levels = Object.keys(levelMap)
    .map(Number)
    .filter(level => level <= maxLevel)
    .sort((a, b) => b - a);
  return levels.length > 0 ? levels[0]! : null;
};

export const filterAbilitiesByLevel = (
  abilities: MitigationAbility[] | null | undefined,
  selectedJobs: SelectedJobs | null | undefined,
  bossLevel: number
): MitigationAbility[] => {
  if (!abilities || !bossLevel) return [];

  return abilities.filter(ability => {
    if (ability.levelRequirement && ability.levelRequirement > bossLevel) {
      return false;
    }

    if (!selectedJobs) return true;

    return ability.jobs.some(jobId => {
      for (const [, jobs] of Object.entries(selectedJobs)) {
        if (Array.isArray(jobs)) {
          if (isJobIdArray(jobs)) {
            if (jobs.includes(jobId)) {
              return true;
            }
          } else if (isJobObjectArray(jobs)) {
            const job = jobs.find(j => j && j.id === jobId);
            if (job && job.selected) {
              return true;
            }
          }
        }
      }
      return false;
    });
  });
};

export const getAbilityDescriptionForLevel = (
  ability: MitigationAbility | null | undefined,
  bossLevel: number
): string => {
  if (!ability || !bossLevel) return ability?.description || '';

  if (!ability.levelDescriptions) return ability.description;

  const level = findHighestLevel(ability.levelDescriptions, bossLevel);
  if (level === null) return ability.description;

  return ability.levelDescriptions[level] ?? ability.description;
};

export const getAbilityCooldownForLevel = (
  ability: MitigationAbility | null | undefined,
  bossLevel: number
): number => {
  if (!ability || !bossLevel) return ability?.cooldown || 0;

  if (!ability.levelCooldowns) return ability.cooldown;

  const level = findHighestLevel(ability.levelCooldowns, bossLevel);
  if (level === null) return ability.cooldown;

  return ability.levelCooldowns[level] ?? ability.cooldown;
};

export const getAbilityMitigationValueForLevel = (
  ability: MitigationAbility | null | undefined,
  bossLevel: number
): number | { physical: number; magical: number } | undefined => {
  if (!ability || !bossLevel) return ability?.mitigationValue || 0;

  if (!ability.levelMitigationValues) return ability.mitigationValue;

  const level = findHighestLevel(ability.levelMitigationValues, bossLevel);
  if (level === null) return ability.mitigationValue;

  return ability.levelMitigationValues[level] ?? ability.mitigationValue;
};

export const getAbilityDurationForLevel = (
  ability: MitigationAbility | null | undefined,
  bossLevel: number
): number => {
  if (!ability || !bossLevel) return ability?.duration || 0;

  if (!ability.levelDurations) {
    if (ability.levelDescriptions) {
      const description = getAbilityDescriptionForLevel(ability, bossLevel);
      const durationMatch = description.match(/for (\d+)s/);
      if (durationMatch && durationMatch[1]) {
        return parseInt(durationMatch[1], 10);
      }
    }
    return ability.duration;
  }

  const level = findHighestLevel(ability.levelDurations, bossLevel);
  if (level === null) return ability.duration;

  return ability.levelDurations[level] ?? ability.duration;
};

export const getAbilityChargeCount = (
  ability: MitigationAbility | null | undefined,
  bossLevel?: number
): number => {
  if (!ability) return 1;

  if (!ability.count) return 1;

  interface LevelCharges {
    [level: number]: number;
  }

  const abilityWithCharges = ability as MitigationAbility & { levelCharges?: LevelCharges };
  
  if (abilityWithCharges.levelCharges && bossLevel) {
    const level = findHighestLevel(abilityWithCharges.levelCharges, bossLevel);
    if (level !== null) {
      return abilityWithCharges.levelCharges[level] ?? ability.count;
    }
  }

  return ability.count;
};

export const getRoleSharedAbilityCount = (
  ability: MitigationAbility | null | undefined,
  selectedJobs: SelectedJobs | null | undefined
): number => {
  if (!ability || !ability.isRoleShared) return 1;

  if (!selectedJobs) return 0;

  let count = 0;

  for (const jobId of ability.jobs) {
    for (const [, jobs] of Object.entries(selectedJobs)) {
      if (Array.isArray(jobs)) {
        if (isJobIdArray(jobs)) {
          if (jobs.includes(jobId)) {
            count++;
            break;
          }
        } else if (isJobObjectArray(jobs)) {
          const job = jobs.find(j => j && j.id === jobId);
          if (job && job.selected) {
            count++;
            break;
          }
        }
      }
    }
  }

  return count;
};

export const isSelfTargetingAbilityUsableByTank = (
  ability: MitigationAbility | null | undefined,
  tankJobId: JobId,
  _tankPositions?: unknown
): boolean => {
  if (!ability || ability.target !== 'self' || !ability.forTankBusters) {
    return true;
  }

  if (ability.jobs.includes(tankJobId)) {
    return true;
  }

  return false;
};

export const filterAbilityUpgrades = (
  abilities: MitigationAbility[] | null | undefined,
  bossLevel: number
): MitigationAbility[] => {
  if (!abilities || !bossLevel) return abilities || [];

  return abilities.filter(ability => {
    if (ability.upgradedBy) {
      const upgradeAbility = abilities.find(a => a.id === ability.upgradedBy);

      if (upgradeAbility && upgradeAbility.levelRequirement <= bossLevel) {
        return false;
      }
    }

    return true;
  });
};

export const getAvailableAbilities = (
  abilities: MitigationAbility[] | null | undefined,
  selectedJobs: SelectedJobs | null | undefined,
  bossLevel: number
): MitigationAbility[] => {
  if (!abilities) return [];

  const levelFiltered = filterAbilitiesByLevel(abilities, selectedJobs, bossLevel);

  return filterAbilityUpgrades(levelFiltered, bossLevel);
};

export default {
  filterAbilitiesByLevel,
  getAbilityDescriptionForLevel,
  getAbilityCooldownForLevel,
  getAbilityMitigationValueForLevel,
  getAbilityDurationForLevel,
  getAbilityChargeCount,
  getRoleSharedAbilityCount,
  isSelfTargetingAbilityUsableByTank,
  filterAbilityUpgrades,
  getAvailableAbilities
};
