import { useParams } from 'react-router-dom';
import { useRealtimePlan } from '../../contexts/RealtimePlanContext';
import RealtimeAppProvider from '../../contexts/RealtimeAppProvider';
import { AppLayout } from '../layout';

const ConsolidatedViewInner = () => {
  const { planId } = useParams();
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

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <h1>{realtimePlan.name}</h1>
        <p>Boss: {realtimePlan.bossId}</p>
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
