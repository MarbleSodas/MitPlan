import React, { createContext, useState, useContext, useEffect } from 'react';
import { ffxivJobs } from '../data';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils';

// Create the context
const JobContext = createContext();

// Create a provider component
export const JobProvider = ({ children }) => {
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

  // Toggle job selection
  const toggleJobSelection = (roleKey, jobId) => {
    setSelectedJobs(prev => ({
      ...prev,
      [roleKey]: prev[roleKey].map(job => 
        job.id === jobId ? { ...job, selected: !job.selected } : job
      )
    }));
  };

  // Set all jobs in a role
  const setAllJobsInRole = (roleKey, selected) => {
    setSelectedJobs(prev => ({
      ...prev,
      [roleKey]: prev[roleKey].map(job => ({ ...job, selected }))
    }));
  };

  // Import jobs from external data
  const importJobs = (importedJobs) => {
    setSelectedJobs(importedJobs);
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
      {children}
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
