import type { BossAction } from '../../types';

function cloneBossAction(action: BossAction, overrides: Partial<BossAction> = {}): BossAction {
  return {
    ...action,
    ...overrides,
    sourceAbilities: [...(overrides.sourceAbilities || action.sourceAbilities || [])],
  };
}

function sortActions(actions: BossAction[]): BossAction[] {
  return [...actions].sort((left, right) => {
    if (left.time !== right.time) {
      return left.time - right.time;
    }

    return left.name.localeCompare(right.name);
  });
}

export function processMultiHitTankBusterSequences(actions: BossAction[]): BossAction[] {
  const sorted = sortActions(actions);
  const collapsed: BossAction[] = [];
  let index = 0;

  while (index < sorted.length) {
    const current = sorted[index];
    if (!current) {
      index += 1;
      continue;
    }

    if (current.isMultiHit || !current.name) {
      collapsed.push(cloneBossAction(current));
      index += 1;
      continue;
    }

    const group: BossAction[] = [current];
    let lookahead = index + 1;

    while (lookahead < sorted.length) {
      const next = sorted[lookahead];
      if (!next) {
        break;
      }

      const timeGap = Number((next.time - group[group.length - 1]!.time).toFixed(3));
      const isCompatible =
        next.name === current.name &&
        next.damageType === current.damageType &&
        Boolean(next.isTankBuster) === Boolean(current.isTankBuster) &&
        Boolean(next.isDualTankBuster) === Boolean(current.isDualTankBuster) &&
        timeGap >= 0 &&
        timeGap <= 4;

      if (!isCompatible) {
        break;
      }

      group.push(next);
      lookahead += 1;
    }

    if (group.length === 1) {
      collapsed.push(cloneBossAction(current));
      index += 1;
      continue;
    }

    const damageValues = group
      .map((action) => {
        const raw = action.unmitigatedDamage;
        if (typeof raw === 'number') {
          return raw;
        }
        if (typeof raw === 'string') {
          const parsed = Number.parseInt(raw.replace(/[^0-9]/g, ''), 10);
          return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
      })
      .filter((value) => value > 0);

    const totalDamage = damageValues.reduce((sum, value) => sum + value, 0);
    const intervals = group
      .slice(1)
      .map((action, actionIndex) => Math.round((action.time - group[actionIndex]!.time) * 1000))
      .filter((value) => value > 0);
    const averageIntervalMs = intervals.length
      ? Math.round(intervals.reduce((sum, value) => sum + value, 0) / intervals.length)
      : undefined;

    collapsed.push(
      cloneBossAction(current, {
        isMultiHit: true,
        hitCount: group.length,
        hitIntervalMs: averageIntervalMs,
        originalDamagePerHit: current.unmitigatedDamage,
        unmitigatedDamage: totalDamage > 0 ? totalDamage : current.unmitigatedDamage,
        timeRange: [current.time, group[group.length - 1]!.time],
        sourceAbilities: Array.from(
          new Set(group.flatMap((action) => action.sourceAbilities || [action.name]).filter(Boolean))
        ),
      })
    );

    index = lookahead;
  }

  return collapsed;
}
