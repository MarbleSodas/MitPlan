/**
 * DraggableAbilityStrip. A compact horizontal strip of the most common
 * mitigation abilities, rendered as small draggable badges. Lives above
 * the timeline in the plan editor's main canvas. Uses @dnd-kit/core
 * `useDraggable` so each chip can be dropped onto a TimelineEventCard
 * (which is a `useDroppable` target).
 */
import { useDraggable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AbilityInfo } from '@/lib/data-source';
import { AbilityIcon } from './ability-icon';

// Quick-mit list. Names must match `SAMPLE_ABILITIES` entries so the
// strip renders even in fallback mode (no live catalog). Order roughly
// follows tank → healer → party-mit for ergonomic DnD.
const QUICK_MITS = [
  // Tank self-mits
  'Rampart',
  'Sentinel',
  'Vengeance',
  'Shadow Wall',
  'Nebula',
  'Heart of Corundum',
  // Tank self-sustain
  'Bloodwhetting',
  // Tank partymit / shield
  'Reprisal',
  'Dark Mind',
  // Healer partymit
  'Indomitability',
  'Kerachole',
  'Holos',
  'Panhaima',
];

export const DraggableAbilityStrip = ({
  abilities,
}: {
  abilities: AbilityInfo[] | null;
}) => {
  if (!abilities || abilities.length === 0) return null;

  const quickMits = QUICK_MITS.map((name) =>
    abilities.find((a) => a.name === name),
  ).filter(Boolean) as AbilityInfo[];

  if (quickMits.length === 0) return null;

  return (
    <div
      className="border-border flex items-center gap-1.5 overflow-x-auto rounded-lg border border-dashed bg-muted/30 px-3 py-2.5"
      style={{ touchAction: 'pan-x' }}
      role="list"
      aria-label="Quick mitigation abilities — drag onto a timeline event"
    >
      <span className="text-muted-foreground shrink-0 text-[10px] font-semibold tracking-widest uppercase">
        Quick mits
      </span>
      <span className="bg-border/40 mx-1 h-4 w-px shrink-0" aria-hidden="true" />
      {quickMits.map((ability) => (
        <DraggableAbilityChip key={ability.id} ability={ability} />
      ))}
    </div>
  );
};

const DraggableAbilityChip = ({ ability }: { ability: AbilityInfo }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `ability-${ability.id}`,
      data: { type: 'ability' as const, ability },
    });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <Badge
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      variant="outline"
      style={style}
      className={cn(
        'shrink-0 cursor-grab touch-none select-none gap-1.5 py-1.5 font-mono text-[10px] active:cursor-grabbing',
        'focus-visible:ring-primary/50 focus-visible:outline-none focus-visible:ring-2',
        isDragging && 'opacity-40 ring-primary/40 ring-2',
      )}
      role="button"
      aria-label={`${ability.name} (${ability.jobAbbrev}) — drag onto a timeline event`}
      aria-roledescription="draggable ability"
      title={`${ability.name} (${ability.jobAbbrev}) — drag onto a timeline event`}
    >
      <AbilityIcon abilityId={ability.abilityId} jobAbbrev={ability.jobAbbrev} size="xs" />
      {ability.name}
    </Badge>
  );
};
