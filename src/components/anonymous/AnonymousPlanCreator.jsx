/**
 * Anonymous Plan Creator Component
 * Handles creation of new plans for anonymous users
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Plus, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import localStoragePlanService from '../../services/localStoragePlanService';
import { bosses } from '../../data';

const CreatorContainer = styled.div`
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem;
  background: ${props => props.theme?.colors?.background || '#ffffff'};
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme?.colors?.text || '#333333'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.theme?.colors?.text || '#333333'};
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme?.colors?.border || '#e0e0e0'};
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#3399ff'};
  }
  
  &:disabled {
    background: ${props => props.theme?.colors?.disabled || '#f5f5f5'};
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme?.colors?.border || '#e0e0e0'};
  border-radius: 6px;
  font-size: 1rem;
  background: white;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#3399ff'};
  }
  
  &:disabled {
    background: ${props => props.theme?.colors?.disabled || '#f5f5f5'};
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme?.colors?.border || '#e0e0e0'};
  border-radius: 6px;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#3399ff'};
  }
  
  &:disabled {
    background: ${props => props.theme?.colors?.disabled || '#f5f5f5'};
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background: ${props => props.theme?.colors?.primary || '#3399ff'};
  color: white;
  flex: 1;
  
  &:hover:not(:disabled) {
    background: ${props => props.theme?.colors?.primaryHover || '#2980b9'};
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${props => props.theme?.colors?.text || '#333333'};
  border: 1px solid ${props => props.theme?.colors?.border || '#e0e0e0'};
  
  &:hover:not(:disabled) {
    background: ${props => props.theme?.colors?.hover || '#f5f5f5'};
  }
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme?.colors?.error || '#e74c3c'};
  font-size: 0.875rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InfoBox = styled.div`
  background: ${props => props.theme?.colors?.info || '#e3f2fd'};
  border: 1px solid ${props => props.theme?.colors?.infoBorder || '#bbdefb'};
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: ${props => props.theme?.colors?.infoText || '#1976d2'};
`;

const AnonymousPlanCreator = ({ onCancel, onSuccess, preSelectedBossId = null }) => {
  const navigate = useNavigate();
  const { isAnonymousMode, anonymousUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    bossId: preSelectedBossId || '',
    description: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Plan name is required');
      return;
    }
    
    if (!formData.bossId) {
      setError('Please select a boss');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Create the plan using local storage service
      const planData = {
        name: formData.name.trim(),
        bossId: formData.bossId,
        description: formData.description.trim(),
        assignments: {},
        selectedJobs: {},
        tankPositions: {}
      };

      const createdPlan = await localStoragePlanService.createPlan(planData);
      
      console.log('[AnonymousPlanCreator] Plan created:', createdPlan);
      
      // Navigate to the new plan
      navigate(`/anonymous/plan/${createdPlan.id}`);
      
      // Call success callback
      onSuccess?.(createdPlan);
      
    } catch (err) {
      console.error('[AnonymousPlanCreator] Error creating plan:', err);
      setError(err.message || 'Failed to create plan');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1); // Go back
    }
  };

  if (!isAnonymousMode) {
    return null;
  }

  return (
    <CreatorContainer>
      <Title>
        <Plus size={24} />
        {preSelectedBossId
          ? `Create Plan for ${bosses.find(b => b.id === preSelectedBossId)?.name}`
          : 'Create New Plan'
        }
      </Title>
      
      <InfoBox>
        You're creating a plan in anonymous mode. It will be stored locally in your browser. 
        Create an account to save plans permanently and enable sharing.
      </InfoBox>

      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="name">Plan Name *</Label>
          <Input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter plan name"
            maxLength={100}
            disabled={isCreating}
            required
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="bossId">Boss *</Label>
          <Select
            id="bossId"
            name="bossId"
            value={formData.bossId}
            onChange={handleInputChange}
            disabled={isCreating || !!preSelectedBossId}
            required
          >
            <option value="">Select a boss</option>
            {bosses.map(boss => (
              <option key={boss.id} value={boss.id}>
                {boss.name}
              </option>
            ))}
          </Select>
          {preSelectedBossId && (
            <div style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginTop: '0.25rem'
            }}>
              Boss pre-selected: {bosses.find(b => b.id === preSelectedBossId)?.name}
            </div>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="description">Description (Optional)</Label>
          <TextArea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Add a description for your plan"
            maxLength={500}
            disabled={isCreating}
          />
        </FormGroup>

        {error && (
          <ErrorMessage>
            <AlertCircle size={16} />
            {error}
          </ErrorMessage>
        )}

        <ButtonGroup>
          <SecondaryButton
            type="button"
            onClick={handleCancel}
            disabled={isCreating}
          >
            Cancel
          </SecondaryButton>
          
          <PrimaryButton
            type="submit"
            disabled={isCreating || !formData.name.trim() || !formData.bossId}
          >
            <Save size={16} />
            {isCreating ? 'Creating...' : 'Create Plan'}
          </PrimaryButton>
        </ButtonGroup>
      </Form>
    </CreatorContainer>
  );
};

export default AnonymousPlanCreator;
