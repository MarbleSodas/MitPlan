import { ffxivJobs } from '../../data';
import type { JobId, Job } from '../../types';

export const getJobById = (jobId: JobId): Job | null => {
  if (!jobId) return null;
  
  for (const jobs of Object.values(ffxivJobs)) {
    const job = jobs.find(j => j.id === jobId);
    if (job) return job;
  }
  
  return null;
};

export const getJobIcon = (jobId: JobId): string | null => {
  const job = getJobById(jobId);
  return job?.icon || null;
};

export const getJobName = (jobId: JobId): string | null => {
  const job = getJobById(jobId);
  return job?.name || null;
};
