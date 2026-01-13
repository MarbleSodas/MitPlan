import type { BossAction } from '../../types';

interface ProcessedBossAction extends BossAction {
  isMultiHit?: boolean;
  hitCount?: number;
  originalDamagePerHit?: number | string;
}

export const processMultiHitTankBusters = (
  bossActions: BossAction[] | null | undefined,
  _timeThreshold: number = 10
): ProcessedBossAction[] => {
  if (!bossActions || !Array.isArray(bossActions) || bossActions.length === 0) {
    return bossActions || [];
  }

  const processedBossActions = bossActions.map((action): ProcessedBossAction => {
    const multiHitMatch = action.description ? action.description.match(/(\d+)[\s-]*hit|multi[\s-]*hit|multiple[\s-]*hit/i) : null;
    const perHitMatch = typeof action.unmitigatedDamage === 'string' 
      ? action.unmitigatedDamage.includes('per hit') 
      : false;

    if (multiHitMatch || perHitMatch) {
      let hitCount = 1;
      if (multiHitMatch && multiHitMatch[1]) {
        hitCount = parseInt(multiHitMatch[1], 10);
      } else if (multiHitMatch) {
        hitCount = 3;
      } else if (perHitMatch) {
        hitCount = 3;
      }

      const originalDamagePerHit = action.unmitigatedDamage;

      let totalDamage: string | number | undefined = action.unmitigatedDamage;
      if (perHitMatch && typeof action.unmitigatedDamage === 'string') {
        const damageMatch = action.unmitigatedDamage.match(/~?(\d+,?\d*)/);
        if (damageMatch && damageMatch[1]) {
          const damagePerHit = parseInt(damageMatch[1].replace(/,/g, ''), 10);
          totalDamage = `${(damagePerHit * hitCount).toLocaleString()}`;
        }
      }

      return {
        ...action,
        isMultiHit: true,
        hitCount,
        originalDamagePerHit,
        unmitigatedDamage: totalDamage
      };
    }
    return action;
  });

  return processedBossActions.sort((a, b) => a.time - b.time);
};

export function isDualTankBusterAction(action: BossAction): boolean {
  console.log('[DEBUG] isDualTankBusterAction check:', {
    action,
    isDualTankBusterProperty: action.isDualTankBuster,
    result: !!action.isDualTankBuster
  });
  return !!action.isDualTankBuster;
}

export default {
  processMultiHitTankBusters,
  isDualTankBusterAction
};
