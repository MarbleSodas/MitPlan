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
  max-width: 600px;
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
  min-height: 200px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;

  &:focus {
    outline: none;
    border-color: ${props => props.theme?.colors?.primary || '#3b82f6'};
  }

  &::placeholder {
    color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  }
`;

const FileInput = styled.input`
  padding: 0.75rem;
  border: 2px dashed ${props => props.theme?.colors?.border || '#e1e5e9'};
  border-radius: 8px;
  background: ${props => props.theme?.colors?.inputBackground || '#ffffff'};
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: ${props => props.theme?.colors?.primary || '#3b82f6'};
  }

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

const HelpText = styled.p`
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.4;
`;

const ImportPlanModal = ({ onClose, onSuccess }) => {
  const { importPlanData } = usePlan();
  const [planName, setPlanName] = useState('');
  const [importData, setImportData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        setImportData(content);
        
        // Try to parse and extract plan name
        const parsed = JSON.parse(content);
        if (parsed.name && !planName) {
          setPlanName(parsed.name);
        }
      } catch (err) {
        setError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!importData.trim()) {
      setError('Please provide plan data to import');
      return;
    }

    if (!planName.trim()) {
      setError('Plan name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const parsedData = JSON.parse(importData);
      await importPlanData(parsedData, planName.trim());
      onSuccess?.();
    } catch (err) {
      if (err.name === 'SyntaxError') {
        setError('Invalid JSON format. Please check your plan data.');
      } else {
        setError(err.message || 'Failed to import plan');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Import Plan</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="planName">Plan Name *</Label>
            <Input
              id="planName"
              type="text"
              placeholder="Enter a name for the imported plan"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="fileUpload">Upload Plan File</Label>
            <FileInput
              id="fileUpload"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
            />
            <HelpText>
              Select a JSON file exported from MitPlan (supports all versions)
            </HelpText>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="importData">Or Paste Plan Data</Label>
            <TextArea
              id="importData"
              placeholder="Paste your plan JSON data here..."
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
            />
            <HelpText>
              Paste the JSON data from an exported plan (supports all versions)
            </HelpText>
          </FormGroup>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <ButtonGroup>
            <SecondaryButton type="button" onClick={onClose}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? 'Importing...' : 'Import Plan'}
            </PrimaryButton>
          </ButtonGroup>
        </Form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default ImportPlanModal;
