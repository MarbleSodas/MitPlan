import { useParams } from 'react-router-dom';
import { useRealtimePlan } from '../../contexts/RealtimePlanContext';
import RealtimeAppProvider from '../../contexts/RealtimeAppProvider';
import { AppLayout } from '../layout';
import { bosses } from '../../data/bosses/bossData';
import { bossActionsMap } from '../../data/bosses/bossActions';
import { mitigationAbilities } from '../../data';
import { getJobIcon } from '../../utils';

const MitigationCard = ({ mitigation, assignment }) => {
  const precastLabel = assignment.precastSeconds > 0
    ? `precast ${assignment.precastSeconds.toFixed(1)}s`
    : 'on-hit';

  return (
    <div className="flex items-center gap-3 px-3 py-2 border border-blue-200 dark:border-blue-800 rounded-md bg-blue-50/50 dark:bg-blue-950/30 print:bg-white print:border print:border-gray-400">
      <span className="w-6 h-6 shrink-0">
        <img
          src={getJobIcon(assignment.casterJobId)}
          alt={assignment.casterJobId}
          className="w-full h-full object-contain"
        />
      </span>
      <span className="font-medium text-sm flex-1">{mitigation.name}</span>
      <span className="text-xs text-muted-foreground">{precastLabel}</span>
    </div>
  );
};

const ConsolidatedViewInner = () => {
  const { realtimePlan, loading, error } = useRealtimePlan();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;
  }

  if (!realtimePlan) {
    return <div className="flex items-center justify-center min-h-screen">Plan not found</div>;
  }

  // Derive boss definition
  const boss = bosses.find(b => b.id === realtimePlan.bossId);
  const bossActions = bossActionsMap[realtimePlan.bossId] || [];
  const currentBossLevel = boss?.level || 100;

  // Format date
  const dateGenerated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto print:max-w-none print:px-0">
        {/* Header */}
        <header className="border-b border-border pb-4 mb-6 print:border-b-2">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{realtimePlan.name}</h1>
              <p className="text-muted-foreground mt-1">
                {boss ? `${boss.name} (${boss.id.toUpperCase()})` : realtimePlan.bossId}
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
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border">
                  <span className="text-lg font-bold min-w-[60px]">{action.time}s</span>
                  <span className="text-2xl">{action.icon || '⚔️'}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-base">{action.name}</h3>
                    {action.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{action.description}</p>
                    )}
                  </div>
                  {action.unmitigatedDamage && (
                    <span className="text-sm font-medium text-muted-foreground">
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
                      {assignmentsForAction.map((assignment, idx) => {
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
      </div>
    </AppLayout>
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
