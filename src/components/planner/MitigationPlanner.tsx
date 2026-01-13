import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { useAuth } from '../../contexts/AuthContext';
import { useCollaboration } from '../../contexts/CollaborationContext';
import { mitigationAbilities } from '../../data';
import { determineMitigationAssignment } from '../../utils/mitigation/autoAssignmentUtils';
import { getAvailableAbilities } from '../../utils';
// import { useAutoAssignment } from '../../hooks/useAutoAssignment';
import { useNavigate } from 'react-router-dom';


import { Maximize2, Minimize2 } from 'lucide-react';

import CollaboratorsList from '../collaboration/CollaboratorsList';
import ActiveUsersDisplay from '../collaboration/ActiveUsersDisplay';
import KofiButton from '../common/KofiButton/KofiButton';
import DiscordButton from '../common/DiscordButton/DiscordButton';
import ThemeToggle from '../common/ThemeToggle';
import { Button } from '../ui/button';
import HealingPotencyInput from '../common/HealingPotencyInput/HealingPotencyInput';
import PrecastToggle from '../common/PrecastToggle';
import Footer from '../layout/Footer';


// Import planning components
import JobSelector from '../../features/jobs/JobSelector/JobSelector';

import BossActionItem from '../BossActionItem/BossActionItem';
import MitigationItem from '../MitigationItem/MitigationItem';
import AssignedMitigations from '../AssignedMitigations/AssignedMitigations';

import FilterToggle from '../common/FilterToggle';
import TankSelectionModal from '../common/TankSelectionModal';
import { PartyAssignmentPanel } from '../PartyAssignment';
import Draggable from '../DragAndDrop/Draggable';
import Droppable from '../DragAndDrop/Droppable';
import PartyMinHealthInput from '../common/PartyMinHealthInput/PartyMinHealthInput';


// Import contexts
import {
  useFilterContext,
  useTankPositionContext,
  useTankSelectionModalContext
} from '../../contexts';
import { useClassSelectionModalContext } from '../../contexts/ClassSelectionModalContext.jsx';

// Import real-time contexts
import { useRealtimePlan } from '../../contexts/RealtimePlanContext';
import { useRealtimeBossContext } from '../../contexts/RealtimeBossContext';
import { useRealtimeJobContext } from '../../contexts/RealtimeJobContext';
import { useEnhancedMitigation } from '../../contexts/EnhancedMitigationContext';
import RealtimeAppProvider from '../../contexts/RealtimeAppProvider';
import { usePresenceOptional } from '../../contexts/PresenceContext';
import { useUserJobAssignmentOptional } from '../../contexts/UserJobAssignmentContext';

// Import utilities
// import { mitigationAbilities } from '../../data';
// import { isMitigationAvailable, getAvailableAbilities } from '../../utils';
// import { useAutoAssignment } from '../../hooks/useAutoAssignment';











// Planning interface component that gets data from real-time contexts
const PlanningInterface = () => {

  // Get real-time plan data
  const { loading, error } = useRealtimePlan();

  // Get real-time contexts - ALWAYS call all hooks before any early returns
  const { sortedBossActions, selectedBossAction, toggleBossActionSelection, currentBossLevel, currentBaseHealth } = useRealtimeBossContext();
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

  // Split pane ratio state (timeline/mitigation)
  const { planId } = useParams();
  const splitContainerRef = useRef(null);
  const [splitRatio, setSplitRatio] = useState(() => {
    try {
      const key = `plannerSplitRatio:${planId || 'default'}`;
      const v = sessionStorage.getItem(key);
      const parsed = v ? parseFloat(v) : NaN;
      return Number.isFinite(parsed) ? Math.min(0.8, Math.max(0.4, parsed)) : 0.66;
    } catch {
      return 0.66;
    }
  });
  useEffect(() => {
    try {
      const key = `plannerSplitRatio:${planId || 'default'}`;
      sessionStorage.setItem(key, String(splitRatio));
    } catch {
      // ignore sessionStorage write errors (e.g., privacy mode)
    }
  }, [splitRatio, planId]);

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

  const timelinePercent = Math.round(splitRatio * 100);
  const mitigationPercent = 100 - timelinePercent;

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

  // Local state for drag and drop
  const [activeMitigation, setActiveMitigation] = useState(null);


	  // Fullscreen overlay state and handlers for timeline + mitigations
	  const [fsMounted, setFsMounted] = useState(false);
	  const [fsOpen, setFsOpen] = useState(false);
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
	  // ESC to exit fullscreen
	  useEffect(() => {
	    if (!fsMounted) return;
	    const onKeyDown = (e) => {
	      if (e.key === 'Escape') {
	        e.preventDefault();
	        closeFullscreen();
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
      presence.updateMySelection('bossAction', isBeingSelected ? action.id : null);
    }

    console.log('[MitigationPlanner] Boss action selected:', {
      actionId: action.id,
      actionName: action.name,
      isBeingSelected,
      autoAssignmentDisabled: true
    });
  }, [toggleBossActionSelection, selectedBossAction, presence]);

  // Get available mitigations based on selected jobs and boss level - MUST be called before early returns
  const availableMitigations = useMemo(() => {
    return getAvailableAbilities(mitigationAbilities, selectedJobs, currentBossLevel);
  }, [selectedJobs, currentBossLevel]);

  // Filter mitigations based on selected boss action and filter settings - MUST be called before early returns
  const filteredMitigations = useMemo(() => {
    if (!selectedBossAction) {
      return filterMitigations(availableMitigations, null, myAssignedJob);
    }

    return filterMitigations(availableMitigations, selectedBossAction, myAssignedJob);
  }, [availableMitigations, selectedBossAction, filterMitigations, myAssignedJob]);

  // Drag and drop handlers - MUST be called before early returns
  const handleDragStart = useCallback((event) => {
    const { active } = event;
    // Extract the actual mitigation ID by removing the __fs suffix if present
    const activeId = typeof active.id === 'string' && active.id.endsWith('__fs')
      ? active.id.slice(0, -4) // Remove '__fs' suffix
      : active.id;
    const mitigation = availableMitigations.find(m => m.id === activeId);
    if (mitigation) {
      setActiveMitigation(mitigation);
    }
  }, [availableMitigations, setActiveMitigation]);

  const handleDragEnd = useCallback((event) => {
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
        addMitigation(targetBossAction.id, mitigation, selectedTankPosition, getCasterOptions());
      }, mitigation, targetBossAction);
      setActiveMitigation(null);
      return;
    }

    // BEFORE any auto-assignment for area/party abilities, handle multi-class caster selection
    if (Array.isArray(mitigation.jobs) && mitigation.jobs.length > 1) {
      openClassSelectionModal(mitigation, targetBossAction, (jobId) => {
        // If exactly one eligible caster was present, jobId will be that caster. If none or multi, jobId is null or chosen.
        addMitigation(targetBossAction.id, mitigation, 'shared', getCasterOptions(jobId));
      });
      setActiveMitigation(null);
      return;
    }

    if (assignmentDecision.assignment) {
      console.log('[MitigationPlanner] Auto-assigning based on decision:', assignmentDecision.assignment);
      // Auto-assign based on the decision
      addMitigation(targetBossAction.id, mitigation, assignmentDecision.assignment.targetPosition, getCasterOptions());
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
          addMitigation(targetBossAction.id, mitigation, 'shared', getCasterOptions(jobId));
        });
      } else {
        // Use the enhanced addMitigation with real-time sync
        addMitigation(targetBossAction.id, mitigation, null, getCasterOptions());
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
  }, [sortedBossActions, availableMitigations, setActiveMitigation, addMitigation, checkAbilityAvailability, openTankSelectionModal, getCasterOptions, openClassSelectionModal, tankPositions, selectedJobs]);



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
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-4 mb-4">

        <JobSelector
          disabled={false}
        />
        <PartyAssignmentPanel />
      </div>

      <div className="flex items-center justify-center gap-4 mb-8 p-4 rounded-lg border border-border bg-card">
        <FilterToggle />
        <PrecastToggle />
        <PartyMinHealthInput />
        <HealingPotencyInput />
      </div>

      {/* Section headers with fullscreen toggle */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-8">
          <h2 className="text-lg font-semibold text-foreground">Boss Timeline</h2>
        </div>
        <button
          type="button"
          onClick={openFullscreen}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border text-foreground bg-card hover:bg-muted transition"
          aria-label="Enter fullscreen for timeline and mitigations"
          title="Enter fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>


      <div ref={splitContainerRef} className="flex w-full gap-4">
        <div style={{ flex: '0 0 auto', width: `${timelinePercent-3}%`, minWidth: '40%', maxWidth: '80%' }} className="bg-background rounded-xl p-4 pb-6 shadow-md border border-border overflow-y-auto overflow-x-auto overscroll-contain touch-pan-x h-[calc(100vh-100px)] min-h-[500px] flex flex-col min-w-0">
          <div className="relative flex flex-col p-4 w-full grow">
            {sortedBossActions.map((action, idx) => {
              const isSelected = selectedBossAction?.id === action.id;
              const droppableId = `${action.id}__${idx}`; // ensure uniqueness even if IDs repeat in data
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
                  isSelected={selectedBossAction?.id === action.id}
                  assignments={assignments}
                  getActiveMitigations={getActiveMitigations}
                  selectedJobs={selectedJobs}
                  currentBossLevel={currentBossLevel}
                  baseHealth={currentBaseHealth}
                  onClick={() => handleBossActionSelection(action)}
                >
                  <AssignedMitigations
                    action={action}
                    assignments={assignments}
                    getActiveMitigations={getActiveMitigations}
                    selectedJobs={selectedJobs}
                    currentBossLevel={currentBossLevel}
                    onUpdatePrecast={updateMitigationPrecast}
                    onRemoveMitigation={removeMitigation}
                  />
                </BossActionItem>
              </Droppable>
              );
            })}
          </div>
        </div>

        <>
            <div onMouseDown={onResizerMouseDown} role="separator" aria-orientation="vertical" aria-label="Resize panels" className="mx-1 w-2 cursor-col-resize flex items-stretch justify-center">
              <div className="my-2 w-px bg-[var(--color-border)]" />
            </div>
            <div style={{ flex: '0 0 auto', width: `${mitigationPercent}%`, minWidth: '20%', maxWidth: '60%' }} className="bg-background rounded-xl p-4 shadow-md border border-border overflow-y-auto overflow-x-auto overscroll-contain touch-pan-x h-[calc(100vh-100px)] min-h-[500px] min-w-0">
            <div className="flex flex-col gap-4 grow overflow-y-auto overscroll-contain touch-pan-y">
              {filteredMitigations.map(mitigation => {
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
                    isDisabled={isDisabled}
                    cooldownReason={cooldownReason}
                  >
                    <MitigationItem
                      mitigation={mitigation}
                      isDisabled={isDisabled}
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
          </div>
          </>
      </div>

	      {/* Fullscreen overlay rendering both timeline and mitigations */}
	      {fsMounted && (
	        <div
	          className={`fixed inset-0 z-[100] flex items-stretch justify-center bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${fsOpen ? 'opacity-100' : 'opacity-0'}`}
	          role="dialog"
	          aria-modal="true"
	        >
	          {/* Click blocker to prevent background interaction */}
	          <div className="absolute inset-0" onClick={closeFullscreen} />
	          <div className={`relative m-4 flex w-[min(1800px,100%)] max-w-[100%] gap-4 rounded-xl bg-card p-4 shadow-2xl transition-transform duration-300 ${fsOpen ? 'translate-y-0 scale-100' : 'translate-y-2 scale-[0.99]'}`}
	               onClick={(e) => e.stopPropagation()}>
	            {/* Exit button */}
	            <button
	              type="button"
	              onClick={closeFullscreen}
	              className="absolute right-3 top-3 inline-flex items-center justify-center h-8 w-8 rounded-md text-primary-foreground bg-primary hover:brightness-110 transition z-50"
	              aria-label="Exit fullscreen"
	              title="Exit fullscreen (Esc)"
	            >
	              <Minimize2 className="h-4 w-4" />
	            </button>
	            {/* Two independently scrollable columns */}
	            <div className="flex w-full gap-4 h-[calc(100vh-64px)]">
	              {/* Timeline column */}
	              <div style={{ flex: '0 0 auto', width: `${timelinePercent-3}%`, minWidth: '40%', maxWidth: '80%' }}
	                   className="rounded-xl p-4 pb-6 shadow-md border border-border overflow-y-auto overflow-x-auto overscroll-contain touch-pan-x h-full min-h-[400px] flex flex-col min-w-0 bg-background">
	                <div className="relative flex flex-col p-4 w-full grow">
	                  {sortedBossActions.map((action, idx) => {
	                    const isSelected = selectedBossAction?.id === action.id;
	                    const droppableId = `${action.id}__${idx}__fs`; // ensure uniqueness in fullscreen
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
	                          isSelected={selectedBossAction?.id === action.id}
	                          assignments={assignments}
	                          getActiveMitigations={getActiveMitigations}
	                          selectedJobs={selectedJobs}
	                          currentBossLevel={currentBossLevel}
	                          baseHealth={currentBaseHealth}
	                          onClick={() => handleBossActionSelection(action)}
	                        >
	                          <AssignedMitigations
	                            action={action}
	                            assignments={assignments}
	                            getActiveMitigations={getActiveMitigations}
	                            selectedJobs={selectedJobs}
	                            currentBossLevel={currentBossLevel}
	                            onUpdatePrecast={updateMitigationPrecast}
	                            onRemoveMitigation={removeMitigation}
	                          />
	                        </BossActionItem>
	                      </Droppable>
	                    );
	                  })}
	                </div>
	              </div>
	              {/* Vertical resizer visual only (no drag in fullscreen) */}
	              <div className="mx-1 w-2 flex items-stretch justify-center select-none">
	                <div className="my-2 w-px bg-border" />
	              </div>
	              {/* Mitigations column */}
	              <div style={{ flex: '0 0 auto', width: `${mitigationPercent}%`, minWidth: '20%', maxWidth: '60%' }}
	                   className="rounded-xl p-4 shadow-md border border-border overflow-y-auto overflow-x-auto overscroll-contain touch-pan-y h-full min-h-[400px] min-w-0 bg-background">
	                <div className="flex flex-col gap-4 grow overflow-y-auto overscroll-contain touch-pan-y">
	                  {filteredMitigations.map(mitigation => {
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
	                        isDisabled={isDisabled}
	                        cooldownReason={cooldownReason}
	                      >
	                        <MitigationItem
	                          mitigation={mitigation}
	                          isDisabled={isDisabled}
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
	              </div>
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
    </DndContext>
  );
};

const MitigationPlanner = ({ onNavigateBack, planId: propPlanId, isSharedPlan = false, isAnonymous = false }) => {
  const { planId: routePlanId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isAnonymousMode, enableAnonymousMode } = useAuth();
  // Remove collaboration context usage from here - it will be moved to MitigationPlannerContent

  const [saving, setSaving] = useState(false);
  const [planIsPublic, setPlanIsPublic] = useState(false);

  // Use route param if available, otherwise fall back to prop (for backward compatibility)
  const planId = routePlanId || propPlanId;

  // Determine if this is a shared plan (either from prop or if plan is public)
  const isActuallySharedPlan = isSharedPlan || planIsPublic;

  // Determine if this is an anonymous session
  const isAnonymousSession = isAnonymous || (!isAuthenticated && isAnonymousMode);

  console.log('[MitigationPlanner] Rendering with planId:', planId);

  // Initialize anonymous mode if needed
  useEffect(() => {
    if (isAnonymous && !isAuthenticated && !isAnonymousMode) {
      enableAnonymousMode();
    }
  }, [isAnonymous, isAuthenticated, isAnonymousMode, enableAnonymousMode]);

  // Set plan public status based on isSharedPlan prop
  useEffect(() => {
    // If this is explicitly marked as a shared plan, treat it as public
    // Otherwise, assume it's private (no need to check permissions)
    setPlanIsPublic(isSharedPlan);
  }, [isSharedPlan]);

  // Access tracking is now handled in RealtimePlanContext

  // Collaboration logic moved to MitigationPlannerContent

  const handleBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else if (isActuallySharedPlan) {
      // For shared plans, go to landing page
      navigate('/');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSave = async () => {
    // Real-time plans are automatically saved, so this is just for user feedback
    setSaving(true);
    try {
      // Simulate save delay for user feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Real-time plan is automatically saved');
      // Show success toast (if toast system is available)
      alert('Plan saved successfully!');
    } catch (error) {
      console.error('Error with save operation:', error);
      alert('Failed to save plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Loading and error handling is now done inside the RealtimeAppProvider

  return (
    <RealtimeAppProvider planId={planId}>
      <MitigationPlannerContent
        planId={planId}
        isSharedPlan={isActuallySharedPlan}
        isAnonymousSession={isAnonymousSession}
        isAuthenticated={isAuthenticated}
        handleBack={handleBack}
        handleSave={handleSave}
        saving={saving}
      />
    </RealtimeAppProvider>
  );
};

// Content component that has access to real-time contexts
const MitigationPlannerContent = ({
  planId,
  isSharedPlan,
  isAuthenticated,
  handleBack,
  handleSave,
  saving
}) => {
  const { realtimePlan, error } = useRealtimePlan();

  // Use collaboration hook
  const {
    joinCollaborativeSession,
    leaveCollaborativeSession,
    collaborators,
    isCollaborating,
    sessionId,
    displayName,
    isInitialized: collaborationInitialized
  } = useCollaboration();

  // No longer need display name modal for anonymous users

  // Handle collaboration setup for all plans (not just shared plans)
  useEffect(() => {
    if (planId && collaborationInitialized) {
      // Check if collaboration functions are available
      if (typeof joinCollaborativeSession !== 'function') {
        console.error('[MitigationPlannerContent] joinCollaborativeSession is not a function');
        return;
      }

      // Setting up collaboration for plan editing

      // Join collaborative session - anonymous users now have auto-generated display names
      console.log('[MitigationPlannerContent] Joining collaboration session with display name:', displayName);
      joinCollaborativeSession(planId, displayName);

      // Universal access enabled - no read-only restrictions
    }

    // Cleanup on unmount or plan change
    return () => {
      if (isCollaborating && typeof leaveCollaborativeSession === 'function') {
        leaveCollaborativeSession();
      }
    };
  }, [
    planId,
    isAuthenticated,
    displayName,
    collaborationInitialized,
    joinCollaborativeSession,
    leaveCollaborativeSession,
    isCollaborating
  ]);

  // No longer need display name handlers for anonymous users

  return (
    <>
      <div className="min-h-screen p-8 bg-background text-foreground">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
        <h1 className="text-2xl font-semibold text-foreground">
          {realtimePlan ? `${isSharedPlan ? 'Shared Plan: ' : ''}${realtimePlan.name}` : 'Mitigation Planner'}
        </h1>
        <div className="flex items-center gap-2">
          {isCollaborating && (
            <CollaboratorsList
              collaborators={collaborators}
              currentSessionId={sessionId}
              isReadOnly={false}
            />
          )}
          <KofiButton />
          <DiscordButton />
          <ThemeToggle />
<Button onClick={handleSave} disabled={saving} className="px-4 py-2">
            {saving ? 'Saving...' : 'Save Plan'}
          </Button>
          <Button onClick={handleBack} variant="outline">
            {isSharedPlan ? 'Back to Home' : 'Back to Dashboard'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600">
          Error: {error}
        </div>
      )}

      {/* Universal access enabled - no read-only restrictions */}

      {isCollaborating && collaborators.length > 0 && (
        <ActiveUsersDisplay
          collaborators={collaborators}
          currentSessionId={sessionId}
          maxDisplayUsers={8}
        />
      )}



      <PlanningInterface
        onSave={handleSave}
        saving={saving}
      />

      {/* No longer showing display name modal for anonymous users */}
    </div>
    <Footer />
  </>
  );
};

export default MitigationPlanner;
