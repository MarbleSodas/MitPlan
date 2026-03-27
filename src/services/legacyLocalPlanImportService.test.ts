/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { legacyLocalPlanImportService } from './legacyLocalPlanImportService';

const { createPlanMock } = vi.hoisted(() => ({
  createPlanMock: vi.fn(),
}));

vi.mock('./realtimePlanService', () => ({
  createPlan: (...args: unknown[]) => createPlanMock(...args),
}));

describe('legacyLocalPlanImportService', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
        clear: () => {
          storage.clear();
        },
      },
    });

    window.localStorage.clear();
    createPlanMock.mockReset();
  });

  it('imports legacy local plans for an authenticated user and clears imported data', async () => {
    window.localStorage.setItem('mitplan_local_plans', JSON.stringify({
      'local-plan-1': {
        id: 'local-plan-1',
        name: 'Legacy Plan',
        description: 'Imported from browser storage',
        bossId: 'ketuduke',
        assignments: { action1: [] },
        selectedJobs: { tank: ['PLD'] },
      },
    }));
    window.localStorage.setItem('mitplan_local_plan_registry', JSON.stringify({
      'local-plan-1': { lastUpdated: 123 },
    }));
    window.localStorage.setItem('mitplan_anonymous_user', JSON.stringify({ id: 'anon-1' }));
    window.localStorage.setItem('mitplan_anonymous_plans', JSON.stringify(['local-plan-1']));
    window.localStorage.setItem('mitplan_display_name', 'Guest');
    window.localStorage.setItem('mitplan_anonymous_session', 'session-1');

    createPlanMock.mockResolvedValue({ id: 'firebase-plan-1' });

    const results = await legacyLocalPlanImportService.importAll('user-1');

    expect(createPlanMock).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        name: 'Legacy Plan',
        description: 'Imported from browser storage',
        bossId: 'ketuduke',
        migratedFromLocalId: 'local-plan-1',
      })
    );
    expect(results).toEqual([
      expect.objectContaining({
        success: true,
        localPlanId: 'local-plan-1',
        newPlanId: 'firebase-plan-1',
      }),
    ]);

    legacyLocalPlanImportService.clearImportedPlans(results);

    expect(window.localStorage.getItem('mitplan_local_plans')).toBe(JSON.stringify({}));
    expect(window.localStorage.getItem('mitplan_local_plan_registry')).toBe(JSON.stringify({}));
    expect(window.localStorage.getItem('mitplan_anonymous_user')).toBeNull();
    expect(window.localStorage.getItem('mitplan_anonymous_plans')).toBeNull();
    expect(window.localStorage.getItem('mitplan_display_name')).toBeNull();
    expect(window.localStorage.getItem('mitplan_anonymous_session')).toBeNull();
  });
});
