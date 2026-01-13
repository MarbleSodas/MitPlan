import type { MitigationAbility, Job, JobId, Role, MitigationAssignments, SelectedJobs } from '../../types';
import { mitigationAbilities, ffxivJobs } from '../../data';

export const compressString = (str: string): string => {
  try {
    return btoa(encodeURIComponent(str));
  } catch (error) {
    console.error('Error compressing string:', error);
    return '';
  }
};

export const decompressString = (compressed: string): string => {
  try {
    return decodeURIComponent(atob(compressed));
  } catch (error) {
    console.error('Error decompressing string:', error);
    return '';
  }
};

interface MinimalPlanData {
  v: string;
  b: string;
  a: MitigationAssignments;
  j: SelectedJobs;
}

interface FullPlanData {
  version: string;
  bossId: string;
  assignments: MitigationAssignments;
  selectedJobs: SelectedJobs;
  importDate?: string;
}

export const generateShareableUrl = (
  planData: FullPlanData,
  baseUrl: string = typeof window !== 'undefined' ? window.location.origin : ''
): string => {
  try {
    console.log('%c[URL UTILS] Generating shareable URL for plan data', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', planData);

    const minimalPlanData: MinimalPlanData = {
      v: planData.version || '1.2',
      b: planData.bossId,
      a: planData.assignments,
      j: planData.selectedJobs
    };

    console.log('%c[URL UTILS] Minimal plan data for URL', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', minimalPlanData);

    if (minimalPlanData.j) {
      Object.entries(minimalPlanData.j).forEach(([roleKey, jobIds]) => {
        console.log(`%c[URL UTILS] Role ${roleKey} has job IDs:`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', jobIds);

        if (!Array.isArray(jobIds)) {
          console.error(`%c[URL UTILS] ERROR: Job IDs for role ${roleKey} is not an array!`, 'background: red; color: white; padding: 2px 5px; border-radius: 3px;');
        }
      });
    }

    const jsonString = JSON.stringify(minimalPlanData);
    console.log('%c[URL UTILS] JSON string length:', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', jsonString.length);

    const compressedData = compressString(jsonString);
    console.log('%c[URL UTILS] Compressed data length:', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', compressedData.length);

    const url = `${baseUrl}?plan=${compressedData}`;
    console.log('%c[URL UTILS] Generated URL:', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', url);

    return url;
  } catch (error) {
    console.error('Error generating shareable URL:', error);
    return '';
  }
};

export const parseShareableUrl = (url: string): FullPlanData | null => {
  try {
    console.log('%c[URL UTILS] Parsing shareable URL', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', url);

    const urlObj = new URL(url);
    const compressedData = urlObj.searchParams.get('plan');

    if (!compressedData) {
      console.log('%c[URL UTILS] No plan data found in URL', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;');
      return null;
    }

    console.log('%c[URL UTILS] Compressed data length:', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', compressedData.length);

    const decompressedData = decompressString(compressedData);
    console.log('%c[URL UTILS] Decompressed data length:', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', decompressedData.length);

    const minimalPlanData = JSON.parse(decompressedData) as MinimalPlanData;
    console.log('%c[URL UTILS] Parsed minimal plan data:', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', minimalPlanData);

    if (minimalPlanData.j) {
      Object.entries(minimalPlanData.j).forEach(([roleKey, jobIds]) => {
        console.log(`%c[URL UTILS] Role ${roleKey} has job IDs:`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', jobIds);

        if (!Array.isArray(jobIds)) {
          console.error(`%c[URL UTILS] ERROR: Job IDs for role ${roleKey} is not an array!`, 'background: red; color: white; padding: 2px 5px; border-radius: 3px;');
        }
      });
    }

    const result: FullPlanData = {
      version: minimalPlanData.v,
      bossId: minimalPlanData.b,
      assignments: minimalPlanData.a,
      selectedJobs: minimalPlanData.j,
      importDate: new Date().toISOString()
    };

    console.log('%c[URL UTILS] Parsed plan data result:', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', result);

    return result;
  } catch (error) {
    console.error('Error parsing shareable URL:', error);
    return null;
  }
};

export const checkUrlForPlanData = (): FullPlanData | null => {
  try {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    return parseShareableUrl(currentUrl);
  } catch (error) {
    console.error('Error checking URL for plan data:', error);
    return null;
  }
};

export const reconstructMitigations = (
  assignments: Record<string, string[]>
): Record<string, MitigationAbility[]> => {
  const reconstructedAssignments: Record<string, MitigationAbility[]> = {};

  Object.entries(assignments).forEach(([bossActionId, mitigationIds]) => {
    reconstructedAssignments[bossActionId] = mitigationIds.map(id => {
      const mitigation = mitigationAbilities.find(m => m.id === id);
      if (!mitigation) {
        console.warn(`Mitigation with ID ${id} not found`);
        return null;
      }
      return mitigation;
    }).filter((m): m is MitigationAbility => m !== null);
  });

  return reconstructedAssignments;
};

interface JobWithSelected extends Job {
  selected: boolean;
}

type ReconstructedJobs = Record<Role, JobWithSelected[]>;

export const reconstructJobs = (selectedJobs: Record<string, JobId[]>): ReconstructedJobs => {
  console.log('%c[URL UTILS] Reconstructing jobs from IDs', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', selectedJobs);

  const reconstructedJobs: ReconstructedJobs = {} as ReconstructedJobs;

  Object.entries(ffxivJobs).forEach(([roleKey, jobs]) => {
    reconstructedJobs[roleKey as Role] = jobs.map(job => ({
      ...job,
      selected: false
    }));
  });

  Object.entries(selectedJobs).forEach(([roleKey, jobIds]) => {
    console.log(`%c[URL UTILS] Processing role ${roleKey} with job IDs`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', jobIds);

    const roleJobs = reconstructedJobs[roleKey as Role];
    if (roleJobs) {
      reconstructedJobs[roleKey as Role] = roleJobs.map(job => {
        const isSelected = jobIds.includes(job.id);
        console.log(`%c[URL UTILS] Job ${job.id} selected:`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', isSelected);

        return {
          ...job,
          selected: isSelected
        };
      });
    }
  });

  console.log('%c[URL UTILS] Reconstructed jobs result', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', reconstructedJobs);

  return reconstructedJobs;
};

export default {
  compressString,
  decompressString,
  generateShareableUrl,
  parseShareableUrl,
  checkUrlForPlanData,
  reconstructMitigations,
  reconstructJobs
};
