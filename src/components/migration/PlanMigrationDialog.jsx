import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { usePlanStorage } from '../../contexts/PlanStorageContext';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContainer = styled.div`
  background-color: ${props => props.theme.colors.primary};
  border-radius: 12px;
  padding: 24px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: ${props => props.theme.shadows.large};
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const ModalTitle = styled.h2`
  color: ${props => props.theme.colors.text};
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 1.5rem;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background-color: ${props => props.theme.colors.secondary};
    color: ${props => props.theme.colors.text};
  }
`;

const Description = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 20px;
  line-height: 1.5;
`;

const PlanList = styled.div`
  margin-bottom: 20px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 12px;
`;

const PlanItem = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const PlanCheckbox = styled.input`
  margin-right: 12px;
  cursor: pointer;
`;

const PlanInfo = styled.div`
  flex: 1;
`;

const PlanName = styled.div`
  color: ${props => props.theme.colors.text};
  font-weight: 500;
  margin-bottom: 2px;
`;

const PlanMeta = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.875rem;
`;

const OptionsSection = styled.div`
  margin-bottom: 20px;
  padding: 16px;
  background-color: ${props => props.theme.colors.secondary};
  border-radius: 8px;
`;

const OptionLabel = styled.label`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const OptionRadio = styled.input`
  margin-right: 8px;
  cursor: pointer;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled(Button)`
  background-color: ${props => props.theme.colors.secondary};
  color: ${props => props.theme.colors.text};
  
  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.border};
  }
`;

const PrimaryButton = styled(Button)`
  background-color: ${props => props.theme.colors.accent};
  color: white;
  
  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.accentHover};
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: ${props => props.theme.colors.secondary};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
`;

const ProgressFill = styled.div`
  height: 100%;
  background-color: ${props => props.theme.colors.accent};
  transition: width 0.3s ease;
  width: ${props => props.progress}%;
`;

const StatusMessage = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.875rem;
  text-align: center;
`;

const PlanMigrationDialog = ({ isOpen, onClose, onComplete }) => {
  const { getLocalPlans, migratePlans, isLoading } = usePlanStorage();
  const [localPlans, setLocalPlans] = useState([]);
  const [selectedPlans, setSelectedPlans] = useState(new Set());
  const [migrationOption, setMigrationOption] = useState('transfer_all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  // Load local plans when dialog opens
  useEffect(() => {
    if (isOpen) {
      const plans = getLocalPlans();
      setLocalPlans(plans);
      setSelectedPlans(new Set(plans.map(p => p.id)));
    }
  }, [isOpen, getLocalPlans]);

  // Handle plan selection
  const handlePlanToggle = (planId) => {
    const newSelected = new Set(selectedPlans);
    if (newSelected.has(planId)) {
      newSelected.delete(planId);
    } else {
      newSelected.add(planId);
    }
    setSelectedPlans(newSelected);
  };

  // Handle select all/none
  const handleSelectAll = () => {
    setSelectedPlans(new Set(localPlans.map(p => p.id)));
  };

  const handleSelectNone = () => {
    setSelectedPlans(new Set());
  };

  // Handle migration
  const handleMigrate = async () => {
    if (selectedPlans.size === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setStatusMessage('Preparing migration...');

    try {
      const plansToMigrate = localPlans.filter(p => selectedPlans.has(p.id));
      const options = {
        clearLocal: migrationOption === 'transfer_all' || migrationOption === 'transfer_selected'
      };

      let completed = 0;
      const total = plansToMigrate.length;

      // Migrate plans one by one for progress tracking
      const results = {
        successful: [],
        failed: [],
        conflicts: []
      };

      for (const plan of plansToMigrate) {
        setStatusMessage(`Migrating "${plan.name}"...`);
        
        try {
          const result = await migratePlans([plan], options);
          results.successful.push(...result.successful);
          results.failed.push(...result.failed);
          results.conflicts.push(...result.conflicts);
        } catch (error) {
          results.failed.push({ plan, error: error.message });
        }

        completed++;
        setProgress((completed / total) * 100);
      }

      // Show completion message
      if (results.successful.length > 0) {
        setStatusMessage(`Successfully migrated ${results.successful.length} plans!`);
      }

      // Wait a moment then close
      setTimeout(() => {
        onComplete?.(results);
        onClose();
      }, 1500);

    } catch (error) {
      setStatusMessage(`Migration failed: ${error.message}`);
      setTimeout(() => setIsProcessing(false), 2000);
    }
  };

  // Handle skip migration
  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>Migrate Local Plans</ModalTitle>
          {!isProcessing && (
            <CloseButton onClick={onClose}>×</CloseButton>
          )}
        </ModalHeader>

        {!isProcessing ? (
          <>
            <Description>
              We found {localPlans.length} plan{localPlans.length !== 1 ? 's' : ''} saved locally on this device. 
              Would you like to transfer them to your account for access across all your devices?
            </Description>

            {localPlans.length > 0 && (
              <>
                <PlanList>
                  {localPlans.map(plan => (
                    <PlanItem key={plan.id}>
                      <PlanCheckbox
                        type="checkbox"
                        checked={selectedPlans.has(plan.id)}
                        onChange={() => handlePlanToggle(plan.id)}
                      />
                      <PlanInfo>
                        <PlanName>{plan.name}</PlanName>
                        <PlanMeta>
                          Created: {new Date(plan.date).toLocaleDateString()}
                          {plan.bossId && ` • Boss: ${plan.bossId}`}
                        </PlanMeta>
                      </PlanInfo>
                    </PlanItem>
                  ))}
                </PlanList>

                <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                  <SecondaryButton onClick={handleSelectAll} style={{ marginRight: '8px' }}>
                    Select All
                  </SecondaryButton>
                  <SecondaryButton onClick={handleSelectNone}>
                    Select None
                  </SecondaryButton>
                </div>

                <OptionsSection>
                  <OptionLabel>
                    <OptionRadio
                      type="radio"
                      name="migrationOption"
                      value="transfer_all"
                      checked={migrationOption === 'transfer_all'}
                      onChange={(e) => setMigrationOption(e.target.value)}
                    />
                    Transfer to account and remove from local storage
                  </OptionLabel>
                  <OptionLabel>
                    <OptionRadio
                      type="radio"
                      name="migrationOption"
                      value="copy_all"
                      checked={migrationOption === 'copy_all'}
                      onChange={(e) => setMigrationOption(e.target.value)}
                    />
                    Copy to account and keep local copies
                  </OptionLabel>
                  <OptionLabel>
                    <OptionRadio
                      type="radio"
                      name="migrationOption"
                      value="keep_local"
                      checked={migrationOption === 'keep_local'}
                      onChange={(e) => setMigrationOption(e.target.value)}
                    />
                    Keep plans local only
                  </OptionLabel>
                </OptionsSection>
              </>
            )}

            <ButtonGroup>
              <SecondaryButton onClick={handleSkip}>
                {migrationOption === 'keep_local' ? 'Keep Local' : 'Skip'}
              </SecondaryButton>
              {migrationOption !== 'keep_local' && (
                <PrimaryButton 
                  onClick={handleMigrate}
                  disabled={selectedPlans.size === 0 || isLoading}
                >
                  Migrate {selectedPlans.size} Plan{selectedPlans.size !== 1 ? 's' : ''}
                </PrimaryButton>
              )}
            </ButtonGroup>
          </>
        ) : (
          <>
            <Description>
              Migrating your plans to your account...
            </Description>
            
            <ProgressBar>
              <ProgressFill progress={progress} />
            </ProgressBar>
            
            <StatusMessage>{statusMessage}</StatusMessage>
          </>
        )}
      </ModalContainer>
    </ModalOverlay>
  );
};

export default PlanMigrationDialog;
