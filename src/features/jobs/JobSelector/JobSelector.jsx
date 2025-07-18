import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { ffxivJobs } from '../../../data';
import { useRealtimeJobContext } from '../../../contexts/RealtimeJobContext';

const Container = styled.div`
  background-color: ${props => props.theme.colors.secondary};
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  box-shadow: ${props => props.theme.shadows.medium};
  transition: background-color 0.3s ease;
`;

const Title = styled.h3`
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding-bottom: 10px;
  color: ${props => props.theme.colors.text};
`;

const RoleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 10px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: 15px;
  }
`;

const RoleSection = styled.div`
  margin-bottom: 25px;
  padding: 15px;
  border-radius: 10px;
  box-shadow: ${props => props.theme.shadows.small};
  background-color: ${props => {
    if (props.theme.mode === 'dark') {
      return 'rgba(30, 30, 30, 0.6)';
    }
    return 'rgba(250, 250, 250, 0.8)';
  }};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    margin-bottom: 15px;
    padding: 12px;
  }
`;

const RoleHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid ${props => props.theme.colors.border};

  /* Role-specific styling */
  ${props => props.$roleKey === 'tank' && `
    border-bottom-color: #3D5CDB;
  `}

  ${props => props.$roleKey === 'healer' && `
    border-bottom-color: #3D9C51;
  `}

  ${props => props.$roleKey === 'melee' && `
    border-bottom-color: #AF1E3A;
  `}

  ${props => props.$roleKey === 'ranged' && `
    border-bottom-color: #6C6C6C;
  `}

  ${props => props.$roleKey === 'caster' && `
    border-bottom-color: #7657C0;
  `}
`;

const RoleIcon = styled.div`
  margin-right: 15px;
  font-size: 28px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;

  /* Role-specific styling */
  ${props => props.$roleKey === 'tank' && `
    background-color: rgba(61, 92, 219, 0.2);
    color: #3D5CDB;
  `}

  ${props => props.$roleKey === 'healer' && `
    background-color: rgba(61, 156, 81, 0.2);
    color: #3D9C51;
  `}

  ${props => props.$roleKey === 'melee' && `
    background-color: rgba(175, 30, 58, 0.2);
    color: #AF1E3A;
  `}

  ${props => props.$roleKey === 'ranged' && `
    background-color: rgba(108, 108, 108, 0.2);
    color: #6C6C6C;
  `}

  ${props => props.$roleKey === 'caster' && `
    background-color: rgba(118, 87, 192, 0.2);
    color: #7657C0;
  `}
`;

const RoleName = styled.h4`
  margin: 0;
  color: ${props => props.theme.colors.text};
  font-size: 18px;
  font-weight: bold;

  /* Role-specific styling */
  ${props => props.$roleKey === 'tank' && `
    color: #3D5CDB;
  `}

  ${props => props.$roleKey === 'healer' && `
    color: #3D9C51;
  `}

  ${props => props.$roleKey === 'melee' && `
    color: #AF1E3A;
  `}

  ${props => props.$roleKey === 'ranged' && `
    color: #6C6C6C;
  `}

  ${props => props.$roleKey === 'caster' && `
    color: #7657C0;
  `}
`;

const JobGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  width: 100%;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: 8px;
  }
`;

const JobCard = styled.div`
  background-color: ${props => {
    if (props.theme.mode === 'dark') {
      return props.$isSelected ? 'rgba(51, 153, 255, 0.2)' : props.theme.colors.cardBackground;
    }
    return props.$isSelected ? '#e6f7ff' : 'white';
  }};
  border: 2px solid ${props => props.$isSelected ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 90px;
  width: 100%;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.medium};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    min-height: 80px;
    padding: 6px 8px;

    &:active {
      transform: translateY(-1px);
      box-shadow: ${props => props.theme.shadows.small};
    }
  }
`;

const JobIcon = styled.div`
  margin-bottom: 6px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const JobName = styled.div`
  font-weight: ${props => props.$isSelected ? 'bold' : 'normal'};
  font-size: 14px;
  color: ${props => props.theme.colors.text};
  margin-top: 3px;
`;

function JobSelector({ disabled = false }) {
  // Use the realtime job context for state and actions
  const { selectedJobs: jobs, toggleJobSelection: contextToggleJobSelection } = useRealtimeJobContext();

  // Simple click debouncing to prevent double-clicks
  const lastClickTimeRef = useRef(new Map());

  // Role icons and names for display
  const roleIcons = {
    tank: '🛡️',
    healer: '💉',
    melee: '🗡️',
    ranged: '🏹',
    caster: '🔮'
  };

  const roleNames = {
    tank: 'Tanks',
    healer: 'Healers',
    melee: 'Melee DPS',
    ranged: 'Physical Ranged DPS',
    caster: 'Magical Ranged DPS'
  };

  // Toggle job selection - direct call to context without complex optimistic updates
  const toggleJobSelection = (roleKey, jobId) => {
    if (disabled) return;

    const clickKey = `${roleKey}-${jobId}`;
    const now = Date.now();
    const lastClickTime = lastClickTimeRef.current.get(clickKey) || 0;

    // Prevent rapid successive clicks (debounce to 200ms to prevent double-clicks)
    if (now - lastClickTime < 200) {
      console.log(`%c[JOB SELECTOR] Click debounced for ${jobId}`, 'background: #FFC107; color: black; padding: 2px 5px; border-radius: 3px;');
      return;
    }

    lastClickTimeRef.current.set(clickKey, now);

    console.log(`%c[JOB SELECTOR] Toggling job ${jobId} in role ${roleKey}`, 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;');

    // Direct call to context - let the context handle all state management
    contextToggleJobSelection(roleKey, jobId);
  };

  return (
    <Container>
      <Title>Select FFXIV Jobs</Title>

      <RoleGrid>
        {Object.entries(jobs).map(([roleKey, roleJobs]) => (
          <RoleSection key={roleKey} $roleKey={roleKey}>
            <RoleHeader $roleKey={roleKey}>
              <RoleIcon $roleKey={roleKey}>{roleIcons[roleKey]}</RoleIcon>
              <RoleName $roleKey={roleKey}>{roleNames[roleKey]}</RoleName>
            </RoleHeader>

            <JobGrid>
              {roleJobs.map(job => {
                // Debug: Log the job selection state
                if (job.selected) {
                  console.log(`[JOB SELECTOR] Rendering selected job: ${job.id} (${job.name})`);
                }

                return (
                  <JobCard
                    key={job.id}
                    $isSelected={job.selected}
                    onClick={() => toggleJobSelection(roleKey, job.id)}
                    style={{
                      opacity: disabled ? 0.6 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <JobIcon>
                      {typeof job.icon === 'string' && job.icon.startsWith('/') ?
                        <img src={job.icon} alt={job.name} style={{ maxHeight: '48px', maxWidth: '48px' }} /> :
                        job.icon
                      }
                    </JobIcon>
                    <JobName $isSelected={job.selected}>{job.name}</JobName>
                  </JobCard>
                );
              })}
            </JobGrid>
          </RoleSection>
        ))}
      </RoleGrid>
    </Container>
  );
}

export default JobSelector;
