import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { createTimeline, getTimeline, updateTimeline } from '../../services/timelineService';
import { getPlan, hydratePlanTimelineLayoutIfMissing } from '../../services/realtimePlanService';
import CollaborationPresenceShell from '../collaboration/CollaborationPresenceShell';
import type { ReactNode } from 'react';
import TimelineEditorCore from './TimelineEditorCore';
import { getTimelineRoomId } from '../../services/collaborationPaths';

const TimelineEditorBody = () => {
  const { timelineId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const sourceTimelineId = searchParams.get('sourceTimelineId');
  const sourcePlanId = searchParams.get('sourcePlanId');

  const [loading, setLoading] = useState(false);
  const [sourceRecord, setSourceRecord] = useState(null);

  const isEditMode = Boolean(timelineId);

  const recordKey = useMemo(() => {
    if (timelineId) {
      return `timeline:${timelineId}`;
    }

    if (sourcePlanId) {
      return `plan-seed:${sourcePlanId}`;
    }

    if (sourceTimelineId) {
      return `timeline-seed:${sourceTimelineId}`;
    }

    return 'timeline:new';
  }, [sourcePlanId, sourceTimelineId, timelineId]);

  useEffect(() => {
    let isCancelled = false;

    const loadSource = async () => {
      setLoading(true);
      try {
        if (timelineId) {
          const timeline = await getTimeline(timelineId);
          if (timeline.official) {
            toast.info('Official timelines are read-only', {
              description: 'Open a community copy from the timeline hub instead.',
            });
            navigate(`/timeline/view/${timeline.id}`);
            return;
          }

          if (!isCancelled) {
            setSourceRecord(timeline);
          }
          return;
        }

        if (sourcePlanId) {
          if (user?.uid) {
            try {
              await hydratePlanTimelineLayoutIfMissing(sourcePlanId, user.uid);
            } catch (error) {
              console.warn('[TimelineEditor] Could not hydrate source plan timeline layout:', error);
            }
          }

          const plan = await getPlan(sourcePlanId);
          const planTimeline = plan?.timelineLayout || null;
          if (!planTimeline) {
            throw new Error('Plan timeline not available');
          }

          if (!isCancelled) {
            setSourceRecord({
              ...planTimeline,
              name: `${plan.name || 'Plan'} Community Timeline`,
              description: planTimeline.description || plan.description || '',
            });
          }
          return;
        }

        if (sourceTimelineId) {
          const timeline = await getTimeline(sourceTimelineId);
          if (!isCancelled) {
            setSourceRecord({
              ...timeline,
              name: `${timeline.name} Copy`,
            });
          }
          return;
        }

        if (!isCancelled) {
          setSourceRecord({
            name: '',
            bossTags: [],
            bossId: null,
            bossMetadata: { level: 100 },
            actions: [],
            description: '',
          });
        }
      } catch (error) {
        console.error('Error loading timeline source:', error);
        toast.error('Failed to load timeline', {
          description: error instanceof Error ? error.message : 'Please try again.',
        });
        navigate('/timeline/create');
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void loadSource();
    return () => {
      isCancelled = true;
    };
  }, [navigate, sourcePlanId, sourceTimelineId, timelineId, user?.uid]);

  const handleSave = async ({ name, description, editedTimeline }) => {
    const userId = user?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const timelineData = {
      name,
      bossTags: editedTimeline.bossTags || [],
      bossId: editedTimeline.bossId || null,
      description,
      actions: editedTimeline.actions || [],
      bossMetadata: editedTimeline.bossMetadata || null,
      adaptiveModel: editedTimeline.adaptiveModel || null,
      resolution: editedTimeline.resolution || null,
      phases: editedTimeline.phases || [],
      analysisSources: editedTimeline.analysisSources || [],
      guideSources: editedTimeline.guideSources || [],
      format: editedTimeline.format || 'legacy_flat',
      schemaVersion: editedTimeline.schemaVersion || 1,
    };

    try {
      if (isEditMode && timelineId) {
        await updateTimeline(timelineId, timelineData);
        toast.success('Timeline updated!', {
          description: 'Your community timeline has been updated successfully.',
        });
        return;
      }

      const newTimeline = await createTimeline(userId, timelineData);
      toast.success('Timeline created!', {
        description: 'Your community timeline has been created successfully.',
      });
      navigate(`/timeline/edit/${newTimeline.id}`);
    } catch (error) {
      console.error('Error saving timeline:', error);
      toast.error('Failed to save timeline', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
      throw error;
    }
  };

  return (
    <TimelineEditorCore
      mode="community"
      loading={loading}
      recordKey={recordKey}
      sourceRecord={sourceRecord}
      onBack={() => navigate(isEditMode ? '/dashboard' : '/timeline/create')}
      backLabel={isEditMode ? 'Back to Dashboard' : 'Back to Timeline Hub'}
      onSave={handleSave}
    />
  );
};

export const TimelineEditorShell = ({
  timelineId,
  children,
}: {
  timelineId?: string;
  children: ReactNode;
}) => {
  const roomId = timelineId ? getTimelineRoomId(timelineId) : null;

  return (
    <CollaborationPresenceShell roomId={roomId} enabled={Boolean(roomId)}>
      {children}
    </CollaborationPresenceShell>
  );
};

const TimelineEditor = () => {
  const { timelineId } = useParams();

  return (
    <TimelineEditorShell timelineId={timelineId}>
      <TimelineEditorBody />
    </TimelineEditorShell>
  );
};

export default TimelineEditor;
