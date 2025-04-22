import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ffxivJobs } from '../data/sampleData';

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
  gap: 15px;
`;

const RoleSection = styled.div`
  background-color: ${props => props.theme.colors.cardBackground};
  border-radius: 6px;
  padding: 12px;
  box-shadow: ${props => props.theme.shadows.small};
  transition: background-color 0.3s ease;
`;

const RoleHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const RoleIcon = styled.span`
  font-size: 20px;
  margin-right: 8px;
`;

const RoleName = styled.h4`
  margin: 0;
  color: ${props => props.theme.colors.text};
`;

const JobGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
`;

const JobCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 6px;
  background-color: ${props => props.isSelected
    ? props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.2)' : '#e6f7ff'
    : props.theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f9f9f9'};
  border: 1px solid ${props => props.isSelected
    ? props.theme.colors.primary
    : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.small};
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.2)' : '#e6f7ff'};
  }
`;

const JobIcon = styled.div`
  height: 40px;
  width: 40px;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const JobName = styled.div`
  font-size: 12px;
  text-align: center;
  color: ${props => props.theme.colors.text};
  font-weight: ${props => props.isSelected ? 'bold' : 'normal'};
`;

// Role icons mapping
const roleIcons = {
  tank: '🛡️',
  healer: '💚',
  melee: '⚔️',
  ranged: '🏹',
  caster: '🔮'
};

// Role names mapping
const roleNames = {
  tank: 'Tanks',
  healer: 'Healers',
  melee: 'Melee DPS',
  ranged: 'Physical Ranged',
  caster: 'Magical Ranged'
};

function JobSelector({ onJobsChange }) {
  const [jobs, setJobs] = useState(() => {
    // Try to load from localStorage
    const savedJobs = localStorage.getItem('selectedJobs');
    return savedJobs ? JSON.parse(savedJobs) : ffxivJobs;
  });

  // Save jobs to localStorage when they change
  useEffect(() => {
    localStorage.setItem('selectedJobs', JSON.stringify(jobs));

    if (onJobsChange) {
      onJobsChange(jobs);
    }
  }, [jobs, onJobsChange]);

  // Toggle job selection
  const toggleJobSelection = (roleKey, jobId) => {
    setJobs(prev => {
      const updatedJobs = { ...prev };

      // Find the job in the role and toggle its selected state
      updatedJobs[roleKey] = updatedJobs[roleKey].map(job =>
        job.id === jobId ? { ...job, selected: !job.selected } : job
      );

      return updatedJobs;
    });
  };

  return (
    <Container>
      <Title>Select FFXIV Jobs</Title>

      <RoleGrid>
        {Object.entries(jobs).map(([roleKey, roleJobs]) => (
          <RoleSection key={roleKey}>
            <RoleHeader>
              <RoleIcon>{roleIcons[roleKey]}</RoleIcon>
              <RoleName>{roleNames[roleKey]}</RoleName>
            </RoleHeader>

            <JobGrid>
              {roleJobs.map(job => (
                <JobCard
                  key={job.id}
                  isSelected={job.selected}
                  onClick={() => toggleJobSelection(roleKey, job.id)}
                >
                  <JobIcon>
                    {typeof job.icon === 'string' && job.icon.startsWith('/') ?
                      <img src={job.icon} alt={job.name} style={{ maxHeight: '40px', maxWidth: '40px' }} /> :
                      job.icon
                    }
                  </JobIcon>
                  <JobName isSelected={job.selected}>{job.name}</JobName>
                </JobCard>
              ))}
            </JobGrid>
          </RoleSection>
        ))}
      </RoleGrid>
    </Container>
  );
}

export default JobSelector;
