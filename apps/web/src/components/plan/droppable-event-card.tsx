/**
 * DroppableEventCard. Wraps TimelineEventCard with @dnd-kit/core
 * `useDroppable` so it can accept dropped ability chips from the
 * DraggableAbilityStrip. Highlights on drag-over for visual feedback.
 */
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { TimelineEventCard } from './timeline-event-card';
import type { TimelineEventInfo } from '@/lib/data-source';
import type { MitStackResult } from '@/lib/mit-evaluator';

export const DroppableEventCard = (props: {
  event: TimelineEventInfo;
  assignmentCount: number;
  mitStack: MitStackResult | null;
  isSelected?: boolean;
  onPick: (event: TimelineEventInfo) => void;
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `event-${props.event.id}`,
    data: { type: 'event' as const, event: props.event },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg transition-all',
        isOver && 'ring-primary/50 ring-2 ring-offset-1 ring-offset-background',
      )}
    >
      <TimelineEventCard {...props} />
    </div>
  );
};
