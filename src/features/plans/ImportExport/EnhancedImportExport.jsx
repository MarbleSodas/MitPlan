import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { mitigationAbilities, ffxivJobs } from '../../../data';
import { usePlanStorage } from '../../../contexts/PlanStorageContext';
import { useAuth } from '../../../contexts/AuthContext';
import StorageStatusIndicator from '../../../components/storage/StorageStatusIndicator';
import EnhancedShareDialog from '../../../components/sharing/EnhancedShareDialog';
import PlanMigrationDialog from '../../../components/migration/PlanMigrationDialog';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  generateShareableUrl
} from '../../../utils';

const Container = styled.div`
  background-color: ${props => props.theme.colors.secondary};
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  box-shadow: ${props => props.theme.shadows.medium};
  transition: background-color 0.3s ease;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 12px;
    margin-bottom: 15px;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const Title = styled.h3`
  color: ${props => props.theme.colors.text};
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
`;

const TwoColumnLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media (min-width: 992px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  color: ${props => props.theme.colors.text};
  font-weight: 500;
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.text};
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.accent};
  }

  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 8px 16px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.border};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background-color: ${props => props.theme.colors.accent};
  color: white;
  border-color: ${props => props.theme.colors.accent};

  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.accentHover};
  }
`;

const PlansList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
`;

const PlanItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: ${props => props.theme.colors.primary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
`;

const PlanInfo = styled.div`
  flex: 1;
`;

const PlanName = styled.div`
  color: ${props => props.theme.colors.text};
  font-weight: 500;
  margin-bottom: 4px;
`;

const PlanMeta = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.875rem;
`;

const PlanActions = styled.div`
  display: flex;
  gap: 4px;
`;

const ActionButton = styled.button`
  padding: 6px 8px;
  border: none;
  border-radius: 4px;
  background-color: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.border};
  }
`;

const StatusMessage = styled.div`
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  margin-bottom: 12px;

  ${props => props.type === 'success' && `
    background-color: #E8F5E8;
    color: #2E7D32;
    border: 1px solid #4CAF50;
  `}

  ${props => props.type === 'error' && `
    background-color: #FFEBEE;
    color: #C62828;
    border: 1px solid #F44336;
  `}

  ${props => props.type === 'info' && `
    background-color: #E3F2FD;
    color: #1565C0;
    border: 1px solid #2196F3;
  `}
`;

function EnhancedImportExport({ assignments, bossId, selectedJobs, onImport }) {
  const { isAuthenticated } = useAuth();
  const {
    savePlan,
    loadAllPlans,
    deletePlan,
    isLoading,
    error,
    migrationNeeded,
    isInitialized
  } = usePlanStorage();

  const [planName, setPlanName] = useState('');
  const [savedPlans, setSavedPlans] = useState([]);
  const [message, setMessage] = useState(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [currentPlanData, setCurrentPlanData] = useState(null);

  // Load saved plans when service is initialized
  useEffect(() => {
    if (isInitialized) {
      loadSavedPlans();
    }
  }, [isInitialized]);

  // Show migration dialog when needed
  useEffect(() => {
    if (migrationNeeded && isAuthenticated) {
      setShowMigrationDialog(true);
    }
  }, [migrationNeeded, isAuthenticated]);

  // Clear messages after timeout
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadSavedPlans = async () => {
    if (!isInitialized) {
      console.log('Storage service not initialized yet, skipping plan load');
      return;
    }

    try {
      const plans = await loadAllPlans();
      setSavedPlans(plans);
    } catch (error) {
      console.error('Failed to load plans:', error);
      setMessage({ type: 'error', text: 'Failed to load saved plans' });
    }
  };

  const createPlanData = () => {
    // Create optimized assignments object
    const optimizedAssignments = {};
    Object.entries(assignments).forEach(([bossActionId, mitigations]) => {
      optimizedAssignments[bossActionId] = mitigations.map(mitigation => mitigation.id);
    });

    // Create optimized selectedJobs object
    const optimizedSelectedJobs = {};
    Object.entries(selectedJobs).forEach(([roleKey, jobs]) => {
      const selectedJobIds = jobs
        .filter(job => job.selected)
        .map(job => job.id);

      if (selectedJobIds.length > 0) {
        optimizedSelectedJobs[roleKey] = selectedJobIds;
      }
    });

    return {
      name: planName.trim() || 'Untitled Plan',
      bossId,
      assignments: optimizedAssignments,
      selectedJobs: optimizedSelectedJobs
    };
  };

  const handleSave = async () => {
    if (!planName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a plan name' });
      return;
    }

    try {
      const planData = createPlanData();
      await savePlan(planData);

      setPlanName('');
      setMessage({ type: 'success', text: `Plan "${planData.name}" saved successfully!` });

      // Reload plans list
      await loadSavedPlans();
    } catch (error) {
      console.error('Save failed:', error);
      setMessage({ type: 'error', text: `Failed to save plan: ${error.message}` });
    }
  };

  const handleShare = () => {
    const planData = createPlanData();
    setCurrentPlanData(planData);
    setShowShareDialog(true);
  };

  const handleLoadPlan = async (plan) => {
    try {
      // Reconstruct the full mitigation objects from IDs
      const reconstructedAssignments = {};
      Object.entries(plan.assignments || {}).forEach(([bossActionId, mitigationIds]) => {
        reconstructedAssignments[bossActionId] = mitigationIds.map(id => {
          const mitigation = mitigationAbilities.find(m => m.id === id);
          if (!mitigation) {
            console.warn(`Mitigation with ID ${id} not found`);
            return null;
          }
          return mitigation;
        }).filter(Boolean);
      });

      // Reconstruct the full job objects if selectedJobs is included
      let reconstructedJobs = null;
      if (plan.selectedJobs) {
        reconstructedJobs = JSON.parse(JSON.stringify(ffxivJobs));

        // Reset all jobs to unselected
        Object.keys(reconstructedJobs).forEach(roleKey => {
          reconstructedJobs[roleKey].forEach(job => {
            job.selected = false;
          });
        });

        // Set selected jobs based on plan data
        Object.entries(plan.selectedJobs).forEach(([roleKey, jobIds]) => {
          if (reconstructedJobs[roleKey]) {
            jobIds.forEach(jobId => {
              const job = reconstructedJobs[roleKey].find(j => j.id === jobId);
              if (job) {
                job.selected = true;
              }
            });
          }
        });
      }

      // Call the onImport callback with the reconstructed data
      onImport(reconstructedAssignments, plan.bossId, reconstructedJobs);
      setMessage({ type: 'success', text: `Plan "${plan.name}" loaded successfully!` });
    } catch (error) {
      console.error('Load error:', error);
      setMessage({ type: 'error', text: `Failed to load plan: ${error.message}` });
    }
  };

  const handleDeletePlan = async (planId, planName) => {
    if (window.confirm(`Are you sure you want to delete "${planName}"?`)) {
      try {
        await deletePlan(planId);
        setMessage({ type: 'success', text: `Plan "${planName}" deleted successfully` });
        await loadSavedPlans();
      } catch (error) {
        console.error('Delete failed:', error);
        setMessage({ type: 'error', text: `Failed to delete plan: ${error.message}` });
      }
    }
  };

  const handleMigrationComplete = async (results) => {
    setShowMigrationDialog(false);

    if (results.successful.length > 0) {
      setMessage({
        type: 'success',
        text: `Successfully migrated ${results.successful.length} plans to your account!`
      });
      await loadSavedPlans();
    }

    if (results.failed.length > 0) {
      setMessage({
        type: 'error',
        text: `Failed to migrate ${results.failed.length} plans. Please try again.`
      });
    }
  };

  return (
    <>
      <Container>
        <Header>
          <Title>Plan Management</Title>
          <StorageStatusIndicator />
        </Header>

        {!isInitialized && (
          <StatusMessage type="info">
            Initializing storage service...
          </StatusMessage>
        )}

        {message && (
          <StatusMessage type={message.type}>
            {message.text}
          </StatusMessage>
        )}

        <TwoColumnLayout>
          {/* Left Column - Save & Share */}
          <Column>
            <Section>
              <Label>Save Current Plan</Label>
              <FormGroup>
                <Input
                  type="text"
                  placeholder="Enter a name for your plan"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                />
                <ButtonGroup>
                  <PrimaryButton
                    onClick={handleSave}
                    disabled={isLoading || !isInitialized}
                    title={!isInitialized ? 'Initializing storage service...' : ''}
                  >
                    💾 Save Plan
                  </PrimaryButton>
                  <Button onClick={handleShare}>
                    📋 Share Plan
                  </Button>
                </ButtonGroup>
              </FormGroup>
            </Section>

            <Section>
              <Label>Saved Plans ({savedPlans.length})</Label>
              {savedPlans.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  No saved plans yet.
                </p>
              ) : (
                <PlansList>
                  {savedPlans.map(plan => (
                    <PlanItem key={plan.id}>
                      <PlanInfo>
                        <PlanName>{plan.name}</PlanName>
                        <PlanMeta>
                          {new Date(plan.date || plan.lastModified).toLocaleDateString()}
                          {plan.source && ` • ${plan.source}`}
                        </PlanMeta>
                      </PlanInfo>
                      <PlanActions>
                        <ActionButton
                          onClick={() => handleLoadPlan(plan)}
                          title="Load Plan"
                        >
                          📂
                        </ActionButton>
                        <ActionButton
                          onClick={() => handleDeletePlan(plan.id, plan.name)}
                          title="Delete Plan"
                        >
                          🗑️
                        </ActionButton>
                      </PlanActions>
                    </PlanItem>
                  ))}
                </PlansList>
              )}
            </Section>
          </Column>

          {/* Right Column - Import (Legacy) */}
          <Column>
            <Section>
              <Label>Import Legacy Plan</Label>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                margin: '0 0 12px 0'
              }}>
                Import plans from JSON files or compressed URLs for backward compatibility.
              </p>
              {/* Legacy import functionality can be added here if needed */}
            </Section>
          </Column>
        </TwoColumnLayout>
      </Container>

      {/* Share Dialog */}
      <EnhancedShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        planData={currentPlanData}
      />

      {/* Migration Dialog */}
      <PlanMigrationDialog
        isOpen={showMigrationDialog}
        onClose={() => setShowMigrationDialog(false)}
        onComplete={handleMigrationComplete}
      />
    </>
  );
}

export default EnhancedImportExport;
