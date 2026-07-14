/**
 * MitigationLibrary — searchable sidebar panel of available abilities.
 *
 * Desktop: rendered as a split-pane sidebar next to the timeline.
 * Mobile: embedded in a bottom sheet.
 *
 * Supports:
 *   - Text search (name, job, description)
 *   - Job filter (toggle per job)
 *   - Damage type filter (physical / magical / all)
 *   - Category grouping
 *   - Cooldown-aware disabled states
 *   - Click to assign (with pre-selected event) or double-click to quick-assign
 */
import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { AbilityInfo, TimelineEventInfo } from '@/lib/data-source';
import { ABILITY_CATEGORY_LABEL, ABILITY_CATEGORY_ORDER } from '@/lib/sample-data';
import { cn, formatMs } from '@/lib/utils';

const ALL_JOBS = [
  'PLD', 'WAR', 'DRK', 'GNB',
  'WHM', 'SCH', 'AST', 'SGE',
  'MNK', 'DRG', 'SAM', 'RPR', 'VPR',
  'BLM', 'RDM', 'SMN', 'PCT',
  'BRD', 'MCH', 'DNC',
];

const DAMAGE_TYPES = [
  { value: 'all' as const, label: 'All types' },
  { value: 'physical' as const, label: 'Physical' },
  { value: 'magical' as const, label: 'Magical' },
];

export interface MitigationLibraryProps {
  abilities: AbilityInfo[] | null;
  events: TimelineEventInfo[] | null;
  /** Existing assignments for cooldown detection. */
  existingAssignments: Array<{ abilityId: string; eventId: string }>;
  /** Currently selected event to anchor assignments to. */
  anchorEventId: string | null;
  /** Called when the user picks an ability + event pair. */
  onAssign: (abilityId: string, eventId: string) => void;
  /** Called when the user clicks an ability without a pre-selected event. */
  onPickAbility: (ability: AbilityInfo) => void;
  /** If true, render as a standalone panel (desktop sidebar); if false, render inside a sheet. */
  standalone?: boolean;
  /** When standalone=false, control sheet open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const MitigationLibrary = (props: MitigationLibraryProps) => {
  const {
    abilities,
    events,
    existingAssignments,
    anchorEventId,
    onAssign,
    onPickAbility,
    standalone = true,
    open,
    onOpenChange,
  } = props;

  const [query, setQuery] = useState('');
  const [jobFilter, setJobFilter] = useState<string | null>(null);
  const [damageFilter, setDamageFilter] = useState<'all' | 'physical' | 'magical'>('all');

  const anchorEvent = useMemo(() => {
    if (!anchorEventId || !events) return null;
    return events.find((e) => e.id === anchorEventId) ?? null;
  }, [anchorEventId, events]);

  const availableJobs = useMemo(() => {
    if (!abilities) return ALL_JOBS;
    const present = new Set(abilities.map((a) => a.jobAbbrev));
    return ALL_JOBS.filter((j) => present.has(j));
  }, [abilities]);

  const grouped = useMemo(() => {
    if (!abilities) return new Map<AbilityInfo['category'], AbilityInfo[]>();
    const q = query.toLowerCase().trim();
    let filtered = abilities;

    if (q) {
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.jobAbbrev.toLowerCase().includes(q) ||
          (a.description?.toLowerCase().includes(q) ?? false),
      );
    }

    if (jobFilter) {
      filtered = filtered.filter((a) => a.jobAbbrev === jobFilter);
    }

    if (damageFilter !== 'all') {
      filtered = filtered.filter(
        (a) => a.damageType == null || a.damageType === damageFilter || a.damageType === 'both',
      );
    }

    const map = new Map<AbilityInfo['category'], AbilityInfo[]>();
    for (const cat of ABILITY_CATEGORY_ORDER) map.set(cat, []);
    for (const a of filtered) {
      const cur = map.get(a.category);
      if (cur) cur.push(a);
    }
    return map;
  }, [abilities, query, jobFilter, damageFilter]);

  const hasActiveFilters = jobFilter !== null || damageFilter !== 'all' || query.length > 0;
  const hasAnyResults = useMemo(
    () => Array.from(grouped.values()).some((list) => list.length > 0),
    [grouped],
  );

  // Detect cooldowns: same job+ability used on another event within recast window
  const onCooldownAbilities = useMemo(() => {
    if (!existingAssignments || !events || !anchorEvent) return new Set<string>();
    const cooldowns = new Set<string>();
    const anchorMs = anchorEvent.timestampMs;
    for (const a of existingAssignments) {
      if (a.eventId === anchorEvent.id) continue;
      const ability = abilities?.find((ab) => ab.id === a.abilityId);
      if (!ability) continue;
      const evt = events.find((e) => e.id === a.eventId);
      if (!evt) continue;
      const recastMs = (ability.recastS ?? 0) * 1000;
      if (recastMs > 0 && Math.abs(evt.timestampMs - anchorMs) < recastMs) {
        cooldowns.add(ability.id);
      }
    }
    return cooldowns;
  }, [existingAssignments, events, anchorEvent, abilities]);

  const content = (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden">
      {/* Search */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search ability, job, or effect…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          aria-label="Search abilities"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-[10px] font-semibold">Type:</span>
        {DAMAGE_TYPES.map((dt) => (
          <button
            key={dt.value}
            type="button"
            onClick={() => setDamageFilter(dt.value)}
            aria-pressed={damageFilter === dt.value}
            className={cn(
              'rounded-md border px-2.5 py-1 text-[10px] font-medium transition-colors',
              'focus-visible:ring-primary/50 focus-visible:outline-none focus-visible:ring-2',
              damageFilter === dt.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-transparent text-muted-foreground hover:bg-muted',
            )}
          >
            {dt.label}
          </button>
        ))}
      </div>

      {/* Job filter chips */}
      <div
        className="flex flex-wrap gap-1"
        role="group"
        aria-label="Filter by job"
      >
        <button
          type="button"
          onClick={() => setJobFilter(null)}
          aria-pressed={jobFilter === null}
          className={cn(
            'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors',
            'focus-visible:ring-primary/50 focus-visible:outline-none focus-visible:ring-2',
            jobFilter === null
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:bg-muted',
          )}
        >
          All
        </button>
        {availableJobs.map((job) => (
          <button
            key={job}
            type="button"
            onClick={() => setJobFilter(jobFilter === job ? null : job)}
            aria-pressed={jobFilter === job}
            className={cn(
              'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors',
              'focus-visible:ring-primary/50 focus-visible:outline-none focus-visible:ring-2',
              jobFilter === job
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {job}
          </button>
        ))}
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => { setQuery(''); setJobFilter(null); setDamageFilter('all'); }}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start rounded px-1 py-0.5 text-[10px]"
        >
          <X className="size-3" />
          Clear filters
        </button>
      )}

      {/* Ability list */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {Array.from(grouped.entries()).map(([cat, list]) =>
          list.length === 0 ? null : (
            <div key={cat}>
              <h4 className="text-muted-foreground mb-2 px-1 text-[10px] font-semibold tracking-widest uppercase">
                {ABILITY_CATEGORY_LABEL[cat]}
                <span className="ml-1 font-normal">({list.length})</span>
              </h4>
              <div className="flex flex-col gap-1">
                {list.map((a) => {
                  const isOnCooldown = onCooldownAbilities.has(a.id);
                  const canAssign = !!anchorEvent && !isOnCooldown;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      disabled={!canAssign}
                      onClick={() => onPickAbility(a)}
                      onDoubleClick={() => {
                        if (anchorEvent) onAssign(a.id, anchorEvent.id);
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md border border-transparent px-2 py-2.5 text-left transition-colors',
                        'hover:bg-muted focus-visible:ring-primary/50 focus-visible:outline-none focus-visible:ring-2',
                        isOnCooldown && 'opacity-50',
                        !canAssign && 'cursor-default',
                      )}
                      aria-label={`${a.name} (${a.jobAbbrev})${isOnCooldown ? ' — on cooldown' : ''}`}
                    >
                      <Badge variant="outline" className="w-12 shrink-0 justify-center font-mono text-[10px]">
                        {a.jobAbbrev}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {a.name}
                          {isOnCooldown && (
                            <span className="text-muted-foreground ml-1.5 text-[10px]">(on CD)</span>
                          )}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">{a.description}</p>
                      </div>
                      <div className="text-muted-foreground flex shrink-0 flex-col items-end font-mono text-[10px]">
                        <span>{a.recastS ?? '–'}s</span>
                        {a.effectPct != null && a.effectPct > 0 && (
                          <span className="text-chart-1">{a.effectPct}%</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ),
        )}
        {!hasAnyResults && abilities && abilities.length > 0 && (
          <p className="text-muted-foreground px-1 text-sm">
            {hasActiveFilters
              ? 'No abilities match your filters.'
              : 'No abilities found.'}
          </p>
        )}
        {abilities && abilities.length === 0 && (
          <p className="text-muted-foreground px-1 text-sm">No abilities catalogued yet.</p>
        )}
      </div>
    </div>
  );

  // Mobile: render inside a sheet
  if (!standalone) {
    return (
      <Sheet open={open ?? false} onOpenChange={(v) => onOpenChange?.(v)}>
        <SheetContent side="bottom" className="flex h-[70vh] flex-col gap-4 px-4 pb-6 pt-4">
          <SheetHeader>
            <SheetTitle>Add mitigation</SheetTitle>
            <SheetDescription>
              Search abilities and assign to the selected event.
            </SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: render as a sidebar panel
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold tracking-widest uppercase">Mitigation Library</h2>
        {anchorEvent && (
          <span className="text-muted-foreground truncate text-[10px] font-mono">
            Anchored: {anchorEvent.name} ({formatMs(anchorEvent.timestampMs)})
          </span>
        )}
      </div>
      {content}
    </div>
  );
};


