import type { PhaseOverride, ResolvedTimelinePhaseSummary } from '../../types';

type PhaseOverrideTimeStripProps = {
  time: number;
  summary?: ResolvedTimelinePhaseSummary | null;
  phaseOverrides?: Record<string, PhaseOverride>;
  disabled?: boolean;
  onChange?: (nextPhaseOverrides: Record<string, PhaseOverride>) => void;
};

export function formatTimelineTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) {
    return '--:--';
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
}

export function formatSignedTimelineDelta(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds === 0) {
    return '0.0s';
  }

  const sign = seconds > 0 ? '+' : '-';
  return `${sign}${Math.abs(seconds).toFixed(1)}s`;
}

export default function PhaseOverrideTimeStrip({
  time,
  summary = null,
}: PhaseOverrideTimeStripProps) {
  const shouldRenderPhaseSummary = Boolean(summary && summary.order > 0);

  if (!shouldRenderPhaseSummary || !summary) {
    return (
      <div className="w-full px-2.5 h-[26px] flex items-center justify-center text-center font-bold text-foreground bg-muted/40 backdrop-blur-sm border-b border-border select-none shrink-0 text-xs">
        <span className="mr-1 opacity-60">⏱️</span>
        {time}s
      </div>
    );
  }

  const effectiveStartTime = summary.effectiveStartTime ?? summary.canonicalStartTime;
  const showDelta = summary.effectiveOffset !== 0;

  return (
    <div
      data-testid={`phase-time-strip-${summary.phaseId}`}
      className="w-full shrink-0 border-b border-border bg-muted/40 px-2 py-1 text-foreground backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium sm:text-xs">
        <span className="rounded-full bg-background/80 px-2 py-0.5">
          {summary.phaseName}
        </span>
        <span>
          Starts {formatTimelineTime(effectiveStartTime)}
        </span>
        {showDelta && (
          <>
            <span className="text-muted-foreground">
              was {formatTimelineTime(summary.canonicalStartTime)}
            </span>
            <span className="rounded-full bg-background/80 px-2 py-0.5">
              {formatSignedTimelineDelta(summary.effectiveOffset)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
