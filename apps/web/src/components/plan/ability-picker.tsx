/**
 * AbilityPicker. Sheet (right-anchored slide-over) with a searchable
 * list of sample abilities grouped by category. The user picks an
 * ability + the event they want to anchor it to, and the parent writes
 * the assignment to the live PlanDoc.
 */
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  ABILITY_CATEGORY_LABEL,
  SAMPLE_ABILITIES,
  SAMPLE_EVENTS,
  type SampleAbility,
  type SampleEvent,
} from '@/lib/sample-data';
import { cn } from '@/lib/utils';

const formatMs = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
};

export const AbilityPicker = ({
  open,
  onOpenChange,
  encounterId,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounterId: string;
  onPick: (input: { ability: SampleAbility; event: SampleEvent }) => void;
}) => {
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<{ ability: SampleAbility; event: SampleEvent } | null>(
    null,
  );

  const events = SAMPLE_EVENTS[encounterId] ?? [];

  const grouped = useMemo(() => {
    const q = query.toLowerCase().trim();
    const matches = q
      ? SAMPLE_ABILITIES.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.jobAbbrev.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q),
        )
      : SAMPLE_ABILITIES;
    const out: Record<SampleAbility['category'], SampleAbility[]> = {
      'tank-cd': [],
      'healer-cd': [],
      'party-mit': [],
      invuln: [],
      shield: [],
    };
    for (const a of matches) out[a.category].push(a);
    return out;
  }, [query]);

  const handleConfirm = () => {
    if (!pending) return;
    onPick(pending);
    setPending(null);
    setQuery('');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add mitigation</SheetTitle>
          <SheetDescription>
            Search the catalog of mits and anchor one to a timeline event.
          </SheetDescription>
        </SheetHeader>

        {!pending ? (
          <div className="flex flex-1 flex-col gap-3 overflow-hidden px-4 pb-4">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search by ability, job, or effect…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {Object.entries(grouped).map(([cat, abilities]) =>
                abilities.length === 0 ? null : (
                  <div key={cat}>
                    <h4 className="text-muted-foreground mb-2 px-1 text-[10px] font-semibold tracking-widest uppercase">
                      {ABILITY_CATEGORY_LABEL[cat as SampleAbility['category']]}
                    </h4>
                    <div className="flex flex-col gap-1">
                      {abilities.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setPending({ ability: a, event: events[0]! })}
                          className="hover:bg-muted flex items-center gap-3 rounded-md border border-transparent px-2 py-2 text-left transition-colors"
                        >
                          <Badge
                            variant="outline"
                            className="w-12 justify-center font-mono text-[10px]"
                          >
                            {a.jobAbbrev}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{a.name}</p>
                            <p className="text-muted-foreground truncate text-xs">
                              {a.description}
                            </p>
                          </div>
                          <div className="text-muted-foreground flex shrink-0 flex-col items-end font-mono text-[10px]">
                            <span>{a.recastS}s</span>
                            {a.effectPct > 0 && (
                              <span className="text-chart-1">{a.effectPct}%</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
            <div className="bg-muted/40 rounded-md border p-3">
              <p className="text-sm font-medium">{pending.ability.name}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {pending.ability.jobAbbrev} · {pending.ability.description}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Anchor to event</Label>
              <div className="flex flex-col gap-1">
                {events.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setPending({ ...pending, event: e })}
                    className={cn(
                      'flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors',
                      pending.event.id === e.id
                        ? 'border-primary bg-primary/10'
                        : 'hover:bg-muted',
                    )}
                  >
                    <span className="font-medium">{e.name}</span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {formatMs(e.positionMs)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-auto flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPending(null)}
              >
                Back
              </Button>
              <Button className="flex-1" onClick={handleConfirm}>
                Add to plan
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};