import { useMemo } from 'react';
import { cn } from '@/lib/utils';

const CompactTimelineVisualization = ({ actions, onActionClick, selectedActionId }) => {
  const { maxTime, markers, timeLabels } = useMemo(() => {
    if (!actions || actions.length === 0) {
      return { maxTime: 600, markers: [], timeLabels: [] };
    }

    const sortedActions = [...actions].sort((a, b) => a.time - b.time);
    const lastActionTime = sortedActions[sortedActions.length - 1]?.time || 0;
    const calculatedMax = Math.max(300, Math.ceil(lastActionTime * 1.1));
    const roundedMax = Math.ceil(calculatedMax / 60) * 60;

    const actionMarkers = sortedActions.map(action => ({
      id: action.id,
      time: action.time,
      position: (action.time / roundedMax) * 100,
      importance: action.importance || 'medium',
      isTankBuster: action.isTankBuster || action.isDualTankBuster,
      name: action.name,
      icon: action.icon,
    }));

    const labelInterval = roundedMax > 600 ? 120 : 60;
    const labels = [];
    for (let t = 0; t <= roundedMax; t += labelInterval) {
      labels.push({
        time: t,
        position: (t / roundedMax) * 100,
        label: `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`,
      });
    }

    return { maxTime: roundedMax, markers: actionMarkers, timeLabels: labels };
  }, [actions]);

  const getMarkerColor = (marker) => {
    if (marker.isTankBuster) return 'bg-red-500';
    switch (marker.importance) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!actions || actions.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-3">
        <div className="text-xs text-muted-foreground text-center">
          No actions yet - add actions to see timeline visualization
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          Timeline Overview
        </span>
        <span className="text-xs text-muted-foreground">
          {actions.length} action{actions.length !== 1 ? 's' : ''} • {formatTime(maxTime)} total
        </span>
      </div>

      <div className="relative h-8 bg-background rounded border border-border">
        <div className="absolute inset-0 flex items-end">
          {timeLabels.map((label, idx) => (
            <div
              key={idx}
              className="absolute bottom-0 transform -translate-x-1/2"
              style={{ left: `${label.position}%` }}
            >
              <div className="h-2 w-px bg-border" />
              <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                {label.label}
              </span>
            </div>
          ))}
        </div>

        {markers.map((marker) => (
          <button
            key={marker.id}
            onClick={() => onActionClick?.(marker.id)}
            className={cn(
              "absolute top-1 transform -translate-x-1/2 w-2 h-4 rounded-sm transition-all hover:scale-125 hover:z-10",
              getMarkerColor(marker),
              selectedActionId === marker.id && "ring-2 ring-white ring-offset-1 ring-offset-background scale-125 z-10"
            )}
            style={{ left: `${marker.position}%` }}
            title={`${formatTime(marker.time)} - ${marker.name}`}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-red-500" />
          <span>Critical/TB</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-orange-500" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-amber-500" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-green-500" />
          <span>Low</span>
        </div>
      </div>
    </div>
  );
};

export default CompactTimelineVisualization;
