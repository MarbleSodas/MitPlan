import { createPlan } from './realtimePlanService';

const LEGACY_LOCAL_PLANS_KEY = 'mitplan_local_plans';
const LEGACY_LOCAL_PLAN_REGISTRY_KEY = 'mitplan_local_plan_registry';
const LEGACY_ANONYMOUS_KEYS = [
  'mitplan_anonymous_user',
  'mitplan_anonymous_plans',
  'mitplan_display_name',
  'mitplan_anonymous_session',
] as const;

type LegacyPlanRecord = {
  id?: string;
  name?: string;
  description?: string;
  bossId?: string | null;
  bossTags?: string[];
  assignments?: Record<string, unknown>;
  selectedJobs?: Record<string, unknown>;
  tankPositions?: Record<string, unknown>;
  sourceTimelineId?: string | null;
  sourceTimelineName?: string | null;
  phaseOverrides?: Record<string, { startTime: number }>;
  createdAt?: string | number;
  updatedAt?: string | number;
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch (error) {
    console.error(`[LegacyLocalPlanImportService] Failed to parse ${key}:`, error);
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeLegacyPlan(plan: LegacyPlanRecord) {
  const bossId = plan.bossId || 'ketuduke';

  return {
    name: plan.name || 'Imported Legacy Plan',
    description: plan.description || '',
    bossId,
    bossTags: Array.isArray(plan.bossTags) && plan.bossTags.length > 0 ? plan.bossTags : [bossId],
    assignments: plan.assignments || {},
    selectedJobs: plan.selectedJobs || {},
    tankPositions: plan.tankPositions || {
      mainTank: null,
      offTank: null,
    },
    sourceTimelineId: plan.sourceTimelineId || null,
    sourceTimelineName: plan.sourceTimelineName || null,
    phaseOverrides: plan.phaseOverrides || {},
    importedAt: new Date().toISOString(),
    migratedFromLocalId: plan.id || null,
  };
}

class LegacyLocalPlanImportService {
  getLegacyPlans(): LegacyPlanRecord[] {
    const plans = readJson<Record<string, LegacyPlanRecord>>(LEGACY_LOCAL_PLANS_KEY, {});

    return Object.entries(plans).map(([id, plan]) => ({
      ...plan,
      id,
    }));
  }

  hasLegacyPlans(): boolean {
    return this.getLegacyPlans().length > 0;
  }

  getMigrationSummary() {
    const plans = this.getLegacyPlans();

    return {
      planCount: plans.length,
      planNames: plans.map((plan) => plan.name || 'Unnamed Plan'),
      totalSize: plans.reduce((size, plan) => size + JSON.stringify(plan).length, 0),
    };
  }

  async importAll(userId: string) {
    const legacyPlans = this.getLegacyPlans();
    const results: Array<{
      success: boolean;
      localPlanId: string;
      newPlanId?: string;
      planName: string;
      error?: string;
    }> = [];

    for (const legacyPlan of legacyPlans) {
      const localPlanId = legacyPlan.id || `legacy-${Date.now()}`;
      const planName = legacyPlan.name || 'Unnamed Plan';

      try {
        const createdPlan = await createPlan(userId, normalizeLegacyPlan(legacyPlan));
        results.push({
          success: true,
          localPlanId,
          newPlanId: createdPlan.id,
          planName,
        });
      } catch (error) {
        console.error('[LegacyLocalPlanImportService] Failed to import legacy plan:', localPlanId, error);
        results.push({
          success: false,
          localPlanId,
          planName,
          error: error instanceof Error ? error.message : 'Unknown import error',
        });
      }
    }

    return results;
  }

  clearImportedPlans(results: Array<{ success: boolean; localPlanId: string }>) {
    if (typeof window === 'undefined') return;

    const plans = readJson<Record<string, LegacyPlanRecord>>(LEGACY_LOCAL_PLANS_KEY, {});
    const registry = readJson<Record<string, unknown>>(LEGACY_LOCAL_PLAN_REGISTRY_KEY, {});

    let removedCount = 0;
    for (const result of results) {
      if (!result.success) continue;
      if (result.localPlanId in plans) {
        delete plans[result.localPlanId];
        removedCount += 1;
      }
      if (result.localPlanId in registry) {
        delete registry[result.localPlanId];
      }
    }

    writeJson(LEGACY_LOCAL_PLANS_KEY, plans);
    writeJson(LEGACY_LOCAL_PLAN_REGISTRY_KEY, registry);

    if (removedCount > 0 && Object.keys(plans).length === 0) {
      LEGACY_ANONYMOUS_KEYS.forEach((key) => window.localStorage.removeItem(key));
    }
  }
}

export const legacyLocalPlanImportService = new LegacyLocalPlanImportService();
