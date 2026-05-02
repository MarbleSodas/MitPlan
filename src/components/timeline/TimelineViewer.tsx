import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/Toast';
import { getTimeline, getShareableLink } from '../../services/timelineService';
import { bosses } from '../../data/bosses/bossData';
import { ArrowLeft, Edit2, Share2, FileText } from 'lucide-react';
import { getBossActionTypeLabel } from '../../utils/boss/bossActionUtils';
import { Button } from '@/components/ui/button';

const TimelineViewer = ({ isShared = false }) => {
  const { timelineId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState(null);

  useEffect(() => {
    loadTimeline();
  }, [timelineId]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const timelineData = await getTimeline(timelineId);
      setTimeline(timelineData);
    } catch (error) {
      console.error('Error loading timeline:', error);
      addToast({
        type: 'error',
        title: 'Failed to load timeline',
        message: 'Please try again.',
        duration: 4000
      });
      navigate(isShared ? '/' : '/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const isOwner = () => {
    if (!timeline) return false;
    const currentUserId = user?.uid;
    return !!currentUserId && (timeline.ownerId === currentUserId || timeline.userId === currentUserId);
  };

  const getBossInfo = () => {
    if (!timeline) return null;
    return bosses.find(b => b.id === timeline.bossId);
  };

  const handleEdit = () => {
    if (!user?.uid) {
      navigate(`/?next=${encodeURIComponent(`/timeline/edit/${timeline.id}`)}`);
      return;
    }
    navigate(`/timeline/edit/${timeline.id}`);
  };

  const handleCopyShareLink = async () => {
    try {
      const shareLink = getShareableLink(timeline.id);
      await navigator.clipboard.writeText(shareLink);
      addToast({
        type: 'success',
        title: 'Share link copied!',
        message: 'The share link has been copied to your clipboard.',
        duration: 3000
      });
    } catch (error) {
      console.error('Error copying share link:', error);
      addToast({
        type: 'error',
        title: 'Failed to copy share link',
        message: 'Please try again.',
        duration: 4000
      });
    }
  };

  const handleCreateMitplan = () => {
    if (!user?.uid) {
      navigate(`/?next=${encodeURIComponent(`/plan/create-from-timeline/${timeline.id}`)}`);
      return;
    }
    navigate(`/plan/create-from-timeline/${timeline.id}`);
  };

  const handleStartFromTimeline = () => {
    if (!timeline?.id) {
      return;
    }

    const nextPath = `/timeline/create/editor?sourceTimelineId=${encodeURIComponent(timeline.id)}`;
    if (!user?.uid) {
      navigate(`/?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    navigate(nextPath);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSortedActions = () => {
    if (!timeline || !timeline.actions) return [];
    return [...timeline.actions].sort((a, b) => a.time - b.time);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (!timeline) {
    return null;
  }

  const bossInfo = getBossInfo();
  const sortedActions = getSortedActions();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div
        data-testid="timeline-viewer-header"
        className="sticky top-0 z-10 border-b border-border bg-card shadow-sm"
      >
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(isShared ? '/' : '/dashboard')}
              >
                <ArrowLeft size={20} />
              </Button>
              <div className="min-w-0">
                <h1 className="m-0 truncate text-2xl font-bold">{timeline.name}</h1>
                {bossInfo && (
                  <p className="m-0 mt-1 text-sm text-muted-foreground">
                    {bossInfo.icon} {bossInfo.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {isOwner() && !isShared && (
                <Button
                  onClick={handleEdit}
                >
                  <Edit2 size={18} />
                  Edit
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleStartFromTimeline}
              >
                <Edit2 size={18} />
                {isOwner() && !isShared ? 'Duplicate Into Editor' : 'Start From This'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCopyShareLink}
              >
                <Share2 size={18} />
                Share
              </Button>
              <Button
                className="bg-success text-success-foreground hover:bg-success/90"
                onClick={handleCreateMitplan}
              >
                <FileText size={18} />
                {user ? 'Create Mitplan' : 'Sign In to Create Mitplan'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Timeline Info */}
        {timeline.description && (
          <div className="mb-6 rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <p className="m-0 text-muted-foreground">{timeline.description}</p>
          </div>
        )}

        {/* Timeline Actions */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold m-0">
              Boss Actions ({sortedActions.length})
            </h2>
            <div className="text-sm text-muted-foreground">
              Total Duration: {formatTime(sortedActions[sortedActions.length - 1]?.time || 0)}
            </div>
          </div>

          {sortedActions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>No actions in this timeline.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedActions.map((action) => (
                <div
                  key={action.id}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-2xl">{action.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{action.name}</span>
                        {action.isCustom && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                            Custom
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-muted text-foreground text-xs rounded">
                          {getBossActionTypeLabel(action)}
                        </span>
                        {action.isMultiHit && (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                            {action.hitCount && action.hitCount > 1 ? `${action.hitCount}-Hit` : 'Multi-hit'}
                          </span>
                        )}
                        {action.hasDot && (
                          <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded">
                            DoT
                          </span>
                        )}
                      </div>
                      <div className="mb-2 text-sm text-muted-foreground">
                        ⏱️ {formatTime(action.time)} ({action.time}s)
                        {action.damageType && (
                          <span className="ml-3">
                            Type: <span className="capitalize">{action.damageType}</span>
                          </span>
                        )}
                        {action.importance && (
                          <span className="ml-3">
                            Importance: <span className="capitalize">{action.importance}</span>
                          </span>
                        )}
                      </div>
                      {action.description && (
                        <p className="m-0 mb-2 text-sm text-muted-foreground">
                          {action.description}
                        </p>
                      )}
                      {action.unmitigatedDamage && (
                        <div className="text-sm text-muted-foreground">
                          Unmitigated Damage: {action.unmitigatedDamage}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-1 text-sm text-muted-foreground">Total Actions</div>
            <div className="text-2xl font-bold">{sortedActions.length}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-1 text-sm text-muted-foreground">Custom Actions</div>
            <div className="text-2xl font-bold">
              {sortedActions.filter(a => a.isCustom).length}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-1 text-sm text-muted-foreground">Tank Busters</div>
            <div className="text-2xl font-bold">
              {sortedActions.filter(a => a.isTankBuster).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineViewer;

