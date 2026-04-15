import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import RealtimeAppProvider from '../../contexts/RealtimeAppProvider';
import { useRealtimePlan } from '../../contexts/RealtimePlanContext';
import { createTimeline } from '../../services/timelineService';
import { canEditPlanContent } from '../../utils/permissions/planPermissions';
import TimelineEditorCore from './TimelineEditorCore';
import { normalizePlanTimelineLayout } from '../../utils/timeline/planTimelineLayoutUtils';

const PlanTimelineEditorBody = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loading, realtimePlan, updateTimelineLayoutRealtime } = useRealtimePlan();

  const canEditPlan = canEditPlanContent(realtimePlan, user?.uid);

  const recordKey = useMemo(() => `plan:${planId || 'unknown'}`, [planId]);

  const handleSave = async ({ editedTimeline }) => {
    const currentTimelineLayout = realtimePlan?.timelineLayout;
    if (!currentTimelineLayout) {
      throw new Error('Plan timeline is not available');
    }

    const nextLayout = normalizePlanTimelineLayout({
      ...editedTimeline,
      healthConfig: currentTimelineLayout.healthConfig,
    });

    if (!nextLayout) {
      throw new Error('Failed to build the updated plan timeline');
    }

    try {
      await updateTimelineLayoutRealtime(nextLayout);
      toast.success('Plan timeline saved', {
        description: 'The planner will now use this edited timeline layout directly.',
      });
    } catch (error) {
      console.error('Error saving plan timeline:', error);
      toast.error('Failed to save the plan timeline', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
      throw error;
    }
  };

  const handlePublish = async ({ editedTimeline, details }) => {
    const userId = user?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      await createTimeline(userId, {
        name: details.name,
        description: details.description,
        isPublic: details.visibility === 'public',
        bossTags: editedTimeline.bossTags || [],
        bossId: editedTimeline.bossId || null,
        bossMetadata: editedTimeline.bossMetadata || null,
        actions: editedTimeline.actions || [],
        adaptiveModel: editedTimeline.adaptiveModel || null,
        resolution: editedTimeline.resolution || null,
        phases: editedTimeline.phases || [],
        analysisSources: editedTimeline.analysisSources || [],
        guideSources: editedTimeline.guideSources || [],
        format: editedTimeline.format || 'legacy_flat',
        schemaVersion: editedTimeline.schemaVersion || 1,
      });

      toast.success('Community timeline created', {
        description: details.visibility === 'public'
          ? 'Your published timeline is now visible in the community browser.'
          : 'Your published timeline has been saved privately to your community timelines.',
      });
    } catch (error) {
      console.error('Error publishing plan timeline:', error);
      toast.error('Failed to publish community timeline', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
      throw error;
    }
  };

  return (
    <TimelineEditorCore
      mode="plan"
      loading={loading}
      readOnly={!canEditPlan}
      recordKey={recordKey}
      sourceRecord={realtimePlan?.timelineLayout || null}
      title={realtimePlan?.name ? `${realtimePlan.name} Timeline` : 'Plan Timeline'}
      backLabel="Back to Planner"
      readOnlyMessage="This plan timeline is editable for signed-in users who have public or shared edit access to the plan."
      onBack={() => navigate(planId ? `/plan/${planId}` : '/dashboard')}
      onSave={handleSave}
      onPublish={canEditPlan ? handlePublish : undefined}
      canEditBossTags={false}
      lockBossTagsMessage="This plan stays tied to its current encounter. Use community timelines for broader encounter metadata changes."
    />
  );
};

const PlanTimelineEditor = () => {
  const { planId } = useParams();

  if (!planId) {
    return null;
  }

  return (
    <RealtimeAppProvider planId={planId}>
      <PlanTimelineEditorBody />
    </RealtimeAppProvider>
  );
};

export default PlanTimelineEditor;
