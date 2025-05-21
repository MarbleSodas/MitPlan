import React, { useState } from 'react';
import styled from 'styled-components';
import { usePlan } from '../../../contexts/PlanContext';
import { useBossContext } from '../../../contexts/BossContext';

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
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: ${props => props.theme.cardBackground};
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  padding: 20px;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${props => props.theme.textSecondary};
  
  &:hover {
    color: ${props => props.theme.textPrimary};
  }
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 20px;
  color: ${props => props.theme.textPrimary};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.label`
  font-weight: 500;
  color: ${props => props.theme.textPrimary};
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid ${props => props.theme.borderColor};
  border-radius: 4px;
  background-color: ${props => props.theme.inputBackground};
  color: ${props => props.theme.textPrimary};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`;

const TextArea = styled.textarea`
  padding: 10px;
  border: 1px solid ${props => props.theme.borderColor};
  border-radius: 4px;
  background-color: ${props => props.theme.inputBackground};
  color: ${props => props.theme.textPrimary};
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`;

const Select = styled.select`
  padding: 10px;
  border: 1px solid ${props => props.theme.borderColor};
  border-radius: 4px;
  background-color: ${props => props.theme.inputBackground};
  color: ${props => props.theme.textPrimary};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Checkbox = styled.input`
  margin: 0;
`;

const Button = styled.button`
  padding: 10px;
  background-color: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.primaryHover};
  }
  
  &:disabled {
    background-color: ${props => props.theme.disabled};
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.error};
  font-size: 14px;
  margin-top: 10px;
`;

const CreatePlanModal = ({ isOpen, onClose, onSuccess }) => {
  const { createPlan, error: planError } = usePlan();
  const { bossList, currentBossId } = useBossContext();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bossId, setBossId] = useState(currentBossId || '');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  if (!isOpen) {
    return null;
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!title || !bossId) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Create plan
      const result = await createPlan({
        title,
        description,
        bossId,
        isPublic,
        selectedJobs: [],
        assignments: {}
      });
      
      // Call success callback
      if (onSuccess) {
        onSuccess(result.plan);
      }
      
      // Close modal
      onClose();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <CloseButton onClick={onClose}>&times;</CloseButton>
        
        <Title>Create New Plan</Title>
        
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="title">Title *</Label>
            <Input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter plan title"
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="description">Description</Label>
            <TextArea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter plan description (optional)"
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="bossId">Boss *</Label>
            <Select
              id="bossId"
              value={bossId}
              onChange={(e) => setBossId(e.target.value)}
              required
            >
              <option value="">Select a boss</option>
              {bossList.map(boss => (
                <option key={boss.id} value={boss.id}>
                  {boss.name}
                </option>
              ))}
            </Select>
          </FormGroup>
          
          <CheckboxGroup>
            <Checkbox
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <Label htmlFor="isPublic" style={{ fontWeight: 'normal' }}>
              Make this plan public (anyone can view it)
            </Label>
          </CheckboxGroup>
          
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Plan'}
          </Button>
          
          {(error || planError) && (
            <ErrorMessage>{error || planError}</ErrorMessage>
          )}
        </Form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default CreatePlanModal;