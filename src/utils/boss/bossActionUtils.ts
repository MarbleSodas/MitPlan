import type { BossAction } from '../../types';

interface ProcessedBossAction extends BossAction {
  isMultiHit?: boolean;
  hitCount?: number;
  originalDamagePerHit?: number | string;
}

export function isDualTankBusterAction(action: BossAction): boolean {
  console.log('[DEBUG] isDualTankBusterAction check:', {
    action,
    isDualTankBusterProperty: action.isDualTankBuster,
    result: !!action.isDualTankBuster
  });
  return !!action.isDualTankBuster;
}

export function processMultiHitTankBusters(actions: BossAction[]): BossAction[] {
  return actions;
}

export default {
  isDualTankBusterAction,
  processMultiHitTankBusters
};
