import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Share2 } from 'lucide-react';
import { usePlan } from '../../contexts/PlanContext';
import { useToast } from '../common/Toast/Toast';
import { getUserDisplayName } from '../../services/userService';

const Card = styled.div`
  background: ${props => props.theme?.colors?.cardBackground || '#ffffff'};
  border: 1px solid ${props => props.theme?.colors?.border || '#e1e5e9'};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  min-width: 0;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    padding: 1.25rem;
  }

  @media (max-width: 600px) {
    padding: 1rem;
    border-radius: 8px;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const PlanName = styled.h3`
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
`;

const BossName = styled.div`
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  font-size: 0.9rem;
  margin-top: 0.5rem;
`;

const CardActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;

  @media (max-width: 768px) {
    gap: 0.5rem;
  }

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const Button = styled.button`
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  flex: 1;

  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    min-height: 40px;
  }

  @media (max-width: 600px) {
    flex: none;
    width: 100%;
    min-height: 48px;
    font-size: 0.9rem;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background: ${props => props.theme?.colors?.primary || '#3b82f6'};
  color: white;

  &:hover:not(:disabled) {
    background: ${props => props.theme?.colors?.primaryHover || '#2563eb'};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  }

  @media (max-width: 600px) {
    order: -1;
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  border: 1px solid ${props => props.theme?.colors?.border || '#e1e5e9'};

  &:hover:not(:disabled) {
    background: ${props => props.theme?.colors?.hoverBackground || '#f9fafb'};
    color: ${props => props.theme?.colors?.text || '#333333'};
    border-color: ${props => props.theme?.colors?.primary || '#3b82f6'};
    transform: translateY(-1px);
  }
`;

const DangerButton = styled(Button)`
  background: ${props => props.theme?.colors?.error || '#ef4444'} !important;
  color: white;
  border: 1px solid ${props => props.theme?.colors?.error || '#ef4444'};

  &:hover:not(:disabled) {
    background: ${props => props.theme?.colors?.errorHover || '#dc2626'};
    border-color: ${props => props.theme?.colors?.errorHover || '#dc2626'};
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  }

  @media (max-width: 600px) {
    order: 1;
  }
`;

const MetaInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme?.colors?.border || '#e1e5e9'};
  font-size: 0.8rem;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
`;

const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CreatorInfo = styled.div`
  text-align: center;
  font-style: italic;
  color: ${props => props.theme?.colors?.primary || '#3b82f6'};
  font-weight: 500;
`;

const ConfirmDialog = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ConfirmContent = styled.div`
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  padding: 2rem;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
`;

const ConfirmTitle = styled.h3`
  color: ${props => props.theme?.colors?.text || '#333333'};
  margin: 0 0 1rem 0;
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
`;

const PlanCard = ({ plan, onEdit, isSharedPlan = false }) => {
  const { deletePlanById, duplicatePlanById, exportPlanById } = usePlan();
  const { addToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatorDisplayName, setCreatorDisplayName] = useState('');
  const [fetchingCreator, setFetchingCreator] = useState(false);

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
    try {
      await deletePlanById(plan.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete plan:', error);
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
          <div>
            <PlanName>{plan.name}</PlanName>
            <BossName>Boss: {plan.bossId || 'Unknown'}</BossName>
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
