/**
 * PlanCard. Single plan summary, used in the `/plan` list grid.
 * Caffeine-styled: card surface, hover ring, typography hierarchy that
 * surfaces the encounter name and last-updated time without competing
 * for the eye with the plan name.
 */
import { Link } from 'react-router';
import { ChevronRight, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SamplePlan } from '@/lib/sample-data';

const RELATIVE = (iso: string): string => {
  const delta = Date.now() - new Date(iso).getTime();
  const min = Math.floor(delta / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
};

export const PlanCard = ({ plan }: { plan: SamplePlan }) => (
  <Card className="group transition-colors hover:border-primary/40">
    <CardHeader>
      <div className="flex items-start justify-between gap-2">
        <CardTitle className="text-base leading-tight">
          <Link to={`/plan/${plan.meta.id}`} className="hover:underline">
            {plan.meta.name}
          </Link>
        </CardTitle>
        <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
          {plan.meta.raid}
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="flex items-end justify-between gap-3 text-sm">
      <div className="text-muted-foreground flex flex-col gap-0.5">
        <span className="text-foreground/80">{plan.meta.encounterName}</span>
        <span className="flex items-center gap-1.5">
          <Users className="size-3" /> {plan.partySize}-person · updated {RELATIVE(plan.updatedAt)}
        </span>
      </div>
      <Link
        to={`/plan/${plan.meta.id}`}
        className="text-primary flex items-center gap-1 text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100"
      >
        Open <ChevronRight className="size-4" />
      </Link>
    </CardContent>
  </Card>
);