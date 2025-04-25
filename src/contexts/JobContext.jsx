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
      // Create the new state
      const newState = {
        ...prev,
        [roleKey]: prev[roleKey].map(job =>
          job.id === jobId ? { ...job, selected: !job.selected } : job
        )
      };

      // If we're deselecting a job, check if any mitigations need to be removed
      const job = prev[roleKey].find(j => j.id === jobId);
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
      // Create the new state
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
    setSelectedJobs(prev => {
      // Check if any jobs are being deselected
      let jobsDeselected = false;

      // Check each role and job to see if any are being deselected
      Object.entries(prev).forEach(([roleKey, jobs]) => {
        jobs.forEach(job => {
          if (job.selected) {
            // Check if this job is still selected in the imported jobs
            const importedRole = importedJobs[roleKey];
            const importedJob = importedRole?.find(j => j.id === job.id);
            if (!importedJob || !importedJob.selected) {
              jobsDeselected = true;
            }
          }
        });
      });

      // If jobs are being deselected, check if any mitigations need to be removed
      if (jobsDeselected) {
        checkAndRemoveUnavailableMitigations(importedJobs);
      }

      return importedJobs;
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
