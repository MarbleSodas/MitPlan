import React, { useEffect, useRef, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ffxivJobs } from '../../../data';
import { BUTTON, MODAL, cn } from '../../../styles/designSystem';

// Get or create a portal container for the modal
const getOrCreatePortalContainer = () => {
  let container = document.getElementById('tank-selection-modal-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'tank-selection-modal-container';
    document.body.appendChild(container);
  }
  return container;
};

const ModalOverlay = ({ children, className = '', ...rest }) => (
  <div {...rest} className={cn(MODAL.overlay, 'z-[10000]', className)}>
    {children}
  </div>
);

const ModalContainer = forwardRef(({ children, className = '', ...rest }, ref) => (
  <div
    ref={ref}
    {...rest}
    className={cn(MODAL.container, 'max-w-[400px] w-[90%]', className)}
  >
    {children}
  </div>
));

const ModalHeader = ({ children, className = '', ...rest }) => (
  <div {...rest} className={cn(MODAL.header, className)}>
    {children}
  </div>
);

const ModalTitle = ({ children, className = '', ...rest }) => (
  <h3 {...rest} className={cn(MODAL.title, 'text-lg', className)}>{children}</h3>
);

const CloseButton = ({ children, className = '', ...rest }) => (
  <button
    {...rest}
    className={`bg-transparent border-0 cursor-pointer p-1 rounded-full text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors ${className}`}
  >
    {children}
  </button>
);

const ModalContentSection = ({ children, className = '', ...rest }) => (
  <div {...rest} className={cn(MODAL.content, className)}>{children}</div>
);

const ButtonContainer = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`flex justify-between gap-3 ${className}`}>{children}</div>
);

const Button = ({ children, className = '', $primary, ...rest }) => {
  const buttonClass = $primary ? BUTTON.primary.medium : BUTTON.secondary.medium;
  return (
    <button {...rest} className={cn(buttonClass, 'flex-1 gap-2', className)}>
      {children}
    </button>
  );
};

const JobIcon = ({ className = '', ...rest }) => (
  <img {...rest} className={`w-6 h-6 rounded-full object-contain ${className}`} />
);

/**
 * Modal component for selecting which tank to apply a mitigation to
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to call when the modal is closed
 * @param {string} props.mitigationName - Name of the mitigation being applied
 * @param {string} props.mainTankJob - Job ID of the main tank
 * @param {string} props.offTankJob - Job ID of the off tank
 * @param {Function} props.onSelectMainTank - Function to call when main tank is selected
 * @param {Function} props.onSelectOffTank - Function to call when off tank is selected
 * @returns {JSX.Element} - Rendered component
 */
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
  const modalRef = useRef(null);

  // Handle clicking outside the modal to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key to close the modal
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);


  if (!isOpen) return null;

  // Helper function to get job icon
  const getJobIcon = (jobId) => {
    if (!jobId) return null;

    // Find the job in the ffxivJobs data
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

  // Determine who can cast the ability
  const canMainTankCast = mitigation && mainTankJob && mitigation.jobs?.includes(mainTankJob);
  const canOffTankCast = mitigation && offTankJob && mitigation.jobs?.includes(offTankJob);

  // Create context message
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

  return createPortal(
    <ModalOverlay>
      <ModalContainer ref={modalRef}>
        <ModalHeader>
          <ModalTitle>Select Tank Target</ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close">
            <X size={20} />
          </CloseButton>
        </ModalHeader>
        <ModalContent>
          <strong>{contextMessage}</strong>
        </ModalContent>
        <ButtonContainer>
          <Button onClick={onSelectMainTank} $primary>
            {mainTankIcon && <JobIcon src={mainTankIcon} alt={mainTankJob} />}
            Select Main Tank
          </Button>
          <Button onClick={onSelectOffTank}>
            {offTankIcon && <JobIcon src={offTankIcon} alt={offTankJob} />}
            Select Off Tank
          </Button>
        </ButtonContainer>
      </ModalContainer>
    </ModalOverlay>,
    getOrCreatePortalContainer()
  );
};

export default TankSelectionModal;
