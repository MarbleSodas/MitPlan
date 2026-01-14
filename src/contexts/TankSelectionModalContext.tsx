import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';
import TankSelectionModal from '../components/common/TankSelectionModal';
import { useTankPositionContext } from './TankPositionContext';
import { useRealtimeJobContext } from './RealtimeJobContext';
import { ffxivJobs } from '../data';
import { determineSingleTargetAssignment } from '../utils/mitigation/autoAssignmentUtils';

// Create the context
const TankSelectionModalContext = createContext();

/**
 * Provider component for managing the tank selection modal
 */
export const TankSelectionModalProvider = ({ children }) => {
  const { tankPositions } = useTankPositionContext();
  const { selectedJobs } = useRealtimeJobContext();

  // State for the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    mitigationName: '',
    callback: null
  });

  // Get the job name from the job ID
  const getJobName = (jobId) => {
    if (!jobId) return jobId;

    // Find the job in the ffxivJobs data
    for (const [, jobs] of Object.entries(ffxivJobs)) {
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        return job.name;
      }
    }

    return jobId;
  };

  // Get selected tank jobs
  const selectedTankJobs = selectedJobs?.tank?.filter(job => job.selected) || [];

  // Open the modal
  const openTankSelectionModal = useCallback((mitigationName, callback, mitigation = null, bossAction = null) => {
    console.log('[TankSelectionModal] Opening modal check:', {
      selectedTankCount: selectedTankJobs.length,
      tankPositions,
      mitigationName,
      mitigation,
      bossAction
    });

    // Check if this is a tank-specific self-target ability that should be auto-assigned
    const isTankSpecificSelfTarget = mitigation &&
      mitigation.target === 'self' &&
      mitigation.forTankBusters &&
      !mitigation.forRaidWide;

    // Auto-assign tank-specific self-target abilities even with 2 tanks selected
    if (isTankSpecificSelfTarget && tankPositions.mainTank && tankPositions.offTank) {
      const mainTankJob = tankPositions.mainTank;
      const offTankJob = tankPositions.offTank;

      const canMainTankUse = mainTankJob && mitigation.jobs.includes(mainTankJob);
      const canOffTankUse = offTankJob && mitigation.jobs.includes(offTankJob);

      console.log('[TankSelectionModal] Tank-specific self-target ability auto-assignment check:', {
        mainTankJob,
        offTankJob,
        canMainTankUse,
        canOffTankUse,
        mitigationJobs: mitigation.jobs
      });

      // Auto-assign if only one tank can use the ability
      if (canMainTankUse && !canOffTankUse) {
        console.log('[TankSelectionModal] Auto-assigning to main tank (only tank that can use it)');
        callback('mainTank');
        return;
      } else if (canOffTankUse && !canMainTankUse) {
        console.log('[TankSelectionModal] Auto-assigning to off tank (only tank that can use it)');
        callback('offTank');
        return;
      }
      // If both tanks can use it, continue to show modal for user choice
    }

    // Only show modal if exactly 2 tanks are selected and both positions are assigned
    if (selectedTankJobs.length !== 2 || !tankPositions.mainTank || !tankPositions.offTank) {
      console.log('[TankSelectionModal] Auto-selecting tank position:', {
        reason: selectedTankJobs.length !== 2 ? 'not exactly 2 tanks' : 'positions not assigned',
        selectedTankCount: selectedTankJobs.length,
        mainTank: tankPositions.mainTank,
        offTank: tankPositions.offTank,
        mitigation
      });

      // Enhanced auto-assignment logic that considers job compatibility
      let selectedPosition = 'shared'; // Default fallback

      // If we have mitigation data, check job compatibility for tank-specific abilities
      if (mitigation && mitigation.target === 'self' && mitigation.forTankBusters && !mitigation.forRaidWide) {
        const mainTankJob = tankPositions?.mainTank;
        const offTankJob = tankPositions?.offTank;

        const canMainTankUse = mainTankJob && mitigation.jobs.includes(mainTankJob);
        const canOffTankUse = offTankJob && mitigation.jobs.includes(offTankJob);

        console.log('[TankSelectionModal] Job compatibility check:', {
          mainTankJob,
          offTankJob,
          canMainTankUse,
          canOffTankUse,
          mitigationJobs: mitigation.jobs
        });

        if (canMainTankUse && !canOffTankUse) {
          selectedPosition = 'mainTank';
        } else if (canOffTankUse && !canMainTankUse) {
          selectedPosition = 'offTank';
        } else if (canMainTankUse && canOffTankUse) {
          // Both tanks can use it - default to main tank
          selectedPosition = 'mainTank';
        } else {
          // Neither tank can use it - this shouldn't happen but fallback to shared
          selectedPosition = 'shared';
        }
      } else {
        // For non-tank-specific abilities or when no mitigation data is provided,
        // use the original logic: prefer main tank, then off tank, then shared
        if (tankPositions.mainTank) {
          selectedPosition = 'mainTank';
        } else if (tankPositions.offTank) {
          selectedPosition = 'offTank';
        } else {
          selectedPosition = 'shared';
        }
      }

      console.log('[TankSelectionModal] Auto-selected position:', selectedPosition);
      callback(selectedPosition);
      return;
    }

    // Enhanced logic for single-target mitigations
    if (mitigation && mitigation.target === 'single' && bossAction) {
      const decision = determineSingleTargetAssignment(mitigation, bossAction, tankPositions, selectedJobs);

      console.log('[TankSelectionModal] Single-target assignment decision:', decision);

      if (!decision.shouldShowModal && decision.assignment) {
        // Auto-assign without showing modal
        console.log('[TankSelectionModal] Auto-assigning single-target mitigation:', {
          mitigation: mitigationName,
          targetPosition: decision.assignment.targetPosition,
          reason: decision.assignment.reason
        });
        callback(decision.assignment.targetPosition);
        return;
      } else if (!decision.shouldShowModal) {
        // Cannot assign - use fallback logic
        console.log('[TankSelectionModal] Cannot assign single-target mitigation:', decision.reason);
        callback('shared');
        return;
      }
      // If decision.shouldShowModal is true, continue to show the modal
    }

    // Show modal for tank selection
    console.log('[TankSelectionModal] Showing modal for tank selection');
    setModalData({
      mitigationName,
      mitigation,
      bossAction,
      callback
    });
    setIsModalOpen(true);
  }, [tankPositions, selectedTankJobs]);

  // Close the modal
  const closeTankSelectionModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Handle selecting the main tank
  const handleSelectMainTank = useCallback(() => {
    if (modalData.callback) {
      modalData.callback('mainTank');
    }
    setIsModalOpen(false);
  }, [modalData]);

  // Handle selecting the off tank
  const handleSelectOffTank = useCallback(() => {
    if (modalData.callback) {
      modalData.callback('offTank');
    }
    setIsModalOpen(false);
  }, [modalData]);

  const contextValue = useMemo(() => ({
    openTankSelectionModal,
    closeTankSelectionModal
  }), [openTankSelectionModal, closeTankSelectionModal]);

  return (
    <TankSelectionModalContext.Provider value={contextValue}>
      {children}
      <TankSelectionModal
        isOpen={isModalOpen}
        onClose={closeTankSelectionModal}
        mitigationName={modalData.mitigationName}
        mitigation={modalData.mitigation}
        bossAction={modalData.bossAction}
        mainTankJob={getJobName(tankPositions.mainTank)}
        offTankJob={getJobName(tankPositions.offTank)}
        onSelectMainTank={handleSelectMainTank}
        onSelectOffTank={handleSelectOffTank}
      />
    </TankSelectionModalContext.Provider>
  );
};

// Custom hook for using the tank selection modal context
export const useTankSelectionModalContext = () => {
  const context = useContext(TankSelectionModalContext);
  if (!context) {
    throw new Error('useTankSelectionModalContext must be used within a TankSelectionModalProvider');
  }
  return context;
};

export default TankSelectionModalContext;
