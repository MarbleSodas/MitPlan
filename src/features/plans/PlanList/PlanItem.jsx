import React from 'react';
import styled from 'styled-components';
import { useAuth } from '../../../contexts/AuthContext';

const Card = styled.div`
  background-color: ${props => props.theme.cardBackground};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const CardHeader = styled.div`
  padding: 15px;
  border-bottom: 1px solid ${props => props.theme.borderColor};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 18px;
  color: ${props => props.theme.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background-color: ${props => props.type === 'public' ? '#28a745' : '#17a2b8'};
  color: white;
`;

const CardBody = styled.div`
  padding: 15px;
`;

const Description = styled.p`
  margin: 0 0 15px 0;
  color: ${props => props.theme.textSecondary};
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 40px;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
`;

const InfoLabel = styled.span`
  color: ${props => props.theme.textSecondary};
`;

const InfoValue = styled.span`
  color: ${props => props.theme.textPrimary};
  font-weight: 500;
`;

const CardFooter = styled.div`
  padding: 10px 15px;
  background-color: ${props => props.theme.backgroundAlt};
  border-top: 1px solid ${props => props.theme.borderColor};
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const UserAvatar = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: ${props => props.theme.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 10px;
`;

const PlanItem = ({ plan, onSelect }) => {
  const { user } = useAuth();
  
  const isOwner = user && plan.userId === user.id;
  const isShared = user && plan.sharedWith && plan.sharedWith.includes(user.id);
  
  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  return (
    <Card onClick={() => onSelect(plan.id)}>
      <CardHeader>
        <Title>{plan.title || 'Untitled Plan'}</Title>
        {plan.isPublic ? (
          <Badge type="public">Public</Badge>
        ) : isShared ? (
          <Badge type="shared">Shared</Badge>
        ) : null}
      </CardHeader>
      
      <CardBody>
        <Description>
          {plan.description || 'No description provided.'}
        </Description>
        
        <InfoRow>
          <InfoLabel>Boss</InfoLabel>
          <InfoValue>{plan.bossId || 'N/A'}</InfoValue>
        </InfoRow>
        
        <InfoRow>
          <InfoLabel>Jobs</InfoLabel>
          <InfoValue>{plan.selectedJobs?.length || 0} selected</InfoValue>
        </InfoRow>
        
        <InfoRow>
          <InfoLabel>Mitigations</InfoLabel>
          <InfoValue>
            {Object.keys(plan.assignments || {}).length} assigned
          </InfoValue>
        </InfoRow>
      </CardBody>
      
      <CardFooter>
        <UserInfo>
          <UserAvatar>{getInitials(plan.username)}</UserAvatar>
          <span>{plan.username || 'Unknown User'}</span>
        </UserInfo>
        
        <span>Updated {formatDate(plan.updatedAt)}</span>
      </CardFooter>
    </Card>
  );
};

export default PlanItem;