import { useMemo } from 'react';
import { cn } from '@/lib/utils';

const MARKER_LANE_GAP = 16;
const MIN_MARKER_SEPARATION_PERCENT = 3;

const getMarkerSeverity = (marker) => {
  if (marker.isTankBuster) {
    return 'critical';
  }

  return marker.importance || 'medium';
};

const MARKER_STYLES = {
  critical: {
    dot: 'bg-red-500',
    chip: 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300',
    label: 'Critical / TB',
  },
  high: {
    dot: 'bg-orange-500',
    chip: 'border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300',
    label: 'High',
  },
  medium: {
    dot: 'bg-amber-500',
    chip: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    label: 'Medium',
  },
  low: {
    dot: 'bg-green-500',
    chip: 'border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-300',
    label: 'Low',
  },
};

const CompactTimelineVisualization = ({ actions, onActionClick, selectedActionId }) => {
  const { maxTime, markers, timeLabels, laneCount, severityCounts } = useMemo(() => {
    if (!actions || actions.length === 0) {
      return {
        maxTime: 600,
        markers: [],
        timeLabels: [],
        laneCount: 1,
        severityCounts: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
      };
    }

    const sortedActions = [...actions].sort((a, b) => a.time - b.time);
    const lastActionTime = sortedActions[sortedActions.length - 1]?.time || 0;
    const calculatedMax = Math.max(300, Math.ceil(lastActionTime * 1.1));
    const roundedMax = Math.ceil(calculatedMax / 60) * 60;
    const laneLastPositions = [];
    const nextSeverityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    const actionMarkers = sortedActions.map((action) => {
      const position = (action.time / roundedMax) * 100;
      let lane = laneLastPositions.findIndex((lastPosition) => position - lastPosition >= MIN_MARKER_SEPARATION_PERCENT);
      if (lane === -1) {
        lane = laneLastPositions.length;
        laneLastPositions.push(position);
      } else {
        laneLastPositions[lane] = position;
      }

      const marker = {
        id: action.id,
        time: action.time,
        position,
        importance: action.importance || 'medium',
        isTankBuster: action.isTankBuster || action.isDualTankBuster,
        name: action.name,
        icon: action.icon,
        lane,
      };
      const severity = getMarkerSeverity(marker);
      nextSeverityCounts[severity] += 1;
      return marker;
    });

    const labelInterval = roundedMax > 600 ? 120 : 60;
    const labels = [];
    for (let t = 0; t <= roundedMax; t += labelInterval) {
      labels.push({
        time: t,
        position: (t / roundedMax) * 100,
        label: `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`,
      });
    }

    return {
      maxTime: roundedMax,
      markers: actionMarkers,
      timeLabels: labels,
      laneCount: Math.max(laneLastPositions.length, 1),
      severityCounts: nextSeverityCounts,
    };
  }, [actions]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const axisTop = 16 + ((laneCount - 1) * MARKER_LANE_GAP) + 20;
  const chartHeight = axisTop + 34;
  const legendItems = ['critical', 'high', 'medium', 'low'];

  if (!actions || actions.length === 0) {
    return (
      <div className="rounded-xl border border-border/70 bg-muted/20 p-5">
        <div className="text-sm text-muted-foreground text-center">
          No actions yet - add actions to see timeline visualization
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 bg-gradient-to-b from-card to-card/95 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Timeline Overview
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Click an event marker to jump to that action in the timeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-border bg-background px-2.5 py-1 font-medium text-foreground">
            {actions.length} action{actions.length !== 1 ? 's' : ''}
          </span>
          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground">
            {formatTime(maxTime)} total
          </span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[34rem] rounded-xl border border-border/70 bg-background/80 px-4 py-4 sm:px-5">
          <div
            className="relative"
            style={{ height: `${chartHeight}px` }}
          >
            <div className="absolute inset-x-0 top-2 rounded-lg bg-muted/25" style={{ height: `${axisTop - 1}px` }} />
            <div
              className="absolute inset-x-0 h-px bg-border/90"
              style={{ top: `${axisTop}px` }}
            />

            {timeLabels.map((label, idx) => (
              <div
                key={`grid-${idx}`}
                className="absolute top-2 bottom-8 w-px bg-border/80"
                style={{ left: `${label.position}%` }}
              />
            ))}

            {markers.map((marker) => {
              const severity = getMarkerSeverity(marker);
              const markerStyle = MARKER_STYLES[severity] || MARKER_STYLES.medium;
              const markerTop = 8 + (marker.lane * MARKER_LANE_GAP);
              const connectorHeight = Math.max(axisTop - markerTop - 14, 10);

              return (
                <button
                  key={marker.id}
                  type="button"
                  onClick={() => onActionClick?.(marker.id)}
                  aria-label={`Jump to ${marker.name} at ${formatTime(marker.time)}`}
                  aria-pressed={selectedActionId === marker.id}
                  className="absolute -translate-x-1/2 text-left transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  style={{ left: `${marker.position}%`, top: `${markerTop}px` }}
                  title={`${formatTime(marker.time)} - ${marker.name}`}
                >
                  <span className="flex flex-col items-center">
                    <span
                      className={cn(
                        'h-3.5 w-3.5 rounded-full border-2 border-background shadow-sm',
                        markerStyle.dot,
                        selectedActionId === marker.id && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
                      )}
                    />
                    <span
                      className={cn(
                        'mt-1 block w-px rounded-full bg-border/80',
                        selectedActionId === marker.id && 'bg-primary/60'
                      )}
                      style={{ height: `${connectorHeight}px` }}
                    />
                  </span>
                </button>
              );
            })}

            {timeLabels.map((label, idx) => (
              <div
                key={`label-${idx}`}
                className={cn(
                  'absolute bottom-0 whitespace-nowrap text-[11px] text-muted-foreground',
                  idx === 0 && 'translate-x-0 text-left',
                  idx > 0 && idx < timeLabels.length - 1 && '-translate-x-1/2 text-center',
                  idx === timeLabels.length - 1 && '-translate-x-full text-right'
                )}
                style={{ left: `${label.position}%` }}
              >
                {label.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {legendItems.map((severity) => {
          const markerStyle = MARKER_STYLES[severity];
          return (
            <div
              key={severity}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium',
                markerStyle.chip
              )}
            >
              <div className={cn('h-2.5 w-2.5 rounded-full', markerStyle.dot)} />
              <span>{markerStyle.label}</span>
              <span className="text-[11px] opacity-75">
                {severityCounts[severity]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompactTimelineVisualization;
