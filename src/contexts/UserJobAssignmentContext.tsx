import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useRealtimePlan } from './RealtimePlanContext';
import { useCollaboration } from './CollaborationContext';
import { useAuth } from './AuthContext';
import { useRealtimeJobContext } from './RealtimeJobContext';
import { 
  claimJob as claimJobService, 
  releaseJob as releaseJobService,
  subscribeToJobAssignments 
} from '../services/realtimePlanService';
import { getColorFromUserId } from '../types/presence';
import { mitigationAbilities } from '../data';
import type { JobId, JobAssignments, UserJobAssignment, MitigationAbility } from '../types';

interface UserJobAssignmentContextValue {
  jobAssignments: JobAssignments;
  myAssignedJob: JobId | null;
  myColor: string;
  myUserId: string | null;
  myDisplayName: string;
  
  claimJob: (jobId: JobId) => Promise<boolean>;
  releaseJob: () => Promise<void>;
  
  getJobAssignment: (jobId: JobId) => UserJobAssignment | null;
  isJobClaimedByMe: (jobId: JobId) => boolean;
  isJobClaimed: (jobId: JobId) => boolean;
  canClaimJob: (jobId: JobId) => boolean;
  getUserColor: (userId: string) => string;
  
  getMyAbilities: () => MitigationAbility[];
  canICast: (ability: MitigationAbility) => boolean;
  getAbilityCasterInfo: (ability: MitigationAbility) => { jobId: JobId; assignment: UserJobAssignment | null } | null;
}

interface UserJobAssignmentProviderProps {
  children: ReactNode;
}

const UserJobAssignmentContext = createContext<UserJobAssignmentContextValue | null>(null);

export const useUserJobAssignment = (): UserJobAssignmentContextValue => {
  const context = useContext(UserJobAssignmentContext);
  if (!context) {
    throw new Error('useUserJobAssignment must be used within a UserJobAssignmentProvider');
  }
  return context;
};

export const useUserJobAssignmentOptional = (): UserJobAssignmentContextValue | null => {
  return useContext(UserJobAssignmentContext);
};

export const UserJobAssignmentProvider = ({ children }: UserJobAssignmentProviderProps) => {
  const { planId } = useRealtimePlan();
  const { user, anonymousUser, isAnonymousMode } = useAuth();
  const { displayName: collaborationDisplayName } = useCollaboration();
  const { selectedJobs } = useRealtimeJobContext();
  
  const [jobAssignments, setJobAssignments] = useState<JobAssignments>({});
  
  const userId = useMemo(() => {
    if (user?.uid) return user.uid;
    if (isAnonymousMode && anonymousUser?.id) return anonymousUser.id;
    return null;
  }, [user?.uid, isAnonymousMode, anonymousUser?.id]);
  
  const displayName = useMemo(() => {
    if (collaborationDisplayName) return collaborationDisplayName;
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    if (anonymousUser?.displayName) return anonymousUser.displayName;
    return 'Anonymous User';
  }, [collaborationDisplayName, user?.displayName, user?.email, anonymousUser?.displayName]);
  
  const myColor = useMemo(() => {
    return userId ? getColorFromUserId(userId) : '#3b82f6';
  }, [userId]);
  
  const myAssignedJob = useMemo((): JobId | null => {
    if (!userId) return null;
    
    for (const [jobId, assignment] of Object.entries(jobAssignments)) {
      if (assignment?.userId === userId) {
        return jobId as JobId;
      }
    }
    return null;
  }, [jobAssignments, userId]);
  
  useEffect(() => {
    if (!planId) {
      setJobAssignments({});
      return;
    }
    
    const unsubscribe = subscribeToJobAssignments(planId, (assignments) => {
      setJobAssignments(assignments || {});
    });
    
    return () => {
      unsubscribe();
    };
  }, [planId]);
  
  const claimJob = useCallback(async (jobId: JobId): Promise<boolean> => {
    if (!planId || !userId || !displayName) {
      console.warn('[UserJobAssignment] Cannot claim job - missing planId, userId, or displayName', {
        planId,
        userId,
        displayName
      });
      return false;
    }
    
    if (myAssignedJob && myAssignedJob !== jobId) {
      console.log('[UserJobAssignment] Switching jobs: releasing', myAssignedJob, 'to claim', jobId);
      await releaseJobService(planId, myAssignedJob, userId);
    }
    
    const color = getColorFromUserId(userId);
    console.log('[UserJobAssignment] Claiming job:', { jobId, userId, displayName, color });
    const success = await claimJobService(planId, jobId, userId, displayName, color);
    
    return success;
  }, [planId, userId, displayName, myAssignedJob]);
  
  const releaseJob = useCallback(async (): Promise<void> => {
    if (!planId || !userId || !myAssignedJob) {
      console.warn('[UserJobAssignment] Cannot release job - no job assigned');
      return;
    }
    
    await releaseJobService(planId, myAssignedJob, userId);
  }, [planId, userId, myAssignedJob]);
  
  const getJobAssignment = useCallback((jobId: JobId): UserJobAssignment | null => {
    return jobAssignments[jobId] || null;
  }, [jobAssignments]);
  
  const isJobClaimedByMe = useCallback((jobId: JobId): boolean => {
    const assignment = jobAssignments[jobId];
    return !!assignment && assignment.userId === userId;
  }, [jobAssignments, userId]);
  
  const isJobClaimed = useCallback((jobId: JobId): boolean => {
    return !!jobAssignments[jobId];
  }, [jobAssignments]);
  
  const canClaimJob = useCallback((jobId: JobId): boolean => {
    if (!userId) return false;
    if (isJobClaimed(jobId) && !isJobClaimedByMe(jobId)) return false;
    return true;
  }, [userId, isJobClaimed, isJobClaimedByMe]);
  
  const getUserColor = useCallback((targetUserId: string): string => {
    return getColorFromUserId(targetUserId);
  }, []);
  
  const getSelectedJobIds = useCallback((): JobId[] => {
    const jobIds: JobId[] = [];
    if (!selectedJobs) return jobIds;
    
    Object.values(selectedJobs).forEach((roleJobs) => {
      if (Array.isArray(roleJobs)) {
        roleJobs.forEach((job) => {
          if (typeof job === 'string') {
            jobIds.push(job as JobId);
          } else if (job?.selected && job?.id) {
            jobIds.push(job.id as JobId);
          }
        });
      }
    });
    
    return jobIds;
  }, [selectedJobs]);
  
  const getMyAbilities = useCallback((): MitigationAbility[] => {
    if (!myAssignedJob) return [];
    
    return mitigationAbilities.filter((ability) => 
      ability.jobs.includes(myAssignedJob)
    );
  }, [myAssignedJob]);
  
  const canICast = useCallback((ability: MitigationAbility): boolean => {
    if (!myAssignedJob) return false;
    return ability.jobs.includes(myAssignedJob);
  }, [myAssignedJob]);
  
  const getAbilityCasterInfo = useCallback((ability: MitigationAbility): { jobId: JobId; assignment: UserJobAssignment | null } | null => {
    const selectedJobIds = getSelectedJobIds();
    
    const eligibleJob = ability.jobs.find(jobId => selectedJobIds.includes(jobId));
    
    if (!eligibleJob) return null;
    
    return {
      jobId: eligibleJob,
      assignment: jobAssignments[eligibleJob] || null
    };
  }, [getSelectedJobIds, jobAssignments]);
  
  const value = useMemo<UserJobAssignmentContextValue>(() => ({
    jobAssignments,
    myAssignedJob,
    myColor,
    myUserId: userId,
    myDisplayName: displayName,
    claimJob,
    releaseJob,
    getJobAssignment,
    isJobClaimedByMe,
    isJobClaimed,
    canClaimJob,
    getUserColor,
    getMyAbilities,
    canICast,
    getAbilityCasterInfo
  }), [
    jobAssignments,
    myAssignedJob,
    myColor,
    userId,
    displayName,
    claimJob,
    releaseJob,
    getJobAssignment,
    isJobClaimedByMe,
    isJobClaimed,
    canClaimJob,
    getUserColor,
    getMyAbilities,
    canICast,
    getAbilityCasterInfo
  ]);
  
  return (
    <UserJobAssignmentContext.Provider value={value}>
      {children}
    </UserJobAssignmentContext.Provider>
  );
};

export default UserJobAssignmentContext;
