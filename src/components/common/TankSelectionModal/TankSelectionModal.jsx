import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { X } from 'lucide-react';
import { ffxivJobs } from '../../../data';

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

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContainer = styled.div`
  background-color: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.large};
  padding: 20px;
  width: 90%;
  max-width: 400px;
  box-shadow: ${props => props.theme.shadows.large};
  animation: slideIn 0.2s ease-out;
  position: relative;

  @keyframes slideIn {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 95%;
    padding: 16px;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.fontSizes.large};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${props => props.theme.colors.text};
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.theme.colors.hover};
  }
`;

const ModalContent = styled.div`
  margin-bottom: 20px;
  color: ${props => props.theme.colors.text};
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
`;

const Button = styled.button`
  flex: 1;
  padding: 10px 16px;
  border-radius: ${props => props.theme.borderRadius.medium};
  border: none;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  background-color: ${props => props.$primary ? props.theme.colors.primary : props.theme.colors.background};
  color: ${props => props.$primary ? props.theme.colors.buttonText : props.theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.small};
    background-color: ${props => props.$primary ? props.theme.colors.primaryHover : props.theme.colors.hover};
  }

  &:active {
    transform: translateY(0);
  }
`;

const JobIcon = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: contain;
`;

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
            Main Tank ({mainTankJob})
          </Button>
          <Button onClick={onSelectOffTank}>
            {offTankIcon && <JobIcon src={offTankIcon} alt={offTankJob} />}
            Off Tank ({offTankJob})
          </Button>
        </ButtonContainer>
      </ModalContainer>
    </ModalOverlay>,
    getOrCreatePortalContainer()
  );
};

export default TankSelectionModal;
