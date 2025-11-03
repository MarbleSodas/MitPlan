import { useState, useEffect } from 'react';
import { Share2, Edit2, Check, X } from 'lucide-react';
import { usePlan } from '../../contexts/PlanContext';
import { useToast } from '../common/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { getUserDisplayName } from '../../services/userService';
import { updatePlanFieldsWithOrigin } from '../../services/realtimePlanService';
import { BUTTON, CARD, cn } from '../../styles/designSystem';
import { bosses } from '../../data/bosses/bossData';

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

const PlanNameContainer = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`flex items-center gap-2 flex-1 min-w-0 ${className}`}>{children}</div>
);

const PlanName = ({ children, className = '', ...rest }) => (
  <h3 {...rest} className={`text-[1.25rem] font-semibold m-0 leading-snug flex-1 min-w-0 break-words ${className}`}>{children}</h3>
);

const PlanNameInput = ({ className = '', ...rest }) => (
  <input
    {...rest}
    className={`text-[1.25rem] font-semibold m-0 leading-snug flex-1 min-w-0 bg-[var(--color-cardBackground)] border-2 border-[var(--color-primary)] rounded px-2 py-1 outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(51,153,255,0.15)] ${className}`}
  />
);

const EditButton = ({ children, className = '', ...rest }) => (
  <button
    {...rest}
    className={`bg-transparent border-0 text-[var(--color-textSecondary)] cursor-pointer p-1 rounded flex items-center justify-center transition-colors flex-shrink-0 hover:bg-[var(--select-bg)] hover:text-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

const EditActions = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`flex gap-1 ${className}`}>{children}</div>
);

const SaveButton = (props) => (
  <EditButton
    {...props}
    className={`text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 ${props.className || ''}`}
  />
);

const CancelButton = (props) => (
  <EditButton
    {...props}
    className={`text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ${props.className || ''}`}
  />
);

const BossName = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`text-sm text-[var(--color-textSecondary)] mt-2 ${className}`}>{children}</div>
);

const CardActions = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`flex flex-wrap gap-3 mt-4 ${className}`}>{children}</div>
);

const PrimaryButton = ({ children, className = '', ...rest }) => (
  <button {...rest} className={cn(BUTTON.primary.medium, 'flex-1', className)}>
    {children}
  </button>
);

const SecondaryButton = ({ children, className = '', ...rest }) => (
  <button {...rest} className={cn(BUTTON.secondary.medium, 'flex-1', className)}>
    {children}
  </button>
);

const DangerButton = ({ children, className = '', ...rest }) => (
  <button {...rest} className={cn(BUTTON.danger.medium, 'flex-1', className)}>
    {children}
  </button>
);

const MetaInfo = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`flex flex-col gap-2 mt-4 pt-4 border-t border-[var(--color-border)] text-xs text-[var(--color-textSecondary)] ${className}`}>{children}</div>
);

const MetaRow = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`flex justify-between items-center ${className}`}>{children}</div>
);

const CreatorInfo = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`text-center italic text-[var(--color-primary)] font-medium ${className}`}>{children}</div>
);

const ConfirmDialog = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] ${className}`}>{children}</div>
);

const ConfirmContent = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`bg-[var(--color-cardBackground)] p-8 rounded-xl max-w-[400px] w-[90%] ${className}`}>{children}</div>
);

const ConfirmTitle = ({ children, className = '', ...rest }) => (
  <h3 {...rest} className={`text-[var(--color-text)] m-0 mb-4 text-lg font-semibold ${className}`}>{children}</h3>
);

const ConfirmActions = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`flex gap-4 justify-end mt-6 ${className}`}>{children}</div>
);

const PlanCard = ({ plan, onEdit, isSharedPlan = false, onPlanDeleted }) => {
  const { deletePlanById, duplicatePlanById, exportPlanById } = usePlan();
  const { addToast } = useToast();
  const { user, isAnonymousMode, anonymousUser } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatorDisplayName, setCreatorDisplayName] = useState('');
  const [fetchingCreator, setFetchingCreator] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(plan.name || '');
  const [nameUpdateLoading, setNameUpdateLoading] = useState(false);

  // Helper function to get boss display name from boss tag/ID
  const getBossDisplayName = (bossTag) => {
    const boss = bosses.find(b => b.id === bossTag);
    return boss ? `${boss.icon} ${boss.name}` : bossTag;
  };

  // Get boss display text - use bossTags if available, fallback to bossId
  const getBossDisplay = () => {
    const tags = plan.bossTags || (plan.bossId ? [plan.bossId] : []);
    if (tags.length === 0) return 'Unknown';
    if (tags.length === 1) return getBossDisplayName(tags[0]);
    return tags.map(tag => getBossDisplayName(tag)).join(', ');
  };

  // Check if current user owns this plan
  const isOwner = () => {
    if (isAnonymousMode) {
      // For anonymous users, check if they own the plan locally
      return anonymousUser?.ownsPlan?.(plan.id) || false;
    } else {
      // For authenticated users, check ownerId or userId
      const currentUserId = user?.uid;
      return currentUserId && (plan.ownerId === currentUserId || plan.userId === currentUserId);
    }
  };

  // Update edited name when plan name changes
  useEffect(() => {
    setEditedName(plan.name || '');
  }, [plan.name]);

  // Fetch creator's display name for shared plans
  useEffect(() => {
    const fetchCreatorDisplayName = async () => {
      // Only fetch for shared plans
      if (!isSharedPlan) {
        return;
      }

      // Get the creator ID (prefer ownerId, fallback to userId)
      const creatorId = plan.ownerId || plan.userId;
      if (!creatorId) {
        console.log('[PlanCard] No creator ID found for plan:', plan.id);
        return;
      }

      console.log('[PlanCard] Fetching creator display name for shared plan:', {
        planId: plan.id,
        planName: plan.name,
        creatorId,
        ownerId: plan.ownerId,
        userId: plan.userId
      });

      setFetchingCreator(true);

      try {
        const displayName = await getUserDisplayName(creatorId);
        console.log('[PlanCard] Creator display name fetched:', displayName);
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

  // Handle name editing
  const handleStartEdit = () => {
    if (!isOwner()) return;
    setIsEditingName(true);
    setEditedName(plan.name || '');
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName(plan.name || '');
  };

  const handleSaveEdit = async () => {
    if (!isOwner() || !editedName.trim()) return;

    const trimmedName = editedName.trim();
    setNameUpdateLoading(true);

    // Optimistically update the local plan name for immediate visual feedback
    const originalName = plan.name;
    plan.name = trimmedName;

    try {
      // Use the direct plan service to update the title field (which maps to name in the frontend)
      const currentUserId = user?.uid || 'anonymous';
      await updatePlanFieldsWithOrigin(plan.id, { title: trimmedName }, currentUserId, null);

      setIsEditingName(false);
      addToast({
        type: 'success',
        title: 'Plan name updated',
        message: 'The plan name has been successfully updated.',
        duration: 3000
      });
    } catch (error) {
      // Revert the optimistic update on error
      plan.name = originalName;
      setEditedName(originalName);

      console.error('Failed to update plan name:', error);
      addToast({
        type: 'error',
        title: 'Failed to update name',
        message: 'Please try again.',
        duration: 4000
      });
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
      // Firestore timestamp
      date = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
      // String timestamp
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      // Firebase Realtime Database timestamp (milliseconds since epoch)
      date = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      // Already a Date object
      date = timestamp;
    } else {
      // Fallback - try to convert to Date
      date = new Date(timestamp);
    }

    // Validate that we have a valid Date object
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    return date.toLocaleDateString();
  };

  const handleDelete = async () => {
    setLoading(true);
    setShowDeleteConfirm(false);

    // Optimistic update: Remove plan from Dashboard UI immediately
    if (onPlanDeleted) {
      onPlanDeleted(plan.id);
    }

    try {
      await deletePlanById(plan.id);
      addToast({
        type: 'success',
        title: 'Plan deleted!',
        message: 'Your plan has been deleted successfully.',
        duration: 3000
      });
    } catch (error) {
      console.error('Failed to delete plan:', error);
      addToast({
        type: 'error',
        title: 'Failed to delete plan',
        message: error.message || 'Please try again.',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
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
    setLoading(true);
    try {
      // Import the service function to make plan public
      const { makePlanPublic } = await import('../../services/realtimePlanService');

      // Make the plan public to enable sharing
      await makePlanPublic(plan.id, true);

      // Generate the edit link
      const baseUrl = window.location.origin;
      const editLink = `${baseUrl}/plan/edit/${plan.id}`;

      // Copy the edit link to clipboard
      await navigator.clipboard.writeText(editLink);

      // Show success toast
      addToast({
        type: 'success',
        title: 'Plan link copied!',
        message: 'The plan link has been copied to your clipboard and is ready to share.',
        duration: 4000
      });

      // Navigate to edit route for sharing - collaboration will be enabled automatically
      onEdit(plan.id);
    } catch (error) {
      console.error('Failed to share plan:', error);

      // Show error toast
      addToast({
        type: 'error',
        title: 'Failed to share plan',
        message: 'Please try again.',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div style={{ flex: 1, minWidth: 0 }}>
            <PlanNameContainer>
              {isEditingName ? (
                <>
                  <PlanNameInput
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={nameUpdateLoading}
                    autoFocus
                    placeholder="Enter plan name"
                  />
                  <EditActions>
                    <SaveButton
                      onClick={handleSaveEdit}
                      disabled={nameUpdateLoading || !editedName.trim()}
                      title="Save name"
                    >
                      <Check size={16} />
                    </SaveButton>
                    <CancelButton
                      onClick={handleCancelEdit}
                      disabled={nameUpdateLoading}
                      title="Cancel editing"
                    >
                      <X size={16} />
                    </CancelButton>
                  </EditActions>
                </>
              ) : (
                <>
                  <PlanName>{plan.name}</PlanName>
                  {isOwner() && (
                    <EditButton
                      onClick={handleStartEdit}
                      disabled={loading}
                      title="Edit plan name"
                    >
                      <Edit2 size={16} />
                    </EditButton>
                  )}
                </>
              )}
            </PlanNameContainer>
            <BossName>Boss: {getBossDisplay()}</BossName>
          </div>
        </CardHeader>

        <CardActions>
          <PrimaryButton onClick={() => onEdit(plan.id)} disabled={loading}>
            Edit
          </PrimaryButton>
          <SecondaryButton onClick={handleShare} disabled={loading}>
            <Share2 size={16} style={{ marginRight: '0.5rem' }} />
            Share
          </SecondaryButton>
          <SecondaryButton onClick={handleDuplicate} disabled={loading}>
            Duplicate
          </SecondaryButton>
          <SecondaryButton onClick={handleExport} disabled={loading}>
            Export
          </SecondaryButton>
          <DangerButton
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading}
          >
            Delete
          </DangerButton>
        </CardActions>

        <MetaInfo>
          <MetaRow>
            <span>Created: {formatDate(plan.createdAt)}</span>
            <span>Updated: {formatDate(plan.updatedAt)}</span>
          </MetaRow>
          {isSharedPlan && (
            <CreatorInfo>
              {fetchingCreator ? (
                'Loading creator...'
              ) : creatorDisplayName ? (
                `Created by: ${creatorDisplayName}`
              ) : null}
            </CreatorInfo>
          )}
        </MetaInfo>
      </Card>

      {showDeleteConfirm && (
        <ConfirmDialog onClick={() => setShowDeleteConfirm(false)}>
          <ConfirmContent onClick={(e) => e.stopPropagation()}>
            <ConfirmTitle>Delete Plan</ConfirmTitle>
            <p>Are you sure you want to delete "{plan.name}"? This action cannot be undone.</p>
            <ConfirmActions>
              <SecondaryButton onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </SecondaryButton>
              <DangerButton onClick={handleDelete} disabled={loading}>
                {loading ? 'Deleting...' : 'Delete'}
              </DangerButton>
            </ConfirmActions>
          </ConfirmContent>
        </ConfirmDialog>
      )}


    </>
  );
};

export default PlanCard;
