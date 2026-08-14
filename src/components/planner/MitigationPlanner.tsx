import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from '@/lib/navigation';

import { DndContext, DragOverlay, closestCenter, useSensor, useSensors, MouseSensor, KeyboardSensor } from '@dnd-kit/core';
import { useAuth } from '../../contexts/AuthContext';
import { useCollaboration } from '../../contexts/CollaborationContext';
import { mitigationAbilities, ffxivJobs } from '../../data';
import { determineMitigationAssignment } from '../../utils/mitigation/autoAssignmentUtils';
import { getAvailableAbilities } from '../../utils';
// import { useAutoAssignment } from '../../hooks/useAutoAssignment';
import { useNavigate } from '@/lib/navigation';

import {
  ArrowLeft,
  Edit2,
  GripVertical,
  History,
  Maximize2,
  Minimize2,
  Search,
  Share2,
  RefreshCw,
  Undo2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import ActiveUsersDisplay from '../collaboration/ActiveUsersDisplay';
import CollaborationAutoJoin from '../collaboration/CollaborationAutoJoin';
import CollaborationStatusNotice from '../collaboration/CollaborationStatusNotice';
import PresenceSurface from '../collaboration/PresenceSurface';
import SectionPresencePill from '../collaboration/SectionPresencePill';
import ThemeToggle from '../common/ThemeToggle';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import HealingPotencyInput from '../common/HealingPotencyInput/HealingPotencyInput';
import PrecastToggle from '../common/PrecastToggle';
import Footer from '../layout/Footer';


// Import planning components
import JobSelector from '../../features/jobs/JobSelector/JobSelector';
import TankHealthInputs from '../../features/jobs/JobSelector/TankHealthInputs';

import BossActionItem from '../BossActionItem/BossActionItem';
import MitigationItem from '../MitigationItem/MitigationItem';
import AssignedMitigations from '../AssignedMitigations/AssignedMitigations';
import MobileBossTimeline from './MobileBossTimeline';
import MitigationBottomSheet from './MitigationBottomSheet';

import FilterToggle from '../common/FilterToggle';
import TankSelectionModal from '../common/TankSelectionModal';
import Draggable from '../DragAndDrop/Draggable';
import Droppable from '../DragAndDrop/Droppable';
import PartyMinHealthInput from '../common/PartyMinHealthInput/PartyMinHealthInput';


// Import contexts
import {
  useFilterContext,
  useTankPositionContext,
  useTankSelectionModalContext
} from '../../contexts';
import { useClassSelectionModalContext } from '../../contexts/ClassSelectionModalContext';

// Import real-time contexts
import { useRealtimePlan } from '../../contexts/RealtimePlanContext';
import { useRealtimeBossContext } from '../../contexts/RealtimeBossContext';
import { useRealtimeJobContext } from '../../contexts/RealtimeJobContext';
import { useEnhancedMitigation } from '../../contexts/EnhancedMitigationContext';
import RealtimeAppProvider from '../../contexts/RealtimeAppProvider';
import { usePresenceOptional } from '../../contexts/PresenceContext';
import { useUserJobAssignmentOptional } from '../../contexts/UserJobAssignmentContext';
import type { BossAction } from '../../types';
import {
  getPlanAbilityModeLabel,
  normalizePlanAbilityMode,
} from '../../utils/abilities/abilityModeUtils';
import {
  createPlanShareLink,
  listPublishedTimelineVersions,
} from '../../services/normalizedPlanService';

// Import utilities
// import { mitigationAbilities } from '../../data';
// import { isMitigationAvailable, getAvailableAbilities } from '../../utils';
// import { useAutoAssignment } from '../../hooks/useAutoAssignment';











// Planning interface component that gets data from real-time contexts
const PlanningInterface = ({
  handleBack,
  isReadOnlyView,
}) => {
  const navigate = useNavigate();

  // Get real-time plan data
  const {
    loading,
    error,
    realtimePlan,
    connectionState,
    changes,
    preference,
    permissions,
    undoChange,
    previewTimelineUpgrade,
    applyTimelineSelection,
    savePreferences,
  } = useRealtimePlan();
  const canEditPlan = !isReadOnlyView && permissions?.canEdit !== false;
  const planAbilityMode = normalizePlanAbilityMode(realtimePlan?.mode);

  // Get real-time contexts - ALWAYS call all hooks before any early returns
  const {
    sortedBossActions,
    selectedBossAction,
    toggleBossActionSelection,
    currentBossLevel,
    currentBaseHealth,
    timelinePhaseSummaries,
    skippedBossActions,
  } = useRealtimeBossContext();
  const { selectedJobs } = useRealtimeJobContext();
  const {
    assignments,
    addMitigation,
    removeMitigation,
    checkAbilityAvailability,
    getActiveMitigations,
    pendingAssignments,
    updateMitigationPrecast,
  } = useEnhancedMitigation();

  const presence = usePresenceOptional();
  const collaboration = useCollaboration() as {
    collaborators: Array<{ sessionId: string; userId: string; displayName: string; color?: string; isActive?: boolean }>;
    sessionId: string | null;
  };

  // Split pane ratio state (timeline/mitigation)
  const { planId } = useParams();
  const splitContainerRef = useRef(null);
  const [splitRatio, setSplitRatio] = useState(0.66);
  const restoredPreferenceRef = useRef(false);

  useEffect(() => {
    if (!restoredPreferenceRef.current || !planId) return undefined;
    const timer = window.setTimeout(() => {
      void savePreferences({ panelRatio: splitRatio }).catch(() => {
        // Preference sync is best-effort and never blocks plan editing.
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [planId, savePreferences, splitRatio]);

  const timelinePercent = Math.round(splitRatio * 100);
  const mitigationPercent = 100 - timelinePercent;

  // Drag-to-resize handler for the split pane
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startRatioRef = useRef(splitRatio);

  const onResizerMouseDown = useCallback((e) => {
    // Prevent starting a DnD-kit drag from the handle
    e.preventDefault();
    e.stopPropagation();
    if (!splitContainerRef.current) return;
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startRatioRef.current = splitRatio;

    const onMove = (ev) => {
      if (!draggingRef.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      if (!rect.width) return;
      const delta = (ev.clientX - startXRef.current) / rect.width;
      let next = startRatioRef.current + delta;
      // Clamp to keep reasonable min/max widths
      next = Math.max(0.4, Math.min(0.8, next));
      setSplitRatio(next);
    };

    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [splitRatio]);

  const onResizerKeyDown = useCallback((event) => {
    const step = event.shiftKey ? 0.05 : 0.02;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setSplitRatio((ratio) => Math.max(0.4, ratio - step));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      setSplitRatio((ratio) => Math.min(0.8, ratio + step));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setSplitRatio(0.4);
    } else if (event.key === 'End') {
      event.preventDefault();
      setSplitRatio(0.8);
    }
  }, []);

  const { filterMitigations } = useFilterContext();
  const { tankPositions } = useTankPositionContext();
  const { openClassSelectionModal } = useClassSelectionModalContext();
  const jobAssignment = useUserJobAssignmentOptional();
  const myAssignedJob = jobAssignment?.myAssignedJob || null;
  const myUserId = jobAssignment?.myUserId || null;
  const myDisplayName = jobAssignment?.myDisplayName || null;
  const myColor = jobAssignment?.myColor || null;

  const getCasterOptions = useCallback((overrideCasterJobId?: string | null) => {
    if (!myUserId) return {};
    return {
      casterJobId: overrideCasterJobId ?? myAssignedJob,
      casterUserId: myUserId,
      casterDisplayName: myDisplayName,
      casterColor: myColor
    };
  }, [myAssignedJob, myUserId, myDisplayName, myColor]);

  const { openTankSelectionModal } = useTankSelectionModalContext();
  const addMitigationHandler = canEditPlan ? addMitigation : () => {};
  const removeMitigationHandler = canEditPlan ? removeMitigation : () => {};
  const updateMitigationPrecastHandler = canEditPlan ? updateMitigationPrecast : () => {};
  const phaseOverrides = realtimePlan?.phaseOverrides || {};

  // Local state for drag and drop
  const [activeMitigation, setActiveMitigation] = useState(null);

  // Search and filter state for mitigations
  const [mitigationSearchQuery, setMitigationSearchQuery] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState<string | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [showTimelineUpgrade, setShowTimelineUpgrade] = useState(false);
  const [timelineVersions, setTimelineVersions] = useState<Array<{
    id: string;
    versionLabel: string;
    gamePatch?: string | null;
    routeIds: string[];
  }>>([]);
  const [selectedTimelineVersionId, setSelectedTimelineVersionId] = useState('');
  const [selectedTimelineRouteId, setSelectedTimelineRouteId] = useState('');
  const [timelineUpgradePreview, setTimelineUpgradePreview] = useState<{
    unchanged: string[];
    moved: string[];
    metadataChanged: string[];
    added: string[];
    removed: string[];
    ambiguous: string[];
  } | null>(null);
  const [timelineUpgradeBusy, setTimelineUpgradeBusy] = useState(false);
  const restoredFocusRef = useRef(false);
  const selectedPhaseId =
    (selectedBossAction as BossAction & { phaseId?: string } | null)?.phaseId || null;

  useEffect(() => {
    if (!preference || restoredPreferenceRef.current) return;
    restoredPreferenceRef.current = true;
    setSplitRatio(Math.min(0.8, Math.max(0.4, preference.panelRatio || 0.66)));
    setMitigationSearchQuery(
      typeof preference.filters?.mitigationSearchQuery === 'string'
        ? preference.filters.mitigationSearchQuery
        : ''
    );
    setSelectedJobFilter(
      typeof preference.filters?.selectedJobFilter === 'string'
        ? preference.filters.selectedJobFilter
        : null
    );
  }, [preference]);

  useEffect(() => {
    if (!preference || restoredFocusRef.current || sortedBossActions.length === 0) return;
    restoredFocusRef.current = true;
    const storedEvent = sortedBossActions.find(
      (action) => action.id === preference.lastEventKey
    );
    const phaseFallback = sortedBossActions.find(
      (action) => (
        (action as BossAction & { phaseId?: string }).phaseId === preference.lastPhaseId
      )
    );
    const nextAction = storedEvent || phaseFallback || sortedBossActions[0];
    if (nextAction && selectedBossAction?.id !== nextAction.id) {
      toggleBossActionSelection(nextAction);
    }
  }, [
    preference,
    selectedBossAction?.id,
    sortedBossActions,
    toggleBossActionSelection,
  ]);

  useEffect(() => {
    if (!restoredPreferenceRef.current) return;
    const timer = window.setTimeout(() => {
      void savePreferences({
        lastEventKey: selectedBossAction?.id || null,
        lastPhaseId: selectedPhaseId,
        filters: {
          mitigationSearchQuery,
          selectedJobFilter,
        },
      }).catch(() => {});
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    mitigationSearchQuery,
    savePreferences,
    selectedBossAction?.id,
    selectedPhaseId,
    selectedJobFilter,
  ]);

  const connectionLabel = {
    loading: 'Loading',
    connecting: 'Connecting',
    saved: 'Saved',
    saving: 'Saving…',
    reconnecting: 'Reconnecting…',
    'offline-queued': 'Offline · queued',
    error: 'Save error',
  }[connectionState] || 'Saved';

  const handleCreateShareLink = useCallback(async () => {
    if (!planId || !permissions?.canAdmin) return;
    try {
      const share = await createPlanShareLink(planId);
      const url = `${window.location.origin}/plan/view/${share.token}`;
      await navigator.clipboard.writeText(url);
      toast.success('View link copied', {
        description: 'Anonymous viewers see the latest saved snapshot after refresh.',
      });
    } catch (shareError) {
      toast.error('Could not create view link', {
        description: shareError instanceof Error ? shareError.message : 'Please try again.',
      });
    }
  }, [permissions?.canAdmin, planId]);

  const handleOpenTimelineUpgrade = useCallback(async () => {
    if (!realtimePlan?.bossId) return;
    setTimelineUpgradeBusy(true);
    setTimelineUpgradePreview(null);
    setShowTimelineUpgrade(true);
    try {
      const versions = await listPublishedTimelineVersions(realtimePlan.bossId);
      setTimelineVersions(versions);
      const initial = versions.find(
        (version) => version.id === realtimePlan.timelineVersionId
      ) || versions[0];
      setSelectedTimelineVersionId(initial?.id || '');
      setSelectedTimelineRouteId(
        initial?.routeIds?.includes(realtimePlan.routeId || '')
          ? realtimePlan.routeId || initial.routeIds[0] || 'default'
          : initial?.routeIds?.[0] || 'default'
      );
    } catch (upgradeError) {
      toast.error('Could not load timeline versions', {
        description: upgradeError instanceof Error ? upgradeError.message : 'Please try again.',
      });
      setShowTimelineUpgrade(false);
    } finally {
      setTimelineUpgradeBusy(false);
    }
  }, [
    realtimePlan?.bossId,
    realtimePlan?.routeId,
    realtimePlan?.timelineVersionId,
  ]);

  const selectedTimelineVersion = timelineVersions.find(
    (version) => version.id === selectedTimelineVersionId
  );

  const handlePreviewTimelineUpgrade = useCallback(async () => {
    if (!selectedTimelineVersionId) return;
    setTimelineUpgradeBusy(true);
    try {
      setTimelineUpgradePreview(
        await previewTimelineUpgrade(selectedTimelineVersionId)
      );
    } catch (upgradeError) {
      toast.error('Could not preview this change', {
        description: upgradeError instanceof Error ? upgradeError.message : 'Please try again.',
      });
    } finally {
      setTimelineUpgradeBusy(false);
    }
  }, [previewTimelineUpgrade, selectedTimelineVersionId]);

  const handleApplyTimelineUpgrade = useCallback(async () => {
    if (!selectedTimelineVersionId || !selectedTimelineRouteId || !timelineUpgradePreview) return;
    setTimelineUpgradeBusy(true);
    try {
      await applyTimelineSelection(selectedTimelineVersionId, selectedTimelineRouteId);
      setShowTimelineUpgrade(false);
      toast.success('Timeline selection updated', {
        description: 'The reviewed change was committed as one undoable plan revision.',
      });
    } catch (upgradeError) {
      toast.error('Could not apply timeline change', {
        description: upgradeError instanceof Error ? upgradeError.message : 'Please try again.',
      });
    } finally {
      setTimelineUpgradeBusy(false);
    }
  }, [
    applyTimelineSelection,
    selectedTimelineRouteId,
    selectedTimelineVersionId,
    timelineUpgradePreview,
  ]);

  // Mobile bottom sheet state
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const openPartySetup = useCallback(() => {
    setIsBottomSheetOpen(false);
    requestAnimationFrame(() => {
      document.getElementById('planner-party-setup')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  // Fullscreen overlay state and handlers for timeline + mitigations
	  const [fsMounted, setFsMounted] = useState(false);
	  const [fsOpen, setFsOpen] = useState(false);
	  const fsDialogRef = useRef<HTMLDivElement | null>(null);
	  const fsCloseButtonRef = useRef<HTMLButtonElement | null>(null);
	  const previousFocusedElementRef = useRef<HTMLElement | null>(null);
	  const openFullscreen = useCallback(() => {
	    if (fsMounted) return;
	    setFsMounted(true);
	    // Next frame to allow transition from opacity-0 to 100
	    requestAnimationFrame(() => setFsOpen(true));
	  }, [fsMounted]);
	  const closeFullscreen = useCallback(() => {
	    setFsOpen(false);
	    // Unmount after transition ends
	    setTimeout(() => setFsMounted(false), 300);
	  }, []);
	  // Focus the close control on entry and return focus to the opener on exit.
	  useEffect(() => {
	    if (!fsMounted) return;
	    previousFocusedElementRef.current = document.activeElement as HTMLElement | null;
	    requestAnimationFrame(() => fsCloseButtonRef.current?.focus());
	    return () => {
	      previousFocusedElementRef.current?.focus?.();
	    };
	  }, [fsMounted]);
	  // ESC to exit fullscreen
	  useEffect(() => {
	    if (!fsMounted) return;
	    const onKeyDown = (e) => {
	      if (e.key === 'Escape') {
	        e.preventDefault();
	        closeFullscreen();
	        return;
	      }
	      if (e.key === 'Tab' && fsDialogRef.current) {
	        const focusable = Array.from(fsDialogRef.current.querySelectorAll<HTMLElement>(
	          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
	        )).filter((element) => element.getClientRects().length > 0);
	        if (focusable.length === 0) return;
	        const first = focusable[0];
	        const last = focusable[focusable.length - 1];
	        if (e.shiftKey && document.activeElement === first) {
	          e.preventDefault();
	          last.focus();
	        } else if (!e.shiftKey && document.activeElement === last) {
	          e.preventDefault();
	          first.focus();
	        }
	      }
	    };
	    window.addEventListener('keydown', onKeyDown);
	    return () => window.removeEventListener('keydown', onKeyDown);
	  }, [fsMounted, closeFullscreen]);
	  // Lock page scroll when fullscreen is mounted
	  useEffect(() => {
	    if (!fsMounted) return;
	    const prev = document.body.style.overflow;
	    document.body.style.overflow = 'hidden';
	    return () => { document.body.style.overflow = prev; };
	  }, [fsMounted]);

  // Enhanced boss action selection with disabled auto-assignment
  const handleBossActionSelection = useCallback((action) => {
    const wasSelected = selectedBossAction?.id === action.id;
    const isBeingSelected = !wasSelected;

    toggleBossActionSelection(action);

    if (presence) {
      if (isBeingSelected) {
        presence.setActiveTarget({
          surface: 'planner',
          entityType: 'bossAction',
          entityId: action.id,
        });
        presence.setInteraction('selected');
      } else {
        presence.setInteraction(null);
        presence.setActiveTarget(null);
      }
    }

    // On mobile, open bottom sheet when selecting a boss action
    if (window.innerWidth < 1280 && isBeingSelected) {
      setIsBottomSheetOpen(true);
    }

    console.log('[MitigationPlanner] Boss action selected:', {
      actionId: action.id,
      actionName: action.name,
      isBeingSelected,
      autoAssignmentDisabled: true
    });
  }, [toggleBossActionSelection, selectedBossAction, presence]);

  const handleEditTimeline = useCallback(() => {
    if (!canEditPlan || !planId) {
      return;
    }

    navigate(`/plan/${planId}/timeline`);
  }, [canEditPlan, navigate, planId]);

  // Get available mitigations based on selected jobs and boss level - MUST be called before early returns
  const availableMitigations = useMemo(() => {
    return getAvailableAbilities(
      mitigationAbilities,
      selectedJobs,
      currentBossLevel,
      planAbilityMode
    );
  }, [selectedJobs, currentBossLevel, planAbilityMode]);

  // Filter mitigations based on selected boss action and filter settings - MUST be called before early returns
  const filteredMitigations = useMemo(() => {
    if (!selectedBossAction) {
      return filterMitigations(availableMitigations, null, myAssignedJob);
    }

    return filterMitigations(availableMitigations, selectedBossAction, myAssignedJob);
  }, [availableMitigations, selectedBossAction, filterMitigations, myAssignedJob]);

  // Get jobs that have mitigations AND are selected in the raid
  const availableJobs = useMemo(() => {
    const jobs = new Set<string>();
    if (selectedJobs && typeof selectedJobs === 'object') {
      Object.values(selectedJobs).forEach(roleJobs => {
        if (Array.isArray(roleJobs)) {
          roleJobs.forEach(job => {
            if (job?.selected) {
              jobs.add(job.id);
            }
          });
        }
      });
    }
    return Array.from(jobs).sort();
  }, [selectedJobs]);

  // Fuzzy search function for mitigation names
  const fuzzyMatch = (text: string, query: string): boolean => {
    if (!query.trim()) return true;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    if (lowerText.includes(lowerQuery)) return true;
    
    let queryIndex = 0;
    for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
      if (lowerText[i] === lowerQuery[queryIndex]) {
        queryIndex++;
      }
    }
    return queryIndex === lowerQuery.length;
  };

  // Filter mitigations by search query and job
  const searchedMitigations = useMemo(() => {
    let result = filteredMitigations;
    
    if (selectedJobFilter) {
      result = result.filter(m => m.jobs?.includes(selectedJobFilter));
    }
    
    if (mitigationSearchQuery.trim()) {
      result = result.filter(m => 
        fuzzyMatch(m.name, mitigationSearchQuery) ||
        fuzzyMatch(m.description || '', mitigationSearchQuery)
      );
    }
    
    return result;
  }, [filteredMitigations, selectedJobFilter, mitigationSearchQuery]);

  const phaseSummaryByAnchorActionId = useMemo(() => {
    return new Map(
      (timelinePhaseSummaries || []).map((summary) => [summary.anchorActionId, summary])
    );
  }, [timelinePhaseSummaries]);

  const skippedActionsByPhaseId = useMemo(() => {
    return (skippedBossActions || []).reduce<Record<string, BossAction[]>>((accumulator, action) => {
      const phaseId = action.phaseId || 'unassigned';
      accumulator[phaseId] = accumulator[phaseId] || [];
      accumulator[phaseId].push(action);
      return accumulator;
    }, {});
  }, [skippedBossActions]);

  const renderTimelineRows = useCallback((idSuffix = '') => {
    return (sortedBossActions || []).map((action, actionIndex) => {
      const phaseSummary = phaseSummaryByAnchorActionId.get(action.id) || null;
      const phaseSkippedActions = phaseSummary
        ? skippedActionsByPhaseId[phaseSummary.phaseId] || []
        : [];
      const isSelected = selectedBossAction?.id === action.id;
      const droppableId = `${action.id}__${actionIndex}${idSuffix}`;

      return (
        <Droppable
          key={droppableId}
          id={droppableId}
          data={{ type: 'bossAction', action }}
          disableDrop={!isSelected}
          isSelected={isSelected}
        >
          <BossActionItem
            action={action}
            isSelected={isSelected}
            assignments={assignments}
            getActiveMitigations={getActiveMitigations}
            selectedJobs={selectedJobs}
            currentBossLevel={currentBossLevel}
            baseHealth={currentBaseHealth}
            phaseSummary={phaseSummary}
            phaseOverrides={phaseOverrides}
            skippedActions={phaseSkippedActions}
            phaseOverridesDisabled={!canEditPlan}
            onClick={() => handleBossActionSelection(action)}
          >
            <AssignedMitigations
              action={action}
              assignments={assignments}
              getActiveMitigations={getActiveMitigations}
              selectedJobs={selectedJobs}
              currentBossLevel={currentBossLevel}
              onUpdatePrecast={updateMitigationPrecastHandler}
              onRemoveMitigation={removeMitigationHandler}
            />
          </BossActionItem>
        </Droppable>
      );
    });
  }, [
    assignments,
    currentBaseHealth,
    currentBossLevel,
    getActiveMitigations,
    handleBossActionSelection,
    canEditPlan,
    phaseOverrides,
    phaseSummaryByAnchorActionId,
    skippedActionsByPhaseId,
    sortedBossActions,
    removeMitigationHandler,
    selectedBossAction,
    selectedJobs,
    updateMitigationPrecastHandler,
  ]);

  // Drag and drop handlers - MUST be called before early returns
  const handleDragStart = useCallback((event) => {
    if (!canEditPlan) return;

    const { active } = event;
    // Extract the actual mitigation ID by removing the __fs suffix if present
    const activeId = typeof active.id === 'string' && active.id.endsWith('__fs')
      ? active.id.slice(0, -4) // Remove '__fs' suffix
      : active.id;
    const mitigation = availableMitigations.find(m => m.id === activeId);
    if (mitigation) {
      setActiveMitigation(mitigation);
    }
  }, [availableMitigations, canEditPlan, setActiveMitigation]);

  const handleDragEnd = useCallback((event) => {
    if (!canEditPlan) {
      setActiveMitigation(null);
      return;
    }

    console.log('[MitigationPlanner] handleDragEnd called:', event);
    const { active, over } = event;

    if (!over) {
      setActiveMitigation(null);
      return;
    }

    // Prefer action object from droppable data when available
    let targetBossAction = over?.data?.current?.action || null;

    // Fallback: extract original action id from droppable id of form `${action.id}__${idx}` or `${action.id}__${idx}__fs`
    if (!targetBossAction) {
      const overId = over.id;
      const originalId = typeof overId === 'string' && overId.includes('__') ? overId.split('__')[0] : overId;
      targetBossAction = sortedBossActions?.find(action => action.id === originalId) || null;
    }

    if (!targetBossAction) {
      setActiveMitigation(null);
      return;
    }

    // Temporarily disable selection validation to test tank selection modal
    // TODO: Re-enable this validation after fixing the selection state issue
    /*
    if (!selectedBossAction || selectedBossAction.id !== targetBossAction.id) {
      console.log('[MitigationPlanner] Drop rejected - boss action not selected:', {
        targetActionId: targetBossAction.id,
        targetActionName: targetBossAction.name,
        selectedActionId: selectedBossAction?.id,
        selectedActionName: selectedBossAction?.name
      });
      setActiveMitigation(null);
      return;
    }
    */

    // Extract the actual mitigation ID by removing the __fs suffix if present
    const activeId = typeof active.id === 'string' && active.id.endsWith('__fs')
      ? active.id.slice(0, -4) // Remove '__fs' suffix
      : active.id;

    const mitigation = availableMitigations.find(m => m.id === activeId);
    if (!mitigation) {
      setActiveMitigation(null);
      return;
    }

    // Check if this mitigation requires tank selection using the unified assignment function
    const assignmentDecision = determineMitigationAssignment(mitigation, targetBossAction, tankPositions, selectedJobs);

    console.log('[MitigationPlanner] Mitigation assignment decision:', {
      mitigationName: mitigation.name,
      mitigationType: mitigation.target,
      bossActionName: targetBossAction.name,
      decision: assignmentDecision
    });

    if (assignmentDecision.shouldShowModal) {
      console.log('[MitigationPlanner] Opening tank selection modal for tank-specific mitigation');

      // Use the tank selection modal context (which includes auto-assignment logic)
      openTankSelectionModal(mitigation.name, (selectedTankPosition) => {
        console.log('[MitigationPlanner] Tank selected in modal:', {
          mitigationName: mitigation.name,
          selectedTankPosition,
          bossActionId: targetBossAction.id
        });
        // Assign the mitigation with the selected tank position
        addMitigationHandler(targetBossAction.id, mitigation, selectedTankPosition, getCasterOptions());
      }, mitigation, targetBossAction);
      setActiveMitigation(null);
      return;
    }

    // BEFORE any auto-assignment for area/party abilities, handle multi-class caster selection
    if (Array.isArray(mitigation.jobs) && mitigation.jobs.length > 1) {
      openClassSelectionModal(mitigation, targetBossAction, (jobId) => {
        // If exactly one eligible caster was present, jobId will be that caster. If none or multi, jobId is null or chosen.
        addMitigationHandler(targetBossAction.id, mitigation, 'shared', getCasterOptions(jobId));
      });
      setActiveMitigation(null);
      return;
    }

    if (assignmentDecision.assignment) {
      console.log('[MitigationPlanner] Auto-assigning based on decision:', assignmentDecision.assignment);
      // Auto-assign based on the decision
      addMitigationHandler(targetBossAction.id, mitigation, assignmentDecision.assignment.targetPosition, getCasterOptions());
      setActiveMitigation(null);
      return;
    }

    // Check if mitigation can be assigned using enhanced cooldown system
    const availability = checkAbilityAvailability(
      mitigation.id,
      targetBossAction.time,
      targetBossAction.id,
      { isBeingAssigned: true }
    );

    if (availability.canAssign()) {
      // DEBUG: Log mitigation assignment
      console.log('[MitigationPlanner] Calling addMitigation:', {
        bossActionId: targetBossAction.id,
        bossActionName: targetBossAction.name,
        mitigationId: mitigation.id,
        mitigationName: mitigation.name,
        mitigationType: mitigation.type
      });

      // If ability is multi-class, prompt for caster selection
      if (Array.isArray(mitigation.jobs) && mitigation.jobs.length > 1) {
        openClassSelectionModal(mitigation, targetBossAction, (jobId) => {
          addMitigationHandler(targetBossAction.id, mitigation, 'shared', getCasterOptions(jobId));
        });
      } else {
        // Use the enhanced addMitigation with real-time sync
        addMitigationHandler(targetBossAction.id, mitigation, null, getCasterOptions());
      }
    } else {
      console.log('[MitigationPlanner] Cannot assign mitigation - availability check failed:', {
        bossActionId: targetBossAction.id,
        bossActionName: targetBossAction.name,
        mitigationId: mitigation.id,
        mitigationName: mitigation.name,
        availabilityReason: availability.getUnavailabilityReason ? availability.getUnavailabilityReason() : 'Unknown'
      });
    }

    setActiveMitigation(null);
  }, [sortedBossActions, availableMitigations, canEditPlan, setActiveMitigation, addMitigationHandler, checkAbilityAvailability, openTankSelectionModal, getCasterOptions, openClassSelectionModal, tankPositions, selectedJobs]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor)
  );


  // Show loading state while data is being loaded (AFTER all hooks are called)
  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Loading plan data...</div>
      </div>
    );
  }

  // Show error state if there's an error (AFTER all hooks are called)
  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
        <div>Error loading plan: {error}</div>
        {error.includes('permission') && (
          <div style={{ marginTop: '1rem', fontSize: '0.9em', color: '#666' }}>
            This plan may be private or you may not have access to it.
          </div>
        )}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Compact planner header keeps the working canvas above the fold. */}
      <header className="mb-3 rounded-xl border border-border bg-card/60 px-3 py-3 shadow-sm sm:px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">
                {realtimePlan?.name || 'Mitigation Planner'}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {realtimePlan?.bossMetadata?.name || realtimePlan?.bossId || 'Encounter'}
                {' · '}
                Route {realtimePlan?.routeId || 'default'}
                {' · '}
                {realtimePlan?.timelineVersionLabel || 'Pinned timeline'}
                {' · '}
                {getPlanAbilityModeLabel(planAbilityMode)}
              </p>
            </div>
            <ActiveUsersDisplay
              compact
              maxDisplayUsers={5}
              collaborators={collaboration.collaborators}
              currentSessionId={collaboration.sessionId}
            />
          </div>
          <div className="flex w-full items-center justify-end gap-2 lg:w-auto">
            {canEditPlan && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleOpenTimelineUpgrade()}
                disabled={connectionState === 'offline-queued'}
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Timeline</span>
              </Button>
            )}
            {permissions?.canAdmin && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateShareLink}
                aria-label="Create anonymous view link"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            )}
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowActivity((open) => !open)}
                aria-expanded={showActivity}
                aria-controls="planner-activity"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Activity</span>
              </Button>
              {showActivity && (
                <div
                  id="planner-activity"
                  className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-2 shadow-xl"
                >
                  <div className="flex items-center justify-between px-2 py-2">
                    <h2 className="text-sm font-semibold">Plan activity</h2>
                    <span className="text-xs text-muted-foreground">
                      Revision {realtimePlan?.revision || 0}
                    </span>
                  </div>
                  <div className="max-h-72 space-y-1 overflow-y-auto">
                    {changes.length === 0 ? (
                      <p className="px-2 py-4 text-sm text-muted-foreground">
                        Changes will appear here after the first saved edit.
                      </p>
                    ) : changes.map((change) => (
                      <div
                        key={change.id}
                        className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/60"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {change.operationKind.replaceAll('_', ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Revision {change.revision} · {new Date(change.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {change.undoEligible && canEditPlan && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Undo revision ${change.revision}`}
                            onClick={() => void undoChange(change.id)}
                          >
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <ThemeToggle className="h-10 w-10" />
            <span
              role="status"
              aria-live="polite"
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                connectionState === 'error'
                  ? 'border-destructive/25 bg-destructive/10 text-destructive'
                  : connectionState === 'offline-queued' || connectionState === 'reconnecting'
                    ? 'border-warning/25 bg-warning/10 text-warning'
                    : 'border-success/25 bg-success/10 text-success'
              }`}
            >
              {!canEditPlan ? 'View only' : connectionLabel}
            </span>
            <Button onClick={handleBack} variant="outline" aria-label="Back to dashboard" className="px-3 sm:px-4">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </Button>
          </div>
        </div>
      </header>

      <Dialog open={showTimelineUpgrade} onOpenChange={setShowTimelineUpgrade}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Review timeline or route change</DialogTitle>
            <DialogDescription>
              Plans stay pinned until this preview is reviewed and committed.
            </DialogDescription>
          </DialogHeader>

          {timelineUpgradeBusy && timelineVersions.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">Loading published versions…</p>
          ) : timelineVersions.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No evidence-approved published version is available for this encounter.
            </p>
          ) : (
            <div className="space-y-4">
              <label className="grid gap-2 text-sm font-medium">
                Timeline version
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedTimelineVersionId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    const nextVersion = timelineVersions.find((version) => version.id === nextId);
                    setSelectedTimelineVersionId(nextId);
                    setSelectedTimelineRouteId(nextVersion?.routeIds?.[0] || 'default');
                    setTimelineUpgradePreview(null);
                  }}
                >
                  {timelineVersions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {version.versionLabel}{version.gamePatch ? ` · patch ${version.gamePatch}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Resolved fight route
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedTimelineRouteId}
                  onChange={(event) => {
                    setSelectedTimelineRouteId(event.target.value);
                    setTimelineUpgradePreview(null);
                  }}
                >
                  {(selectedTimelineVersion?.routeIds || ['default']).map((routeId) => (
                    <option key={routeId} value={routeId}>{routeId}</option>
                  ))}
                </select>
              </label>

              {timelineUpgradePreview && (
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm sm:grid-cols-3">
                  <span>Unchanged: {timelineUpgradePreview.unchanged.length}</span>
                  <span>Moved: {timelineUpgradePreview.moved.length}</span>
                  <span>Metadata: {timelineUpgradePreview.metadataChanged.length}</span>
                  <span>Added: {timelineUpgradePreview.added.length}</span>
                  <span>Removed: {timelineUpgradePreview.removed.length}</span>
                  <span>Ambiguous: {timelineUpgradePreview.ambiguous.length}</span>
                  {(timelineUpgradePreview.metadataChanged.length > 0 ||
                    timelineUpgradePreview.removed.length > 0 ||
                    timelineUpgradePreview.ambiguous.length > 0) && (
                    <p className="col-span-full text-warning">
                      Assigned changed, removed, or ambiguous mechanics require review before relying on this plan.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowTimelineUpgrade(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handlePreviewTimelineUpgrade()}
              disabled={!selectedTimelineVersionId || timelineUpgradeBusy}
            >
              Preview
            </Button>
            <Button
              type="button"
              onClick={() => void handleApplyTimelineUpgrade()}
              disabled={!timelineUpgradePreview || timelineUpgradeBusy}
            >
              Apply reviewed change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CollaborationStatusNotice className="mb-3" />

      {planAbilityMode === 'EVOLVED' && availableMitigations.length === 0 && (
        <div className="mb-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          This Evolved plan is ready for mode-specific actions. No verified Evolved mitigation
          catalog entries have been added yet, so new assignments stay hidden until official job
          data is available.
        </div>
      )}

      <div id="planner-party-setup" className="scroll-mt-4">
        <JobSelector compact disabled={!canEditPlan} showHealthSettings={false} />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/20 p-2 xl:grid-cols-[auto_auto_minmax(0,1fr)]">
        <div className="min-w-0"><FilterToggle /></div>
        <div className="min-w-0"><PrecastToggle /></div>
        <div className="col-span-2 grid min-w-0 gap-2 sm:grid-cols-3 xl:col-span-1">
          <TankHealthInputs />
          <PartyMinHealthInput />
          <HealingPotencyInput />
        </div>
      </div>


      {/* Mobile: Boss Timeline with bottom sheet trigger */}
      <div className="mb-3 xl:hidden">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Boss Timeline</h2>
            <span className="text-xs text-muted-foreground">Tap to select</span>
          </div>
          {canEditPlan && (
            <Button variant="outline" size="sm" onClick={handleEditTimeline}>
              <Edit2 className="h-4 w-4" />
              Edit Timeline
            </Button>
          )}
        </div>
        <MobileBossTimeline
          sortedBossActions={sortedBossActions}
          selectedBossAction={selectedBossAction}
          assignments={assignments}
          getActiveMitigations={getActiveMitigations}
          selectedJobs={selectedJobs}
          currentBossLevel={currentBossLevel}
          baseHealth={currentBaseHealth}
          phaseSummaryByAnchorActionId={phaseSummaryByAnchorActionId}
          skippedActionsByPhaseId={skippedActionsByPhaseId}
          phaseOverrides={phaseOverrides}
          disabled={!canEditPlan}
          onSelectAction={handleBossActionSelection}
        />
      </div>

      {/* Desktop: one bounded, resizable workspace for both planning panes. */}
      <div
        ref={splitContainerRef}
        className="hidden h-[calc(100dvh-17.5rem)] min-h-[32rem] w-full gap-2 xl:grid"
        style={{ gridTemplateColumns: `${timelinePercent}fr 1rem ${mitigationPercent}fr` }}
      >
        <PresenceSurface
          surface="planner"
          panel="timeline"
          section="timeline"
          hideRemoteCursorsOnMobile={true}
          className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-background p-3 shadow-sm"
        >
          <div className="sticky top-0 z-20 mb-2 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-2 pb-3 pt-1 backdrop-blur">
            <div className="flex min-w-0 items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">Boss Timeline</h2>
              <SectionPresencePill surface="planner" section="timeline" />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {canEditPlan && (
                <Button variant="outline" size="sm" onClick={handleEditTimeline}>
                  <Edit2 className="h-4 w-4" />
                  Edit Timeline
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={openFullscreen}
                className="h-9 w-9"
                aria-label="Enter fullscreen for timeline and mitigations"
                title="Enter fullscreen"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative flex w-full grow flex-col px-2 pb-4">
            {renderTimelineRows()}
          </div>
        </PresenceSurface>

        <div
          onMouseDown={onResizerMouseDown}
          onDoubleClick={() => setSplitRatio(0.66)}
          onKeyDown={onResizerKeyDown}
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Resize timeline and mitigation panels"
          aria-valuemin={40}
          aria-valuemax={80}
          aria-valuenow={timelinePercent}
          title="Drag to resize. Use arrow keys for precise control; double-click to reset."
          className="group flex h-full cursor-col-resize items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <GripVertical className="h-5 w-5" aria-hidden="true" />
        </div>

        <PresenceSurface
          surface="planner"
          panel="mitigations"
          section="mitigations"
          hideRemoteCursorsOnMobile={true}
          className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background p-3 shadow-sm"
        >
          <div className="mb-3 flex shrink-0 items-center justify-between gap-3 border-b border-border px-1 pb-3 pt-1">
            <h2 className="text-lg font-semibold text-foreground">Mitigations</h2>
            <SectionPresencePill surface="planner" section="mitigations" />
          </div>
          {/* Search and filter bar */}
          <div className="mb-3 flex shrink-0 flex-col gap-2 rounded-lg border border-border bg-card/70 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search mitigations..."
                aria-label="Search mitigations"
                value={mitigationSearchQuery}
                onChange={(e) => setMitigationSearchQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {mitigationSearchQuery && (
                <button
                  type="button"
                  onClick={() => setMitigationSearchQuery('')}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Clear mitigation search"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedJobFilter(null)}
                className={`min-h-8 rounded-md border px-2 py-1 text-xs transition-colors ${
                  selectedJobFilter === null
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                }`}
              >
                All
              </button>
              {availableJobs.map(jobId => {
                const jobInfo = Object.values(ffxivJobs).flat().find(j => j.id === jobId);
                if (!jobInfo) return null;
                return (
                  <button
                    key={jobId}
                    type="button"
                    onClick={() => setSelectedJobFilter(selectedJobFilter === jobId ? null : jobId)}
                    className={`flex min-h-8 items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                      selectedJobFilter === jobId
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                    title={jobInfo.name}
                  >
                    {jobInfo.icon && typeof jobInfo.icon === 'string' && jobInfo.icon.startsWith('/') ? (
                      <img src={jobInfo.icon} alt={jobInfo.name} className="w-4 h-4 object-contain" />
                    ) : null}
                    <span className="text-foreground">{jobId}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">

            {searchedMitigations.map(mitigation => {
              // Use enhanced cooldown checking
              const availability = selectedBossAction ? checkAbilityAvailability(
                mitigation.id,
                selectedBossAction.time,
                selectedBossAction.id,
                { isBeingAssigned: false }
              ) : { isAvailable: true, canAssign: () => true };

              const isDisabled = !availability.canAssign();
              const cooldownReason = availability.getUnavailabilityReason ? availability.getUnavailabilityReason() : null;

              return (
                <Draggable
                  key={mitigation.id}
                  id={mitigation.id}
                  data={{ type: 'mitigation', mitigation }}
                  isDisabled={isDisabled || !canEditPlan}
                  cooldownReason={cooldownReason}
                >
                  <MitigationItem
                    mitigation={mitigation}
                    isDisabled={isDisabled || !canEditPlan}
                    cooldownReason={cooldownReason}
                    currentBossLevel={currentBossLevel}
                    selectedBossAction={selectedBossAction}
                    selectedJobs={selectedJobs}
                    checkAbilityAvailability={checkAbilityAvailability}
                    pendingAssignments={pendingAssignments}
                  />
                </Draggable>
              );
            })}
          </div>
        </PresenceSurface>
      </div>

	      {/* Fullscreen overlay rendering both timeline and mitigations */}
	      {fsMounted && (
	        <div
	          className={`fixed inset-0 z-[100] flex items-stretch justify-center bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${fsOpen ? 'opacity-100' : 'opacity-0'}`}
	          role="dialog"
	          aria-modal="true"
	          aria-labelledby="planner-fullscreen-title"
	        >
	          {/* Click blocker to prevent background interaction */}
	          <div className="absolute inset-0" onClick={closeFullscreen} />
	            <div ref={fsDialogRef} className={`relative m-4 flex w-[min(1800px,100%)] max-w-[100%] gap-4 rounded-xl bg-card p-4 shadow-2xl transition-transform duration-300 ${fsOpen ? 'translate-y-0 scale-100' : 'translate-y-2 scale-[0.99]'}`}
	               onClick={(e) => e.stopPropagation()}>
	            <h2 id="planner-fullscreen-title" className="sr-only">Timeline and mitigation browser</h2>
	            {/* Exit button */}
	            <button
	              type="button"
	              ref={fsCloseButtonRef}
	              onClick={closeFullscreen}
	              className="absolute right-3 top-3 z-50 inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
	              aria-label="Exit fullscreen"
	              title="Exit fullscreen (Esc)"
	            >
	              <Minimize2 className="h-4 w-4" />
	            </button>
	            {/* Two independently scrollable columns */}
	            <div
	              className="grid h-[calc(100dvh-64px)] w-full gap-2"
	              style={{ gridTemplateColumns: `${timelinePercent}fr 1rem ${mitigationPercent}fr` }}
	            >
	              {/* Timeline column */}
	              <PresenceSurface
	                surface="planner"
	                panel="timeline"
	                section="timeline"
	                hideRemoteCursorsOnMobile={true}
	                className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-background p-4 pb-6 shadow-sm"
	              >
	                <div className="relative flex flex-col p-4 w-full grow">
	                  {renderTimelineRows('__fs')}
	                </div>
	              </PresenceSurface>
	              {/* Vertical resizer visual only (no drag in fullscreen) */}
	              <div className="flex select-none items-center justify-center text-muted-foreground">
	                <GripVertical className="h-5 w-5" aria-hidden="true" />
	              </div>
              {/* Mitigations column */}
              <PresenceSurface
                surface="planner"
                panel="mitigations"
                section="mitigations"
                hideRemoteCursorsOnMobile={true}
                className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background p-4 shadow-sm"
              >
                <div className="mb-3 flex shrink-0 items-center justify-between gap-3 border-b border-border pb-3 pr-12">
                  <h2 className="text-lg font-semibold text-foreground">Mitigations</h2>
                  <SectionPresencePill surface="planner" section="mitigations" />
                </div>
                <div className="mb-3 flex shrink-0 flex-col gap-2 rounded-lg border border-border bg-card/70 p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
	                    <input
	                      type="text"
	                      aria-label="Search fullscreen mitigations"
                      placeholder="Search mitigations..."
                      value={mitigationSearchQuery}
                      onChange={(e) => setMitigationSearchQuery(e.target.value)}
	                      className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {mitigationSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setMitigationSearchQuery('')}
	                        className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
	                        aria-label="Clear mitigation search"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedJobFilter(null)}
                      className={`min-h-8 rounded-md border px-2 py-1 text-xs transition-colors ${
                        selectedJobFilter === null
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      All
                    </button>
                    {availableJobs.map(jobId => {
                      const jobInfo = Object.values(ffxivJobs).flat().find(j => j.id === jobId);
                      if (!jobInfo) return null;
                      return (
                        <button
                          key={jobId}
                          type="button"
                          onClick={() => setSelectedJobFilter(selectedJobFilter === jobId ? null : jobId)}
                          className={`flex min-h-8 items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                            selectedJobFilter === jobId
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-background hover:border-primary/50'
                          }`}
                          title={jobInfo.name}
                        >
                          {jobInfo.icon && typeof jobInfo.icon === 'string' && jobInfo.icon.startsWith('/') ? (
                            <img src={jobInfo.icon} alt={jobInfo.name} className="w-4 h-4 object-contain" />
                          ) : null}
                          <span className="text-foreground">{jobId}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">

              {searchedMitigations.map(mitigation => {
	                    const availability = selectedBossAction ? checkAbilityAvailability(
	                      mitigation.id,
	                      selectedBossAction.time,
	                      selectedBossAction.id,
	                      { isBeingAssigned: false }
	                    ) : { isAvailable: true, canAssign: () => true };
	                    const isDisabled = !availability.canAssign();
	                    const cooldownReason = availability.getUnavailabilityReason ? availability.getUnavailabilityReason() : null;
	                    return (
	                      <Draggable
	                        key={`${mitigation.id}__fs`}
	                        id={`${mitigation.id}__fs`}
	                        data={{ type: 'mitigation', mitigation }}
	                        isDisabled={isDisabled || !canEditPlan}
	                        cooldownReason={cooldownReason}
	                      >
	                        <MitigationItem
	                          mitigation={mitigation}
	                          isDisabled={isDisabled || !canEditPlan}
	                          cooldownReason={cooldownReason}
	                          currentBossLevel={currentBossLevel}
	                          selectedBossAction={selectedBossAction}
	                          selectedJobs={selectedJobs}
	                          checkAbilityAvailability={checkAbilityAvailability}
	                          pendingAssignments={pendingAssignments}
	                        />
	                      </Draggable>
	                    );
	                  })}
	                </div>
	              </PresenceSurface>
	            </div>
	          </div>
	        </div>
	      )}



      <DragOverlay>
        {activeMitigation && (
          <MitigationItem
            mitigation={activeMitigation}
            isDisabled={false}
            cooldownReason={null}
            currentBossLevel={currentBossLevel}
            selectedJobs={selectedJobs}
            checkAbilityAvailability={checkAbilityAvailability}
            pendingAssignments={pendingAssignments}
            isDragging={true}
          />
        )}
      </DragOverlay>

      <TankSelectionModal />

      <MitigationBottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        selectedBossAction={selectedBossAction}
        selectedJobs={selectedJobs}
        currentBossLevel={currentBossLevel}
        abilityMode={planAbilityMode}
        assignments={assignments}
        addMitigation={addMitigationHandler}
        removeMitigation={removeMitigationHandler}
        checkAbilityAvailability={checkAbilityAvailability}
        pendingAssignments={pendingAssignments}
        getActiveMitigations={getActiveMitigations}
        sortedBossActions={sortedBossActions}
        onOpenPartySetup={openPartySetup}
      />
    </DndContext>
  );
};

const MitigationPlanner = ({ onNavigateBack, planId: propPlanId, isSharedPlan: _isSharedPlan = false }) => {
  const { planId: routePlanId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Use route param if available, otherwise fall back to prop (for backward compatibility)
  const planId = routePlanId || propPlanId;

  const isReadOnlyView = !isAuthenticated;

  console.log('[MitigationPlanner] Rendering with planId:', planId);

  const handleBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      navigate('/dashboard');
    }
  };

  // Loading and error handling is now done inside the RealtimeAppProvider

  return (
    <RealtimeAppProvider
      planId={planId}
      readOnly={isReadOnlyView}
      enableCollaboration={isAuthenticated && !isReadOnlyView}
    >
      <MitigationPlannerContent
        planId={planId}
        isReadOnlyView={isReadOnlyView}
        handleBack={handleBack}
      />
    </RealtimeAppProvider>
  );
};

// Content component that has access to real-time contexts
const MitigationPlannerContent = ({
  planId,
  isReadOnlyView,
  handleBack,
}) => {
  const { error } = useRealtimePlan();

  return (
    <>
      <CollaborationAutoJoin roomId={planId} enabled={!isReadOnlyView} />
      <div className="min-h-screen overflow-x-hidden bg-background px-3 py-3 text-foreground sm:px-5 sm:py-4 xl:px-6">

      {isReadOnlyView && (
        <div className="mb-6 rounded-lg border border-info/30 bg-info/10 px-4 py-3 text-info">
          Sign in is required to edit this plan.
        </div>
      )}

      {error && (
        <div className="mb-8 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
          Error: {error}
        </div>
      )}

      <PlanningInterface
        handleBack={handleBack}
        isReadOnlyView={isReadOnlyView}
      />
    </div>
    <Footer />
  </>
  );
};

export default MitigationPlanner;
