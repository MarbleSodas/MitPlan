/**
 * PlanList. Grid of PlanCards with a loading skeleton state.
 *
 * Phase 1: loads plans via `data-source.listMyPlans()` (which routes
 * to `rpc('plans_list')` when Supabase is configured), then joins
 * each plan with its encounter via `data-source.listEncounters()` so
 * the card can surface the raid + encounter name.
 */
import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { listMyPlans, listEncounters, type PlanInfo, type EncounterInfo } from '@/lib/data-source';
import { PlanCard, type PlanCardData } from './plan-card';

/** Raid badge label per encounter slug prefix. e.g. `fru-p1` → `FRU`. */
const raidBadge = (enc: EncounterInfo | undefined): string =>
  enc ? enc.raidSlug.toUpperCase() : '';

export const PlanList = () => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PlanCardData[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([listMyPlans(), listEncounters()])
      .then(([myPlans, encounters]) => {
        if (!mounted) return;
        const encById = new Map<string, EncounterInfo>(encounters.map((e) => [e.id, e] as const));
        const cards: PlanCardData[] = myPlans.map((p: PlanInfo) => {
          const enc = encById.get(p.encounterId);
          return {
            id: p.id,
            name: p.name,
            raid: raidBadge(enc),
            encounterName: enc?.name ?? 'Unknown encounter',
            updatedAt: p.updatedAt,
            partySize: 8,
            mode: p.mode,
            accessRole: p.accessRole,
          };
        });
        setPlans(cards);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        // eslint-disable-next-line no-console
        console.error('[plan-list] failed to load plans', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load plans');
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loadError) {
    return (
      <div
        className="border-border bg-card/40 text-muted-foreground flex items-center gap-2 rounded-lg border p-6 text-sm"
        role="alert"
      >
        <AlertCircle className="text-destructive size-4 shrink-0" aria-hidden />
        <span>Could not load plans: {loadError}</span>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" aria-label="Loading plan card" />
        ))}
      </div>
    );
  }
  if (plans.length === 0) {
    return (
      <p className="text-muted-foreground px-1 text-sm">
        No plans yet. Click <strong>New plan</strong> to start your first.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((p) => (
        <PlanCard key={p.id} plan={p} />
      ))}
    </div>
  );
};
