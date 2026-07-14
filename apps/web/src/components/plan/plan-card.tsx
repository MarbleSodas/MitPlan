/**
 * PlanCard. Single plan summary, used in the `/plan` list grid.
 * Caffeine-styled: card surface, hover ring, typography hierarchy that
 * surfaces the encounter name and last-updated time without competing
 * for the eye with the plan name.
 *
 * Accepts the minimum subset of fields the card needs — the parent
 * (`plan-list.tsx` or the route) maps from `PlanInfo` or `SamplePlan`
 * into this shape. Keeping the shape narrow means the card doesn't
 * have to know about `meta.*` / `PlanRow` schema choices.
 */
import { Link } from 'react-router';
import { ChevronRight, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

export interface PlanCardData {
  id: string;
  name: string;
  /** Short raid badge, e.g. "FRU", "M1S". Empty falls back to the
   * encounter slug prefix. */
  raid: string;
  /** Display name of the encounter this plan is for. */
  encounterName: string;
  updatedAt: string;
  partySize: 8 | 16;
  mode: 'REBORN' | 'EVOLVED' | 'CURRENT' | 'ALL';
  accessRole: 'OWNER' | 'EDITOR' | 'VIEWER' | null;
}

export const PlanCard = ({ plan }: { plan: PlanCardData }) => (
  <Card className="group transition-colors hover:border-primary/40 focus-within:border-primary/40">
    <CardHeader>
      <div className="flex items-start justify-between gap-2">
        <CardTitle className="text-base leading-tight">
          <Link
            to={`/plan/${plan.id}`}
            className="hover:underline focus-visible:ring-primary/50 rounded-sm focus-visible:outline-none focus-visible:ring-2"
          >
            {plan.name}
          </Link>
        </CardTitle>
        <div className="flex shrink-0 items-center gap-1">
          {plan.raid && (
            <Badge variant="secondary" className="font-mono text-[10px]">
              {plan.raid}
            </Badge>
          )}
          <Badge variant="outline" className="font-mono text-[10px]">
            {plan.mode}
          </Badge>
          {plan.accessRole && plan.accessRole !== 'OWNER' && (
            <Badge variant="outline" className="text-[10px]">
              Shared · {plan.accessRole.toLowerCase()}
            </Badge>
          )}
        </div>
      </div>
    </CardHeader>
    <CardContent className="flex items-end justify-between gap-3 text-sm">
      <div className="text-muted-foreground flex flex-col gap-0.5">
        <span className="text-foreground/80">{plan.encounterName}</span>
        <span className="flex items-center gap-1.5">
          <Users className="size-3" /> {plan.partySize}-person · updated {RELATIVE(plan.updatedAt)}
        </span>
        <Link
          to={`/plan/${plan.id}`}
          className="text-primary mt-1 flex items-center gap-1 text-sm font-medium sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100"
          aria-label={`Open plan: ${plan.name}`}
        >
          Open <ChevronRight className="size-4" />
        </Link>
      </div>
    </CardContent>
  </Card>
);
