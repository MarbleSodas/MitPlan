import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { mitigationAbilities, ffxivJobs } from '../../../data';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  generateShareableUrl
} from '../../../utils';
import { useAuth } from '../../../contexts/AuthContext';
import { usePlan } from '../../../contexts/PlanContext';

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
`;

const Title = styled.h3`
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding-bottom: 10px;
  color: ${props => props.theme.colors.text};
`;

const Section = styled.div`
  margin-bottom: 20px;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  color: ${props => props.theme.colors.text};
  font-weight: bold;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  background-color: ${props => props.theme.colors.cardBackground};
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 150px;
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  background-color: ${props => props.theme.colors.cardBackground};
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  font-family: monospace;
  resize: vertical;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    min-height: 120px;
    padding: 6px 10px;
    font-size: 12px;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: 8px;
    margin-bottom: 12px;
  }
`;

const Button = styled.button`
  padding: 8px 16px;
  background-color: ${props => props.theme.colors.secondary};
  color: ${props => props.theme.colors.text};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.primary};
    color: white;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 6px 12px;
    font-size: 13px;
  }
`;

const SaveButton = styled(Button)`
  background-color: #4caf50;
  color: white;
  border: none;

  &:hover {
    background-color: #45a049;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex: 1; /* Take up available space on mobile */
  }
`;

const ImportButton = styled(Button)`
  background-color: #2196f3;
  color: white;
  border: none;
  height: 36px; /* Match the height of FileInputLabel */
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    background-color: #0b7dda;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    height: 32px;
    flex: 1; /* Take up available space on mobile */
  }
`;

const FileInputLabel = styled.label`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  height: 36px;
  background-color: ${props => props.theme.colors.secondary};
  color: ${props => props.theme.colors.text};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    background-color: ${props => props.theme.colors.primary};
    color: white;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 6px 12px;
    height: 32px;
    font-size: 13px;
    flex: 1; /* Take up available space on mobile */
  }
`;

const FileInput = styled.input`
  display: none;
`;

const ActionRow = styled.div`
  margin-bottom: 10px;
`;

const SavedPlansList = styled.div`
  margin-top: 10px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  background-color: ${props => props.theme.colors.cardBackground};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    margin-top: 8px;
    max-height: 180px;
  }
`;

const SavedPlanItem = styled.div`
  padding: 8px 12px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 6px 10px;
    font-size: 13px;
  }
`;

const PlanName = styled.div`
  flex-grow: 1;
  color: ${props => props.theme.colors.text};
`;

const PlanDate = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.lightText};
  margin-right: 10px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 11px;
    margin-right: 8px;
  }
`;

const PlanActions = styled.div`
  display: flex;
  gap: 5px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: 3px;
  }
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 5px;
  color: ${props => props.theme.colors.text};

  &:hover {
    color: ${props => props.theme.colors.primary};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 14px;
    padding: 2px 4px;
  }
`;

const AuthStatusBanner = styled.div`
  background-color: ${props => props.$isAuthenticated ? '#e8f5e8' : '#fff3cd'};
  border: 1px solid ${props => props.$isAuthenticated ? '#d4edda' : '#ffeaa7'};
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 20px;
  color: ${props => props.$isAuthenticated ? '#155724' : '#856404'};
  font-size: 14px;

  strong {
    font-weight: 600;
  }
`;

function ImportExport({ assignments, bossId, selectedJobs, onImport }) {
  const { isAuthenticated, user } = useAuth();
  const {
    userPlans,
    createPlan,
    deletePlan: deleteDatabasePlan,
    loading: planLoading
  } = usePlan();

  const [planName, setPlanName] = useState('');
  const [exportData, setExportData] = useState('');
  const [importData, setImportData] = useState('');
  const [savedPlans, setSavedPlans] = useState([]);
  const [saving, setSaving] = useState(false);

  // Load saved plans on component mount
  useEffect(() => {
    console.log('📥 [IMPORT/EXPORT] Component mounted');
    if (!isAuthenticated) {
      console.log('📥 [IMPORT/EXPORT] Loading plans from localStorage for non-authenticated user');
      // Load plans from localStorage for non-authenticated users
      loadSavedPlans();
    } else {
      console.log('📥 [IMPORT/EXPORT] User authenticated - using plans from PlanContext (no fetch needed)');
    }
    // For authenticated users, plans are already loaded by PlanContext
  }, [isAuthenticated]);

  // Update savedPlans when userPlans changes (for authenticated users)
  useEffect(() => {
    if (isAuthenticated && userPlans) {
      setSavedPlans(userPlans);
    }
  }, [isAuthenticated, userPlans]);

  // Load saved plans from localStorage (for unauthenticated users)
  const loadSavedPlans = () => {
    const plans = loadFromLocalStorage('mitPlanSavedPlans', []);
    setSavedPlans(plans);
  };

  // Handle saving the current plan
  const handleSave = async () => {
    if (!planName.trim()) {
      alert('Please enter a plan name');
      return;
    }

    setSaving(true);

    try {
      // Create optimized assignments object with only the necessary data
      const optimizedAssignments = {};

      Object.entries(assignments).forEach(([bossActionId, mitigations]) => {
        // Store only the mitigation IDs instead of the full objects
        optimizedAssignments[bossActionId] = mitigations.map(mitigation => mitigation.id);
      });

      // Create optimized selectedJobs object with only the selected job IDs
      const optimizedSelectedJobs = {};

      Object.entries(selectedJobs).forEach(([roleKey, jobs]) => {
        // Filter to only include selected jobs and store only their IDs
        const selectedJobIds = jobs
          .filter(job => job.selected)
          .map(job => job.id);

        // Only include the role if it has selected jobs
        if (selectedJobIds.length > 0) {
          optimizedSelectedJobs[roleKey] = selectedJobIds;
        }
      });

      if (isAuthenticated) {
        // Save to database
        const planData = {
          title: planName,
          description: `Created on ${new Date().toLocaleDateString()}`,
          bossId,
          assignments: optimizedAssignments,
          selectedJobs: optimizedSelectedJobs,
          isPublic: false
        };

        await createPlan(planData);
        alert(`Plan "${planName}" saved to your account!`);

        // Note: createPlan automatically updates local state, no need to refetch
        console.log('✅ [IMPORT/EXPORT] Plan created and automatically added to local state');
      } else {
        // Save to localStorage
        const planData = {
          id: Date.now().toString(),
          name: planName,
          date: new Date().toISOString(),
          version: '1.2',
          bossId,
          assignments: optimizedAssignments,
          selectedJobs: optimizedSelectedJobs
        };

        const updatedPlans = [...savedPlans, planData];
        saveToLocalStorage('mitPlanSavedPlans', updatedPlans);
        setSavedPlans(updatedPlans);
        alert(`Plan "${planName}" saved locally!`);
      }

      setPlanName('');
    } catch (error) {
      console.error('Save error:', error);
      alert(`Failed to save plan: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Handle exporting the current plan
  const handleExport = () => {
    // Create optimized assignments object with only the necessary data
    const optimizedAssignments = {};

    Object.entries(assignments).forEach(([bossActionId, mitigations]) => {
      // Store only the mitigation IDs instead of the full objects
      optimizedAssignments[bossActionId] = mitigations.map(mitigation => mitigation.id);
    });

    // Create optimized selectedJobs object with only the selected job IDs
    const optimizedSelectedJobs = {};

    Object.entries(selectedJobs).forEach(([roleKey, jobs]) => {
      // Filter to only include selected jobs and store only their IDs
      const selectedJobIds = jobs
        .filter(job => job.selected)
        .map(job => job.id);

      // Only include the role if it has selected jobs
      if (selectedJobIds.length > 0) {
        optimizedSelectedJobs[roleKey] = selectedJobIds;
      }
    });

    // Create the export data
    const exportObj = {
      version: '1.2',
      exportDate: new Date().toISOString(),
      bossId,
      assignments: optimizedAssignments,
      selectedJobs: optimizedSelectedJobs
    };

    // Convert to JSON string
    const exportString = JSON.stringify(exportObj, null, 2);
    setExportData(exportString);
  };

  // Handle downloading the export file
  const downloadExportFile = () => {
    if (!exportData) return;

    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mitplan_${bossId}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate a shareable link and copy it to clipboard
  const handleCopyPlanLink = () => {
    // Create optimized assignments object with only the necessary data
    const optimizedAssignments = {};

    Object.entries(assignments).forEach(([bossActionId, mitigations]) => {
      // Store only the mitigation IDs instead of the full objects
      optimizedAssignments[bossActionId] = mitigations.map(mitigation => mitigation.id);
    });

    // Create optimized selectedJobs object with only the selected job IDs
    const optimizedSelectedJobs = {};

    Object.entries(selectedJobs).forEach(([roleKey, jobs]) => {
      // Filter to only include selected jobs and store only their IDs
      const selectedJobIds = jobs
        .filter(job => job.selected)
        .map(job => job.id);

      // Only include the role if it has selected jobs
      if (selectedJobIds.length > 0) {
        optimizedSelectedJobs[roleKey] = selectedJobIds;
      }
    });

    // Create the plan data
    const planData = {
      version: '1.2',
      exportDate: new Date().toISOString(),
      bossId,
      assignments: optimizedAssignments,
      selectedJobs: optimizedSelectedJobs
    };

    // Generate the shareable URL
    const url = generateShareableUrl(planData);

    // Copy the URL to clipboard directly
    navigator.clipboard.writeText(url)
      .then(() => {
        alert('Plan link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
        alert('Failed to copy link. Please try again.');
      });
  };



  // Handle importing data
  const handleImport = () => {
    if (!importData.trim()) {
      alert('Please enter import data or select a file');
      return;
    }

    try {
      const importObj = JSON.parse(importData);

      // Validate the import data
      if (!importObj.assignments || !importObj.bossId) {
        throw new Error('Invalid import data: missing required fields');
      }

      // Reconstruct the full mitigation objects from IDs
      const reconstructedAssignments = {};

      Object.entries(importObj.assignments).forEach(([bossActionId, mitigationIds]) => {
        reconstructedAssignments[bossActionId] = mitigationIds.map(id => {
          const mitigation = mitigationAbilities.find(m => m.id === id);
          if (!mitigation) {
            console.warn(`Mitigation with ID ${id} not found`);
            return null;
          }
          return mitigation;
        }).filter(Boolean); // Remove null values
      });

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

      // Call the onImport callback with the reconstructed data
      onImport(reconstructedAssignments, importObj.bossId, reconstructedJobs);
      setImportData('');
      alert('Import successful!');
    } catch (error) {
      console.error('Import error:', error);
      alert(`Import failed: ${error.message}`);
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

  // Handle loading a saved plan
  const handleLoadPlan = (plan) => {
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
        }).filter(Boolean); // Remove null values
      });

      // Reconstruct the full job objects if selectedJobs is included
      let reconstructedJobs = null;
      if (plan.selectedJobs) {
        reconstructedJobs = JSON.parse(JSON.stringify(ffxivJobs)); // Deep clone

        // Reset all jobs to unselected
        Object.keys(reconstructedJobs).forEach(roleKey => {
          reconstructedJobs[roleKey].forEach(job => {
            job.selected = false;
          });
        });

        // Set selected jobs based on import data
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
      const planName = plan.title || plan.name || 'Untitled Plan';
      onImport(reconstructedAssignments, plan.bossId, reconstructedJobs);
      alert(`Plan "${planName}" loaded successfully!`);
    } catch (error) {
      console.error('Load error:', error);
      alert(`Load failed: ${error.message}`);
    }
  };

  // Handle deleting a saved plan
  const handleDeletePlan = async (planId) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      try {
        if (isAuthenticated) {
          // Delete from database
          await deleteDatabasePlan(planId);
          alert('Plan deleted successfully!');
          // Note: deleteDatabasePlan automatically updates local state, no need to refetch
          console.log('✅ [IMPORT/EXPORT] Plan deleted and automatically removed from local state');
        } else {
          // Delete from localStorage
          const updatedPlans = savedPlans.filter(plan => plan.id !== planId);
          saveToLocalStorage('mitPlanSavedPlans', updatedPlans);
          setSavedPlans(updatedPlans);
        }
      } catch (error) {
        console.error('Delete error:', error);
        alert(`Failed to delete plan: ${error.message}`);
      }
    }
  };

  // Generate a shareable link for a saved plan and copy it to clipboard
  const handleCopyPlanLinkFromSaved = (plan) => {
    // Create the plan data for sharing
    const planData = {
      version: '1.2',
      exportDate: new Date().toISOString(),
      bossId: plan.bossId,
      assignments: plan.assignments,
      selectedJobs: plan.selectedJobs
    };

    // Generate the shareable URL
    const url = generateShareableUrl(planData);

    // Copy the URL to clipboard directly
    navigator.clipboard.writeText(url)
      .then(() => {
        alert(`Link for plan "${plan.name}" copied to clipboard!`);
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
        alert('Failed to copy link. Please try again.');
      });
  };

  return (
    <Container>
      {/* Authentication Status Banner */}
      <AuthStatusBanner $isAuthenticated={isAuthenticated}>
        {isAuthenticated ? (
          <div>
            <strong>✅ Logged in as {user?.username}</strong> - Your plans are saved to your account and accessible across all devices.
          </div>
        ) : (
          <div>
            <strong>⚠️ Not logged in</strong> - Plans are saved locally only. Log in to save plans to your account and access them from any device.
          </div>
        )}
      </AuthStatusBanner>

      <TwoColumnLayout>
        {/* Left Column - Save & Export */}
        <Column>
          <Title>{isAuthenticated ? 'Save Plan to Account' : 'Save Plan Locally'}</Title>

          <Section>
            <FormGroup>
              <Label>Plan Name</Label>
              <Input
                type="text"
                placeholder="Enter a name for your plan"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </FormGroup>

            <ButtonGroup>
              <SaveButton onClick={handleSave} disabled={saving || planLoading}>
                {saving ? '💾 Saving...' : `💾 Save ${isAuthenticated ? 'to Account' : 'Locally'}`}
              </SaveButton>
              <Button onClick={handleExport}>
                📤 Export to File
              </Button>
              <Button onClick={handleCopyPlanLink}>
                📋 Copy Plan
              </Button>
            </ButtonGroup>

            {exportData && (
              <div>
                <ActionRow>
                  <Button onClick={downloadExportFile}>
                    📥 Download File
                  </Button>
                </ActionRow>
                <TextArea
                  value={exportData}
                  readOnly
                  onClick={(e) => e.target.select()}
                />
              </div>
            )}
          </Section>

          <Section>
            <Label>{isAuthenticated ? 'Your Saved Plans' : 'Locally Saved Plans'}</Label>
            {planLoading ? (
              <p>Loading plans...</p>
            ) : savedPlans.length === 0 ? (
              <p>{isAuthenticated ? 'No plans saved to your account yet.' : 'No locally saved plans yet.'}</p>
            ) : (
              <SavedPlansList>
                {savedPlans.map(plan => {
                  const planName = plan.title || plan.name || 'Untitled Plan';
                  const planDate = plan.createdAt || plan.date;
                  return (
                    <SavedPlanItem key={plan.id}>
                      <PlanName>{planName}</PlanName>
                      <PlanDate>{new Date(planDate).toLocaleDateString()}</PlanDate>
                      <PlanActions>
                        <ActionButton onClick={() => handleLoadPlan(plan)} title="Load Plan">
                          📂
                        </ActionButton>
                        <ActionButton onClick={() => handleCopyPlanLinkFromSaved(plan)} title="Copy Link">
                          📋
                        </ActionButton>
                        <ActionButton onClick={() => handleDeletePlan(plan.id)} title="Delete Plan">
                          🗑️
                        </ActionButton>
                      </PlanActions>
                    </SavedPlanItem>
                  );
                })}
              </SavedPlansList>
            )}
          </Section>
        </Column>

        {/* Right Column - Import */}
        <Column>
          <Title>Import Plan</Title>

          <Section>
            <FormGroup>
              <Label>Import from File or JSON</Label>
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
                  onClick={handleImport}
                  disabled={!importData.trim()}
                >
                  📥 Import Data
                </ImportButton>
              </ButtonGroup>

              <TextArea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste JSON data here or use the file chooser above"
              />
            </FormGroup>
          </Section>
        </Column>
      </TwoColumnLayout>
    </Container>
  );
}

export default ImportExport;
