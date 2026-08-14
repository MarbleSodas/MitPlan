import { useState } from 'react';
import { Share2, Copy, Trash2, FileText, BookmarkX, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '@/lib/navigation';
import { deleteTimeline, duplicateTimeline, getShareableLink, removeFromCollection, togglePublicStatus } from '../../services/timelineService';
import { bosses } from '../../data/bosses/bossData';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import ActionMenu from '@/components/ui/action-menu';

const TimelineCard = ({ timeline, onTimelineChanged, onTimelineDeleted }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(timeline.isPublic || false);
  const [togglingPublic, setTogglingPublic] = useState(false);

  const isOwner = () => {
    const currentUserId = user?.uid;
    return !!currentUserId && (timeline.ownerId === currentUserId || timeline.userId === currentUserId);
  };

  const getBossName = () => {
    const boss = bosses.find(b => b.id === timeline.bossId);
    return boss ? `${boss.icon} ${boss.name}` : timeline.bossId;
  };

  const handleEdit = () => {
    navigate(`/timeline/edit/${timeline.id}`);
  };

  const handleView = () => {
    navigate(`/timeline/view/${timeline.id}`);
  };

  const handleTogglePublic = async () => {
    if (togglingPublic || !isOwner()) return;

    setTogglingPublic(true);
    const newPublicStatus = !isPublic;

    try {
      await togglePublicStatus(timeline.id, newPublicStatus);
      setIsPublic(newPublicStatus);

      toast.success(newPublicStatus ? 'Timeline is now public' : 'Timeline is now private', {
        description: newPublicStatus
          ? 'Your timeline is now visible in the Browse Timelines page.'
          : 'Your timeline is now private and only visible to you.'
      });

      if (onTimelineChanged) {
        onTimelineChanged();
      }
    } catch (error) {
      console.error('Error toggling public status:', error);
      toast.error('Failed to update visibility', { description: 'Please try again.' });
    } finally {
      setTogglingPublic(false);
    }
  };

  const handleDuplicate = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const userId = user?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      await duplicateTimeline(timeline.id, userId);
      toast.success('Timeline duplicated!', { description: 'Your timeline has been duplicated successfully.' });

      if (onTimelineChanged) {
        onTimelineChanged();
      }
    } catch (error) {
      console.error('Error duplicating timeline:', error);
      toast.error('Failed to duplicate timeline', { description: 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromCollection = async () => {
    if (loading) return;

    setLoading(true);

    if (onTimelineDeleted) {
      onTimelineDeleted(timeline.id);
    }

    try {
      const userId = user?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      await removeFromCollection(userId, timeline.id);
      toast.success('Removed from collection!', { description: 'Timeline has been removed from your collection.' });

      if (onTimelineChanged) {
        onTimelineChanged();
      }
    } catch (error) {
      console.error('Error removing from collection:', error);
      toast.error('Failed to remove timeline', { description: 'Please try again.' });

      if (onTimelineChanged) {
        onTimelineChanged();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (loading) return;

    setLoading(true);
    setShowDeleteConfirm(false);

    if (onTimelineDeleted) {
      onTimelineDeleted(timeline.id);
    }

    try {
      const userId = user?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      await deleteTimeline(timeline.id, userId);
      toast.success('Timeline deleted!', { description: 'Your timeline has been deleted successfully.' });

      if (onTimelineChanged) {
        onTimelineChanged();
      }
    } catch (error) {
      console.error('Error deleting timeline:', error);
      toast.error('Failed to delete timeline', { description: 'Please try again.' });

      if (onTimelineChanged) {
        onTimelineChanged();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyShareLink = async () => {
    try {
      const shareLink = getShareableLink(timeline.id);
      await navigator.clipboard.writeText(shareLink);
      toast.success('Public view link copied!', {
        description: 'Anyone with the link can view this timeline. Editing still requires sign-in.'
      });
    } catch (error) {
      console.error('Error copying share link:', error);
      toast.error('Failed to copy share link', { description: 'Please try again.' });
    }
  };

  const handleCreateMitplan = () => {
    navigate(`/plan/create-from-timeline/${timeline.id}`);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-semibold leading-snug truncate">
            {timeline.name}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold">Boss:</span>
            <span>{getBossName()}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold">Actions:</span>
            <span>{timeline.actions?.length || 0} boss actions</span>
          </div>

          {timeline.description && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold">Description:</span>
              <span className="truncate">{timeline.description}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold">Updated:</span>
            <span>{formatDate(timeline.updatedAt)}</span>
          </div>

          {isOwner() && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isPublic ? <Globe size={14} aria-hidden="true" /> : <Lock size={14} aria-hidden="true" />}
              <span>{isPublic ? 'Public' : 'Private'}</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2 border-t border-border pt-4">
          <Button onClick={isOwner() ? handleEdit : handleView} disabled={loading} className="min-w-0 flex-1 gap-2">
            <FileText size={16} />
            Open
          </Button>

          <ActionMenu
            label={`More actions for ${timeline.name}`}
            items={[
              ...(isOwner() ? [{ label: 'View', icon: FileText, onSelect: handleView, disabled: loading }] : []),
              { label: 'Create a plan', icon: FileText, onSelect: handleCreateMitplan, disabled: loading },
              { label: 'Copy share link', icon: Share2, onSelect: handleCopyShareLink, disabled: loading },
              ...(isOwner() ? [{
                label: isPublic ? 'Make private' : 'Make public',
                icon: isPublic ? Lock : Globe,
                onSelect: handleTogglePublic,
                disabled: loading || togglingPublic,
              }] : []),
              { label: 'Duplicate', icon: Copy, onSelect: handleDuplicate, disabled: loading },
              ...(isOwner()
                ? [{ label: 'Delete', icon: Trash2, onSelect: () => setShowDeleteConfirm(true), destructive: true, disabled: loading }]
                : timeline.inCollection
                  ? [{ label: 'Remove from Collection', icon: BookmarkX, onSelect: handleRemoveFromCollection, disabled: loading }]
                  : []),
            ]}
          />
        </CardFooter>
      </Card>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Timeline?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{timeline.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TimelineCard;
