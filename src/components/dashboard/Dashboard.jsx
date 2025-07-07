import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../contexts/PlanContext';
import PlanCard from './PlanCard';
import CreatePlanModal from './CreatePlanModal';
import ImportPlanModal from './ImportPlanModal';
import ThemeToggle from '../common/ThemeToggle';
import KofiButton from '../common/KofiButton/KofiButton';
import DiscordButton from '../common/DiscordButton/DiscordButton';

const DashboardContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h1`
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const UserName = styled.span`
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-weight: 500;
`;

const LogoutButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.theme?.colors?.error || '#ef4444'} !important;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme?.colors?.errorHover || '#dc2626'};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background: ${props => props.theme?.colors?.primary || '#3b82f6'};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: ${props => props.theme?.colors?.primaryHover || '#2563eb'};
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: ${props => props.theme?.colors?.primary || '#3b82f6'};
  border: 2px solid ${props => props.theme?.colors?.primary || '#3b82f6'};

  &:hover {
    background: ${props => props.theme?.colors?.primary || '#3b82f6'};
    color: white;
  }
`;

const PlansGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  @media (max-width: 600px) {
    margin-top: 1rem;
    padding: 0 0.5rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
`;

const EmptyStateTitle = styled.h3`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: ${props => props.theme?.colors?.text || '#333333'};
`;

const EmptyStateText = styled.p`
  font-size: 1rem;
  margin-bottom: 2rem;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  font-size: 1.1rem;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
`;

const ErrorMessage = styled.div`
  background: ${props => props.theme?.colors?.errorBackground || '#fef2f2'};
  border: 1px solid ${props => props.theme?.colors?.errorBorder || '#fecaca'};
  color: ${props => props.theme?.colors?.error || '#ef4444'};
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
`;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { plans, loading, error, loadUserPlans } = usePlan();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const handleNavigateToPlanner = (planId) => {
    navigate(`/plan/edit/${planId}`);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleCreatePlan = () => {
    setShowCreateModal(true);
  };

  const handleImportPlan = () => {
    setShowImportModal(true);
  };

  const handlePlanCreated = () => {
    setShowCreateModal(false);
    loadUserPlans();
  };

  const handlePlanImported = () => {
    setShowImportModal(false);
    loadUserPlans();
  };

  if (loading) {
    return (
      <DashboardContainer>
        <LoadingSpinner>Loading your plans...</LoadingSpinner>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <Header>
        <Title>Mitigation Plans</Title>
        <UserInfo>
          <UserName>
            Welcome, {user?.displayName || user?.email || 'User'}!
          </UserName>
          <KofiButton />
          <DiscordButton />
          <ThemeToggle />
          <LogoutButton onClick={handleLogout}>
            Sign Out
          </LogoutButton>
        </UserInfo>
      </Header>

      {error && (
        <ErrorMessage>
          Error: {error}
        </ErrorMessage>
      )}

      <ActionButtons>
        <Button onClick={handleCreatePlan}>
          Create New Plan
        </Button>
        <SecondaryButton onClick={handleImportPlan}>
          Import Plan
        </SecondaryButton>
      </ActionButtons>

      {plans.length === 0 ? (
        <EmptyState>
          <EmptyStateTitle>No Plans Yet</EmptyStateTitle>
          <EmptyStateText>
            Create your first mitigation plan to get started with optimizing your raid strategies.
          </EmptyStateText>
          <Button onClick={handleCreatePlan}>
            Create Your First Plan
          </Button>
        </EmptyState>
      ) : (
        <PlansGrid>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => handleNavigateToPlanner(plan.id)}
            />
          ))}
        </PlansGrid>
      )}

      {showCreateModal && (
        <CreatePlanModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handlePlanCreated}
          onNavigateToPlanner={handleNavigateToPlanner}
        />
      )}

      {showImportModal && (
        <ImportPlanModal
          onClose={() => setShowImportModal(false)}
          onSuccess={handlePlanImported}
        />
      )}
    </DashboardContainer>
  );
};

export default Dashboard;
