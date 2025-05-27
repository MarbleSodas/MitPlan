import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import { FaEye, FaEdit, FaTrash, FaShare } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const Container = styled.div`
  margin-top: ${props => props.theme.spacing.large};
`;

const Title = styled.h3`
  font-size: ${props => props.theme.fontSizes.large};
  margin-bottom: ${props => props.theme.spacing.medium};
  color: ${props => props.theme.colors.text};
`;

const PlansList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${props => props.theme.spacing.medium};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const PlanCard = styled.div`
  background-color: ${props => props.theme.colors.cardBackground};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: ${props => props.theme.spacing.medium};
  box-shadow: ${props => props.theme.shadows.small};
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.medium};
  }
`;

const PlanTitle = styled.h4`
  font-size: ${props => props.theme.fontSizes.medium};
  margin-bottom: ${props => props.theme.spacing.small};
  color: ${props => props.theme.colors.text};
`;

const PlanDescription = styled.p`
  font-size: ${props => props.theme.fontSizes.small};
  color: ${props => props.theme.colors.lightText};
  margin-bottom: ${props => props.theme.spacing.medium};
`;

const PlanOwner = styled.p`
  font-size: ${props => props.theme.fontSizes.small};
  color: ${props => props.theme.colors.lightText};
  margin-bottom: ${props => props.theme.spacing.small};
  font-style: italic;
`;

const PlanActions = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.small};
  margin-top: ${props => props.theme.spacing.small};
`;

const ActionButton = styled.button`
  background-color: transparent;
  border: none;
  color: ${props => props.theme.colors.primary};
  cursor: pointer;
  padding: ${props => props.theme.spacing.small};
  border-radius: ${props => props.theme.borderRadius.small};
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.primaryLight};
  }

  &:disabled {
    color: ${props => props.theme.colors.lightText};
    cursor: not-allowed;
  }
`;

const EmptyMessage = styled.p`
  font-size: ${props => props.theme.fontSizes.medium};
  color: ${props => props.theme.colors.lightText};
  text-align: center;
  padding: ${props => props.theme.spacing.large};
`;

const PermissionBadge = styled.span`
  display: inline-block;
  padding: ${props => props.theme.spacing.xsmall} ${props => props.theme.spacing.small};
  border-radius: ${props => props.theme.borderRadius.small};
  font-size: ${props => props.theme.fontSizes.xsmall};
  font-weight: 600;
  margin-left: ${props => props.theme.spacing.small};
  background-color: ${props =>
    props.permission === 'edit'
      ? props.theme.mode === 'dark' ? '#2c5282' : '#ebf8ff'
      : props.theme.mode === 'dark' ? '#2a4365' : '#e6fffa'};
  color: ${props =>
    props.permission === 'edit'
      ? props.theme.mode === 'dark' ? '#90cdf4' : '#2b6cb0'
      : props.theme.mode === 'dark' ? '#81e6d9' : '#285e61'};
`;

const SharedPlansList = () => {
  const { user } = useAuth();
  const [sharedPlans, setSharedPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🚫 [SHARED PLANS LIST] Component mounted - THIS COMPONENT SHOULD USE PLANCONTEXT INSTEAD OF FETCHING DIRECTLY');
    const fetchSharedPlans = async () => {
      try {
        console.log('🔄 [SHARED PLANS LIST] Fetching shared plans directly (should be avoided)');
        setLoading(true);
        setError(null);

        const response = await axios.get(`${API_URL}/plans/shared`);

        setSharedPlans(response.data.plans);
        console.log('✅ [SHARED PLANS LIST] Shared plans fetched', response.data.plans.length);
      } catch (error) {
        console.error('❌ [SHARED PLANS LIST] Fetch shared plans error:', error);
        setError('Failed to load shared plans');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSharedPlans();
    }
  }, [user]);

  const handleViewPlan = (planId) => {
    window.location.href = `/plans/${planId}`;
  };

  const handleRemoveAccess = async (planId) => {
    try {
      await axios.delete(`${API_URL}/plans/${planId}/share`);

      // Remove plan from list
      setSharedPlans(sharedPlans.filter(plan => plan.id !== planId));
    } catch (error) {
      console.error('Remove access error:', error);
      setError('Failed to remove access');
    }
  };

  if (loading) {
    return <Container><EmptyMessage>Loading shared plans...</EmptyMessage></Container>;
  }

  if (error) {
    return <Container><EmptyMessage>Error: {error}</EmptyMessage></Container>;
  }

  if (sharedPlans.length === 0) {
    return <Container><EmptyMessage>No plans have been shared with you yet.</EmptyMessage></Container>;
  }

  return (
    <Container>
      <Title>Plans Shared With You</Title>
      <PlansList>
        {sharedPlans.map(plan => (
          <PlanCard key={plan.id}>
            <PlanTitle>
              {plan.title}
              <PermissionBadge permission={plan.permission}>
                {plan.permission === 'edit' ? 'Can Edit' : 'View Only'}
              </PermissionBadge>
            </PlanTitle>
            <PlanOwner>Shared by: {plan.owner.username || plan.owner.email}</PlanOwner>
            <PlanDescription>
              {plan.description || 'No description provided'}
            </PlanDescription>
            <PlanActions>
              <ActionButton onClick={() => handleViewPlan(plan.id)} title="View Plan">
                <FaEye />
              </ActionButton>
              {plan.permission === 'edit' && (
                <ActionButton onClick={() => handleViewPlan(plan.id)} title="Edit Plan">
                  <FaEdit />
                </ActionButton>
              )}
              <ActionButton onClick={() => handleRemoveAccess(plan.id)} title="Remove Access">
                <FaTrash />
              </ActionButton>
            </PlanActions>
          </PlanCard>
        ))}
      </PlansList>
    </Container>
  );
};

export default SharedPlansList;
