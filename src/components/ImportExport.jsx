import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { mitigationAbilities, ffxivJobs } from '../data/sampleData';

const Container = styled.div`
  background-color: ${props => props.theme.colors.secondary};
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  box-shadow: ${props => props.theme.shadows.medium};
  transition: background-color 0.3s ease;
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
  height: 100%;

  /* Add a subtle border between columns on large screens */
  @media (min-width: 992px) {
    &:first-child {
      padding-right: 20px;
      border-right: 1px solid ${props => props.theme.colors.border};
    }

    &:last-child {
      padding-left: 20px;
    }
  }
`;

const Title = styled.h3`
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding-bottom: 10px;
  color: ${props => props.theme.colors.text};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  background-color: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 5px;

  &:hover {
    background-color: ${props => props.theme.colors.primary_dark || '#40a9ff'};
  }

  &:disabled {
    background-color: ${props => props.theme.mode === 'dark' ? '#555555' : '#cccccc'};
    color: ${props => props.theme.mode === 'dark' ? '#aaaaaa' : '#666666'};
    cursor: not-allowed;
  }
`;

const ImportButton = styled(Button)`
  background-color: ${props => props.theme.mode === 'dark' ? '#52c41a' : '#52c41a'};

  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? '#73d13d' : '#73d13d'};
  }
`;

const SaveButton = styled(Button)`
  background-color: ${props => props.theme.mode === 'dark' ? '#52c41a' : '#52c41a'};

  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? '#73d13d' : '#73d13d'};
  }
`;

const DeleteButton = styled(Button)`
  background-color: ${props => props.theme.mode === 'dark' ? '#ff4d4f' : '#ff4d4f'};
  padding: 4px 8px;
  font-size: 12px;

  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? '#ff7875' : '#ff7875'};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  height: 150px;
  padding: 10px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
  resize: vertical;
  margin-bottom: 10px;
  background-color: ${props => props.theme.colors.cardBackground};
  color: ${props => props.theme.colors.text};
  transition: border-color 0.3s ease, background-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
  flex: 1;
  min-height: 150px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.3)' : 'rgba(24, 144, 255, 0.2)'};
  }
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.colors.critical};
  margin-bottom: 10px;
  padding: 10px;
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 77, 79, 0.2)' : '#fff2f0'};
  border: 1px solid ${props => props.theme.mode === 'dark' ? 'rgba(255, 77, 79, 0.5)' : '#ffccc7'};
  border-radius: 4px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
`;

const SuccessMessage = styled.div`
  color: ${props => props.theme.mode === 'dark' ? '#73d13d' : '#52c41a'};
  margin-bottom: 10px;
  padding: 10px;
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(82, 196, 26, 0.2)' : '#f6ffed'};
  border: 1px solid ${props => props.theme.mode === 'dark' ? 'rgba(82, 196, 26, 0.5)' : '#b7eb8f'};
  border-radius: 4px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
`;

const FileInput = styled.input`
  display: none;
`;

const FileInputLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background-color: ${props => props.theme.mode === 'dark' ? '#52c41a' : '#52c41a'};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? '#73d13d' : '#73d13d'};
  }
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  font-size: 14px;
  background-color: ${props => props.theme.colors.cardBackground};
  color: ${props => props.theme.colors.text};
  transition: border-color 0.3s ease, background-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
  margin-bottom: 15px;
  width: 100%;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.3)' : 'rgba(24, 144, 255, 0.2)'};
  }
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  font-size: 14px;
  background-color: ${props => props.theme.colors.cardBackground};
  color: ${props => props.theme.colors.text};
  transition: border-color 0.3s ease, background-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
  margin-bottom: 15px;
  width: 100%;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.3)' : 'rgba(24, 144, 255, 0.2)'};
  }
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: ${props => props.theme.colors.text};
`;

const ActionRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 10px;
`;

const Option = styled.option`
  background-color: ${props => props.theme.colors.cardBackground};
  color: ${props => props.theme.colors.text};
`;

const Section = styled.div`
  margin-bottom: 20px;
`;

function ImportExport({ assignments, bossId, selectedJobs, onImport }) {
  const [exportData, setExportData] = useState('');
  const [importData, setImportData] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const [planName, setPlanName] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');

  // Generate export data
  const handleExport = () => {
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

      const data = {
        version: '1.2', // Updated version to reflect optimized data structure
        bossId,
        assignments: optimizedAssignments,
        selectedJobs: optimizedSelectedJobs
      };

      const jsonData = JSON.stringify(data, null, 2);
      setExportData(jsonData);
      setError(null);
      setSuccess('Data exported successfully. Copy the text below or download the file.');
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data: ' + err.message);
      setSuccess(null);
    }
  };

  // Handle import from text
  const handleImport = () => {
    try {
      if (!importData.trim()) {
        setError('Please enter import data');
        return;
      }

      const data = JSON.parse(importData);

      // Validate data structure
      if (!data.version || !data.bossId || !data.assignments) {
        throw new Error('Invalid import data format');
      }

      // Process the imported data based on version
      if (data.version === '1.2') {
        // Handle optimized format (version 1.2)
        if (onImport) {
          // We need to reconstruct the full objects from the IDs
          const reconstructedAssignments = {};

          // Reconstruct assignments
          Object.entries(data.assignments).forEach(([bossActionId, mitigationIds]) => {
            reconstructedAssignments[bossActionId] = mitigationIds.map(id => {
              // Find the full mitigation object by ID
              const mitigation = mitigationAbilities.find(m => m.id === id);
              return mitigation || { id, name: 'Unknown Ability', description: 'Ability not found', duration: 0, cooldown: 0, jobs: [], icon: '', type: 'unknown' };
            });
          });

          // Reconstruct selectedJobs if available
          let reconstructedSelectedJobs = null;
          if (data.selectedJobs) {
            reconstructedSelectedJobs = JSON.parse(JSON.stringify(ffxivJobs)); // Deep clone the jobs structure

            // Reset all jobs to unselected
            Object.values(reconstructedSelectedJobs).forEach(jobs => {
              jobs.forEach(job => job.selected = false);
            });

            // Mark the selected jobs
            Object.entries(data.selectedJobs).forEach(([roleKey, jobIds]) => {
              if (reconstructedSelectedJobs[roleKey]) {
                jobIds.forEach(jobId => {
                  const job = reconstructedSelectedJobs[roleKey].find(j => j.id === jobId);
                  if (job) {
                    job.selected = true;
                  }
                });
              }
            });
          }

          onImport(reconstructedAssignments, data.bossId, reconstructedSelectedJobs);
        }
      } else {
        // Handle legacy formats (version 1.0 or 1.1)
        if (onImport) {
          onImport(data.assignments, data.bossId, data.selectedJobs);
        }
      }

      setError(null);
      setSuccess('Data imported successfully!');
      setImportData('');
    } catch (err) {
      console.error('Import error:', err);
      setError('Failed to import data: ' + err.message);
      setSuccess(null);
    }
  };

  // Handle file import
  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target.result;
        setImportData(content);
      } catch (err) {
        console.error('File read error:', err);
        setError('Failed to read file: ' + err.message);
      }
    };

    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      setError('Failed to read file');
    };

    reader.readAsText(file);
  };

  // Download export data as file
  const downloadExportFile = () => {
    if (!exportData) {
      setError('No export data available');
      return;
    }

    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mitigation-plan-${bossId}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Load saved plans from localStorage on component mount
  useEffect(() => {
    loadSavedPlansList();
  }, []);

  // Function to load the list of saved plans
  const loadSavedPlansList = () => {
    try {
      // Get the list of saved plans from localStorage
      const plansList = JSON.parse(localStorage.getItem('mitPlansList') || '[]');
      setSavedPlans(plansList);
    } catch (err) {
      console.error('Error loading saved plans list:', err);
      setError('Failed to load saved plans list');
    }
  };

  // Function to save the current plan
  const handleSave = () => {
    try {
      if (!planName.trim()) {
        setError('Please enter a name for your plan');
        return;
      }

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
        bossId,
        assignments: optimizedAssignments,
        selectedJobs: optimizedSelectedJobs
      };

      // Create the plan metadata
      const planMeta = {
        id: Date.now().toString(),
        name: planName.trim(),
        date: new Date().toISOString(),
        bossId,
      };

      // Save the plan data to localStorage
      localStorage.setItem(`mitPlan_${planMeta.id}`, JSON.stringify(planData));

      // Update the plans list
      const updatedPlansList = [...savedPlans, planMeta];
      localStorage.setItem('mitPlansList', JSON.stringify(updatedPlansList));
      setSavedPlans(updatedPlansList);

      // Clear the input and show success message
      setPlanName('');
      setError(null);
      setSuccess(`Plan "${planMeta.name}" saved successfully!`);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error saving plan:', err);
      setError('Failed to save plan: ' + err.message);
    }
  };

  // Function to load a saved plan
  const handleLoad = () => {
    const planId = selectedPlanId;
    if (!planId) {
      setError('Please select a plan to load');
      return;
    }
    try {
      // Get the plan data from localStorage
      const planDataString = localStorage.getItem(`mitPlan_${planId}`);
      if (!planDataString) {
        setError('Plan not found');
        return;
      }

      const planData = JSON.parse(planDataString);

      // Process the imported data based on version
      if (planData.version === '1.2') {
        // Handle optimized format (version 1.2)
        if (onImport) {
          // We need to reconstruct the full objects from the IDs
          const reconstructedAssignments = {};

          // Reconstruct assignments
          Object.entries(planData.assignments).forEach(([bossActionId, mitigationIds]) => {
            reconstructedAssignments[bossActionId] = mitigationIds.map(id => {
              // Find the full mitigation object by ID
              const mitigation = mitigationAbilities.find(m => m.id === id);
              return mitigation || { id, name: 'Unknown Ability', description: 'Ability not found', duration: 0, cooldown: 0, jobs: [], icon: '', type: 'unknown' };
            });
          });

          // Reconstruct selectedJobs if available
          let reconstructedSelectedJobs = null;
          if (planData.selectedJobs) {
            reconstructedSelectedJobs = JSON.parse(JSON.stringify(ffxivJobs)); // Deep clone the jobs structure

            // Reset all jobs to unselected
            Object.values(reconstructedSelectedJobs).forEach(jobs => {
              jobs.forEach(job => job.selected = false);
            });

            // Mark the selected jobs
            Object.entries(planData.selectedJobs).forEach(([roleKey, jobIds]) => {
              if (reconstructedSelectedJobs[roleKey]) {
                jobIds.forEach(jobId => {
                  const job = reconstructedSelectedJobs[roleKey].find(j => j.id === jobId);
                  if (job) {
                    job.selected = true;
                  }
                });
              }
            });
          }

          onImport(reconstructedAssignments, planData.bossId, reconstructedSelectedJobs);
        }
      }

      setError(null);
      setSuccess('Plan loaded successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error loading plan:', err);
      setError('Failed to load plan: ' + err.message);
    }
  };

  // Function to delete a saved plan
  const handleDelete = () => {
    const planId = selectedPlanId;
    if (!planId) {
      setError('Please select a plan to delete');
      return;
    }

    // Find the plan name for the success message
    const plan = savedPlans.find(p => p.id === planId);
    if (!plan) {
      setError('Plan not found');
      return;
    }

    try {
      // Remove the plan data from localStorage
      localStorage.removeItem(`mitPlan_${planId}`);

      // Update the plans list
      const updatedPlansList = savedPlans.filter(plan => plan.id !== planId);
      localStorage.setItem('mitPlansList', JSON.stringify(updatedPlansList));
      setSavedPlans(updatedPlansList);

      setError(null);
      setSuccess(`Plan "${plan.name}" deleted successfully!`);
      setSelectedPlanId('');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error deleting plan:', err);
      setError('Failed to delete plan: ' + err.message);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Container>
      <Title>Mitigation Plan Management</Title>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      <TwoColumnLayout>
        {/* Left Column - Save & Export */}
        <Column>
          <Title>Save Plan</Title>

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
              <SaveButton onClick={handleSave}>
                💾 Save Current Plan
              </SaveButton>
              <Button onClick={handleExport}>
                📤 Export to File
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
        </Column>

        {/* Right Column - Load & Import */}
        <Column>
          <Title>Load Plan</Title>

          <Section>
            <FormGroup>
              <Label>Select Saved Plan</Label>
              {savedPlans.length === 0 ? (
                <p>No saved plans found.</p>
              ) : (
                <div>
                  <Select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                  >
                    <Option value="">-- Select a plan --</Option>
                    {savedPlans.map(plan => (
                      <Option key={plan.id} value={plan.id}>
                        {plan.name} ({formatDate(plan.date).split(',')[0]}) - {plan.bossId}
                      </Option>
                    ))}
                  </Select>

                  <ActionRow>
                    <Button
                      onClick={handleLoad}
                      disabled={!selectedPlanId}
                    >
                      📂 Load Plan
                    </Button>
                    <DeleteButton
                      onClick={handleDelete}
                      disabled={!selectedPlanId}
                    >
                      🗑️ Delete
                    </DeleteButton>
                  </ActionRow>
                </div>
              )}
            </FormGroup>
          </Section>

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
