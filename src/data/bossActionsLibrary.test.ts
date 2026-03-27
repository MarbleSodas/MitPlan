import { describe, expect, it } from 'vitest';
import { bossActionsLibrary, libraryUtils } from './bossActionsLibrary';

describe('bossActionsLibrary', () => {
  it('builds time-agnostic per-boss templates from the full boss action dataset', () => {
    expect(
      bossActionsLibrary.some((action) => action.sourceBoss === 'vamp-fatale-m9s')
    ).toBe(true);
    expect(
      bossActionsLibrary.some((action) => action.sourceBoss === 'red-hot-deep-blue-m10s')
    ).toBe(true);
    expect(bossActionsLibrary.every((action) => !('time' in action))).toBe(true);
  });

  it('preserves authored classifications and derives legacy ones', () => {
    const rawSteel = bossActionsLibrary.find(
      (action) => action.sourceBoss === 'the-tyrant-m11s' && action.name === 'Raw Steel'
    );
    const hardcore = bossActionsLibrary.find(
      (action) => action.sourceBoss === 'vamp-fatale-m9s' && action.name === 'Hardcore'
    );
    const infernoTheorem = bossActionsLibrary.find(
      (action) => action.sourceBoss === 'lala' && action.name === 'Inferno Theorem'
    );

    expect(rawSteel?.classification).toBe('dual_tankbuster');
    expect(hardcore?.classification).toBe('dual_tankbuster');
    expect(infernoTheorem?.classification).toBe('raidwide');
  });

  it('collapses repeated identical per-boss occurrences into a reusable template', () => {
    const strategicStrike = bossActionsLibrary.find(
      (action) =>
        action.sourceBoss === 'lala' &&
        action.name === 'Strategic Strike' &&
        action.unmitigatedDamage === '179475'
    );

    expect(strategicStrike?.occurrenceCount).toBeGreaterThan(1);
  });

  it('supports filtering templates by full classification', () => {
    const sharedTankbusters = libraryUtils.getActionsByClassification(
      bossActionsLibrary,
      'dual_tankbuster'
    );

    expect(sharedTankbusters.length).toBeGreaterThan(0);
    expect(sharedTankbusters.every((action) => action.classification === 'dual_tankbuster')).toBe(
      true
    );
  });
});
