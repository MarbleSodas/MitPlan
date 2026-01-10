import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ffxivJobs } from '../../../data';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const getOrCreatePortalContainer = () => {
  let container = document.getElementById('tank-selection-modal-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'tank-selection-modal-container';
    document.body.appendChild(container);
  }
  return container;
};

const TankSelectionModal = ({
  isOpen,
  onClose,
  mitigationName,
  mitigation,
  mainTankJob,
  offTankJob,
  onSelectMainTank,
  onSelectOffTank
}) => {
  if (!isOpen) return null;

  const getJobIcon = (jobId) => {
    if (!jobId) return null;

    for (const [role, jobs] of Object.entries(ffxivJobs)) {
      const job = jobs.find(j => j.id === jobId);
      if (job && job.icon) {
        return job.icon;
      }
    }

    return null;
  };

  const mainTankIcon = getJobIcon(mainTankJob);
  const offTankIcon = getJobIcon(offTankJob);

  const canMainTankCast = mitigation && mainTankJob && mitigation.jobs?.includes(mainTankJob);
  const canOffTankCast = mitigation && offTankJob && mitigation.jobs?.includes(offTankJob);

  let contextMessage = `Apply ${mitigationName} to which tank?`;
  if (mitigation && mitigation.target === 'single') {
    if (canMainTankCast && !canOffTankCast) {
      contextMessage = `${mainTankJob} will cast ${mitigationName} on which tank?`;
    } else if (canOffTankCast && !canMainTankCast) {
      contextMessage = `${offTankJob} will cast ${mitigationName} on which tank?`;
    } else if (canMainTankCast && canOffTankCast) {
      contextMessage = `Which tank should cast and receive ${mitigationName}?`;
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Select Tank Target</DialogTitle>
          <DialogDescription>
            {contextMessage}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-between gap-3 mt-4">
          <Button onClick={onSelectMainTank} className="flex-1 gap-2">
            {mainTankIcon && <img src={mainTankIcon} alt={mainTankJob} className="w-6 h-6 rounded-full object-contain" />}
            Select Main Tank
          </Button>
          <Button onClick={onSelectOffTank} variant="secondary" className="flex-1 gap-2">
            {offTankIcon && <img src={offTankIcon} alt={offTankJob} className="w-6 h-6 rounded-full object-contain" />}
            Select Off Tank
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TankSelectionModal;
