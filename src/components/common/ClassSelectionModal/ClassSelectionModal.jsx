import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';
import { ffxivJobs } from '../../../data';

const getOrCreatePortalContainer = () => {
  let container = document.getElementById('class-selection-modal-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'class-selection-modal-container';
    document.body.appendChild(container);
  }
  return container;
};

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;

const ModalContainer = styled.div`
  background-color: ${p => p.theme.colors.secondary};
  border-radius: ${p => p.theme.borderRadius.large};
  padding: 20px;
  width: 90%;
  max-width: 480px;
  box-shadow: ${p => p.theme.shadows.large};
  animation: slideIn 0.2s ease-out;
  position: relative;

  @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: ${p => p.theme.colors.text};
  font-size: ${p => p.theme.fontSizes.large};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${p => p.theme.colors.text};
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;

  &:hover { background-color: ${p => p.theme.colors.hover}; }
`;

const JobsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
`;

const JobButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 12px;
  min-height: 96px;
  border-radius: ${p => p.theme.borderRadius.medium};
  background: ${p => p.theme.colors.background};
  border: none;
  color: ${p => p.theme.colors.text};
  cursor: pointer;
  text-align: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;

  &:hover { transform: translateY(-3px); box-shadow: ${p => p.theme.shadows.small}; background-color: ${p => p.theme.colors.hover}; }
`;

const JobIcon = styled.img`
  width: 44px; height: 44px;
`;

const JobAbbrev = styled.span`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
`;

const ClassSelectionModal = ({ isOpen, onClose, mitigation, eligibleJobs = [], onSelectJob }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    if (isOpen) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const jobMetaById = new Map();
  Object.values(ffxivJobs).forEach(list => list.forEach(j => jobMetaById.set(j.id, j)));

  return (
    <ModalOverlay>
      <ModalContainer ref={modalRef}>
        <ModalHeader>
          <ModalTitle>Select Caster</ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close"><X size={18} /></CloseButton>
        </ModalHeader>
        <div style={{ marginBottom: 12, color: 'inherit' }}>
          <strong>{mitigation?.name}</strong>
        </div>
        <JobsGrid>
          {eligibleJobs.map(jobId => {
            const meta = jobMetaById.get(jobId);
            return (
              <JobButton key={jobId} onClick={() => onSelectJob(jobId)}>
                {meta?.icon && <JobIcon src={meta.icon} alt={meta?.name || jobId} />}
                <JobAbbrev>{jobId}</JobAbbrev>
              </JobButton>
            );
          })}
        </JobsGrid>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default ClassSelectionModal;

