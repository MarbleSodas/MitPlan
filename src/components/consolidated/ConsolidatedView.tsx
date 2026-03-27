import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useRealtimePlan } from '../../contexts/RealtimePlanContext';
import RealtimeAppProvider from '../../contexts/RealtimeAppProvider';
import { bosses, bossActionsMap } from '../../data';
import { getTimeline } from '../../services/timelineService';
import { processMultiHitTankBusters } from '../../utils/boss/bossActionUtils';
import { mitigationAbilities } from '../../data';
import { getJobIcon } from '../../utils';
import { getPlanTimelineLayout } from '../../utils/timeline/planTimelineLayoutUtils';
import type { AssignedMitigation, MitigationAbility, BossAction } from '../../types';

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
    <div className="flex items-center gap-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 print:bg-white print:border print:border-gray-400 print:break-inside-avoid">
      {assignment.casterJobId && (
        <span className="w-6 h-6 shrink-0">
          <img
            src={getJobIcon(assignment.casterJobId) ?? ''}
            alt={assignment.casterJobId}
            className="w-full h-full object-contain"
          />
        </span>
      )}
      <span className="font-medium text-sm flex-1">{mitigation.name}</span>
      {precastLabel && (
        <span className="text-xs text-muted-foreground print:text-gray-600">{precastLabel}</span>
      )}
    </div>
  );
};

const ConsolidatedViewInner = () => {
  const { realtimePlan, loading, error } = useRealtimePlan();
  const [bossActions, setBossActions] = useState<BossAction[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [bossMetadata, setBossMetadata] = useState<TimelineBossMetadata | null>(null);

  useEffect(() => {
    if (!realtimePlan) return;

    let cancelled = false;
    setTimelineLoading(true);

    const loadBossActions = async () => {
      const planTimelineLayout = getPlanTimelineLayout(realtimePlan);
      const timelineId = realtimePlan.sourceTimelineId;

      if (planTimelineLayout) {
        setBossMetadata(planTimelineLayout.bossMetadata || null);
        const rawActions = Array.isArray(planTimelineLayout.actions) ? planTimelineLayout.actions : [];
        setBossActions(processMultiHitTankBusters(rawActions));
        setTimelineLoading(false);
        setInitialized(true);
        return;
      }

      if (timelineId) {
        try {
          const timeline = await getTimeline(timelineId);
          if (cancelled) return;
          if (timeline?.bossMetadata) {
            setBossMetadata(timeline.bossMetadata);
          }
          const rawActions = Array.isArray(timeline?.actions) ? timeline.actions : [];
          if (rawActions.length) {
            setBossActions(processMultiHitTankBusters(rawActions));
            setTimelineLoading(false);
            setInitialized(true);
            return;
          }
        } catch (e) {
          console.warn('[ConsolidatedView] Failed to load timeline actions, falling back:', e);
        }
      }

      if (cancelled) return;
      setBossMetadata(null);
      const bossActionsFromMap = bossActionsMap[realtimePlan.bossId] || [];
      setBossActions(processMultiHitTankBusters(bossActionsFromMap));
      setTimelineLoading(false);
      setInitialized(true);
    };

    loadBossActions();
    return () => { cancelled = true; };
  }, [realtimePlan?.timelineLayout, realtimePlan?.sourceTimelineId, realtimePlan?.bossId]);

  if (loading || timelineLoading || !initialized) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;
  }

  if (!realtimePlan) {
    return <div className="flex items-center justify-center min-h-screen">Plan not found</div>;
  }

  const boss = bosses.find((b: { id: string }) => b.id === realtimePlan.bossId);
  const displayBossName = bossMetadata?.name || boss?.name || realtimePlan.bossId;
  const displayBossId = bossMetadata?.name ? realtimePlan.bossId?.toUpperCase() : (boss?.id?.toUpperCase() || realtimePlan.bossId?.toUpperCase());

  // Format date
  const dateGenerated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Print Header - shown on each printed page */}
      <header className="print-header border-b border-border pb-4 mb-6 hidden print:block print:border-b-2">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{realtimePlan.name}</h1>
            <p className="text-muted-foreground mt-1">
              {bossMetadata ? displayBossName : (boss ? `${boss.name} (${boss.id.toUpperCase()})` : realtimePlan.bossId)}
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Generated: {dateGenerated}</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 print:max-w-none print:px-8 print:py-0">
        {/* Screen Header */}
        <header className="border-b border-border pb-4 mb-6 print:hidden">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{realtimePlan.name}</h1>
              <p className="text-muted-foreground mt-1">
                {bossMetadata ? displayBossName : (boss ? `${boss.name} (${boss.id.toUpperCase()})` : realtimePlan.bossId)}
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Generated: {dateGenerated}</p>
            </div>
          </div>
        </header>

        {/* Timeline */}
        <div className="flex flex-col gap-6">
          {bossActions.map(action => {
            const assignmentsForAction = realtimePlan.assignments?.[action.id] || [];

            return (
              <div key={action.id} className="border border-border rounded-lg overflow-hidden print:break-inside-avoid">
                {/* Boss Action Header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border print:bg-gray-100 dark:print:bg-gray-800">
                  <span className="text-lg font-bold min-w-[60px] print:text-black">{formatTime(action.time)}</span>
                  <span className="text-2xl">{action.icon || '⚔️'}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-base">{action.name}</h3>
                    {action.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 print:text-gray-600 dark:print:text-gray-300">{action.description}</p>
                    )}
                  </div>
                  {action.unmitigatedDamage && (
                    <span className="text-sm font-medium text-muted-foreground print:text-gray-600">
                      Dmg: {action.unmitigatedDamage}
                    </span>
                  )}
                </div>

                {/* Mitigations */}
                <div className="p-4">
                  {assignmentsForAction.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No mitigations assigned</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {assignmentsForAction.map((assignment: AssignedMitigation, idx: number) => {
                        const fullMitigation = mitigationAbilities.find(m => m.id === assignment.id);
                        if (!fullMitigation) return null;
                        return (
                          <MitigationCard
                            key={`${assignment.id}-${idx}`}
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

        {/* Print Footer with Page Numbers */}
        <footer className="hidden print:block print-footer mt-8 pt-4 border-t border-border text-center text-sm text-muted-foreground">
          <span>Page </span>
          <span className="page-number">1</span>
        </footer>
      </div>
    </div>
  );
};

const ConsolidatedView = () => {
  const { planId } = useParams();

  return (
    <RealtimeAppProvider planId={planId}>
      <ConsolidatedViewInner />
    </RealtimeAppProvider>
  );
};

export default ConsolidatedView;
