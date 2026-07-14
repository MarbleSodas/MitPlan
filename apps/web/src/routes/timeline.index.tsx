import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Clock, Search, Sparkles } from 'lucide-react';
import type { AbilityMode } from '@xivmitplan/validation/ability';
import {
  getCanonicalTimelineForEncounter,
  getTimelineForEncounter,
  listEncounters,
  type CanonicalTimelineInfo,
  type EncounterInfo,
  type TimelineEventInfo,
} from '@/lib/data-source';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CommunityTimelineBrowser } from '@/components/plan/community-timeline-browser';

type TimelineCardData = {
  encounter: EncounterInfo;
  canonical: CanonicalTimelineInfo | null;
  events: TimelineEventInfo[];
};

export const TimelineIndex = () => {
  const [mode, setMode] = useState<AbilityMode>('CURRENT');
  const [query, setQuery] = useState('');
  const [cards, setCards] = useState<TimelineCardData[]>([]);
  const [encounters, setEncounters] = useState<EncounterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    void listEncounters()
      .then(async (encounters) => {
        if (mounted) setEncounters(encounters);
        const next = await Promise.all(
          encounters.map(async (encounter) => {
            const canonical = await getCanonicalTimelineForEncounter(encounter.id, mode);
            const fallbackEvents = canonical
              ? canonical.events
              : await getTimelineForEncounter(encounter.id, mode);
            return {
              encounter,
              canonical,
              events: canonical?.events ?? fallbackEvents,
            };
          }),
        );
        if (mounted) setCards(next.filter((card) => card.events.length > 0));
      })
      .catch((cause: unknown) => {
        if (mounted) setError(cause instanceof Error ? cause.message : 'Could not load timelines');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [mode]);

  const filteredCards = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return cards;
    return cards.filter(({ encounter }) =>
      [encounter.name, encounter.raidName, encounter.raidSlug].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [cards, query]);
  const eventsByEncounter = useMemo(
    () => new Map(cards.map((card) => [card.encounter.id, card.events] as const)),
    [cards],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon" className="size-8">
            <Link to="/plan" aria-label="Back to plans">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Timeline catalog</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Browse the mode-aware canonical encounter timelines used by new plans.
            </p>
          </div>
        </div>
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value as AbilityMode)}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          aria-label="Timeline mode"
        >
          <option value="REBORN">Reborn</option>
          <option value="EVOLVED">Evolved</option>
          <option value="CURRENT">Current</option>
          <option value="ALL">All modes</option>
        </select>
      </header>

      <div className="relative max-w-xl">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search encounters or raids"
          className="pl-9"
          aria-label="Search timeline catalog"
        />
      </div>

      {error && <p className="text-destructive text-sm">Could not load timelines: {error}</p>}
      {loading && <p className="text-muted-foreground text-sm">Loading timelines…</p>}
      {!loading && !error && filteredCards.length === 0 && (
        <div className="border-border bg-card/40 text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
          No timelines are available for this mode.
        </div>
      )}

      {!loading && filteredCards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map(({ encounter, canonical, events }) => (
            <article key={encounter.id} className="border-border bg-card rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                    {encounter.raidSlug}
                  </p>
                  <h2 className="mt-1 truncate font-semibold">{encounter.name}</h2>
                </div>
                <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                  {canonical?.version ?? encounter.patchVersion}
                </Badge>
              </div>
              <div className="text-muted-foreground mt-4 flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-3" /> {events.length} events
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3" /> {encounter.patchVersion}
                </span>
              </div>
              <Button asChild className="mt-4 w-full" variant="outline">
                <Link to={`/plan?encounterId=${encodeURIComponent(encounter.id)}`}>
                  Use as plan base
                </Link>
              </Button>
            </article>
          ))}
        </div>
      )}

      <CommunityTimelineBrowser
        encounters={encounters}
        eventsByEncounter={eventsByEncounter}
        mode={mode}
      />
    </div>
  );
};
