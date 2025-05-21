import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { usePlan } from '../../../contexts/PlanContext';
import { useAuth } from '../../../contexts/AuthContext';
import PlanItem from './PlanItem';

const Container = styled.div`
  margin-bottom: 30px;
`;

const Title = styled.h2`
  margin-bottom: 15px;
  color: ${props => props.theme.textPrimary};
  font-size: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TabsContainer = styled.div`
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid ${props => props.theme.borderColor};
`;

const Tab = styled.button`
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.active ? props.theme.primary : 'transparent'};
  color: ${props => props.active ? props.theme.primary : props.theme.textSecondary};
  font-weight: ${props => props.active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    color: ${props => props.theme.primary};
  }
`;

const EmptyState = styled.div`
  padding: 30px;
  text-align: center;
  background-color: ${props => props.theme.backgroundAlt};
  border-radius: 8px;
  color: ${props => props.theme.textSecondary};
`;

const CreateButton = styled.button`
  padding: 8px 16px;
  background-color: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  margin-left: auto;
  
  &:hover {
    background-color: ${props => props.theme.primaryHover};
  }
`;

const LoadingIndicator = styled.div`
  text-align: center;
  padding: 20px;
  color: ${props => props.theme.textSecondary};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const PlanList = ({ onCreatePlan, onSelectPlan }) => {
  const { isAuthenticated } = useAuth();
  const { 
    userPlans, 
    sharedPlans, 
    publicPlans, 
    loading, 
    fetchUserPlans, 
    fetchSharedPlans, 
    fetchPublicPlans 
  } = usePlan();
  
  const [activeTab, setActiveTab] = useState('my-plans');
  
  useEffect(() => {
    // Set default tab based on authentication status
    if (!isAuthenticated) {
      setActiveTab('public');
    }
  }, [isAuthenticated]);
  
  useEffect(() => {
    // Fetch plans based on active tab
    if (activeTab === 'my-plans' && isAuthenticated) {
      fetchUserPlans();
    } else if (activeTab === 'shared' && isAuthenticated) {
      fetchSharedPlans();
    } else if (activeTab === 'public') {
      fetchPublicPlans();
    }
  }, [activeTab, isAuthenticated, fetchUserPlans, fetchSharedPlans, fetchPublicPlans]);
  
  const getPlansToDisplay = () => {
    switch (activeTab) {
      case 'my-plans':
        return userPlans;
      case 'shared':
        return sharedPlans;
      case 'public':
        return publicPlans;
      default:
        return [];
    }
  };
  
  const renderEmptyState = () => {
    switch (activeTab) {
      case 'my-plans':
        return (
          <EmptyState>
            <h3>No plans yet</h3>
            <p>Create your first mitigation plan to get started.</p>
            <button 
              onClick={onCreatePlan}
              style={{ 
                marginTop: '15px',
                padding: '8px 16px',
                backgroundColor: '#4a90e2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Create Plan
            </button>
          </EmptyState>
        );
      case 'shared':
        return (
          <EmptyState>
            <h3>No shared plans</h3>
            <p>Plans shared with you will appear here.</p>
          </EmptyState>
        );
      case 'public':
        return (
          <EmptyState>
            <h3>No public plans</h3>
            <p>Public plans will appear here.</p>
          </EmptyState>
        );
      default:
        return null;
    }
  };
  
  return (
    <Container>
      <Title>
        Mitigation Plans
        {isAuthenticated && (
          <CreateButton onClick={onCreatePlan}>
            Create Plan
          </CreateButton>
        )}
      </Title>
      
      <TabsContainer>
        {isAuthenticated && (
          <>
            <Tab 
              active={activeTab === 'my-plans'} 
              onClick={() => setActiveTab('my-plans')}
            >
              My Plans
            </Tab>
            <Tab 
              active={activeTab === 'shared'} 
              onClick={() => setActiveTab('shared')}
            >
              Shared With Me
            </Tab>
          </>
        )}
        <Tab 
          active={activeTab === 'public'} 
          onClick={() => setActiveTab('public')}
        >
          Public Plans
        </Tab>
      </TabsContainer>
      
      {loading ? (
        <LoadingIndicator>Loading plans...</LoadingIndicator>
      ) : (
        <>
          {getPlansToDisplay().length === 0 ? (
            renderEmptyState()
          ) : (
            <Grid>
              {getPlansToDisplay().map(plan => (
                <PlanItem 
                  key={plan.id} 
                  plan={plan} 
                  onSelect={() => onSelectPlan(plan.id)}
                />
              ))}
            </Grid>
          )}
        </>
      )}
    </Container>
  );
};

export default PlanList;