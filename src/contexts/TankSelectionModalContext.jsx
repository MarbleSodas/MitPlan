import React, { createContext, useState, useContext, useCallback } from 'react';
import TankSelectionModal from '../components/common/TankSelectionModal';
import { useTankPositionContext } from './TankPositionContext';
import { ffxivJobs } from '../data';

// Create the context
const TankSelectionModalContext = createContext();

/**
 * Provider component for managing the tank selection modal
 */
export const TankSelectionModalProvider = ({ children }) => {
  const { tankPositions } = useTankPositionContext();

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

  // Open the modal
  const openTankSelectionModal = useCallback((mitigationName, callback) => {
    // If we don't have exactly 2 tanks selected, default to main tank
    if (tankPositions.mainTank && !tankPositions.offTank) {
      // If we have only one tank, use that tank
      callback('mainTank');
      return;
    }

    setModalData({
      mitigationName,
      callback
    });
    setIsModalOpen(true);
  }, [tankPositions]);

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

  return (
    <TankSelectionModalContext.Provider value={{
      openTankSelectionModal,
      closeTankSelectionModal
    }}>
      {children}
      <TankSelectionModal
        isOpen={isModalOpen}
        onClose={closeTankSelectionModal}
        mitigationName={modalData.mitigationName}
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
