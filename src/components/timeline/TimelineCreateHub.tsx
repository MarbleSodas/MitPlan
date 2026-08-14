import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from '@/lib/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Compass, FilePlus2 } from 'lucide-react';
import { getCategorizedUserPlans } from '../../services/planAccessService';
import {
  getAllPublicTimelines,
  getOfficialTimelines,
  getUserTimelines,
} from '../../services/timelineService';
import { bosses } from '../../data/bosses/bossData';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import PageHeader from '../layout/PageHeader';
import { cn } from '@/lib/utils';

type HubTab = 'mine' | 'plans' | 'browse';

type TimelineSeedCardProps = {
  title: string;
  bossLabel: string;
  description?: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

const TimelineSeedCard = ({
  title,
  bossLabel,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel = 'View',
  onSecondary,
}: TimelineSeedCardProps) => (
  <Card className="min-w-0">
    <CardHeader>
      <CardTitle className="truncate">{title}</CardTitle>
      <CardDescription>{bossLabel}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      <p className="line-clamp-2 text-sm text-muted-foreground">
        {description || 'Use this timeline as a starting point.'}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="min-w-0 flex-1" onClick={onPrimary}>{primaryLabel}</Button>
        {onSecondary ? (
          <Button variant="outline" className="min-w-0 flex-1" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        ) : null}
      </div>
    </CardContent>
  </Card>
);

const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="rounded-lg border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
    {children}
  </div>
);

const TimelineCreateHub = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<HubTab>('mine');
  const [loading, setLoading] = useState(true);
  const [ownedPlans, setOwnedPlans] = useState<any[]>([]);
  const [ownedTimelines, setOwnedTimelines] = useState<any[]>([]);
  const [collectedTimelines, setCollectedTimelines] = useState<any[]>([]);
  const [officialTimelines, setOfficialTimelines] = useState<any[]>([]);
  const [publicTimelines, setPublicTimelines] = useState<any[]>([]);

  useEffect(() => {
    let isCancelled = false;

    const loadHubData = async () => {
      if (!user?.uid) return;

      setLoading(true);
      try {
        const [planData, userTimelineData, officialTimelineData, publicTimelineData] = await Promise.all([
          getCategorizedUserPlans(user.uid),
          getUserTimelines(user.uid),
          getOfficialTimelines(),
          getAllPublicTimelines('recent'),
        ]);

        if (isCancelled) return;
        const editableTimelines = userTimelineData.filter((timeline: any) => !timeline.official);
        setOwnedPlans((planData.ownedPlans || []).filter((plan: any) => plan.timelineLayout || plan.sourceTimelineId));
        setOwnedTimelines(editableTimelines.filter((timeline: any) => timeline.isOwned));
        setCollectedTimelines(editableTimelines.filter((timeline: any) => !timeline.isOwned));
        setOfficialTimelines(officialTimelineData || []);
        setPublicTimelines(publicTimelineData || []);
      } catch (error) {
        console.error('Failed to load timeline hub data:', error);
        toast.error('Failed to load the timeline hub', {
          description: error instanceof Error ? error.message : 'Please try again.',
        });
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    void loadHubData();
    return () => { isCancelled = true; };
  }, [user?.uid]);

  const featuredPublicTimelines = useMemo(() => publicTimelines.slice(0, 6), [publicTimelines]);
  const featuredOfficialTimelines = useMemo(() => officialTimelines.slice(0, 6), [officialTimelines]);

  const getBossLabel = (bossId?: string, bossTags: string[] = []) => {
    const effectiveBossId = bossId || bossTags[0];
    if (!effectiveBossId) return 'Multi-encounter';
    const boss = bosses.find((entry) => entry.id === effectiveBossId);
    return boss ? `${boss.icon || ''} ${boss.name}`.trim() : effectiveBossId;
  };

  const openTimelineSeed = (timelineId: string) => {
    navigate(`/timeline/create/editor?sourceTimelineId=${encodeURIComponent(timelineId)}`);
  };
  const openPlanSeed = (planId: string) => {
    navigate(`/timeline/create/editor?sourcePlanId=${encodeURIComponent(planId)}`);
  };

  const tabs: Array<{ id: HubTab; label: string }> = [
    { id: 'mine', label: 'My timelines' },
    { id: 'plans', label: 'From a plan' },
    { id: 'browse', label: 'Browse' },
  ];

  const cardGrid = 'grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <PageHeader
            className="mb-0"
            title="Timeline hub"
            description="Create, continue, and discover community timelines."
            leading={
              <Button variant="outline" size="icon" onClick={() => navigate('/dashboard')} aria-label="Back to dashboard">
                <ArrowLeft size={18} />
              </Button>
            }
            actions={
              <Button onClick={() => navigate('/timeline/create/editor')}>
                <FilePlus2 size={16} /> New Timeline
              </Button>
            }
          />
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:py-8">
        <div className="flex overflow-x-auto border-b border-border" role="tablist" aria-label="Timeline hub sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'min-h-11 whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'mine' && (
          <section className="space-y-4" role="tabpanel">
            <div>
              <h2 className="text-xl font-semibold">My timelines</h2>
              <p className="text-sm text-muted-foreground">Continue editing timelines you own.</p>
            </div>
            {loading ? <EmptyState>Loading your timelines…</EmptyState> : ownedTimelines.length === 0 ? (
              <EmptyState>
                <p className="mb-4">You have not created a community timeline yet.</p>
                <Button onClick={() => navigate('/timeline/create/editor')}>Create your first timeline</Button>
              </EmptyState>
            ) : (
              <div className={cardGrid}>
                {ownedTimelines.map((timeline) => (
                  <TimelineSeedCard
                    key={timeline.id}
                    title={timeline.name}
                    bossLabel={getBossLabel(timeline.bossId, timeline.bossTags)}
                    description={timeline.description}
                    primaryLabel="Continue editing"
                    onPrimary={() => navigate(`/timeline/edit/${timeline.id}`)}
                    onSecondary={() => navigate(`/timeline/view/${timeline.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'plans' && (
          <div className="space-y-8" role="tabpanel">
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">From one of your plans</h2>
                <p className="text-sm text-muted-foreground">Create a separate community timeline from a plan-local edit.</p>
              </div>
              {loading ? <EmptyState>Loading your plans…</EmptyState> : ownedPlans.length === 0 ? (
                <EmptyState>No editable plan timelines are available yet.</EmptyState>
              ) : (
                <div className={cardGrid}>
                  {ownedPlans.map((plan) => (
                    <TimelineSeedCard
                      key={plan.id}
                      title={plan.name}
                      bossLabel={getBossLabel(plan.bossId, plan.bossTags)}
                      description={plan.description}
                      primaryLabel="Start from plan"
                      onPrimary={() => openPlanSeed(plan.id)}
                      secondaryLabel="Open plan editor"
                      onSecondary={() => navigate(`/plan/${plan.id}/timeline`)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Official starting points</h2>
                <p className="text-sm text-muted-foreground">Copy a verified encounter route into the community editor.</p>
              </div>
              {featuredOfficialTimelines.length === 0 ? <EmptyState>No official timelines are available.</EmptyState> : (
                <div className={cardGrid}>
                  {featuredOfficialTimelines.map((timeline) => (
                    <TimelineSeedCard
                      key={timeline.id}
                      title={timeline.name}
                      bossLabel={getBossLabel(timeline.bossId, timeline.bossTags)}
                      description={timeline.description}
                      primaryLabel="Use as starting point"
                      onPrimary={() => openTimelineSeed(timeline.id)}
                      onSecondary={() => navigate(`/timeline/view/${timeline.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'browse' && (
          <div className="space-y-8" role="tabpanel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Browse community timelines</h2>
                <p className="text-sm text-muted-foreground">Use a saved or public route as your starting point.</p>
              </div>
              <Button variant="outline" onClick={() => navigate('/timeline/browse')}>
                <Compass size={16} /> Open full browser
              </Button>
            </div>

            <section className="space-y-4">
              <h3 className="font-semibold">Saved to your collection</h3>
              {loading ? <EmptyState>Loading your collection…</EmptyState> : collectedTimelines.length === 0 ? (
                <EmptyState>You have not saved any community timelines yet.</EmptyState>
              ) : (
                <div className={cardGrid}>
                  {collectedTimelines.map((timeline) => (
                    <TimelineSeedCard
                      key={timeline.id}
                      title={timeline.name}
                      bossLabel={getBossLabel(timeline.bossId, timeline.bossTags)}
                      description={timeline.description}
                      primaryLabel="Start from this"
                      onPrimary={() => openTimelineSeed(timeline.id)}
                      onSecondary={() => navigate(`/timeline/view/${timeline.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h3 className="font-semibold">Recently published</h3>
              {featuredPublicTimelines.length === 0 ? <EmptyState>No public timelines match yet.</EmptyState> : (
                <div className={cardGrid}>
                  {featuredPublicTimelines.map((timeline) => (
                    <TimelineSeedCard
                      key={timeline.id}
                      title={timeline.name}
                      bossLabel={getBossLabel(timeline.bossId, timeline.bossTags)}
                      description={timeline.description}
                      primaryLabel="Start from this"
                      onPrimary={() => openTimelineSeed(timeline.id)}
                      onSecondary={() => navigate(`/timeline/view/${timeline.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default TimelineCreateHub;
