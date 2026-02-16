import { memo, useState, useCallback, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, X, XCircle } from 'lucide-react';
import { mitigationAbilities, ffxivJobs } from '../../data';
import { determineMitigationAssignment } from '../../utils/mitigation/autoAssignmentUtils';
import { getAvailableAbilities } from '../../utils';
import { useFilterContext, useTankPositionContext, useTankSelectionModalContext } from '../../contexts';
import { useClassSelectionModalContext } from '../../contexts/ClassSelectionModalContext.jsx';
import { useUserJobAssignmentOptional } from '../../contexts/UserJobAssignmentContext';
import MitigationItem from '../MitigationItem/MitigationItem';
import { cn } from '@/lib/utils';

interface MitigationBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBossAction: any;
  selectedJobs: any;
  currentBossLevel: number;
  assignments: any;
  addMitigation: any;
  removeMitigation: any;
  checkAbilityAvailability: any;
  pendingAssignments: any;
  getActiveMitigations: any;
  sortedBossActions: any[];
}

const MitigationBottomSheet = memo(({
  isOpen,
  onClose,
  selectedBossAction,
  selectedJobs,
  currentBossLevel,
  assignments,
  addMitigation,
  removeMitigation,
  checkAbilityAvailability,
  pendingAssignments,
  getActiveMitigations,
}: MitigationBottomSheetProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState<string | null>(null);
  
  const { filterMitigations } = useFilterContext();
  const { tankPositions } = useTankPositionContext();
  const { openTankSelectionModal } = useTankSelectionModalContext();
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

  const availableMitigations = useMemo(() => {
    return getAvailableAbilities(mitigationAbilities, selectedJobs, currentBossLevel);
  }, [selectedJobs, currentBossLevel]);

  const filteredMitigations = useMemo(() => {
    if (!selectedBossAction) {
      return filterMitigations(availableMitigations, null, myAssignedJob);
    }
    return filterMitigations(availableMitigations, selectedBossAction, myAssignedJob);
  }, [availableMitigations, filterMitigations, myAssignedJob, selectedBossAction]);

  const availableJobs = useMemo(() => {
    const jobs = new Set<string>();
    if (selectedJobs && typeof selectedJobs === 'object') {
      Object.values(selectedJobs).forEach((roleJobs: any) => {
        if (Array.isArray(roleJobs)) {
          roleJobs.forEach((job: any) => {
            if (job?.selected) {
              jobs.add(job.id);
            }
          });
        }
      });
    }
    return Array.from(jobs).sort();
  }, [selectedJobs]);

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

  const searchedMitigations = useMemo(() => {
    let result = filteredMitigations;
    
    if (selectedJobFilter) {
      result = result.filter((m: any) => m.jobs?.includes(selectedJobFilter));
    }
    
    if (searchQuery.trim()) {
      result = result.filter((m: any) => 
        fuzzyMatch(m.name, searchQuery) ||
        fuzzyMatch(m.description || '', searchQuery)
      );
    }
    
    return result;
  }, [filteredMitigations, selectedJobFilter, searchQuery]);

  const handleMitigationTap = useCallback((mitigation: any) => {
    if (!selectedBossAction) return;

    const isAlreadyAssigned = directAssignments.some((a: any) => a.id === mitigation.id);

    if (isAlreadyAssigned) {
      removeMitigation(selectedBossAction.id, mitigation.id);
      return;
    }

    const assignmentDecision = determineMitigationAssignment(
      mitigation, 
      selectedBossAction, 
      tankPositions, 
      selectedJobs
    );

    if (assignmentDecision.shouldShowModal) {
      openTankSelectionModal(mitigation.name, (selectedTankPosition: string) => {
        addMitigation(selectedBossAction.id, mitigation, selectedTankPosition, getCasterOptions());
      }, mitigation, selectedBossAction);
      return;
    }

    if (Array.isArray(mitigation.jobs) && mitigation.jobs.length > 1) {
      openClassSelectionModal(mitigation, selectedBossAction, (jobId: string) => {
        addMitigation(selectedBossAction.id, mitigation, 'shared', getCasterOptions(jobId));
      });
      return;
    }

    if (assignmentDecision.assignment) {
      addMitigation(
        selectedBossAction.id, 
        mitigation, 
        assignmentDecision.assignment.targetPosition, 
        getCasterOptions()
      );
      return;
    }

    const availability = checkAbilityAvailability(
      mitigation.id,
      selectedBossAction.time,
      selectedBossAction.id,
      { isBeingAssigned: true }
    );

    if (availability.canAssign()) {
      if (Array.isArray(mitigation.jobs) && mitigation.jobs.length > 1) {
        openClassSelectionModal(mitigation, selectedBossAction, (jobId: string) => {
          addMitigation(selectedBossAction.id, mitigation, 'shared', getCasterOptions(jobId));
        });
      } else {
        addMitigation(selectedBossAction.id, mitigation, null, getCasterOptions());
      }
    }
  }, [
    selectedBossAction, tankPositions, selectedJobs, addMitigation, removeMitigation, 
    checkAbilityAvailability, openTankSelectionModal, openClassSelectionModal, getCasterOptions
  ]);

  const directAssignments = selectedBossAction ? assignments[selectedBossAction.id] || [] : [];
  const activeAssignments = selectedBossAction && getActiveMitigations 
    ? getActiveMitigations(selectedBossAction.id, selectedBossAction.time) 
    : [];
  const hasAssignments = directAssignments.length > 0 || activeAssignments.length > 0;

  const allAssignedMitigations = useMemo(() => {
    const result: any[] = [];
    directAssignments.forEach(assignment => {
      const fullMitigation = mitigationAbilities.find(m => m.id === assignment.id);
      if (fullMitigation) {
        result.push({ ...fullMitigation, ...assignment, isDirect: true });
      }
    });
    activeAssignments.forEach(assignment => {
      const fullMitigation = mitigationAbilities.find(m => m.id === assignment.id);
      if (fullMitigation && !result.find(r => r.id === assignment.id)) {
        result.push({ ...fullMitigation, ...assignment, isDirect: false });
      }
    });
    return result;
  }, [directAssignments, activeAssignments]);

  const handleRemoveMitigation = useCallback((mitigationId: string) => {
    if (!selectedBossAction) return;
    removeMitigation(selectedBossAction.id, mitigationId);
  }, [selectedBossAction, removeMitigation]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] rounded-t-2xl p-0 gap-0"
      >
        <SheetHeader className="p-4 pb-2 border-b shrink-0">
          <SheetTitle className="text-base">
            {selectedBossAction ? selectedBossAction.name : 'Select Mitigation'}
          </SheetTitle>
          {selectedBossAction && (
            <p className="text-xs text-muted-foreground">
              ⏱️ {selectedBossAction.time}s • {selectedBossAction.isTankBuster ? 'Tank Buster' : selectedBossAction.isDualTankBuster ? 'Dual Tank Buster' : 'Raidwide'}
            </p>
          )}
        </SheetHeader>

        {hasAssignments && (
          <div className="px-4 py-3 border-b bg-primary/5 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">
                Assigned Mitigations ({allAssignedMitigations.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {allAssignedMitigations.map((mit, idx) => (
                <div
                  key={`${mit.id}-${idx}`}
                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-md text-xs pr-1"
                >
                  {mit.icon && typeof mit.icon === 'string' && mit.icon.startsWith('/') ? (
                    <img src={mit.icon} alt="" className="w-4 h-4 object-contain" />
                  ) : (
                    <span className="text-sm">{mit.icon}</span>
                  )}
                  <span className="truncate max-w-[60px]">{mit.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMitigation(mit.id)}
                    className="ml-1 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-3 border-b shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search mitigations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedJobFilter(null)}
              className={cn(
                "px-2 py-1 text-xs rounded-md border transition-colors whitespace-nowrap",
                selectedJobFilter === null
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/50'
              )}
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
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-colors whitespace-nowrap",
                    selectedJobFilter === jobId
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-primary/50'
                  )}
                >
                  {jobInfo.icon && typeof jobInfo.icon === 'string' && jobInfo.icon.startsWith('/') ? (
                    <img src={jobInfo.icon} alt={jobInfo.name} className="w-4 h-4 object-contain" />
                  ) : null}
                  <span>{jobId}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ maxHeight: 'calc(90vh - 220px)' }}>
            {searchedMitigations.map((mitigation: any) => {
              const availability = selectedBossAction ? checkAbilityAvailability(
                mitigation.id,
                selectedBossAction.time,
                selectedBossAction.id,
                { isBeingAssigned: false }
              ) : { isAvailable: true, canAssign: () => true };

              const isDisabled = !availability.canAssign();
              const cooldownReason = availability.getUnavailabilityReason ? availability.getUnavailabilityReason() : null;

              return (
                <div
                  key={mitigation.id}
                  onClick={() => !isDisabled && handleMitigationTap(mitigation)}
                  className={cn(
                    "cursor-pointer rounded-lg border border-border bg-card p-3 transition-all",
                    isDisabled 
                      ? "opacity-50 cursor-not-allowed" 
                      : "hover:border-primary/50 hover:shadow-sm active:scale-[0.98]"
                  )}
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
                </div>
              );
            })}
            {searchedMitigations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No mitigations found</p>
                <p className="text-xs mt-1">Try adjusting your search or filters</p>
              </div>
            )}
        </div>

        <div className="p-2 border-t shrink-0">
          <div className="flex justify-center">
            <div className="w-12 h-1 bg-muted rounded-full" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
});

MitigationBottomSheet.displayName = 'MitigationBottomSheet';

export default MitigationBottomSheet;
