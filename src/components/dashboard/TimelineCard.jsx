import { useState } from 'react';
import { Share2, Edit2, Check, X, Copy, Trash2, FileText, BookmarkX, Globe, Lock } from 'lucide-react';
import { useToast } from '../common/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { deleteTimeline, duplicateTimeline, getShareableLink, removeFromCollection, togglePublicStatus } from '../../services/timelineService';
import { bosses } from '../../data/bosses/bossData';
import { BUTTON, CARD, cn } from '../../styles/designSystem';

const Card = ({ children, className = '', ...rest }) => (
  <div
    {...rest}
    className={cn(CARD.interactive, 'p-6', className)}
  >
    {children}
  </div>
);

const CardHeader = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`flex justify-between items-start mb-4 ${className}`}>{children}</div>
);

const TimelineNameContainer = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`flex items-center gap-2 flex-1 min-w-0 ${className}`}>{children}</div>
);

const TimelineName = ({ children, className = '', ...rest }) => (
  <h3 {...rest} className={`text-[1.25rem] font-semibold m-0 leading-snug flex-1 min-w-0 break-words ${className}`}>{children}</h3>
);

const EditButton = ({ children, className = '', ...rest }) => (
  <button
    {...rest}
    className={`bg-transparent border-0 text-[var(--color-textSecondary)] cursor-pointer p-1 rounded flex items-center justify-center transition-colors flex-shrink-0 hover:bg-[var(--select-bg)] hover:text-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

const CardContent = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`space-y-3 ${className}`}>{children}</div>
);

const InfoRow = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`flex items-center gap-2 text-sm text-[var(--color-textSecondary)] ${className}`}>{children}</div>
);

const CardActions = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`flex flex-wrap gap-2 mt-4 pt-4 border-t border-[var(--color-border)] ${className}`}>{children}</div>
);

const ActionButton = ({ children, className = '', variant = 'primary', ...rest }) => {
  const variantClasses = {
    primary: BUTTON.primary.small,
    secondary: BUTTON.secondary.small,
    danger: BUTTON.danger.small,
    ghost: BUTTON.variant.ghost + ' ' + BUTTON.size.small,
  };

  return (
    <button
      {...rest}
      className={cn(variantClasses[variant] || variantClasses.primary, 'gap-2', className)}
    >
      {children}
    </button>
  );
};

const TimelineCard = ({ timeline, onTimelineChanged, onTimelineDeleted }) => {
  const { addToast } = useToast();
  const { user, isAnonymousMode, anonymousUser } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(timeline.isPublic || false);
  const [togglingPublic, setTogglingPublic] = useState(false);

  // Check if current user owns this timeline
  const isOwner = () => {
    if (isAnonymousMode) {
      return anonymousUser?.id === timeline.userId;
    } else {
      const currentUserId = user?.uid;
      return currentUserId && (timeline.ownerId === currentUserId || timeline.userId === currentUserId);
    }
  };

  // Get boss name from bossId
  const getBossName = () => {
    const boss = bosses.find(b => b.id === timeline.bossId);
    return boss ? `${boss.icon} ${boss.name}` : timeline.bossId;
  };

  // Handle edit timeline
  const handleEdit = () => {
    navigate(`/timeline/edit/${timeline.id}`);
  };

  // Handle view timeline
  const handleView = () => {
    navigate(`/timeline/view/${timeline.id}`);
  };

  // Handle toggle public status
  const handleTogglePublic = async () => {
    if (togglingPublic || !isOwner()) return;

    setTogglingPublic(true);
    const newPublicStatus = !isPublic;

    try {
      await togglePublicStatus(timeline.id, newPublicStatus);
      setIsPublic(newPublicStatus);

      addToast({
        type: 'success',
        title: newPublicStatus ? 'Timeline is now public' : 'Timeline is now private',
        message: newPublicStatus
          ? 'Your timeline is now visible in the Browse Timelines page.'
          : 'Your timeline is now private and only visible to you.',
        duration: 3000
      });

      // Notify parent to refresh if needed
      if (onTimelineChanged) {
        onTimelineChanged();
      }
    } catch (error) {
      console.error('Error toggling public status:', error);
      addToast({
        type: 'error',
        title: 'Failed to update visibility',
        message: error.message || 'Please try again.',
        duration: 4000
      });
    } finally {
      setTogglingPublic(false);
    }
  };

  // Handle duplicate timeline
  const handleDuplicate = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const userId = isAnonymousMode ? anonymousUser?.id : user?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      await duplicateTimeline(timeline.id, userId);
      addToast({
        type: 'success',
        title: 'Timeline duplicated!',
        message: 'Your timeline has been duplicated successfully.',
        duration: 3000
      });

      // Notify parent to refresh
      if (onTimelineChanged) {
        onTimelineChanged();
      }
    } catch (error) {
      console.error('Error duplicating timeline:', error);
      addToast({
        type: 'error',
        title: 'Failed to duplicate timeline',
        message: error.message || 'Please try again.',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle remove from collection
  const handleRemoveFromCollection = async () => {
    if (loading) return;

    setLoading(true);

    // Optimistic update: Remove timeline from UI immediately
    if (onTimelineDeleted) {
      onTimelineDeleted(timeline.id);
    }

    try {
      const userId = isAnonymousMode ? anonymousUser?.id : user?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      await removeFromCollection(userId, timeline.id);
      addToast({
        type: 'success',
        title: 'Removed from collection!',
        message: 'Timeline has been removed from your collection.',
        duration: 3000
      });

      // Notify parent to refresh
      if (onTimelineChanged) {
        onTimelineChanged();
      }
    } catch (error) {
      console.error('Error removing from collection:', error);
      addToast({
        type: 'error',
        title: 'Failed to remove timeline',
        message: error.message || 'Please try again.',
        duration: 4000
      });

      // Revert optimistic update on error
      if (onTimelineChanged) {
        onTimelineChanged();
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle delete timeline
  const handleDelete = async () => {
    if (loading) return;

    setLoading(true);
    setShowDeleteConfirm(false);

    // Optimistic update: Remove timeline from UI immediately
    if (onTimelineDeleted) {
      onTimelineDeleted(timeline.id);
    }

    try {
      const userId = isAnonymousMode ? anonymousUser?.id : user?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      await deleteTimeline(timeline.id, userId);
      addToast({
        type: 'success',
        title: 'Timeline deleted!',
        message: 'Your timeline has been deleted successfully.',
        duration: 3000
      });

      // Notify parent for any additional cleanup
      if (onTimelineChanged) {
        onTimelineChanged();
      }
    } catch (error) {
      console.error('Error deleting timeline:', error);
      addToast({
        type: 'error',
        title: 'Failed to delete timeline',
        message: error.message || 'Please try again.',
        duration: 4000
      });

      // Rollback: Reload timelines on error
      if (onTimelineChanged) {
        onTimelineChanged();
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle copy share link
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

  // Handle create mitplan from timeline
  const handleCreateMitplan = () => {
    navigate(`/plan/create-from-timeline/${timeline.id}`);
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <TimelineNameContainer>
            <TimelineName>{timeline.name}</TimelineName>
          </TimelineNameContainer>
        </CardHeader>

        <CardContent>
          <InfoRow>
            <span className="font-semibold">Boss:</span>
            <span>{getBossName()}</span>
          </InfoRow>

          <InfoRow>
            <span className="font-semibold">Actions:</span>
            <span>{timeline.actions?.length || 0} boss actions</span>
          </InfoRow>

          {timeline.description && (
            <InfoRow>
              <span className="font-semibold">Description:</span>
              <span className="truncate">{timeline.description}</span>
            </InfoRow>
          )}

          <InfoRow>
            <span className="font-semibold">Updated:</span>
            <span>{formatDate(timeline.updatedAt)}</span>
          </InfoRow>

          {isOwner() && (
            <InfoRow>
              <span className="font-semibold">Visibility:</span>
              <button
                onClick={handleTogglePublic}
                disabled={togglingPublic}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--select-bg)] hover:bg-[var(--color-primary)] hover:text-white text-[var(--color-primary)]"
                title={isPublic ? 'Click to make private' : 'Click to make public'}
              >
                {isPublic ? (
                  <>
                    <Globe size={14} />
                    <span className="text-xs font-medium">Public</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    <span className="text-xs font-medium">Private</span>
                  </>
                )}
              </button>
            </InfoRow>
          )}
        </CardContent>

        <CardActions>
          {isOwner() && (
            <ActionButton onClick={handleEdit} variant="primary" disabled={loading}>
              <Edit2 size={16} />
              Edit
            </ActionButton>
          )}

          <ActionButton onClick={handleView} disabled={loading}>
            <FileText size={16} />
            View
          </ActionButton>

          <ActionButton onClick={handleCreateMitplan} disabled={loading}>
            <FileText size={16} />
            Create Mitplan
          </ActionButton>

          <ActionButton onClick={handleDuplicate} disabled={loading}>
            <Copy size={16} />
            Duplicate
          </ActionButton>

          <ActionButton onClick={handleCopyShareLink} disabled={loading}>
            <Share2 size={16} />
            Copy Link
          </ActionButton>

          {isOwner() && (
            <ActionButton onClick={() => setShowDeleteConfirm(true)} variant="danger" disabled={loading}>
              <Trash2 size={16} />
              Delete
            </ActionButton>
          )}

          {!isOwner() && timeline.inCollection && (
            <ActionButton onClick={handleRemoveFromCollection} variant="secondary" disabled={loading}>
              <BookmarkX size={16} />
              Remove from Collection
            </ActionButton>
          )}
        </CardActions>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-cardBackground)] rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-[var(--color-text)]">Delete Timeline?</h3>
            <p className="text-[var(--color-textSecondary)] mb-6">
              Are you sure you want to delete "{timeline.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TimelineCard;

