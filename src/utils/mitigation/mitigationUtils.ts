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
  id?: string;
  name?: string;
  mitigationValue?: number | { physical: number; magical: number };
  layeredMitigation?: MitigationAbility['layeredMitigation'];
  damageType?: string;
  duration?: number;
  remainingDuration?: number;
}

const resolveMitigationValue = (
  mitigationValue: number | { physical: number; magical: number } | undefined,
  damageType: string,
  mitigationDamageType?: string
): number => {
  if (!mitigationValue) {
    return 0;
  }

  if (typeof mitigationValue === 'object') {
    if (damageType === 'magical' && mitigationValue.magical) {
      return mitigationValue.magical;
    }
    if (damageType === 'physical' && mitigationValue.physical) {
      return mitigationValue.physical;
    }
    if (damageType === 'both') {
      return Math.max(mitigationValue.magical || 0, mitigationValue.physical || 0);
    }
    return 0;
  }

  if (mitigationDamageType === 'both' || mitigationDamageType === damageType || !mitigationDamageType) {
    return mitigationValue;
  }

  return 0;
};

const isLayerActive = (
  mitigation: MitigationWithValue,
  layer: NonNullable<MitigationAbility['layeredMitigation']>[number],
  bossLevel: number | null
): boolean => {
  if (mitigation.remainingDuration === undefined || mitigation.remainingDuration === null) {
    return true;
  }

  const fullDuration = bossLevel
    ? getAbilityDurationForLevel(mitigation as MitigationAbility, bossLevel)
    : mitigation.duration || layer.duration;
  const elapsed = Math.max(0, fullDuration - mitigation.remainingDuration);

  return elapsed <= layer.duration;
};

const getMitigationEntries = (
  mitigation: MitigationWithValue,
  allMitigations: MitigationWithValue[],
  damageType: string,
  bossLevel: number | null
): Array<{ value: number; label?: string }> => {
  const mitigationValue = bossLevel ?
    getAbilityMitigationValueForLevel(mitigation as MitigationAbility, bossLevel) :
    mitigation.mitigationValue;

  const entries: Array<{ value: number; label?: string }> = [];
  const baseValue = resolveMitigationValue(mitigationValue, damageType, mitigation.damageType);
  if (baseValue > 0) {
    entries.push({ value: baseValue });
  }

  mitigation.layeredMitigation?.forEach(layer => {
    if (layer.conditionAbilityIds?.length) {
      const conditionActive = allMitigations.some(active => (
        active.id !== mitigation.id && layer.conditionAbilityIds?.includes(active.id || '')
      ));
      if (!conditionActive) {
        return;
      }
    }

    if (!isLayerActive(mitigation, layer, bossLevel)) {
      return;
    }

    const layerValue = resolveMitigationValue(layer.value, damageType, mitigation.damageType);
    if (layerValue > 0) {
      entries.push({ value: layerValue, label: layer.description });
    }
  });

  return entries;
};

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
    getMitigationEntries(mitigation, mitigations, damageType, bossLevel)
      .forEach(entry => {
        totalMultiplier *= (1 - entry.value);
      });
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
    getMitigationEntries(mitigation, mitigations, damageType, bossLevel)
      .forEach(entry => {
        const suffix = entry.label ? ` (${entry.label})` : '';
        breakdown += `\n• ${mitigation.name}${suffix}: ${formatMitigation(entry.value)}`;
      });
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
