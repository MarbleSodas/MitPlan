import type { MitigationAbility, BossAction, SelectedJobs, Job, JobId, AssignedMitigation, MitigationAssignments } from '../../types';
import {
  getAbilityMitigationValueForLevel,
  getAbilityDurationForLevel,
  getAbilityChargeCount,
  getAbilityCooldownForLevel
} from '../abilities/abilityUtils';
import { formatPercentage } from '../health/healthBarUtils';

type JobsArray = Job[] | JobId[];

const isJobIdArray = (jobs: JobsArray): jobs is JobId[] => {
  return jobs.length > 0 && typeof jobs[0] === 'string';
};

const isJobObjectArray = (jobs: JobsArray): jobs is Job[] => {
  return jobs.length > 0 && typeof jobs[0] === 'object' && jobs[0] !== null;
};

interface ActiveMitigation extends AssignedMitigation {
  sourceActionId: string;
  sourceActionName: string;
  sourceActionTime: number;
  remainingDuration: number;
}

export const findActiveMitigationsAtTime = (
  assignments: MitigationAssignments | null | undefined,
  bossActions: BossAction[] | null | undefined,
  mitigationAbilities: MitigationAbility[],
  targetActionId: string,
  targetTime: number,
  bossLevel: number = 90
): ActiveMitigation[] => {
  if (!bossActions || !Array.isArray(bossActions) || !assignments) {
    return [];
  }

  const activeMitigations: ActiveMitigation[] = [];

  const sortedActions = [...bossActions].sort((a, b) => a.time - b.time);

  for (const action of sortedActions) {
    if (action.id === targetActionId) {
      continue;
    }

    const actionMitigations = assignments[action.id] || [];

    for (const assignedMitigation of actionMitigations) {
      const mitigation = mitigationAbilities.find(m => m.id === assignedMitigation.id);
      if (!mitigation) continue;

      const duration = getAbilityDurationForLevel(mitigation, bossLevel);

      let precast = Number(assignedMitigation.precastSeconds);
      if (!Number.isFinite(precast) || precast < 0) precast = 0;
      const startTime = Math.max(0, action.time - precast);
      const endTime = startTime + duration;

      if (startTime > targetTime) {
        continue;
      }

      const isBarrierWithoutRegen = mitigation.type === 'barrier' && !mitigation.regenPotency && !mitigation.regenDuration;
      const isInstantHealingWithoutRegen = mitigation.type === 'healing' &&
        mitigation.healingType === 'instant' &&
        !mitigation.regenPotency &&
        !mitigation.regenDuration;
      const isHealingWithBarrier = mitigation.type === 'healing' && mitigation.barrierPotency;
      const isDurationHealingSingleAction = mitigation.type === 'healing' &&
        (mitigation.duration && mitigation.duration > 0) &&
        mitigation.healingType !== 'boost' &&
        !mitigation.regenPotency && !mitigation.regenDuration;

      if (isBarrierWithoutRegen || isInstantHealingWithoutRegen || isHealingWithBarrier || isDurationHealingSingleAction) {
        if (action.id !== targetActionId) {
          continue;
        }
      }

      if (endTime > targetTime) {
        activeMitigations.push({
          ...assignedMitigation,
          sourceActionId: action.id,
          sourceActionName: action.name,
          sourceActionTime: startTime,
          remainingDuration: endTime - targetTime
        });
      }
    }
  }

  return activeMitigations;
};

interface MitigationWithValue {
  mitigationValue?: number | { physical: number; magical: number };
  damageType?: string;
}

export const calculateTotalMitigation = (
  mitigations: MitigationWithValue[] | null | undefined,
  damageType: string = 'both',
  bossLevel: number | null = null
): number => {
  if (!mitigations || mitigations.length === 0) {
    return 0;
  }

  let totalMultiplier = 1.0;

  mitigations.forEach(mitigation => {
    const mitigationValue = bossLevel ?
      getAbilityMitigationValueForLevel(mitigation as MitigationAbility, bossLevel) :
      mitigation.mitigationValue;

    if (!mitigationValue) {
      return;
    }

    if (typeof mitigationValue === 'object') {
      if (damageType === 'magical' && mitigationValue.magical) {
        totalMultiplier *= (1 - mitigationValue.magical);
      } else if (damageType === 'physical' && mitigationValue.physical) {
        totalMultiplier *= (1 - mitigationValue.physical);
      } else if (damageType === 'both') {
        const value = Math.max(
          mitigationValue.magical || 0,
          mitigationValue.physical || 0
        );
        totalMultiplier *= (1 - value);
      }
    }
    else if (
      mitigation.damageType === 'both' ||
      mitigation.damageType === damageType ||
      !mitigation.damageType
    ) {
      totalMultiplier *= (1 - mitigationValue);
    }
  });

  const mitigationPercentage = 1 - totalMultiplier;

  return mitigationPercentage;
};

export const formatMitigation = formatPercentage;

interface MitigationWithName extends MitigationWithValue {
  name: string;
}

export const generateMitigationBreakdown = (
  mitigations: MitigationWithName[] | null | undefined,
  damageType: string = 'both',
  bossLevel: number | null = null
): string => {
  if (!mitigations || mitigations.length === 0) {
    return 'No mitigation applied';
  }

  const totalMitigation = calculateTotalMitigation(mitigations, damageType, bossLevel);
  let breakdown = `Total mitigation: ${formatMitigation(totalMitigation)}\n\nBreakdown:`;

  mitigations.forEach(mitigation => {
    const mitigationValue = bossLevel ?
      getAbilityMitigationValueForLevel(mitigation as MitigationAbility, bossLevel) :
      mitigation.mitigationValue;

    if (!mitigationValue) {
      return;
    }

    let value = 0;

    if (typeof mitigationValue === 'object') {
      if (damageType === 'magical' && mitigationValue.magical) {
        value = mitigationValue.magical;
      } else if (damageType === 'physical' && mitigationValue.physical) {
        value = mitigationValue.physical;
      } else if (damageType === 'both') {
        const magicalValue = mitigationValue.magical || 0;
        const physicalValue = mitigationValue.physical || 0;

        if (magicalValue === physicalValue) {
          value = magicalValue;
        } else {
          breakdown += `\n• ${mitigation.name}: ${formatMitigation(physicalValue)} physical, ${formatMitigation(magicalValue)} magical`;
          return;
        }
      }
    }
    else if (
      mitigation.damageType === 'both' ||
      mitigation.damageType === damageType ||
      !mitigation.damageType
    ) {
      value = mitigationValue;
    } else {
      return;
    }

    breakdown += `\n• ${mitigation.name}: ${formatMitigation(value)}`;
  });

  return breakdown;
};

export const isMitigationAvailable = (
  mitigation: MitigationAbility | null | undefined,
  selectedJobs: SelectedJobs | null | undefined
): boolean => {
  if (!mitigation || !selectedJobs || !mitigation.jobs) {
    return false;
  }

  return mitigation.jobs.some(jobId => {
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
};

interface AbilityUsage {
  lastUsedTime: number;
  chargesUsed: number;
  totalCharges: number;
}

export const calculateOptimalMitigationPlan = (
  bossActions: BossAction[],
  availableMitigations: MitigationAbility[],
  selectedJobs: SelectedJobs,
  bossLevel: number = 90,
  targetMinimumMitigation: number = 0.15
): Record<string, MitigationAbility[]> => {
  const sortedActions = [...bossActions].sort((a, b) => a.time - b.time);

  const filteredMitigations = availableMitigations.filter(mitigation =>
    isMitigationAvailable(mitigation, selectedJobs)
  );

  const assignments: Record<string, MitigationAbility[]> = {};

  const abilityUsage: Record<string, AbilityUsage> = {};
  filteredMitigations.forEach(mitigation => {
    abilityUsage[mitigation.id] = {
      lastUsedTime: -Infinity,
      chargesUsed: 0,
      totalCharges: getAbilityChargeCount(mitigation, bossLevel)
    };
  });

  for (const action of sortedActions) {
    if (!action.unmitigatedDamage) continue;

    assignments[action.id] = [];

    const damageType = action.damageType || 'both';

    const availableAbilities = filteredMitigations.filter(mitigation => {
      if (mitigation.damageType && mitigation.damageType !== 'both' && mitigation.damageType !== damageType) {
        return false;
      }

      if (action.isTankBuster && !mitigation.forTankBusters) return false;
      if (!action.isTankBuster && !mitigation.forRaidWide) return false;

      const usage = abilityUsage[mitigation.id];
      if (!usage) return false;
      
      const cooldownDuration = getAbilityCooldownForLevel(mitigation, bossLevel);
      const timeSinceLastUse = action.time - usage.lastUsedTime;

      if (usage.totalCharges > 1) {
        if (usage.chargesUsed < usage.totalCharges) {
          return true;
        }

        if (timeSinceLastUse >= cooldownDuration) {
          return true;
        }

        return false;
      } else {
        return timeSinceLastUse >= cooldownDuration;
      }
    });

    const sortedAbilities = [...availableAbilities].sort((a, b) => {
      const aValue = typeof a.mitigationValue === 'object' ?
        Math.max(a.mitigationValue.physical || 0, a.mitigationValue.magical || 0) :
        a.mitigationValue || 0;

      const bValue = typeof b.mitigationValue === 'object' ?
        Math.max(b.mitigationValue.physical || 0, b.mitigationValue.magical || 0) :
        b.mitigationValue || 0;

      return bValue - aValue;
    });

    let currentMitigation = 0;
    for (const ability of sortedAbilities) {
      if (currentMitigation >= targetMinimumMitigation) break;

      const actionAssignments = assignments[action.id];
      if (actionAssignments) {
        actionAssignments.push(ability);
      }

      const usage = abilityUsage[ability.id];
      if (!usage) continue;
      
      if (usage.totalCharges > 1 && usage.chargesUsed < usage.totalCharges) {
        usage.chargesUsed++;
      } else {
        usage.chargesUsed = 1;
        usage.lastUsedTime = action.time;
      }

      const mitigationValue = getAbilityMitigationValueForLevel(ability, bossLevel);
      if (typeof mitigationValue === 'object') {
        if (damageType === 'physical') {
          currentMitigation = 1 - ((1 - currentMitigation) * (1 - (mitigationValue.physical || 0)));
        } else if (damageType === 'magical') {
          currentMitigation = 1 - ((1 - currentMitigation) * (1 - (mitigationValue.magical || 0)));
        } else {
          const value = Math.max(mitigationValue.physical || 0, mitigationValue.magical || 0);
          currentMitigation = 1 - ((1 - currentMitigation) * (1 - value));
        }
      } else if (mitigationValue) {
        currentMitigation = 1 - ((1 - currentMitigation) * (1 - mitigationValue));
      }
    }
  }

  return assignments;
};

export default {
  findActiveMitigationsAtTime,
  calculateTotalMitigation,
  formatMitigation,
  generateMitigationBreakdown,
  isMitigationAvailable,
  calculateOptimalMitigationPlan
};
