/**
 * EncounterPicker — radio-style selector for picking an encounter
 * (and thus the plan's base timeline) in the "New plan" dialog.
 *
 * Loads the encounter catalog via `data-source.listEncounters()` and
 * groups by raid. The selected encounter drives the editor's
 * timeline view + ability picker anchoring.
 *
 * Phase 1 scope: single-select, no search. With ~6 encounters in the
 * catalog, a scrollable grouped radio list is sufficient. When the
 * catalog grows past ~20, swap in a `cmdk`-style combobox here.
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2, Skull, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listEncounters, type EncounterInfo } from '@/lib/data-source';

const TYPE_TINT: Record<'ultimate' | 'savage' | 'raid', string> = {
  ultimate: 'bg-primary/10 text-primary border-primary/30',
  savage: 'bg-chart-2/10 text-chart-2 border-chart-2/30',
  raid: 'bg-muted text-muted-foreground border-border',
};

const badgeFor = (slug: string): { label: string; type: keyof typeof TYPE_TINT } => {
  if (slug.endsWith('-u') || slug.includes('-ult')) return { label: 'Ultimate', type: 'ultimate' };
  if (slug.includes('savage') || /m[0-9]+s|p[0-9]+s/.test(slug))
    return { label: 'Savage', type: 'savage' };
  return { label: 'Raid', type: 'raid' };
};

const formatPatch = (v: string | null): string => (v ? `patch ${v}` : '');

export const EncounterPicker = ({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string) => void;
}) => {
  const [encounters, setEncounters] = useState<EncounterInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Ref-mirror `onChange` so the loader effect only fires on mount.
  // The parent passes an inline arrow that has a new identity every
  // render — depending on it directly would refetch the catalog on
  // every parent re-render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let mounted = true;
    listEncounters()
      .then((rows) => {
        if (!mounted) return;
        setEncounters(rows);
        if (!value && rows[0]) onChangeRef.current(rows[0].id);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load encounters');
      });
    return () => {
      mounted = false;
    };
    // value is intentionally captured via the ref's mount-time read —
    // see the comment above.
  }, []);

  if (error) {
    return <p className="text-destructive text-sm">Could not load encounters: {error}</p>;
  }
  if (!encounters) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-3 animate-spin" /> Loading encounter catalog…
      </div>
    );
  }

  // Group by raid (raid_slug + raid_name), preserve encounter order
  // within a raid. This drives the section headings.
  const grouped = new Map<string, { raidName: string; items: EncounterInfo[] }>();
  for (const e of encounters) {
    const key = e.raidSlug;
    const cur = grouped.get(key);
    if (cur) cur.items.push(e);
    else grouped.set(key, { raidName: e.raidName, items: [e] });
  }

  return (
    <div
      className="border-border bg-card/40 flex max-h-72 flex-col gap-3 overflow-y-auto rounded-md border p-2"
      role="radiogroup"
      aria-label="Encounter"
    >
      {Array.from(grouped.entries()).map(([raidSlug, { raidName, items }]) => (
        <div key={raidSlug} className="flex flex-col gap-1">
          <div className="text-muted-foreground px-2 text-[10px] font-semibold tracking-widest uppercase">
            {raidName}
          </div>
          {items.map((e) => {
            const selected = e.id === value;
            const { label, type } = badgeFor(e.slug);
            return (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(e.id)}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                  selected
                    ? 'border-primary bg-primary/10'
                    : 'border-transparent hover:bg-muted/60',
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {type === 'ultimate' ? (
                    <Sparkles className="text-primary size-4 shrink-0" />
                  ) : (
                    <Skull className="text-muted-foreground size-4 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {formatPatch(e.patchVersion)}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase',
                    TYPE_TINT[type],
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};