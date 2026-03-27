import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Compass, Copy, Edit2, FilePlus2, Globe, Sparkles } from 'lucide-react';
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

const TimelineCreateHub = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [ownedPlans, setOwnedPlans] = useState([]);
  const [ownedTimelines, setOwnedTimelines] = useState([]);
  const [collectedTimelines, setCollectedTimelines] = useState([]);
  const [officialTimelines, setOfficialTimelines] = useState([]);
  const [publicTimelines, setPublicTimelines] = useState([]);

  useEffect(() => {
    let isCancelled = false;

    const loadHubData = async () => {
      if (!user?.uid) {
        return;
      }

      setLoading(true);
      try {
        const [planData, userTimelineData, officialTimelineData, publicTimelineData] = await Promise.all([
          getCategorizedUserPlans(user.uid),
          getUserTimelines(user.uid),
          getOfficialTimelines(),
          getAllPublicTimelines('recent'),
        ]);

        if (isCancelled) {
          return;
        }

        const editableCommunityTimelines = userTimelineData.filter((timeline) => !timeline.official);
        setOwnedPlans((planData.ownedPlans || []).filter((plan) => plan.timelineLayout || plan.sourceTimelineId));
        setOwnedTimelines(editableCommunityTimelines.filter((timeline) => timeline.isOwned));
        setCollectedTimelines(editableCommunityTimelines.filter((timeline) => !timeline.isOwned));
        setOfficialTimelines(officialTimelineData || []);
        setPublicTimelines(publicTimelineData || []);
      } catch (error) {
        console.error('Failed to load timeline hub data:', error);
        toast.error('Failed to load the timeline hub', {
          description: error instanceof Error ? error.message : 'Please try again.',
        });
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void loadHubData();
    return () => {
      isCancelled = true;
    };
  }, [user?.uid]);

  const featuredPublicTimelines = useMemo(() => publicTimelines.slice(0, 6), [publicTimelines]);
  const featuredOfficialTimelines = useMemo(() => officialTimelines.slice(0, 6), [officialTimelines]);

  const getBossLabel = (bossId, bossTags = []) => {
    const effectiveBossId = bossId || bossTags[0];
    if (!effectiveBossId) {
      return 'Multi-encounter';
    }

    const boss = bosses.find((entry) => entry.id === effectiveBossId);
    return boss ? `${boss.icon || '📘'} ${boss.name}` : effectiveBossId;
  };

  const openTimelineSeed = (timelineId) => {
    navigate(`/timeline/create/editor?sourceTimelineId=${encodeURIComponent(timelineId)}`);
  };

  const openPlanSeed = (planId) => {
    navigate(`/timeline/create/editor?sourcePlanId=${encodeURIComponent(planId)}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Button variant="outline" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={18} />
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">Community Timeline Hub</h1>
              <p className="text-sm text-muted-foreground">
                Continue your work, start from a plan or official route, or publish something new for the community.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/timeline/browse')}>
              <Compass size={16} />
              Browse Public Timelines
            </Button>
            <Button onClick={() => navigate('/timeline/create/editor')}>
              <FilePlus2 size={16} />
              Start Blank
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles size={18} />
                Start Blank
              </CardTitle>
              <CardDescription>
                Open the shared community editor with an empty timeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate('/timeline/create/editor')}>
                Create Community Timeline
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe size={18} />
                Browse Public Timelines
              </CardTitle>
              <CardDescription>
                Discover community routes, collect favorites, and use them as a starting point.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => navigate('/timeline/browse')}>
                Open Community Browser
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy size={18} />
                Publish From a Plan
              </CardTitle>
              <CardDescription>
                Need to share a plan-local edit? Open the plan timeline editor and publish a separate community copy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
                Go to Your Plans
              </Button>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Continue Your Timelines</h2>
            <p className="text-sm text-muted-foreground">
              Jump back into the community timelines you already own.
            </p>
          </div>
          {loading ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              Loading your community timelines...
            </div>
          ) : ownedTimelines.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              No owned community timelines yet. Start blank, or seed one from a plan or official timeline below.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ownedTimelines.map((timeline) => (
                <Card key={timeline.id}>
                  <CardHeader>
                    <CardTitle className="truncate">{timeline.name}</CardTitle>
                    <CardDescription>{getBossLabel(timeline.bossId, timeline.bossTags)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {timeline.description || 'No description yet.'}
                    </p>
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => navigate(`/timeline/edit/${timeline.id}`)}>
                        <Edit2 size={16} />
                        Continue Editing
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={() => navigate(`/timeline/view/${timeline.id}`)}>
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Start From a Plan Timeline</h2>
            <p className="text-sm text-muted-foreground">
              Seed a new community timeline from one of your private plan-owned timeline edits.
            </p>
          </div>
          {loading ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              Loading your plans...
            </div>
          ) : ownedPlans.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              No plan timelines available yet. Edit a plan timeline first, then come back here to branch it into a community timeline.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ownedPlans.map((plan) => (
                <Card key={plan.id}>
                  <CardHeader>
                    <CardTitle className="truncate">{plan.name}</CardTitle>
                    <CardDescription>{getBossLabel(plan.bossId, plan.bossTags)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {plan.description || 'Use this plan timeline as the starting point for a shareable community route.'}
                    </p>
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => openPlanSeed(plan.id)}>
                        Start From Plan Timeline
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={() => navigate(`/plan/${plan.id}/timeline`)}>
                        Open Plan Editor
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Start From an Official Timeline</h2>
            <p className="text-sm text-muted-foreground">
              Create a mutable community copy from the official encounter timelines.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredOfficialTimelines.map((timeline) => (
              <Card key={timeline.id}>
                <CardHeader>
                  <CardTitle className="truncate">{timeline.name}</CardTitle>
                  <CardDescription>{getBossLabel(timeline.bossId, timeline.bossTags)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {timeline.description || 'Start from the official route and adapt it into your own community timeline.'}
                  </p>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => openTimelineSeed(timeline.id)}>
                      Use as Starting Point
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => navigate(`/timeline/view/${timeline.id}`)}>
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Duplicate a Community Timeline</h2>
            <p className="text-sm text-muted-foreground">
              Start from a collected community route without changing the original.
            </p>
          </div>
          {loading ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              Loading collected timelines...
            </div>
          ) : collectedTimelines.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              No collected timelines yet. Add one from the community browser or start from one of the public timelines below.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {collectedTimelines.map((timeline) => (
                <Card key={timeline.id}>
                  <CardHeader>
                    <CardTitle className="truncate">{timeline.name}</CardTitle>
                    <CardDescription>{getBossLabel(timeline.bossId, timeline.bossTags)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {timeline.description || 'Create a new community timeline based on this collected route.'}
                    </p>
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => openTimelineSeed(timeline.id)}>
                        Duplicate Into Editor
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={() => navigate(`/timeline/view/${timeline.id}`)}>
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Browse Public Community Timelines</h2>
              <p className="text-sm text-muted-foreground">
                Preview what the community is publishing right now, then open one directly in the editor.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/timeline/browse')}>
              Open Full Browser
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredPublicTimelines.map((timeline) => (
              <Card key={timeline.id}>
                <CardHeader>
                  <CardTitle className="truncate">{timeline.name}</CardTitle>
                  <CardDescription>{getBossLabel(timeline.bossId, timeline.bossTags)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {timeline.description || 'Open this public route as the starting point for your own community timeline.'}
                  </p>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => openTimelineSeed(timeline.id)}>
                      Start From This
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => navigate(`/timeline/view/${timeline.id}`)}>
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default TimelineCreateHub;
