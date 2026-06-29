/**
 * PlanList. Grid of PlanCards with a loading skeleton state.
 * Loads via `listSamplePlans()` from `lib/sample-data` (Phase 0 stub)
 * or via `rpc('list_my_plans')` (Phase 1+). The 200ms artificial
 * delay exercises the skeleton state.
 */
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { listSamplePlans, type SamplePlan } from '@/lib/sample-data';
import { PlanCard } from './plan-card';

export const PlanList = ({ onLoaded }: { onLoaded?: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SamplePlan[]>([]);
  useEffect(() => {
    let mounted = true;
    listSamplePlans().then((p) => {
      if (!mounted) return;
      setPlans(p);
      setLoading(false);
      onLoaded?.();
    });
    return () => {
      mounted = false;
    };
  }, [onLoaded]);
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }
  if (plans.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No plans yet. Click <strong>New plan</strong> to start your first.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((p) => (
        <PlanCard key={p.meta.id} plan={p} />
      ))}
    </div>
  );
};