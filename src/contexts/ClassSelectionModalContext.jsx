import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import ClassSelectionModal from '../components/common/ClassSelectionModal';
import RealtimeJobContext from './RealtimeJobContext';
import JobContext from './JobContext.jsx';

const ClassSelectionModalContext = createContext();

export const ClassSelectionModalProvider = ({ children }) => {
  // Support both realtime and legacy job providers
  const realtimeJobCtx = useContext(RealtimeJobContext);
  const legacyJobCtx = useContext(JobContext);
  const selectedJobs = realtimeJobCtx?.selectedJobs || legacyJobCtx?.selectedJobs || null;

  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState({ mitigation: null, bossAction: null, eligibleJobs: [], callback: null });

  // Flatten selected jobs into a set of job IDs
  const selectedJobIds = useMemo(() => {
    const ids = new Set();
    if (!selectedJobs || typeof selectedJobs !== 'object') return ids;
    Object.values(selectedJobs).forEach(list => {
      if (!Array.isArray(list)) return;
      if (list.length && typeof list[0] === 'object') {
        list.forEach(j => j?.selected && j.id && ids.add(j.id));
      } else {
        list.forEach(id => {
          const v = typeof id === 'string' ? id : id?.id;
          if (v) ids.add(v);
        });
      }
    });
    return ids;
  }, [selectedJobs]);

  const getEligibleJobs = useCallback((mitigation) => {
    if (!mitigation || !Array.isArray(mitigation.jobs)) return [];
    // Only consider currently selected jobs
    const eligible = mitigation.jobs.filter(jobId => selectedJobIds.has(jobId));
    return eligible;
  }, [selectedJobIds]);

  const openClassSelectionModal = useCallback((mitigation, bossAction, callback) => {
    const eligible = getEligibleJobs(mitigation);

    // If 2+ eligible casters, show modal to choose
    if (eligible.length > 1) {
      setModalData({ mitigation, bossAction, eligibleJobs: eligible, callback });
      setIsOpen(true);
      return;
    }

    // If exactly 1 eligible caster, auto-select without showing modal
    if (eligible.length === 1) {
      callback(eligible[0]);
      return;
    }

    // No eligible caster selected: do not show modal; proceed with no caster
    callback(null);
  }, [getEligibleJobs]);

  const closeClassSelectionModal = useCallback(() => setIsOpen(false), []);

  const handleSelectJob = useCallback((jobId) => {
    if (modalData.callback) modalData.callback(jobId);
    setIsOpen(false);
  }, [modalData]);

  return (
    <ClassSelectionModalContext.Provider value={{ openClassSelectionModal, closeClassSelectionModal }}>
      {children}
      <ClassSelectionModal
        isOpen={isOpen}
        onClose={closeClassSelectionModal}
        mitigation={modalData.mitigation}
        eligibleJobs={modalData.eligibleJobs}
        onSelectJob={handleSelectJob}
      />
    </ClassSelectionModalContext.Provider>
  );
};

export const useClassSelectionModalContext = () => {
  const ctx = useContext(ClassSelectionModalContext);
  if (!ctx) throw new Error('useClassSelectionModalContext must be used within a ClassSelectionModalProvider');
  return ctx;
};

export default ClassSelectionModalContext;

