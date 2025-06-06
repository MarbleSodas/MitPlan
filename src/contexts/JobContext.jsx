import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { ffxivJobs, mitigationAbilities } from '../data';
import { loadFromLocalStorage, saveToLocalStorage, isMitigationAvailable } from '../utils';
import MitigationContext from './MitigationContext';

// Create the context
const JobContext = createContext();

// Create a provider component
export const JobProvider = ({ children }) => {
  // Reference to the mitigation context
  const mitigationContextRef = useRef(null);

  // Initialize jobs from localStorage or default
  const [selectedJobs, setSelectedJobs] = useState(() => {
    // Try to load from localStorage
    const savedJobs = loadFromLocalStorage('selectedJobs', null);
    if (savedJobs) {
      return savedJobs;
    }

    // Try to load from autosave
    const autosavedPlan = loadFromLocalStorage('mitPlanAutosave', null);
    if (autosavedPlan && autosavedPlan.selectedJobs) {
      try {
        // We need to reconstruct the full job objects
        const reconstructedJobs = JSON.parse(JSON.stringify(ffxivJobs)); // Deep clone

        // Reset all jobs to unselected
        Object.keys(reconstructedJobs).forEach(roleKey => {
          reconstructedJobs[roleKey].forEach(job => {
            job.selected = false;
          });
        });

        // Set selected jobs based on autosave data
        Object.entries(autosavedPlan.selectedJobs).forEach(([roleKey, jobIds]) => {
          if (reconstructedJobs[roleKey]) {
            jobIds.forEach(jobId => {
              const job = reconstructedJobs[roleKey].find(j => j.id === jobId);
              if (job) {
                job.selected = true;
              }
            });
          }
        });

        return reconstructedJobs;
      } catch (err) {
        console.error('Error loading autosaved jobs:', err);
      }
    }

    return ffxivJobs;
  });

  // Save selected jobs to localStorage whenever they change
  useEffect(() => {
    saveToLocalStorage('selectedJobs', selectedJobs);

    // Also update the autosave
    const autosavedPlan = loadFromLocalStorage('mitPlanAutosave', {});

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

    saveToLocalStorage('mitPlanAutosave', {
      ...autosavedPlan,
      selectedJobs: optimizedSelectedJobs
    });
  }, [selectedJobs]);

  // Function to check and remove unavailable mitigations
  const checkAndRemoveUnavailableMitigations = (newSelectedJobs) => {
    // If we don't have access to the mitigation context yet, return
    if (!mitigationContextRef.current) return;

    const { assignments, removeMitigation } = mitigationContextRef.current;

    // Check each assigned mitigation to see if it's still available
    Object.entries(assignments).forEach(([bossActionId, mitigations]) => {
      mitigations.forEach(mitigation => {
        // Check if this mitigation is still available with the new job selection
        if (!isMitigationAvailable(mitigation, newSelectedJobs)) {
          // If not available, remove it from the boss action
          removeMitigation(bossActionId, mitigation.id);
        }
      });
    });
  };

  // Toggle job selection
  const toggleJobSelection = (roleKey, jobId) => {
    setSelectedJobs(prev => {
      // Get the job we're toggling
      const job = prev[roleKey].find(j => j.id === jobId);

      // If we're selecting a tank, check if we already have 2 tanks selected
      if (roleKey === 'tank' && !job.selected) {
        const selectedTankCount = prev.tank.filter(j => j.selected).length;

        // If we already have 2 tanks selected, don't allow selecting another one
        if (selectedTankCount >= 2) {
          console.log('%c[JOB CONTEXT] Cannot select more than 2 tanks', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
          return prev; // Return the previous state unchanged
        }
      }

      // Create the new state
      const newState = {
        ...prev,
        [roleKey]: prev[roleKey].map(j =>
          j.id === jobId ? { ...j, selected: !j.selected } : j
        )
      };

      // If we're deselecting a job, check if any mitigations need to be removed
      if (job && job.selected) {
        // We're deselecting this job
        checkAndRemoveUnavailableMitigations(newState);
      }

      return newState;
    });
  };

  // Set all jobs in a role
  const setAllJobsInRole = (roleKey, selected) => {
    setSelectedJobs(prev => {
      // If we're selecting all tanks, limit to the first 2
      if (roleKey === 'tank' && selected) {
        // Create a new state with only the first 2 tanks selected
        const newState = {
          ...prev,
          [roleKey]: prev[roleKey].map((job, index) => ({ ...job, selected: index < 2 && selected }))
        };

        return newState;
      }

      // For other roles or when deselecting, proceed normally
      const newState = {
        ...prev,
        [roleKey]: prev[roleKey].map(job => ({ ...job, selected }))
      };

      // If we're deselecting jobs, check if any mitigations need to be removed
      if (!selected) {
        checkAndRemoveUnavailableMitigations(newState);
      }

      return newState;
    });
  };

  // Import jobs from external data
  const importJobs = (importedJobs) => {
    console.log('%c[JOB CONTEXT] Importing jobs', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', importedJobs);

    // Check if there are any selected jobs in the imported jobs
    const hasSelectedJobs = Object.values(importedJobs).some(
      roleJobs => roleJobs.some(job => job.selected)
    );

    console.log('%c[JOB CONTEXT] Imported jobs have selections:', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', hasSelectedJobs);

    // Enforce the 2-tank limit
    const modifiedImportedJobs = { ...importedJobs };

    // Check if there are more than 2 tanks selected
    const selectedTanks = importedJobs.tank.filter(job => job.selected);
    if (selectedTanks.length > 2) {
      console.log('%c[JOB CONTEXT] Limiting imported tanks to 2', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');

      // Keep only the first 2 selected tanks
      const selectedTankIds = selectedTanks.slice(0, 2).map(job => job.id);

      // Update the tank selection
      modifiedImportedJobs.tank = importedJobs.tank.map(job => ({
        ...job,
        selected: selectedTankIds.includes(job.id)
      }));
    }

    setSelectedJobs(prev => {
      console.log('%c[JOB CONTEXT] Previous jobs state:', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', prev);

      // Check if any jobs are being deselected
      let jobsDeselected = false;

      // Check each role and job to see if any are being deselected
      Object.entries(prev).forEach(([roleKey, jobs]) => {
        jobs.forEach(job => {
          if (job.selected) {
            // Check if this job is still selected in the imported jobs
            const importedRole = modifiedImportedJobs[roleKey];
            const importedJob = importedRole?.find(j => j.id === job.id);
            if (!importedJob || !importedJob.selected) {
              jobsDeselected = true;
            }
          }
        });
      });

      // If jobs are being deselected, check if any mitigations need to be removed
      if (jobsDeselected) {
        console.log('%c[JOB CONTEXT] Jobs are being deselected, checking mitigations', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
        checkAndRemoveUnavailableMitigations(modifiedImportedJobs);
      }

      // Force update localStorage to ensure it has the latest data
      console.log('%c[JOB CONTEXT] Updating localStorage with imported jobs', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
      saveToLocalStorage('selectedJobs', modifiedImportedJobs);

      // Also update the autosave
      const autosavedPlan = loadFromLocalStorage('mitPlanAutosave', {});

      // Create optimized selectedJobs object with only the selected job IDs
      const optimizedSelectedJobs = {};

      Object.entries(modifiedImportedJobs).forEach(([roleKey, jobs]) => {
        // Filter to include only selected jobs and store only their IDs
        const selectedJobIds = jobs
          .filter(job => job.selected)
          .map(job => job.id);

        // Only include the role if it has selected jobs
        if (selectedJobIds.length > 0) {
          optimizedSelectedJobs[roleKey] = selectedJobIds;
        }
      });

      console.log('%c[JOB CONTEXT] Updating autosave with optimized job IDs', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', optimizedSelectedJobs);

      saveToLocalStorage('mitPlanAutosave', {
        ...autosavedPlan,
        selectedJobs: optimizedSelectedJobs
      });

      return modifiedImportedJobs;
    });
  };

  // Create the context value
  const contextValue = {
    selectedJobs,
    setSelectedJobs,
    toggleJobSelection,
    setAllJobsInRole,
    importJobs
  };

  return (
    <JobContext.Provider value={contextValue}>
      <MitigationContext.Consumer>
        {mitigationContext => {
          // Store the mitigation context in the ref so we can access it later
          mitigationContextRef.current = mitigationContext;
          return children;
        }}
      </MitigationContext.Consumer>
    </JobContext.Provider>
  );
};

// Create a custom hook for using the job context
export const useJobContext = () => {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error('useJobContext must be used within a JobProvider');
  }
  return context;
};

export default JobContext;
