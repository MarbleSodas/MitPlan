/**
 * Anonymous Dashboard Component
 * Shows local plans and provides access to anonymous features
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Plus, FileText, Calendar, User, Trash2, Edit, Check, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/Toast/Toast';
import unifiedPlanService from '../../services/unifiedPlanService';

import AnonymousPlanCreator from './AnonymousPlanCreator';
import BossSelectionModal from '../dashboard/BossSelectionModal';
import Footer from '../layout/Footer';

const DashboardContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 600;
  color: ${props => props.theme?.colors?.text || '#333333'};
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 1rem;
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};
`;

const PlansSection = styled.div`
  margin-bottom: 3rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h2`
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
`;

const PlanCount = styled.span`
  background: ${props => props.theme?.colors?.primaryBackground || '#eff6ff'};
  color: ${props => props.theme?.colors?.primary || '#3b82f6'};
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
`;

const ActionsBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background: ${props => props.theme?.colors?.primary || '#3399ff'};
  color: white;
  
  &:hover:not(:disabled) {
    background: ${props => props.theme?.colors?.primaryHover || '#2980b9'};
  }
`;

const PlansGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
`;

const PlanCard = styled.div`
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  border: 1px solid ${props => props.theme?.colors?.border || '#e0e0e0'};
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    border-color: ${props => props.theme?.colors?.primary || '#3399ff'};
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const PlanTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
`;

const PlanTitle = styled.h3`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${props => props.theme?.colors?.text || '#333333'};
  flex: 1;
`;

const HeaderEditButton = styled.button`
  background: transparent;
  border: none;
  color: ${props => props.theme?.colors?.primary || '#3399ff'};
  cursor: pointer;
  padding: 0.375rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  opacity: 0.7;

  &:hover {
    opacity: 1;
    background: ${props => props.theme?.colors?.primaryLight || 'rgba(51, 153, 255, 0.1)'};
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const PlanNameInput = styled.input`
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  border: 2px solid ${props => props.theme?.colors?.primary || '#3399ff'};
  border-radius: 6px;
  padding: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${props => props.theme?.colors?.text || '#333333'};
  width: 100%;
  outline: none;
  font-family: inherit;

  &:focus {
    border-color: ${props => props.theme?.colors?.primaryHover || '#2980b9'};
    box-shadow: 0 0 0 3px rgba(51, 153, 255, 0.1);
  }
`;

const EditActions = styled.div`
  display: flex;
  gap: 0.25rem;
  margin-left: 0.5rem;
`;

const EditActionButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme?.colors?.hover || '#f5f5f5'};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const SaveButton = styled(EditActionButton)`
  color: ${props => props.theme?.colors?.success || '#10b981'};

  &:hover {
    background: rgba(16, 185, 129, 0.1);
  }
`;

const CancelButton = styled(EditActionButton)`
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};

  &:hover {
    background: rgba(102, 102, 102, 0.1);
  }
`;

const PlanMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};
`;

const PlanActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const SmallButton = styled(Button)`
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
`;

const SecondaryButton = styled(SmallButton)`
  background: transparent;
  color: ${props => props.theme?.colors?.text || '#333333'};

  &:hover:not(:disabled) {
    background: ${props => props.theme?.colors?.hover || '#f5f5f5'};
  }
`;

const DangerButton = styled(SmallButton)`
  background: transparent;
  color: ${props => props.theme?.colors?.error || '#e74c3c'};

  &:hover:not(:disabled) {
    background: ${props => props.theme?.colors?.error || '#e74c3c'};
    color: white;
  }
`;

const SectionEmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  background: ${props => props.theme?.colors?.backgroundSecondary || '#f8fafc'};
  border-radius: 8px;
  border: 1px dashed ${props => props.theme?.colors?.border || '#e2e8f0'};
`;

const SectionEmptyText = styled.p`
  font-size: 0.875rem;
  margin: 0;
  font-style: italic;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${props => props.theme?.colors?.textSecondary || '#666666'};
`;

const EmptyStateIcon = styled.div`
  margin-bottom: 1rem;
  color: ${props => props.theme?.colors?.textTertiary || '#999999'};
`;

const Modal = styled.div`
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
  padding: 1rem;
`;

const AnonymousDashboard = () => {
  const navigate = useNavigate();
  const { isAnonymousMode, anonymousUser } = useAuth();
  const { addToast } = useToast();
  const [categorizedPlans, setCategorizedPlans] = useState({
    ownedPlans: [],
    sharedPlans: [],
    totalPlans: 0
  });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBossSelectionModal, setShowBossSelectionModal] = useState(false);
  const [selectedBossForPlan, setSelectedBossForPlan] = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Set up unified plan service context and load plans
  useEffect(() => {
    if (isAnonymousMode && anonymousUser) {
      // Set the user context for the unified plan service
      unifiedPlanService.setUserContext(anonymousUser, true);
      loadPlans();
    }
  }, [isAnonymousMode, anonymousUser]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const plans = await unifiedPlanService.getCategorizedUserPlans();
      setCategorizedPlans(plans);
    } catch (error) {
      console.error('Error loading categorized plans:', error);
      setCategorizedPlans({ ownedPlans: [], sharedPlans: [], totalPlans: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlanByBoss = () => {
    setShowBossSelectionModal(true);
  };

  const handleBossSelected = (bossId) => {
    setSelectedBossForPlan(bossId);
    setShowBossSelectionModal(false);
    setShowCreateModal(true);
  };

  const handleCreateModalClose = () => {
    setShowCreateModal(false);
    setSelectedBossForPlan(null);
  };

  const handlePlanCreated = (plan) => {
    setShowCreateModal(false);
    setSelectedBossForPlan(null);
    loadPlans(); // Refresh the list
  };

  const handleEditPlan = (planId) => {
    navigate(`/anonymous/plan/${planId}`);
  };

  const handleDeletePlan = async (planId, planName) => {
    if (window.confirm(`Are you sure you want to delete "${planName}"? This action cannot be undone.`)) {
      try {
        await localStoragePlanService.deletePlan(planId);
        loadPlans(); // Refresh the list
      } catch (error) {
        console.error('Error deleting plan:', error);
        addToast({
          type: 'error',
          title: 'Delete failed',
          message: 'Failed to delete plan: ' + error.message,
          duration: 4000
        });
      }
    }
  };

  const handleStartEditName = (planId, currentName) => {
    setEditingPlanId(planId);
    setEditedName(currentName);
  };

  const handleSaveName = async (planId) => {
    if (editedName.trim() === '' || !editingPlanId) {
      setEditingPlanId(null);
      setEditedName('');
      return;
    }

    setSavingName(true);
    try {
      // Update both 'title' (primary field) and 'name' (for compatibility)
      await unifiedPlanService.updatePlan(planId, {
        title: editedName.trim(),
        name: editedName.trim()
      });
      setEditingPlanId(null);
      setEditedName('');

      // Show success toast
      addToast({
        type: 'success',
        title: 'Plan renamed!',
        message: `Plan renamed to "${editedName.trim()}".`,
        duration: 3000
      });

      // Refresh the plans list
      loadPlans();
    } catch (error) {
      console.error('Failed to rename plan:', error);

      // Show error toast
      addToast({
        type: 'error',
        title: 'Failed to rename plan',
        message: 'Please try again.',
        duration: 4000
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleCancelEditName = () => {
    setEditingPlanId(null);
    setEditedName('');
  };

  const handleNameKeyPress = (e, planId) => {
    if (e.key === 'Enter') {
      handleSaveName(planId);
    } else if (e.key === 'Escape') {
      handleCancelEditName();
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!isAnonymousMode) {
    return null;
  }

  return (
    <>
      <DashboardContainer>
      <Header>
        <Title>
          <User size={32} />
          Anonymous Dashboard
        </Title>
        <Subtitle>
          Welcome, {anonymousUser?.displayName || 'Anonymous User'}! 
          Your plans are stored locally in your browser.
        </Subtitle>
      </Header>



      <ActionsBar>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Your Plans ({categorizedPlans.totalPlans})</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <PrimaryButton onClick={handleCreatePlanByBoss}>
            <Plus size={16} />
            Create New Plan
          </PrimaryButton>
        </div>
      </ActionsBar>

      {loading ? (
        <div>Loading plans...</div>
      ) : categorizedPlans.totalPlans === 0 ? (
        <EmptyState>
          <EmptyStateIcon>
            <FileText size={48} />
          </EmptyStateIcon>
          <h3>No plans yet</h3>
          <p>Create your first mitigation plan to get started.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
            <PrimaryButton onClick={handleCreatePlanByBoss}>
              <Plus size={16} />
              Create Your First Plan
            </PrimaryButton>
          </div>
        </EmptyState>
      ) : (
        <>
          {/* My Plans Section */}
          <PlansSection>
            <SectionHeader>
              <SectionTitle>My Plans</SectionTitle>
              <PlanCount>{categorizedPlans.ownedPlans.length}</PlanCount>
            </SectionHeader>

            {categorizedPlans.ownedPlans.length === 0 ? (
              <SectionEmptyState>
                <SectionEmptyText>
                  You haven't created any plans yet. Click "Create New Plan" to get started!
                </SectionEmptyText>
              </SectionEmptyState>
            ) : (
              <PlansGrid>
                {categorizedPlans.ownedPlans.map((plan) => (
                  <PlanCard key={plan.id} onClick={() => handleEditPlan(plan.id)}>
                    <PlanTitleRow>
                      {editingPlanId === plan.id ? (
                        <>
                          <PlanNameInput
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            onKeyDown={(e) => handleNameKeyPress(e, plan.id)}
                            onBlur={() => handleSaveName(plan.id)}
                            autoFocus
                            disabled={savingName}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <EditActions>
                            <SaveButton
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveName(plan.id);
                              }}
                              disabled={savingName}
                              title="Save name"
                            >
                              <Check size={12} />
                            </SaveButton>
                            <CancelButton
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEditName();
                              }}
                              disabled={savingName}
                              title="Cancel"
                            >
                              <X size={12} />
                            </CancelButton>
                          </EditActions>
                        </>
                      ) : (
                        <>
                          <PlanTitle>{plan.name}</PlanTitle>
                          <HeaderEditButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditName(plan.id, plan.name);
                            }}
                            disabled={savingName}
                            title="Edit plan name"
                          >
                            <Edit size={16} />
                          </HeaderEditButton>
                        </>
                      )}
                    </PlanTitleRow>
                    <PlanMeta>
                      <div>Boss: {plan.bossId}</div>
                      <div>
                        <Calendar size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        Created: {formatDate(plan.createdAt)}
                      </div>
                      <div>
                        <Calendar size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        Updated: {formatDate(plan.updatedAt)}
                      </div>
                    </PlanMeta>

                    <PlanActions onClick={(e) => e.stopPropagation()}>
                      <SecondaryButton onClick={() => handleEditPlan(plan.id)}>
                        <Edit size={14} />
                        Edit
                      </SecondaryButton>
                      <DangerButton onClick={() => handleDeletePlan(plan.id, plan.name)}>
                        <Trash2 size={14} />
                        Delete
                      </DangerButton>
                    </PlanActions>
                  </PlanCard>
                ))}
              </PlansGrid>
            )}
          </PlansSection>

          {/* Note: Anonymous users don't have shared plans since they only work with localStorage */}
        </>
      )}

      {showBossSelectionModal && (
        <BossSelectionModal
          onClose={() => setShowBossSelectionModal(false)}
          onSelectBoss={handleBossSelected}
        />
      )}

      {showCreateModal && (
        <Modal onClick={handleCreateModalClose}>
          <div onClick={(e) => e.stopPropagation()}>
            <AnonymousPlanCreator
              onCancel={handleCreateModalClose}
              onSuccess={handlePlanCreated}
              preSelectedBossId={selectedBossForPlan}
            />
          </div>
        </Modal>
      )}
    </DashboardContainer>
    <Footer />
  </>
  );
};

export default AnonymousDashboard;
