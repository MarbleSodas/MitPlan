import React, { useState, useEffect } from 'react';
import { mitigationAbilities, ffxivJobs } from '../../../data';
import { getRoleSharedAbilityCount } from '../../../utils/abilities/abilityUtils';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  generateShareableUrl
} from '../../../utils';
import { useToast } from '../../../components/common/Toast';























function ImportExport({ assignments, bossId, selectedJobs, onImport }) {
  const { addToast } = useToast();
  const [planName, setPlanName] = useState('');
  const [exportData, setExportData] = useState('');
  const [importData, setImportData] = useState('');
  const [savedPlans, setSavedPlans] = useState([]);

  // Load saved plans on component mount
  useEffect(() => {
    loadSavedPlans();
  }, []);

  // Load saved plans from localStorage
  const loadSavedPlans = () => {
    const plans = loadFromLocalStorage('mitPlanSavedPlans', []);
    setSavedPlans(plans);
  };

  // Handle saving the current plan
  const handleSave = () => {
    if (!planName.trim()) {
      addToast({
        type: 'warning',
        title: 'Plan name required',
        message: 'Please enter a plan name.',
        duration: 3000
      });
      return;
    }

    // Create optimized assignments object with only the necessary data
    const optimizedAssignments = {};

    Object.entries(assignments).forEach(([bossActionId, mitigations]) => {
      optimizedAssignments[bossActionId] = mitigations.map(mitigation => {
        const ability = mitigationAbilities.find(m => m.id === mitigation.id) || mitigation;
        const isMultiInstance = ability?.isRoleShared && getRoleSharedAbilityCount(ability, selectedJobs) > 1;
        if (isMultiInstance && mitigation.casterJobId) {
          return { id: mitigation.id, casterJobId: mitigation.casterJobId };
        }
        return mitigation.id;
      });
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
      id: Date.now().toString(),
      name: planName,
      date: new Date().toISOString(),
      version: '1.3',
      bossId,
      assignments: optimizedAssignments,
      selectedJobs: optimizedSelectedJobs
    };

    // Add to saved plans
    const updatedPlans = [...savedPlans, planData];
    saveToLocalStorage('mitPlanSavedPlans', updatedPlans);
    setSavedPlans(updatedPlans);
    setPlanName('');
    addToast({
      type: 'success',
      title: 'Plan saved!',
      message: `Plan "${planName}" saved successfully!`,
      duration: 3000
    });
  };

  // Handle exporting the current plan
  const handleExport = () => {
    // Create optimized assignments object with only the necessary data
    const optimizedAssignments = {};

    Object.entries(assignments).forEach(([bossActionId, mitigations]) => {
      optimizedAssignments[bossActionId] = mitigations.map(mitigation => {
        const ability = mitigationAbilities.find(m => m.id === mitigation.id) || mitigation;
        const isMultiInstance = ability?.isRoleShared && getRoleSharedAbilityCount(ability, selectedJobs) > 1;
        if (isMultiInstance && mitigation.casterJobId) {
          return { id: mitigation.id, casterJobId: mitigation.casterJobId };
        }
        return mitigation.id;
      });
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
      version: '1.3',
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
      optimizedAssignments[bossActionId] = mitigations.map(mitigation => {
        const ability = mitigationAbilities.find(m => m.id === mitigation.id) || mitigation;
        const isMultiInstance = ability?.isRoleShared && getRoleSharedAbilityCount(ability, selectedJobs) > 1;
        if (isMultiInstance && mitigation.casterJobId) {
          return { id: mitigation.id, casterJobId: mitigation.casterJobId };
        }
        return mitigation.id;
      });
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
      version: '1.3',
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
        addToast({
          type: 'success',
          title: 'Plan link copied!',
          message: 'The plan link has been copied to your clipboard.',
          duration: 3000
        });
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
        addToast({
          type: 'error',
          title: 'Failed to copy link',
          message: 'Please try again.',
          duration: 4000
        });
      });
  };



  // Handle importing data
  const handleImport = () => {
    if (!importData.trim()) {
      addToast({
        type: 'warning',
        title: 'Import data required',
        message: 'Please enter import data or select a file.',
        duration: 3000
      });
      return;
    }

    try {
      const importObj = JSON.parse(importData);

      // Import migration utilities
      import('../../../utils/version/versionUtils.js').then(({ migratePlanData, validatePlanData }) => {
        try {
          console.log('%c[IMPORT] Starting plan import process',
            'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', importObj);

          // Migrate the plan data to the current version
          const migratedData = migratePlanData(importObj);

          // Validate the migrated data
          if (!validatePlanData(migratedData)) {
            throw new Error('Invalid plan data after migration');
          }

          console.log('%c[IMPORT] Plan data migrated and validated successfully',
            'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', migratedData);

          // Reconstruct the full mitigation objects from IDs
          const reconstructedAssignments = {};

          Object.entries(migratedData.assignments).forEach(([bossActionId, mitigationItems]) => {
            reconstructedAssignments[bossActionId] = mitigationItems.map(item => {
              const id = typeof item === 'string' ? item : (item && item.id);
              const casterJobId = (item && typeof item === 'object') ? item.casterJobId : undefined;
              const ability = mitigationAbilities.find(m => m.id === id);
              if (!ability) {
                console.warn(`Mitigation with ID ${id} not found`);
                return null;
              }
              const mit = { ...ability };
              if (casterJobId) mit.casterJobId = casterJobId;
              return mit;
            }).filter(Boolean);
          });

          // Reconstruct the full job objects if selectedJobs is included
          let reconstructedJobs = null;
          if (migratedData.selectedJobs) {
            reconstructedJobs = JSON.parse(JSON.stringify(ffxivJobs)); // Deep clone

            // Reset all jobs to unselected
            Object.keys(reconstructedJobs).forEach(roleKey => {
              reconstructedJobs[roleKey].forEach(job => {
                job.selected = false;
              });
            });

            // Set selected jobs based on import data
            Object.entries(migratedData.selectedJobs).forEach(([roleKey, jobIds]) => {
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
          onImport(reconstructedAssignments, migratedData.bossId, reconstructedJobs);
          setImportData('');
          addToast({
            type: 'success',
            title: 'Import successful!',
            message: 'Your plan has been imported successfully.',
            duration: 3000
          });
        } catch (error) {
          console.error('Import error:', error);
          addToast({
            type: 'error',
            title: 'Import failed',
            message: error.message,
            duration: 4000
          });
        }
      }).catch(error => {
        console.error('Failed to load migration utilities:', error);
        addToast({
          type: 'error',
          title: 'Import failed',
          message: 'Unable to load migration utilities.',
          duration: 4000
        });
      });
    } catch (error) {
      console.error('JSON parsing error:', error);
      addToast({
        type: 'error',
        title: 'Import failed',
        message: `Invalid JSON format - ${error.message}`,
        duration: 4000
      });
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
      // Import migration utilities and migrate the plan data
      import('../../../utils/version/versionUtils.js').then(({ migratePlanData, validatePlanData }) => {
        try {
          console.log('%c[LOAD] Loading saved plan',
            'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', plan);

          // Migrate the plan data to the current version
          const migratedPlan = migratePlanData(plan);

          // Validate the migrated data
          if (!validatePlanData(migratedPlan)) {
            throw new Error('Invalid plan data after migration');
          }

          // Reconstruct the full mitigation objects from IDs
          const reconstructedAssignments = {};

          Object.entries(migratedPlan.assignments).forEach(([bossActionId, mitigationItems]) => {
            reconstructedAssignments[bossActionId] = mitigationItems.map(item => {
              const id = typeof item === 'string' ? item : (item && item.id);
              const casterJobId = (item && typeof item === 'object') ? item.casterJobId : undefined;
              const ability = mitigationAbilities.find(m => m.id === id);
              if (!ability) {
                console.warn(`Mitigation with ID ${id} not found`);
                return null;
              }
              const mit = { ...ability };
              if (casterJobId) mit.casterJobId = casterJobId;
              return mit;
            }).filter(Boolean);
          });

          // Reconstruct the full job objects if selectedJobs is included
          let reconstructedJobs = null;
          if (migratedPlan.selectedJobs) {
            reconstructedJobs = JSON.parse(JSON.stringify(ffxivJobs)); // Deep clone

            // Reset all jobs to unselected
            Object.keys(reconstructedJobs).forEach(roleKey => {
              reconstructedJobs[roleKey].forEach(job => {
                job.selected = false;
              });
            });

            // Set selected jobs based on import data
            Object.entries(migratedPlan.selectedJobs).forEach(([roleKey, jobIds]) => {
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
          onImport(reconstructedAssignments, migratedPlan.bossId, reconstructedJobs);
          addToast({
            type: 'success',
            title: 'Plan loaded!',
            message: `Plan "${migratedPlan.name || plan.name}" loaded successfully!`,
            duration: 3000
          });
        } catch (error) {
          console.error('Load error:', error);
          addToast({
            type: 'error',
            title: 'Load failed',
            message: error.message,
            duration: 4000
          });
        }
      }).catch(error => {
        console.error('Failed to load migration utilities:', error);
        addToast({
          type: 'error',
          title: 'Load failed',
          message: 'Unable to load migration utilities.',
          duration: 4000
        });
      });
    } catch (error) {
      console.error('Load error:', error);
      addToast({
        type: 'error',
        title: 'Load failed',
        message: error.message,
        duration: 4000
      });
    }
  };

  // Handle deleting a saved plan
  const handleDeletePlan = (planId) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      const updatedPlans = savedPlans.filter(plan => plan.id !== planId);
      saveToLocalStorage('mitPlanSavedPlans', updatedPlans);
      setSavedPlans(updatedPlans);
    }
  };

  // Generate a shareable link for a saved plan and copy it to clipboard
  const handleCopyPlanLinkFromSaved = (plan) => {
    // Create the plan data for sharing
    const planData = {
      version: '1.3',
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
        addToast({
          type: 'success',
          title: 'Plan link copied!',
          message: `Link for plan "${plan.name}" has been copied to your clipboard.`,
          duration: 3000
        });
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
        addToast({
          type: 'error',
          title: 'Failed to copy link',
          message: 'Please try again.',
          duration: 4000
        });
      });
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 md:p-6 shadow-md" data-export-section>
      <div className="grid gap-5 md:grid-cols-2">
        {/* Left Column - Save & Export */}
        <div className="flex flex-col">
          <h3 className="mt-0 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">Save Plan</h3>

          <div className="mb-5">
            <div className="mb-4">
              <label className="block mb-1 text-sm font-semibold text-gray-800 dark:text-gray-200">Plan Name</label>
              <input className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-blue-500"
                type="text"
                placeholder="Enter a name for your plan"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <button className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700" onClick={handleSave}>
                💾 Save Current Plan
              </button>
              <button className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-neutral-800" onClick={handleExport}>
                📤 Export to File
              </button>
              <button className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-neutral-800" onClick={handleCopyPlanLink}>
                📋 Copy Plan
              </button>
            </div>

            {exportData && (
              <div>
                <div className="mb-2">
                  <button className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-neutral-800" onClick={downloadExportFile}>
                    📥 Download File
                  </button>
                </div>
                <textarea
                  className="w-full min-h-[150px] px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:border-blue-500"
                  value={exportData}
                  readOnly
                  onClick={(e) => e.target.select()}
                />
              </div>
            )}
          </div>

          <div className="mb-5">
            <label className="block mb-1 text-sm font-semibold text-gray-800 dark:text-gray-200">Saved Plans</label>
            {savedPlans.length === 0 ? (
              <p>No saved plans yet.</p>
            ) : (
              <div className="mt-2 max-h-[200px] overflow-y-auto border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-neutral-900">
                {savedPlans.map(plan => (
                  <div key={plan.id} className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-800">
                    <div className="flex-1 text-gray-900 dark:text-gray-100">{plan.name}</div>
                    <div className="text-xs text-gray-500 mr-2">{new Date(plan.date).toLocaleDateString()}</div>
                    <div className="flex gap-1">
                      <button className="px-2 py-1 rounded hover:text-blue-600" onClick={() => handleLoadPlan(plan)} title="Load Plan">
                        📂
                      </button>
                      <button className="px-2 py-1 rounded hover:text-blue-600" onClick={() => handleCopyPlanLinkFromSaved(plan)} title="Copy Link">
                        📋
                      </button>
                      <button className="px-2 py-1 rounded hover:text-red-600" onClick={() => handleDeletePlan(plan.id)} title="Delete Plan">
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Import */}
        <div className="flex flex-col">
          <h3 className="mt-0 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">Import Plan</h3>

          <div className="mb-5">
            <div className="mb-4">
              <label className="block mb-1 text-sm font-semibold text-gray-800 dark:text-gray-200">Import from File or JSON</label>
              <div className="flex flex-wrap gap-2 mb-3">
                <label className="inline-flex items-center justify-center px-4 py-2 h-9 rounded border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800">
                  📂 Choose File
                  <input
                    className="hidden"
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                  />
                </label>

                <button
                  className="px-4 py-2 h-9 rounded bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                  onClick={handleImport}
                  disabled={!importData.trim()}
                >
                  📥 Import Data
                </button>
              </div>

              <textarea
                className="w-full min-h-[150px] px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:border-blue-500"
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste JSON data here or use the file chooser above"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportExport;
