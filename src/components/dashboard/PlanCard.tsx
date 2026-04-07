import { useState, useEffect } from 'react';
import { Share2, Edit2, Check, X } from 'lucide-react';
import { usePlan } from '../../contexts/PlanContext';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { getUserDisplayName } from '../../services/userService';
import { updatePlanFieldsWithOrigin } from '../../services/realtimePlanService';
import { bosses } from '../../data/bosses/bossData';
import { canAdminPlan } from '../../utils/permissions/planPermissions';
import SharePlanModal from '../collaboration/SharePlanModal';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

const PlanCard = ({ plan, onEdit, isSharedPlan = false, onPlanDeleted, onPlanChanged }) => {
  const { deletePlanById, duplicatePlanById, exportPlanById } = usePlan();
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatorDisplayName, setCreatorDisplayName] = useState('');
  const [fetchingCreator, setFetchingCreator] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(plan.name || '');
  const [nameUpdateLoading, setNameUpdateLoading] = useState(false);

  const getBossDisplayName = (bossTag) => {
    const boss = bosses.find(b => b.id === bossTag);
    return boss ? `${boss.icon} ${boss.name}` : bossTag;
  };

  const getBossDisplay = () => {
    const tags = plan.bossTags || (plan.bossId ? [plan.bossId] : []);
    if (tags.length === 0) return 'Unknown';
    if (tags.length === 1) return getBossDisplayName(tags[0]);
    return tags.map(tag => getBossDisplayName(tag)).join(', ');
  };

  const currentUserId = user?.uid || null;
  const canAdmin = canAdminPlan(plan, currentUserId);
  const canRenamePlan = canAdmin;
  const canDuplicatePlan = plan.shareMode !== 'view';
  const canExportPlan = plan.shareMode !== 'view';
  const primaryActionLabel = plan.shareMode === 'view' ? 'View' : 'Edit';
  const sharingStatusLabel = canAdmin
    ? 'Owner'
    : plan.shareMode === 'edit'
      ? 'Shared Editor'
      : 'View Only';

  useEffect(() => {
    setEditedName(plan.name || '');
  }, [plan.name]);

  useEffect(() => {
    const fetchCreatorDisplayName = async () => {
      if (!isSharedPlan) {
        return;
      }

      const creatorId = plan.ownerId || plan.userId;
      if (!creatorId) {
        console.log('[PlanCard] No creator ID found for plan:', plan.id);
        return;
      }

      setFetchingCreator(true);

      try {
        const displayName = await getUserDisplayName(creatorId);
        setCreatorDisplayName(displayName);
      } catch (error) {
        console.error('[PlanCard] Error fetching creator display name:', error);
        setCreatorDisplayName('Unknown User');
      } finally {
        setFetchingCreator(false);
      }
    };

    fetchCreatorDisplayName();
  }, [isSharedPlan, plan.ownerId, plan.userId, plan.id]);

  const handleStartEdit = () => {
    if (!canRenamePlan) return;
    setIsEditingName(true);
    setEditedName(plan.name || '');
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName(plan.name || '');
  };

  const handleSaveEdit = async () => {
    if (!canRenamePlan || !editedName.trim()) return;

    const trimmedName = editedName.trim();
    setNameUpdateLoading(true);

    const originalName = plan.name;
    plan.name = trimmedName;

    try {
      const currentUserId = user?.uid;
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      await updatePlanFieldsWithOrigin(plan.id, { name: trimmedName }, currentUserId, null);
      onPlanChanged?.();

      setIsEditingName(false);
      toast.success('Plan name updated', { description: 'The plan name has been successfully updated.' });
    } catch (error) {
      plan.name = originalName;
      setEditedName(originalName);

      console.error('Failed to update plan name:', error);
      toast.error('Failed to update name', { description: 'Please try again.' });
    } finally {
      setNameUpdateLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';

    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    return date.toLocaleDateString();
  };

  const handleDelete = async () => {
    if (!canAdmin) {
      return;
    }

    setLoading(true);
    setShowDeleteConfirm(false);

    if (onPlanDeleted) {
      onPlanDeleted(plan.id);
    }

    try {
      await deletePlanById(plan.id);
      toast.success('Plan deleted!', { description: 'Your plan has been deleted successfully.' });
    } catch (error) {
      console.error('Failed to delete plan:', error);
      toast.error('Failed to delete plan', { description: error.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!canDuplicatePlan) {
      return;
    }

    setLoading(true);
    try {
      await duplicatePlanById(plan.id, `${plan.name} (Copy)`);
    } catch (error) {
      console.error('Failed to duplicate plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!canExportPlan) {
      return;
    }

    setLoading(true);
    try {
      const exportData = await exportPlanById(plan.id);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${plan.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_plan.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!canAdmin) {
      return;
    }

    setShowShareModal(true);
  };

  return (
    <>
      <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={nameUpdateLoading}
                    autoFocus
                    placeholder="Enter plan name"
                    className="flex-1 h-9"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSaveEdit}
                    disabled={nameUpdateLoading || !editedName.trim()}
                    title="Save name"
                    className="h-9 w-9 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                  >
                    <Check size={16} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    disabled={nameUpdateLoading}
                    title="Cancel editing"
                    className="h-9 w-9 text-muted-foreground"
                  >
                    <X size={16} />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-semibold leading-snug truncate">
                    {plan.name}
                  </CardTitle>
                  {canRenamePlan && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleStartEdit}
                      disabled={loading}
                      title="Edit plan name"
                      className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0"
                    >
                      <Edit2 size={16} />
                    </Button>
                  )}
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Boss: {getBossDisplay()}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1">
          <div className="flex flex-col gap-2 pt-4 border-t border-border text-xs text-muted-foreground">
            <div className="flex justify-between items-center">
              <span>Created: {formatDate(plan.createdAt)}</span>
              <span>Updated: {formatDate(plan.updatedAt)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Status: {sharingStatusLabel}</span>
              {plan.shareMode === 'view' && plan.viewToken ? <span>Read-only link</span> : null}
            </div>
            {isSharedPlan && (
              <div className="text-center italic text-primary font-medium">
                {fetchingCreator ? (
                  'Loading creator...'
                ) : creatorDisplayName ? (
                  `Created by: ${creatorDisplayName}`
                ) : null}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 pt-0">
          <Button onClick={onEdit} disabled={loading} className="flex-1">
            {primaryActionLabel}
          </Button>
          {canAdmin && (
            <Button variant="secondary" onClick={handleShare} disabled={loading} className="flex-1">
              <Share2 size={16} className="mr-2" />
              Share
            </Button>
          )}
          {canDuplicatePlan && (
            <Button variant="secondary" onClick={handleDuplicate} disabled={loading} className="flex-1">
              Duplicate
            </Button>
          )}
          {canExportPlan && (
            <Button variant="secondary" onClick={handleExport} disabled={loading} className="flex-1">
              Export
            </Button>
          )}
          {canAdmin && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="flex-1"
            >
              Delete
            </Button>
          )}
        </CardFooter>
      </Card>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{plan.name}"? This action cannot be undone.
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

      <SharePlanModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onPlanChanged={onPlanChanged}
        plan={plan}
      />
    </>
  );
};

export default PlanCard;
