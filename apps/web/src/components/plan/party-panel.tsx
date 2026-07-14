import { Users } from 'lucide-react';
import type { PlanPartyState, TankPosition } from '@xivmitplan/validation/plan';
import type { AbilityInfo } from '@/lib/data-source';
import { Badge } from '@/components/ui/badge';

const POSITION_LABEL: Record<TankPosition, string> = {
  MAIN: 'Main tank',
  OFF: 'Off tank',
  NEITHER: 'Not a tank',
};

export const PartyPanel = ({
  abilities,
  partyState,
  currentUserId,
  canEdit,
  onSelectJob,
  onSetTankPosition,
  onClaim,
}: {
  abilities: AbilityInfo[] | null;
  partyState: PlanPartyState;
  currentUserId: string | null;
  canEdit: boolean;
  onSelectJob: (jobId: string) => void;
  onSetTankPosition: (position: TankPosition) => void;
  onClaim: (jobId: string, displayName: string) => void;
}) => {
  const jobs = Array.from(
    new Map(
      (abilities ?? []).map((ability) => [ability.jobId, ability.jobAbbrev] as const),
    ).entries(),
  ).sort(([, a], [, b]) => a.localeCompare(b));
  const selectedJob = currentUserId ? partyState.selectedJobs[currentUserId] : undefined;
  const selectedPosition = currentUserId
    ? (partyState.tankPositions[currentUserId] ?? 'NEITHER')
    : 'NEITHER';
  const jobLabels = new Map(jobs);

  return (
    <section className="border-border/70 bg-card/30 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase">
          <Users className="size-3" /> Party
        </p>
        <Badge variant="outline" className="font-mono text-[10px]">
          {partyState.claims.length}/8
        </Badge>
      </div>

      {currentUserId && (
        <div className="mt-3 grid gap-2">
          <label className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
            <span>Your job</span>
            <select
              value={selectedJob ?? ''}
              disabled={!canEdit || jobs.length === 0}
              onChange={(event) => {
                const jobId = event.target.value;
                if (!jobId) return;
                onSelectJob(jobId);
                const abbreviation = jobs.find(([id]) => id === jobId)?.[1] ?? jobId;
                onClaim(jobId, abbreviation);
              }}
              className="border-input bg-background h-7 min-w-24 rounded-md border px-2 text-xs text-foreground"
              aria-label="Your job"
            >
              <option value="">Choose job</option>
              {jobs.map(([jobId, abbreviation]) => (
                <option key={jobId} value={jobId}>
                  {abbreviation}
                </option>
              ))}
            </select>
          </label>
          <label className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
            <span>Tank position</span>
            <select
              value={selectedPosition}
              disabled={!canEdit}
              onChange={(event) => onSetTankPosition(event.target.value as TankPosition)}
              className="border-input bg-background h-7 min-w-24 rounded-md border px-2 text-xs text-foreground"
              aria-label="Your tank position"
            >
              {Object.entries(POSITION_LABEL).map(([position, label]) => (
                <option key={position} value={position}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {partyState.claims.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {partyState.claims.map((claim) => (
            <Badge key={claim.userId} variant="secondary" className="text-[10px]">
              {claim.displayName ?? claim.userId.slice(0, 6)} ·{' '}
              {jobLabels.get(claim.jobId) ?? claim.jobId.slice(0, 8)}
            </Badge>
          ))}
        </div>
      )}
    </section>
  );
};
