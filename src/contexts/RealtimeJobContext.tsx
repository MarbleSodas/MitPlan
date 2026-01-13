import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useRealtimePlan } from './RealtimePlanContext';
import { ffxivJobs } from '../data';

// Create the context
const RealtimeJobContext = createContext();

// Create a provider component
export const RealtimeJobProvider = ({ children }) => {
  const {
    selectedJobs: realtimeSelectedJobs,
    updateJobsRealtime,
    isInitialized
  } = useRealtimePlan();

  const [localSelectedJobs, setLocalSelectedJobs] = useState(() => {
    // Initialize with default job structure
    return JSON.parse(JSON.stringify(ffxivJobs));
  });

  // Flag to prevent syncing when updating from Firebase
  const isUpdatingFromFirebase = useRef(false);
  const lastSyncedData = useRef(null);

  // Helper function to deep compare job data
  const jobsAreEqual = (jobs1, jobs2) => {
    if (!jobs1 || !jobs2) return false;
    return JSON.stringify(jobs1) === JSON.stringify(jobs2);
  };

  // Sync real-time job data to local state
  useEffect(() => {
    console.log('[RealtimeJobContext] Sync effect triggered:', { isInitialized, realtimeSelectedJobs });

    if (!isInitialized) {
      console.log('[RealtimeJobContext] Not ready to sync - waiting for initialization');
      return;
    }

    console.log('[RealtimeJobContext] Syncing real-time job data:', realtimeSelectedJobs);

    // Set flag to prevent Firebase sync during this update
    isUpdatingFromFirebase.current = true;

    // Check if we have meaningful realtime data
    if (realtimeSelectedJobs && typeof realtimeSelectedJobs === 'object' && Object.keys(realtimeSelectedJobs).length > 0) {
      // Check if this is the old optimized format (role -> array of job IDs)
      const isOptimizedFormat = Object.values(realtimeSelectedJobs).some(value => Array.isArray(value));

      if (isOptimizedFormat) {
        // Convert from optimized format to full format
        const reconstructedJobs = JSON.parse(JSON.stringify(ffxivJobs)); // Deep clone

        // Reset all jobs to unselected
        Object.keys(reconstructedJobs).forEach(roleKey => {
          reconstructedJobs[roleKey].forEach(job => {
            job.selected = false;
          });
        });

        // Set selected jobs based on real-time data
        Object.entries(realtimeSelectedJobs).forEach(([roleKey, jobData]) => {
          if (reconstructedJobs[roleKey] && Array.isArray(jobData)) {
            jobData.forEach(item => {
              // Handle both formats: job ID strings or job objects
              const jobId = typeof item === 'string' ? item : (item.id || item);
              const job = reconstructedJobs[roleKey].find(j => j.id === jobId);
              if (job) {
                job.selected = true;
              }
            });
          }
        });

        setLocalSelectedJobs(reconstructedJobs);
        lastSyncedData.current = reconstructedJobs;
      } else {
        // Use the full format directly
        setLocalSelectedJobs(realtimeSelectedJobs);
        lastSyncedData.current = realtimeSelectedJobs;
      }
    } else {
      // No realtime data or empty data, use default jobs (all unselected)
      console.log('[RealtimeJobContext] Empty or no job data, initializing with default structure');
      const defaultJobs = JSON.parse(JSON.stringify(ffxivJobs));
      setLocalSelectedJobs(defaultJobs);
      lastSyncedData.current = defaultJobs;
    }

    // Reset flag after state update with a shorter delay for better responsiveness
    setTimeout(() => {
      isUpdatingFromFirebase.current = false;
    }, 50);
  }, [realtimeSelectedJobs, isInitialized]);

  // Sync local changes to Firebase (separate effect to avoid setState during render)
  useEffect(() => {
    // Don't sync if we're updating from Firebase or not initialized
    if (isUpdatingFromFirebase.current || !isInitialized || !updateJobsRealtime) {
      return;
    }

    // Don't sync if the data hasn't actually changed
    if (jobsAreEqual(localSelectedJobs, lastSyncedData.current)) {
      console.log('[RealtimeJobContext] Skipping sync - data unchanged');
      return;
    }

    console.log('[RealtimeJobContext] Syncing local changes to Firebase:', localSelectedJobs);
    updateJobsRealtime(localSelectedJobs);
    lastSyncedData.current = localSelectedJobs;
  }, [localSelectedJobs, isInitialized, updateJobsRealtime]);



  // Toggle job selection with real-time sync
  const toggleJobSelection = useCallback((roleKey, jobId) => {
    console.log(`%c[REALTIME JOB CONTEXT] Toggling job ${jobId} in role ${roleKey}`, 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;');

    setLocalSelectedJobs(prev => {
      // Get the job we're toggling
      const job = prev[roleKey]?.find(j => j.id === jobId);
      if (!job) {
        console.warn(`Job ${jobId} not found in role ${roleKey}`);
        return prev;
      }

      // If we're selecting a tank, check if we already have 2 tanks selected
      if (roleKey === 'tank' && !job.selected) {
        const selectedTankCount = prev.tank.filter(j => j.selected).length;

        // If we already have 2 tanks selected, don't allow selecting another one
        if (selectedTankCount >= 2) {
          console.log('%c[REALTIME JOB CONTEXT] Cannot select more than 2 tanks', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
          return prev; // Return the previous state unchanged
        }
      }

      // Create the new state with immediate update
      const newState = {
        ...prev,
        [roleKey]: prev[roleKey].map(j =>
          j.id === jobId ? { ...j, selected: !j.selected } : j
        )
      };

      console.log(`%c[REALTIME JOB CONTEXT] Job ${jobId} toggled successfully`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');

      // Firebase sync will happen automatically via useEffect
      return newState;
    });
  }, []);

  // Set all jobs in a role with real-time sync
  const setAllJobsInRole = useCallback((roleKey, selected) => {
    setLocalSelectedJobs(prev => {
      let newState;

      // If we're selecting all tanks, limit to the first 2
      if (roleKey === 'tank' && selected) {
        // Create a new state with only the first 2 tanks selected
        newState = {
          ...prev,
          [roleKey]: prev[roleKey].map((job, index) => ({ ...job, selected: index < 2 && selected }))
        };
      } else {
        // For other roles or when deselecting, proceed normally
        newState = {
          ...prev,
          [roleKey]: prev[roleKey].map(job => ({ ...job, selected }))
        };
      }

      // Firebase sync will happen automatically via useEffect
      return newState;
    });
  }, []);

  // Import jobs with real-time sync
  const importJobs = useCallback((importedJobs) => {
    setLocalSelectedJobs(prev => {
      // Merge imported jobs with current state
      const modifiedImportedJobs = { ...prev };

      Object.entries(importedJobs).forEach(([roleKey, jobs]) => {
        if (modifiedImportedJobs[roleKey]) {
          modifiedImportedJobs[roleKey] = modifiedImportedJobs[roleKey].map(existingJob => {
            const importedJob = jobs.find(j => j.id === existingJob.id);
            return importedJob ? { ...existingJob, selected: importedJob.selected } : existingJob;
          });
        }
      });

      // Firebase sync will happen automatically via useEffect
      return modifiedImportedJobs;
    });
  }, []);

  // Create the context value
  const contextValue = {
    selectedJobs: localSelectedJobs,
    setSelectedJobs: setLocalSelectedJobs,
    toggleJobSelection,
    setAllJobsInRole,
    importJobs
  };

  return (
    <RealtimeJobContext.Provider value={contextValue}>
      {children}
    </RealtimeJobContext.Provider>
  );
};

// Create a custom hook for using the job context
export const useRealtimeJobContext = () => {
  const context = useContext(RealtimeJobContext);
  if (context === undefined) {
    throw new Error('useRealtimeJobContext must be used within a RealtimeJobProvider');
  }
  return context;
};

export default RealtimeJobContext;
