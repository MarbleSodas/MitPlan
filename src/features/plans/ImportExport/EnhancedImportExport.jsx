import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { mitigationAbilities, ffxivJobs } from '../../../data';
import { usePlanStorage } from '../../../contexts/PlanStorageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useCollaboration } from '../../../contexts/CollaborationContext';
import StorageStatusIndicator from '../../../components/storage/StorageStatusIndicator';
import PlanMigrationDialog from '../../../components/migration/PlanMigrationDialog';
import SessionControlPanel from '../../../components/collaboration/SessionControlPanel';
import SessionStatusIndicator from '../../../components/collaboration/SessionStatusIndicator';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  generateShareableUrl
} from '../../../utils';
import { reconstructMitigations } from '../../../utils/url/urlUtils';

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

// Additional styled components for legacy import functionality
const ImportFormGroup = styled.div`
  margin-bottom: 16px;
`;

const ImportTextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
  font-size: 12px;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: var(--accent-color);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const FileInput = styled.input`
  display: none;
`;

const FileInputLabel = styled.label`
  display: inline-block;
  padding: 8px 16px;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;

  &:hover {
    background-color: var(--bg-hover);
    border-color: var(--accent-color);
  }
`;

const ImportButton = styled.button`
  padding: 8px 16px;
  background-color: var(--accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: var(--accent-hover);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

function EnhancedImportExport({ assignments, bossId, selectedJobs, onImport }) {
  const { isAuthenticated } = useAuth();
  const {
    savePlan,
    loadAllPlans,
    deletePlan,
    sharePlan,
    isLoading,
    error,
    migrationNeeded,
    isInitialized,
    storageState
  } = usePlanStorage();

  const {
    isCollaborating,
    currentSession,
    sessionStatus,
    isSessionOwner
  } = useCollaboration();

  const [planName, setPlanName] = useState('');
  const [savedPlans, setSavedPlans] = useState([]);
  const [message, setMessage] = useState(null);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [importData, setImportData] = useState('');
  const [sharingPlanId, setSharingPlanId] = useState(null);

  // Load saved plans when service is initialized or storage state changes
  useEffect(() => {
    if (isInitialized) {
      console.log('EnhancedImportExport: Loading plans due to initialization or storage state change');
      loadSavedPlans();
    }
  }, [isInitialized, storageState, isAuthenticated]);

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
      console.log('EnhancedImportExport: Storage service not initialized yet, skipping plan load');
      return;
    }

    try {
      console.log('EnhancedImportExport: Loading plans from storage, authenticated:', isAuthenticated, 'storageState:', storageState);
      const plans = await loadAllPlans();
      console.log('EnhancedImportExport: Loaded plans:', plans.length, 'plans');
      setSavedPlans(plans);

      // Clear any previous error messages when plans load successfully
      if (error) {
        setMessage(null);
      }
    } catch (error) {
      console.error('EnhancedImportExport: Failed to load plans:', error);
      setMessage({ type: 'error', text: `Failed to load saved plans: ${error.message}` });
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

    // Get tank positions from localStorage
    const tankPositions = JSON.parse(localStorage.getItem('tankPositions') || '{}');

    return {
      name: planName.trim() || 'Untitled Plan',
      bossId,
      assignments: optimizedAssignments,
      selectedJobs: optimizedSelectedJobs,
      tankPositions
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

  const handleSharePlan = async (plan) => {
    if (!isAuthenticated) {
      setMessage({ type: 'error', text: 'Please sign in to share plans' });
      return;
    }

    setSharingPlanId(plan.id);

    try {
      const result = await sharePlan(plan);

      // Copy to clipboard
      await navigator.clipboard.writeText(result.shareUrl);

      const collaborationStatus = result.collaborationEnabled
        ? ' Real-time collaboration is now active!'
        : '';

      setMessage({
        type: 'success',
        text: `Plan "${plan.name}" shared successfully! Link copied to clipboard.${collaborationStatus} Anyone with the link can ${result.collaborationEnabled ? 'collaborate in real-time' : 'view the plan'}.`
      });

      // Reload plans to update the shared status
      await loadSavedPlans();
    } catch (error) {
      console.error('Share failed:', error);
      setMessage({
        type: 'error',
        text: `Failed to share plan: ${error.message}`
      });
    } finally {
      setSharingPlanId(null);
    }
  };

  const handleLoadPlan = async (plan) => {
    try {
      console.log('Loading plan with assignments:', plan.assignments);

      // Use the reconstructMitigations utility to handle both old and new formats
      const reconstructedAssignments = reconstructMitigations(plan.assignments || {});
      console.log('Reconstructed assignments:', reconstructedAssignments);

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

      // Restore tank positions if available
      if (plan.tankPositions && Object.keys(plan.tankPositions).length > 0) {
        console.log('Restoring tank positions from plan:', plan.tankPositions);
        localStorage.setItem('tankPositions', JSON.stringify(plan.tankPositions));

        // Trigger a storage event to notify TankPositionContext
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'tankPositions',
          newValue: JSON.stringify(plan.tankPositions)
        }));
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

  // Handle importing legacy plan data
  const handleLegacyImport = () => {
    if (!importData.trim()) {
      setMessage({ type: 'error', text: 'Please enter import data or select a file' });
      return;
    }

    try {
      const importObj = JSON.parse(importData);

      // Validate the import data
      if (!importObj.assignments || !importObj.bossId) {
        throw new Error('Invalid import data: missing required fields');
      }

      // Use the reconstructMitigations utility to handle both old and new formats
      const reconstructedAssignments = reconstructMitigations(importObj.assignments || {});

      // Reconstruct the full job objects if selectedJobs is included
      let reconstructedJobs = null;
      if (importObj.selectedJobs) {
        reconstructedJobs = JSON.parse(JSON.stringify(ffxivJobs)); // Deep clone

        // Reset all jobs to unselected
        Object.keys(reconstructedJobs).forEach(roleKey => {
          reconstructedJobs[roleKey].forEach(job => {
            job.selected = false;
          });
        });

        // Set selected jobs based on import data
        Object.entries(importObj.selectedJobs).forEach(([roleKey, jobIds]) => {
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

      // Restore tank positions if available
      if (importObj.tankPositions && Object.keys(importObj.tankPositions).length > 0) {
        console.log('Restoring tank positions from import:', importObj.tankPositions);
        localStorage.setItem('tankPositions', JSON.stringify(importObj.tankPositions));

        // Trigger a storage event to notify TankPositionContext
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'tankPositions',
          newValue: JSON.stringify(importObj.tankPositions)
        }));
      }

      // Call the onImport callback with the reconstructed data
      onImport(reconstructedAssignments, importObj.bossId, reconstructedJobs);
      setImportData('');
      setMessage({ type: 'success', text: 'Legacy plan imported successfully!' });
    } catch (error) {
      console.error('Import error:', error);
      setMessage({ type: 'error', text: `Import failed: ${error.message}` });
    }
  };

  // Handle file import
  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImportData(e.target.result);
    };
    reader.readAsText(file);
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

        {/* Session Status and Control */}
        {(isCollaborating || currentSession) && (
          <SessionStatusIndicator />
        )}

        {(isSessionOwner || currentSession) && (
          <SessionControlPanel
            planData={createPlanData()}
            onSessionEnd={(finalPlanData) => {
              setMessage({
                type: 'success',
                text: 'Collaboration session ended and changes saved!'
              });
              // Reload plans to reflect any changes
              loadSavedPlans();
            }}
          />
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
                <PrimaryButton
                  onClick={handleSave}
                  disabled={isLoading || !isInitialized}
                  title={!isInitialized ? 'Initializing storage service...' : ''}
                >
                  💾 Save Plan
                </PrimaryButton>
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
                          onClick={() => handleSharePlan(plan)}
                          title="Share Plan"
                          disabled={sharingPlanId === plan.id || !isAuthenticated}
                        >
                          {sharingPlanId === plan.id ? '⏳' : '📤'}
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

              <ImportFormGroup>
                <ButtonGroup>
                  <FileInputLabel>
                    📂 Choose File
                    <FileInput
                      type="file"
                      accept=".json"
                      onChange={handleFileImport}
                    />
                  </FileInputLabel>

                  <ImportButton
                    onClick={handleLegacyImport}
                    disabled={!importData.trim()}
                  >
                    📥 Import Data
                  </ImportButton>
                </ButtonGroup>

                <ImportTextArea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="Paste JSON data here or use the file chooser above"
                />
              </ImportFormGroup>
            </Section>
          </Column>
        </TwoColumnLayout>
      </Container>

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
