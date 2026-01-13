import React from 'react';
import JobAssignmentCard from './JobAssignmentCard';
import type { Job, JobId, Role, UserJobAssignment } from '../../types';
import { useUserJobAssignmentOptional } from '../../contexts/UserJobAssignmentContext';

interface JobAssignmentGridProps {
  selectedJobs: Record<Role, Job[]>;
  excludeRoles?: Role[];
}

const ROLE_LABELS: Record<Role, string> = {
  tank: 'Tanks',
  healer: 'Healers',
  melee: 'Melee DPS',
  ranged: 'Ranged DPS',
  caster: 'Casters'
};

const ROLE_ORDER: Role[] = ['tank', 'healer', 'melee', 'ranged', 'caster'];

const JobAssignmentGrid = ({ selectedJobs, excludeRoles = [] }: JobAssignmentGridProps) => {
  const jobAssignment = useUserJobAssignmentOptional();
  
  if (!jobAssignment) {
    return null;
  }
  
  const { 
    jobAssignments, 
    myAssignedJob, 
    claimJob, 
    releaseJob, 
    canClaimJob,
    isJobClaimedByMe 
  } = jobAssignment;
  
  const getSelectedJobsForRole = (role: Role): Job[] => {
    const roleJobs = selectedJobs[role];
    if (!Array.isArray(roleJobs)) return [];
    
    return roleJobs.filter((job): job is Job => {
      if (typeof job === 'string') return false;
      return job?.selected === true;
    });
  };
  
  const handleClaim = async (jobId: JobId) => {
    await claimJob(jobId);
  };
  
  const handleRelease = async () => {
    await releaseJob();
  };
  
  const rolesToRender = ROLE_ORDER.filter(role => !excludeRoles.includes(role));
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {rolesToRender.map(role => {
        const jobs = getSelectedJobsForRole(role);
        if (jobs.length === 0) return null;
        
        return (
          <div key={role} className="flex flex-col gap-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {ROLE_LABELS[role]}
            </h4>
            <div className="flex flex-wrap gap-2">
              {jobs.map(job => {
                const assignment: UserJobAssignment | null = jobAssignments[job.id] || null;
                const isMyJob = isJobClaimedByMe(job.id);
                const canClaim = canClaimJob(job.id);
                
                return (
                  <JobAssignmentCard
                    key={job.id}
                    job={job}
                    assignment={assignment}
                    isMyJob={isMyJob}
                    canClaim={canClaim}
                    onClaim={() => handleClaim(job.id)}
                    onRelease={handleRelease}
                    compact
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default JobAssignmentGrid;
