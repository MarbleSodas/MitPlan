import { useParams } from 'react-router-dom';
import { useRealtimePlan } from '../../contexts/RealtimePlanContext';
import RealtimeAppProvider from '../../contexts/RealtimeAppProvider';
import { AppLayout } from '../layout';
import { bosses } from '../../data/bosses/bossData';
import { bossActionsMap } from '../../data/bosses/bossActions';

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
