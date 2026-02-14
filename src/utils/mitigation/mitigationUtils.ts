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



export const precalculateActiveMitigations = (
  assignments: MitigationAssignments | null | undefined,
  bossActions: BossAction[] | null | undefined,
  mitigationAbilities: MitigationAbility[],
  bossLevel: number = 90
): Map<string, ActiveMitigation[]> => {
  const activeMitigationsMap = new Map<string, ActiveMitigation[]>();

  if (!bossActions || !Array.isArray(bossActions) || !assignments) {
    return activeMitigationsMap;
  }

  bossActions.forEach(action => {
    activeMitigationsMap.set(action.id, []);
  });

  const sortedActions = [...bossActions].sort((a, b) => a.time - b.time);

  Object.entries(assignments).forEach(([sourceActionId, actionAssignments]) => {
    if (!Array.isArray(actionAssignments)) return;

    const sourceAction = sortedActions.find(a => a.id === sourceActionId);
    if (!sourceAction) return;

    actionAssignments.forEach(assignedMitigation => {
      const mitigation = mitigationAbilities.find(m => m.id === assignedMitigation.id);
      if (!mitigation) return;

      const duration = getAbilityDurationForLevel(mitigation, bossLevel);
      
      let precast = Number(assignedMitigation.precastSeconds);
      if (!Number.isFinite(precast) || precast < 0) precast = 0;
      
      const startTime = Math.max(0, sourceAction.time - precast);
      const endTime = startTime + duration;

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
        return;
      }

      for (const targetAction of sortedActions) {
        if (targetAction.time > endTime) break;
        if (targetAction.time < startTime) continue;
        if (targetAction.id === sourceActionId) continue;

        const existing = activeMitigationsMap.get(targetAction.id) || [];
        existing.push({
          ...assignedMitigation,
          sourceActionId: sourceAction.id,
          sourceActionName: sourceAction.name,
          sourceActionTime: startTime,
          remainingDuration: endTime - targetAction.time
        });
        activeMitigationsMap.set(targetAction.id, existing);
      }
    });
  });

  return activeMitigationsMap;
};

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

export default {
  findActiveMitigationsAtTime,
  calculateTotalMitigation,
  formatMitigation,
  generateMitigationBreakdown,
  isMitigationAvailable
};
