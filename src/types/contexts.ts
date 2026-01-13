import type { User } from 'firebase/auth';
import type { ReactNode } from 'react';
import type { Job, JobId, Plan, MitigationAssignments, TankPositions, MitigationAbility, BossAction } from './index';

export interface ChildrenProp {
  children: ReactNode;
}

export interface AnonymousUser {
  id: string;
  displayName: string;
  isAnonymous: boolean;
  setDisplayName: (name: string) => void;
}

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  anonymousUser: AnonymousUser | null;
  isAnonymousMode: boolean;
  enableAnonymousMode: () => void;
  disableAnonymousMode: () => void;
  setAnonymousDisplayName: (name: string) => void;
  initializeAnonymousUser: (displayName?: string | null) => Promise<AnonymousUser>;
  getCurrentUser: () => User | AnonymousUser | null;
  hasUser: boolean;
  hasPendingMigration: boolean;
  setHasPendingMigration: (value: boolean) => void;
  checkForPendingMigration: () => Promise<void>;
  currentUser: User | AnonymousUser | null;
  displayName: string | null;
  userId: string | null;
}

export interface ThemeContextValue {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export interface FilterContextValue {
  showAllMitigations: boolean;
  toggleFilterMode: () => void;
  filterMitigations: (mitigations: MitigationAbility[], bossAction: BossAction | null) => MitigationAbility[];
  showPrecastOptions: boolean;
  togglePrecastOptions: () => void;
}

export type TankPosition = 'mainTank' | 'offTank';

export interface TankPositionContextValue {
  tankPositions: TankPositions;
  assignTankPosition: (tankJobId: JobId, position: TankPosition) => Promise<boolean>;
  clearTankPosition: (position: TankPosition) => Promise<boolean>;
  getTankForPosition: (position: TankPosition) => Job | null;
  isTankAssigned: (tankJobId: JobId) => boolean;
  getPositionForTank: (tankJobId: JobId) => TankPosition | null;
  selectedTankJobs: Job[];
  registerTankPositionChangeHandler: (handler: TankPositionChangeHandler) => () => void;
}

export type TankPositionChangeHandler = (
  oldPositions: TankPositions,
  newPositions: TankPositions
) => void;

export interface CollaborationContextValue {
  sessionId: string;
  activePlanId: string | null;
  collaborators: Collaborator[];
  isCollaborating: boolean;
  displayName: string;
  isInitialized: boolean;
  joinCollaborativeSession: (planId: string, displayName?: string | null) => Promise<void>;
  leaveCollaborativeSession: () => Promise<void>;
  setChangeOrigin: (origin: string) => void;
  isOwnChange: (origin: string | null) => boolean;
  updateDisplayName: (name: string) => Promise<void>;
  getCollaboratorDisplayName: (userId: string) => string;
}

export interface Collaborator {
  id: string;
  name: string;
  sessionId: string;
  userId?: string;
  lastActive?: number;
}

export interface PlanContextValue {
  plans: Plan[];
  currentPlan: Plan | null;
  loading: boolean;
  error: string | null;
  loadUserPlans: () => Promise<void>;
  createPlan: (planData: Partial<Plan>) => Promise<Plan>;
  updatePlan: (planId: string, updates: Partial<Plan>) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  loadPlan: (planId: string) => Promise<Plan | null>;
  setCurrentPlan: (plan: Plan | null) => void;
}

export interface RealtimePlanContextValue {
  realtimePlan: Plan | null;
  tankPositions: TankPositions;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  loadPlanRealtime: (planId: string) => Promise<void>;
  updatePlanRealtime: (updates: Partial<Plan>) => Promise<void>;
  updateAssignmentsRealtime: (assignments: MitigationAssignments) => Promise<void>;
  updateTankPositionsRealtime: (positions: TankPositions) => Promise<void>;
  clearRealtimePlan: () => void;
}

export interface RealtimeBossContextValue {
  currentBossId: string | null;
  currentBossLevel: number;
  setCurrentBoss: (bossId: string) => void;
  setCurrentBossLevel: (level: number) => void;
}

export interface RealtimeJobContextValue {
  selectedJobs: Record<string, Job[]>;
  updateSelectedJobs: (role: string, jobs: Job[]) => void;
  toggleJobSelection: (role: string, jobId: JobId) => void;
  clearJobSelections: () => void;
}

export interface RealtimeMitigationContextValue {
  assignments: MitigationAssignments;
  assignMitigation: (actionId: string, mitigation: MitigationAssignment) => Promise<void>;
  removeMitigation: (actionId: string, mitigationId: string, instanceId?: string) => Promise<void>;
  clearAssignments: () => void;
}

export interface MitigationAssignment {
  id: string;
  name?: string;
  instanceId?: string;
  tankPosition?: TankPosition | 'shared';
  precastSeconds?: number;
}

export interface TankSelectionModalContextValue {
  isOpen: boolean;
  openModal: (config: TankSelectionConfig) => void;
  closeModal: () => void;
  modalConfig: TankSelectionConfig | null;
}

export interface TankSelectionConfig {
  actionId: string;
  abilityId: string;
  abilityName: string;
  onSelect: (tankPosition: TankPosition) => void;
}

export interface ClassSelectionModalContextValue {
  isOpen: boolean;
  openModal: (config: ClassSelectionConfig) => void;
  closeModal: () => void;
  modalConfig: ClassSelectionConfig | null;
}

export interface ClassSelectionConfig {
  role: string;
  currentSelection: JobId[];
  onSelect: (jobs: JobId[]) => void;
}

export interface EnhancedMitigationContextValue {
  getCooldownState: (abilityId: string, jobId: JobId) => CooldownState;
  getAetherflowState: () => AetherflowState;
  getChargeState: (abilityId: string) => ChargeState;
  refreshCooldownStates: () => void;
}

export interface CooldownState {
  isAvailable: boolean;
  cooldownRemaining: number;
  totalCooldown: number;
}

export interface AetherflowState {
  currentStacks: number;
  maxStacks: number;
  nextRefreshTime: number;
}

export interface ChargeState {
  currentCharges: number;
  maxCharges: number;
  nextChargeTime: number;
}
