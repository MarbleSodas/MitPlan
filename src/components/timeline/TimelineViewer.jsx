import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/Toast';
import { getTimeline, getShareableLink } from '../../services/timelineService';
import { bosses } from '../../data/bosses/bossData';
import { ArrowLeft, Edit2, Share2, FileText } from 'lucide-react';

const TimelineViewer = ({ isShared = false }) => {
  const { timelineId } = useParams();
  const navigate = useNavigate();
  const { user, isAnonymousMode, anonymousUser } = useAuth();
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
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const isOwner = () => {
    if (!timeline) return false;
    if (isAnonymousMode) {
      return anonymousUser?.id === timeline.userId;
    } else {
      const currentUserId = user?.uid;
      return currentUserId && (timeline.ownerId === currentUserId || timeline.userId === currentUserId);
    }
  };

  const getBossInfo = () => {
    if (!timeline) return null;
    return bosses.find(b => b.id === timeline.bossId);
  };

  const handleEdit = () => {
    navigate(`/timeline/edit/${timelineId}`);
  };

  const handleCopyShareLink = async () => {
    try {
      const shareLink = getShareableLink(timelineId);
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
    navigate(`/plan/create-from-timeline/${timelineId}`);
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-[var(--color-textSecondary)]">Loading timeline...</p>
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
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      {/* Header */}
      <div className="bg-[var(--color-cardBackground)] border-b border-[var(--color-border)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 rounded-lg hover:bg-[var(--select-bg)] transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold m-0">{timeline.name}</h1>
                {bossInfo && (
                  <p className="text-sm text-[var(--color-textSecondary)] m-0 mt-1">
                    {bossInfo.icon} {bossInfo.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {isOwner() && !isShared && (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-semibold hover:bg-[#2563eb] transition-colors flex items-center gap-2"
                >
                  <Edit2 size={18} />
                  Edit
                </button>
              )}
              <button
                onClick={handleCopyShareLink}
                className="px-4 py-2 bg-[var(--select-bg)] text-[var(--color-primary)] rounded-lg font-semibold hover:bg-[var(--color-primary)] hover:text-white transition-colors flex items-center gap-2"
              >
                <Share2 size={18} />
                Share
              </button>
              <button
                onClick={handleCreateMitplan}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <FileText size={18} />
                Create Mitplan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Timeline Info */}
        {timeline.description && (
          <div className="bg-[var(--color-cardBackground)] border border-[var(--color-border)] rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <p className="text-[var(--color-textSecondary)] m-0">{timeline.description}</p>
          </div>
        )}

        {/* Timeline Actions */}
        <div className="bg-[var(--color-cardBackground)] border border-[var(--color-border)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold m-0">
              Boss Actions ({sortedActions.length})
            </h2>
            <div className="text-sm text-[var(--color-textSecondary)]">
              Total Duration: {formatTime(sortedActions[sortedActions.length - 1]?.time || 0)}
            </div>
          </div>

          {sortedActions.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-textSecondary)]">
              <p>No actions in this timeline.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedActions.map((action, index) => (
                <div
                  key={action.id}
                  className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-2xl">{action.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{action.name}</span>
                        {action.isCustom && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                            Custom
                          </span>
                        )}
                        {action.isTankBuster && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                            Tank Buster
                          </span>
                        )}
                        {action.isDualTankBuster && (
                          <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">
                            Dual TB
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[var(--color-textSecondary)] mb-2">
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
                        <p className="text-sm text-[var(--color-textSecondary)] m-0 mb-2">
                          {action.description}
                        </p>
                      )}
                      {action.unmitigatedDamage && (
                        <div className="text-sm text-[var(--color-textSecondary)]">
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
          <div className="bg-[var(--color-cardBackground)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="text-sm text-[var(--color-textSecondary)] mb-1">Total Actions</div>
            <div className="text-2xl font-bold">{sortedActions.length}</div>
          </div>
          <div className="bg-[var(--color-cardBackground)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="text-sm text-[var(--color-textSecondary)] mb-1">Custom Actions</div>
            <div className="text-2xl font-bold">
              {sortedActions.filter(a => a.isCustom).length}
            </div>
          </div>
          <div className="bg-[var(--color-cardBackground)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="text-sm text-[var(--color-textSecondary)] mb-1">Tank Busters</div>
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

