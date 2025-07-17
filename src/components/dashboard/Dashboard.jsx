import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../contexts/PlanContext';
import unifiedPlanService from '../../services/unifiedPlanService';
import PlanCard from './PlanCard';
import CreatePlanModal from './CreatePlanModal';
import BossSelectionModal from './BossSelectionModal';
import ImportPlanModal from './ImportPlanModal';
import ThemeToggle from '../common/ThemeToggle';
import KofiButton from '../common/KofiButton/KofiButton';
import DiscordButton from '../common/DiscordButton/DiscordButton';
import Footer from '../layout/Footer';

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
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 1rem;
  background: ${props => props.theme?.colors?.error || '#ef4444'} !important;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
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

const PlansSection = styled.div`
  margin-bottom: 3rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h2`
  color: ${props => props.theme?.colors?.text || '#333333'};
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
`;

const PlanCount = styled.span`
  background: ${props => props.theme?.colors?.primaryBackground || '#eff6ff'};
  color: ${props => props.theme?.colors?.primary || '#3b82f6'};
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
`;

const PlansGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  @media (max-width: 600px) {
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

const SectionEmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
  background: ${props => props.theme?.colors?.backgroundSecondary || '#f8fafc'};
  border-radius: 8px;
  border: 1px dashed ${props => props.theme?.colors?.border || '#e2e8f0'};
`;

const SectionEmptyText = styled.p`
  font-size: 0.875rem;
  margin: 0;
  font-style: italic;
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
  const { loadUserPlans } = usePlan();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBossSelectionModal, setShowBossSelectionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedBossForPlan, setSelectedBossForPlan] = useState(null);
  const [categorizedPlans, setCategorizedPlans] = useState({
    ownedPlans: [],
    sharedPlans: [],
    totalPlans: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set up unified plan service context and load categorized plans
  useEffect(() => {
    if (user) {
      // Set the user context for the unified plan service
      unifiedPlanService.setUserContext(user, false);
      loadCategorizedPlans();
    }
  }, [user]);

  const loadCategorizedPlans = async () => {
    if (!user) {
      setCategorizedPlans({ ownedPlans: [], sharedPlans: [], totalPlans: 0 });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[Dashboard] Loading categorized plans for user:', user.uid);
      const plans = await unifiedPlanService.getCategorizedUserPlans();
      console.log('[Dashboard] Categorized plans loaded:', {
        ownedPlans: plans.ownedPlans.length,
        sharedPlans: plans.sharedPlans.length,
        totalPlans: plans.totalPlans
      });
      setCategorizedPlans(plans);
    } catch (err) {
      console.error('Error loading categorized plans:', err);
      setError(err.message);
      setCategorizedPlans({ ownedPlans: [], sharedPlans: [], totalPlans: 0 });
    } finally {
      setLoading(false);
    }
  };

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

  const handleCreatePlanByBoss = () => {
    setShowBossSelectionModal(true);
  };

  const handleBossSelected = (bossId) => {
    setSelectedBossForPlan(bossId);
    setShowBossSelectionModal(false);
    setShowCreateModal(true);
  };

  const handleCreateModalClose = () => {
    setShowCreateModal(false);
    setSelectedBossForPlan(null);
  };

  const handleImportPlan = () => {
    setShowImportModal(true);
  };

  const handlePlanCreated = () => {
    setShowCreateModal(false);
    loadUserPlans(); // Keep for real-time updates
    loadCategorizedPlans(); // Refresh categorized view
  };

  const handlePlanImported = () => {
    setShowImportModal(false);
    loadUserPlans(); // Keep for real-time updates
    loadCategorizedPlans(); // Refresh categorized view
  };

  const handlePlanChanged = () => {
    loadUserPlans(); // Keep for real-time updates
    loadCategorizedPlans(); // Refresh categorized view
  };

  if (loading) {
    return (
      <>
        <DashboardContainer>
          <LoadingSpinner>Loading your plans...</LoadingSpinner>
        </DashboardContainer>
        <Footer />
      </>
    );
  }

  return (
    <>
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
        <Button onClick={handleCreatePlanByBoss}>
          Create New Plan
        </Button>
        <SecondaryButton onClick={handleImportPlan}>
          Import Plan
        </SecondaryButton>
      </ActionButtons>

      {categorizedPlans.totalPlans === 0 ? (
        <EmptyState>
          <EmptyStateTitle>No Plans Yet</EmptyStateTitle>
          <EmptyStateText>
            Create your first mitigation plan to get started with optimizing your raid strategies.
          </EmptyStateText>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button onClick={handleCreatePlanByBoss}>
              Create Your First Plan
            </Button>
          </div>
        </EmptyState>
      ) : (
        <>
          {/* My Plans Section */}
          <PlansSection>
            <SectionHeader>
              <SectionTitle>My Plans</SectionTitle>
              <PlanCount>{categorizedPlans.ownedPlans.length}</PlanCount>
            </SectionHeader>

            {categorizedPlans.ownedPlans.length === 0 ? (
              <SectionEmptyState>
                <SectionEmptyText>
                  You haven't created any plans yet. Click "Create New Plan" to get started!
                </SectionEmptyText>
              </SectionEmptyState>
            ) : (
              <PlansGrid>
                {categorizedPlans.ownedPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={() => handleNavigateToPlanner(plan.id)}
                    onPlanChanged={handlePlanChanged}
                    isSharedPlan={false}
                  />
                ))}
              </PlansGrid>
            )}
          </PlansSection>

          {/* Shared Plans Section - Only show for authenticated users */}
          {user && !user.isAnonymous && (
            <PlansSection>
              <SectionHeader>
                <SectionTitle>Shared Plans</SectionTitle>
                <PlanCount>{categorizedPlans.sharedPlans.length}</PlanCount>
              </SectionHeader>

              {categorizedPlans.sharedPlans.length === 0 ? (
                <SectionEmptyState>
                  <SectionEmptyText>
                    No plans have been shared with you yet. Shared plans will appear here when other users give you access.
                  </SectionEmptyText>
                </SectionEmptyState>
              ) : (
                <PlansGrid>
                  {categorizedPlans.sharedPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      onEdit={() => handleNavigateToPlanner(plan.id)}
                      onPlanChanged={handlePlanChanged}
                      isSharedPlan={true}
                    />
                  ))}
                </PlansGrid>
              )}
            </PlansSection>
          )}
        </>
      )}

      {showBossSelectionModal && (
        <BossSelectionModal
          onClose={() => setShowBossSelectionModal(false)}
          onSelectBoss={handleBossSelected}
        />
      )}

      {showCreateModal && (
        <CreatePlanModal
          onClose={handleCreateModalClose}
          onSuccess={handlePlanCreated}
          onNavigateToPlanner={handleNavigateToPlanner}
          preSelectedBossId={selectedBossForPlan}
        />
      )}

      {showImportModal && (
        <ImportPlanModal
          onClose={() => setShowImportModal(false)}
          onSuccess={handlePlanImported}
        />
      )}
    </DashboardContainer>
    <Footer />
  </>
  );
};

export default Dashboard;
