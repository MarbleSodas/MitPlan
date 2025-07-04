import { useState } from 'react';
import styled from 'styled-components';
import { usePlan } from '../../contexts/PlanContext';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  padding: 2rem;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const ModalTitle = styled.h2`
  color: ${props => props.theme?.colors?.text || '#333333'};
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;

  &:hover {
    background: ${props => props.theme?.colors?.hoverBackground || '#f9fafb'};
    color: ${props => props.theme?.colors?.text || '#333333'};
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-weight: 500;
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid ${props => props.theme?.colors?.border || '#e1e5e9'};
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
  background: ${props => props.theme?.colors?.inputBackground || '#ffffff'};
  color: ${props => props.theme?.colors?.text || '#333333'};

  &:focus {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#3b82f6'};
  }

  &::placeholder {
    color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 2px solid ${props => props.theme?.colors?.border || '#e1e5e9'};
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
  background: ${props => props.theme?.colors?.inputBackground || '#ffffff'};
  color: ${props => props.theme?.colors?.text || '#333333'};
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#3b82f6'};
  }

  &::placeholder {
    color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 2px solid ${props => props.theme?.colors?.border || '#e1e5e9'};
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
  background: ${props => props.theme?.colors?.inputBackground || '#ffffff'};
  color: ${props => props.theme?.colors?.text || '#333333'};

  &:focus {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#3b82f6'};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
`;

const PrimaryButton = styled(Button)`
  background: ${props => props.theme?.colors?.primary || '#3b82f6'};
  color: white;

  &:hover {
    background: ${props => props.theme?.colors?.primaryHover || '#2563eb'};
  }

  &:disabled {
    background: ${props => props.theme?.colors?.disabled || '#9ca3af'};
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  border: 2px solid ${props => props.theme?.colors?.border || '#e1e5e9'};

  &:hover {
    background: ${props => props.theme?.colors?.hoverBackground || '#f9fafb'};
    color: ${props => props.theme?.colors?.text || '#333333'};
  }
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme?.colors?.error || '#ef4444'};
  background: ${props => props.theme?.colors?.errorBackground || '#fef2f2'};
  border: 1px solid ${props => props.theme?.colors?.errorBorder || '#fecaca'};
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
`;

const CreatePlanModal = ({ onClose, onSuccess, onNavigateToPlanner }) => {
  const { createNewPlan } = usePlan();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bossId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const bosses = [
    { id: 'ketuduke', name: 'Ketuduke' },
    { id: 'lala', name: 'Lala' },
    { id: 'statice', name: 'Statice' },
    { id: 'm6s', name: 'Sugar Riot (M6S)' },
    { id: 'm7s', name: 'Brute Abominator (M7S)' },
    { id: 'm8s', name: 'M8S' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Plan name is required');
      return;
    }

    if (!formData.bossId) {
      setError('Please select a boss encounter');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const planData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        bossId: formData.bossId,
        assignments: {},
        selectedJobs: {},
        tankPositions: {
          mainTank: null,
          offTank: null
        }
      };

      console.log('[CreatePlanModal] Creating plan with data:', planData);
      const newPlan = await createNewPlan(planData);
      console.log('[CreatePlanModal] Plan created successfully:', newPlan);

      onSuccess?.(newPlan);

      // Navigate to planner if requested
      if (onNavigateToPlanner) {
        onNavigateToPlanner(newPlan.id);
      }
    } catch (err) {
      console.error('[CreatePlanModal] Error creating plan:', err);
      setError(err.message || 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Create New Plan</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="name">Plan Name *</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Enter plan name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="bossId">Boss Encounter *</Label>
            <Select
              id="bossId"
              name="bossId"
              value={formData.bossId}
              onChange={handleInputChange}
              required
            >
              <option value="">Select a boss encounter</option>
              {bosses.map(boss => (
                <option key={boss.id} value={boss.id}>
                  {boss.name}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="description">Description</Label>
            <TextArea
              id="description"
              name="description"
              placeholder="Optional description for your plan"
              value={formData.description}
              onChange={handleInputChange}
            />
          </FormGroup>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <ButtonGroup>
            <SecondaryButton type="button" onClick={onClose}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Plan'}
            </PrimaryButton>
          </ButtonGroup>
        </Form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default CreatePlanModal;
