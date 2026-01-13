import type { Plan, MitigationAssignments, SelectedJobs, TankPositions } from '../../types';

declare global {
  interface Window {
    __BUILD_TIMESTAMP__?: number;
  }
}

export const BUILD_TIMESTAMP: number = (typeof window !== 'undefined' && window.__BUILD_TIMESTAMP__)
  ? window.__BUILD_TIMESTAMP__
  : Date.now();

export const checkForUpdates = (): boolean => {
  try {
    const storedVersion = localStorage.getItem('mitPlanVersion');

    if (!storedVersion) {
      localStorage.setItem('mitPlanVersion', BUILD_TIMESTAMP.toString());
      return false;
    }

    if (storedVersion !== BUILD_TIMESTAMP.toString()) {
      console.log('%c[VERSION] Update detected! Clearing localStorage and refreshing...',
        'background: #FF5722; color: white; padding: 2px 5px; border-radius: 3px;',
        { storedVersion, currentVersion: BUILD_TIMESTAMP });

      localStorage.clear();
      localStorage.setItem('mitPlanVersion', BUILD_TIMESTAMP.toString());
      window.location.reload();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking for updates:', error);
    return false;
  }
};

interface LegacyPlanData {
  version?: string;
  bossId?: string;
  boss?: string;
  assignments?: MitigationAssignments;
  mitigations?: MitigationAssignments;
  assignedMitigations?: MitigationAssignments;
  selectedJobs?: SelectedJobs;
  jobs?: SelectedJobs;
  tankPositions?: TankPositions;
  tankAssignments?: TankPositions;
  name?: string;
  title?: string;
  createdAt?: number | string;
  exportDate?: number | string;
}

interface MigratedPlanData {
  version: string;
  bossId: string;
  assignments: MitigationAssignments;
  selectedJobs: SelectedJobs;
  tankPositions?: TankPositions;
  name?: string;
  createdAt?: number | string;
}

export const migratePlanData = (planData: LegacyPlanData): MigratedPlanData => {
  if (!planData) {
    throw new Error('No plan data provided');
  }

  const migratedData: LegacyPlanData & { version: string } = { ...planData, version: planData.version || '1.0' };
  const version = planData.version || '1.0';

  console.log(`%c[MIGRATION] Migrating plan from version ${version}`,
    'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;');

  if (version === '1.0' || !version) {
    if (!migratedData.assignments && migratedData.mitigations) {
      migratedData.assignments = migratedData.mitigations;
      delete migratedData.mitigations;
    }

    if (!migratedData.selectedJobs && migratedData.jobs) {
      migratedData.selectedJobs = migratedData.jobs;
      delete migratedData.jobs;
    }

    migratedData.version = '1.2';
  }

  if (version === '1.1') {
    migratedData.version = '1.2';
  }

  if (migratedData.assignedMitigations && !migratedData.assignments) {
    migratedData.assignments = migratedData.assignedMitigations;
    delete migratedData.assignedMitigations;
  }

  if (migratedData.tankAssignments && !migratedData.tankPositions) {
    migratedData.tankPositions = migratedData.tankAssignments;
    delete migratedData.tankAssignments;
  }

  migratedData.assignments = migratedData.assignments || {};
  migratedData.selectedJobs = migratedData.selectedJobs || {} as SelectedJobs;
  migratedData.bossId = migratedData.bossId || 'ketuduke';

  if (migratedData.boss && !migratedData.bossId) {
    migratedData.bossId = migratedData.boss;
    delete migratedData.boss;
  }

  if (migratedData.title && !migratedData.name) {
    migratedData.name = migratedData.title;
  }

  if (migratedData.exportDate && !migratedData.createdAt) {
    migratedData.createdAt = migratedData.exportDate;
  }

  migratedData.version = '1.2';

  console.log(`%c[MIGRATION] Migration complete. Final version: ${migratedData.version}`,
    'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');

  return migratedData as MigratedPlanData;
};

export const validatePlanData = (planData: Partial<Plan> | null | undefined): boolean => {
  if (!planData) {
    return false;
  }

  const requiredFields: (keyof Plan)[] = ['bossId', 'assignments'];

  for (const field of requiredFields) {
    if (!(field in planData)) {
      console.warn(`%c[VALIDATION] Missing required field: ${field}`,
        'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
      return false;
    }
  }

  if (typeof planData.assignments !== 'object') {
    console.warn(`%c[VALIDATION] Invalid assignments field type`,
      'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
    return false;
  }

  if (planData.selectedJobs && typeof planData.selectedJobs !== 'object') {
    console.warn(`%c[VALIDATION] Invalid selectedJobs field type`,
      'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
    return false;
  }

  return true;
};

export default {
  BUILD_TIMESTAMP,
  checkForUpdates,
  migratePlanData,
  validatePlanData
};
