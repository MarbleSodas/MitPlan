import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FilePlus2, LogIn, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { bosses, bossActionsMap } from '../../data';
import { mitigationAbilities } from '../../data';
import { getTimeline } from '../../services/timelineService';
import {
  duplicatePlanFromViewToken,
  subscribeToPlanShareView,
  trackPlanShareViewAccess,
} from '../../services/realtimePlanService';
import { processMultiHitTankBusters } from '../../utils/boss/bossActionUtils';
import { getJobIcon } from '../../utils';
import { getPlanTimelineLayout } from '../../utils/timeline/planTimelineLayoutUtils';
import type { AssignedMitigation, BossAction, MitigationAbility, Plan } from '../../types';
import { Button } from '@/components/ui/button';

interface TimelineBossMetadata {
  level?: number;
  name?: string;
  icon?: string;
  description?: string;
  baseHealth?: Record<string, unknown>;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const MitigationCard = ({ mitigation, assignment }: { mitigation: MitigationAbility; assignment: AssignedMitigation }) => {
  const precastLabel = assignment.precastSeconds !== undefined && assignment.precastSeconds > 0
    ? `precast ${assignment.precastSeconds.toFixed(1)}s`
    : assignment.precastSeconds === 0
      ? 'on-hit'
      : '';

  return (
    <div className="flex items-center gap-3 rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 print:border print:border-gray-400 print:bg-white print:break-inside-avoid">
      {assignment.casterJobId && (
        <span className="h-6 w-6 shrink-0">
          <img
            src={getJobIcon(assignment.casterJobId) ?? ''}
            alt={assignment.casterJobId}
            className="h-full w-full object-contain"
          />
        </span>
      )}
      <span className="flex-1 text-sm font-medium">{mitigation.name}</span>
      {precastLabel && (
        <span className="text-xs text-muted-foreground print:text-gray-600">{precastLabel}</span>
      )}
    </div>
  );
};

const SharedPlanView = () => {
  const { viewToken } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sharedPlan, setSharedPlan] = useState<Plan | null>(null);
  const [bossActions, setBossActions] = useState<BossAction[]>([]);
  const [bossMetadata, setBossMetadata] = useState<TimelineBossMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewToken) {
      setError('Shared plan link is invalid.');
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToPlanShareView(viewToken, (nextPlan, shareViewError) => {
      if (shareViewError) {
        setError('Unable to load this shared plan.');
        setSharedPlan(null);
      } else if (!nextPlan) {
        setError('This shared plan link is no longer available.');
        setSharedPlan(null);
      } else {
        setSharedPlan(nextPlan);
        setError(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [viewToken]);

  useEffect(() => {
    if (!viewToken || !user?.uid) {
      return;
    }

    trackPlanShareViewAccess(viewToken, user.uid);
  }, [user?.uid, viewToken]);

  useEffect(() => {
    if (!sharedPlan) {
      return;
    }

    let cancelled = false;
    setTimelineLoading(true);

    const loadBossActions = async () => {
      const planTimelineLayout = getPlanTimelineLayout(sharedPlan);
      const timelineId = sharedPlan.sourceTimelineId;

      if (planTimelineLayout) {
        if (cancelled) {
          return;
        }

        setBossMetadata(planTimelineLayout.bossMetadata || null);
        setBossActions(processMultiHitTankBusters(Array.isArray(planTimelineLayout.actions) ? planTimelineLayout.actions : []));
        setTimelineLoading(false);
        return;
      }

      if (timelineId) {
        try {
          const timeline = await getTimeline(timelineId);
          if (cancelled) {
            return;
          }

          if (timeline?.bossMetadata) {
            setBossMetadata(timeline.bossMetadata);
          }

          const timelineActions = Array.isArray(timeline?.actions) ? timeline.actions : [];
          if (timelineActions.length > 0) {
            setBossActions(processMultiHitTankBusters(timelineActions));
            setTimelineLoading(false);
            return;
          }
        } catch (timelineError) {
          console.warn('[SharedPlanView] Failed to load timeline actions, falling back:', timelineError);
        }
      }

      if (cancelled) {
        return;
      }

      setBossMetadata(null);
      setBossActions(processMultiHitTankBusters(bossActionsMap[sharedPlan.bossId] || []));
      setTimelineLoading(false);
    };

    loadBossActions();

    return () => {
      cancelled = true;
    };
  }, [sharedPlan]);

  const handleBack = () => {
    navigate(user ? '/dashboard' : '/');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleMakeCopy = async () => {
    if (!viewToken || !user?.uid) {
      navigate(`/?next=${encodeURIComponent(`/plan/view/${viewToken || ''}`)}`);
      return;
    }

    setCopying(true);
    try {
      const copiedPlan = await duplicatePlanFromViewToken(viewToken, user.uid);
      toast.success('Private copy created', {
        description: 'You can now edit your own copy of this plan.',
      });
      navigate(`/plan/edit/${copiedPlan.id}`);
    } catch (copyError) {
      console.error('Failed to create copy from shared view:', copyError);
      toast.error('Failed to create a copy', {
        description: copyError instanceof Error ? copyError.message : 'Please try again.',
      });
    } finally {
      setCopying(false);
    }
  };

  if (loading || timelineLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (error || !sharedPlan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
        <p className="text-lg font-semibold">{error || 'Shared plan not found.'}</p>
        <Button onClick={handleBack} variant="outline">Back</Button>
      </div>
    );
  }

  const boss = bosses.find((candidate: { id: string }) => candidate.id === sharedPlan.bossId);
  const displayBossName = bossMetadata?.name || boss?.name || sharedPlan.bossId;
  const dateGenerated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="print-header mb-6 hidden border-b border-border pb-4 print:block print:border-b-2">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{sharedPlan.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {bossMetadata ? displayBossName : (boss ? `${boss.name} (${boss.id.toUpperCase()})` : sharedPlan.bossId)}
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Generated: {dateGenerated}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 print:max-w-none print:px-8 print:py-0">
        <header className="mb-6 border-b border-border pb-4 print:hidden">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{sharedPlan.name}</h1>
              <p className="mt-1 text-muted-foreground">
                {bossMetadata ? displayBossName : (boss ? `${boss.name} (${boss.id.toUpperCase()})` : sharedPlan.bossId)}
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Generated: {dateGenerated}</p>
            </div>
          </div>

          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800">
            Read-only shared plan. Print this view or create your own private copy to make changes.
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            {user ? (
              <Button onClick={handleMakeCopy} disabled={copying}>
                <FilePlus2 className="mr-2 h-4 w-4" />
                {copying ? 'Creating Copy...' : 'Make a Copy'}
              </Button>
            ) : (
              <Button onClick={handleMakeCopy}>
                <LogIn className="mr-2 h-4 w-4" />
                Sign In to Copy
              </Button>
            )}
          </div>
        </header>

        <div className="flex flex-col gap-6">
          {bossActions.map((action) => {
            const assignmentsForAction = sharedPlan.assignments?.[action.id] || [];

            return (
              <div key={action.id} className="overflow-hidden rounded-lg border border-border print:break-inside-avoid">
                <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3 print:bg-gray-100 dark:print:bg-gray-800">
                  <span className="min-w-[60px] text-lg font-bold print:text-black">{formatTime(action.time)}</span>
                  <span className="text-2xl">{action.icon || '⚔️'}</span>
                  <div className="flex-1">
                    <h3 className="text-base font-bold">{action.name}</h3>
                    {action.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground print:text-gray-600 dark:print:text-gray-300">
                        {action.description}
                      </p>
                    )}
                  </div>
                  {action.unmitigatedDamage && (
                    <span className="text-sm font-medium text-muted-foreground print:text-gray-600">
                      Dmg: {action.unmitigatedDamage}
                    </span>
                  )}
                </div>

                <div className="p-4">
                  {assignmentsForAction.length === 0 ? (
                    <p className="text-sm italic text-muted-foreground">No mitigations assigned</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {assignmentsForAction.map((assignment: AssignedMitigation, index: number) => {
                        const fullMitigation = mitigationAbilities.find((mitigation) => mitigation.id === assignment.id);
                        if (!fullMitigation) {
                          return null;
                        }

                        return (
                          <MitigationCard
                            key={`${assignment.id}-${index}`}
                            mitigation={fullMitigation}
                            assignment={assignment}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <footer className="print-footer mt-8 hidden border-t border-border pt-4 text-center text-sm text-muted-foreground print:block">
          <span>Page </span>
          <span className="page-number">1</span>
        </footer>
      </div>
    </div>
  );
};

export default SharedPlanView;
