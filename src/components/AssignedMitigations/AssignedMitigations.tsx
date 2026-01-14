import { memo } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  getAbilityDescriptionForLevel,
  getAbilityDurationForLevel,
  getAbilityCooldownForLevel,
  getAbilityMitigationValueForLevel,
  getAbilityChargeCount,
  isMitigationAvailable,
  getJobIcon
} from '../../utils';
import { mitigationAbilities } from '../../data/abilities/mitigationAbilities.js';
import { useFilterContext } from '../../contexts';
import { useUserJobAssignmentOptional } from '../../contexts/UserJobAssignmentContext';
import { Input } from '@/components/ui/input';



const RemoveButton = ({ children, className = '', ...rest }) => (
  <button
    {...rest}
    className={`cursor-pointer text-[18px] flex items-center justify-center w-6 h-6 rounded-full border-0 bg-red-500 text-white p-0 ml-[4px] leading-none shrink-0 relative z-[15] select-none touch-manipulation hover:bg-red-600 active:bg-red-400 active:scale-95 ${className}`}
  >
    {children}
  </button>
);


const CasterBadge = ({ children, className = '', color, jobId, ...rest }) => {
  const jobIcon = jobId ? getJobIcon(jobId) : null;
  return (
    <span {...rest} className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1 py-[1px] rounded ml-1 bg-muted text-foreground ${className}`}>
      {color && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {jobIcon && (
        <img 
          src={jobIcon} 
          alt={jobId} 
          className="w-3.5 h-3.5 object-contain shrink-0"
        />
      )}
      {children}
    </span>
  );
};

const TankPositionBadge = ({ children, className = '', $position, ...rest }) => {
  const bg = $position === 'mainTank'
    ? 'bg-blue-100 dark:bg-blue-500/30'
    : $position === 'offTank'
      ? 'bg-cyan-100 dark:bg-cyan-400/30'
      : 'bg-transparent';
  return (
    <span {...rest} className={`inline-flex items-center justify-center text-[9px] font-bold px-[3px] py-[1px] rounded ml-1 uppercase tracking-[0.5px] text-foreground sm:text-[7px] sm:px-[2px] sm:ml-[2px] ${bg} ${className}`}>{children}</span>
  );
};

const AssignedMitigations = ({
  action,
  assignments,
  getActiveMitigations,
  selectedJobs,
  currentBossLevel,
  onRemoveMitigation,
  onUpdatePrecast
}) => {
  const { showPrecastOptions } = useFilterContext();
  const jobAssignment = useUserJobAssignmentOptional();
  const myUserId = jobAssignment?.myUserId || null;
  const myColor = jobAssignment?.myColor || null;
  const myAssignedJob = jobAssignment?.myAssignedJob || null;

  // Get directly assigned mitigations
  const directMitigations = (assignments && assignments[action.id]) || [];

  // Filter out mitigations that don't have any corresponding selected jobs
  const filteredDirectMitigations = directMitigations.filter(mitigation => {
    if (!mitigation) return false;

    // Find the full mitigation data from the abilities array
    const fullMitigation = mitigationAbilities.find(a => a.id === mitigation.id);
    if (!fullMitigation) return false;

    // Check if any of the jobs that can use this ability are selected
    return isMitigationAvailable(fullMitigation, selectedJobs);
  });

  // Get inherited mitigations from previous actions
  const activeMitigations = getActiveMitigations ? getActiveMitigations(action.id, action.time) : [];

  // Filter out inherited mitigations that don't have any corresponding selected jobs
  const filteredActiveMitigations = activeMitigations.filter(mitigation => {
    // Find the full mitigation data
    const fullMitigation = mitigationAbilities.find(a => a.id === mitigation.id);
    if (!fullMitigation) return false;

    // Check if any of the jobs that can use this ability are selected
    return isMitigationAvailable(fullMitigation, selectedJobs);
  });

  // Only render if we have any mitigations to display
  if (filteredDirectMitigations.length === 0 && filteredActiveMitigations.length === 0) {
    return null;
  }
  return (
    <div className="absolute top-[30px] right-0 flex flex-col gap-1.5 border-l-2 border-border p-2.5 h-[calc(100%-40px)] overflow-y-auto overflow-x-hidden rounded-br-md z-10 w-[clamp(260px,20vw,360px)] 2xl:w-[clamp(280px,18vw,380px)] xl:w-[clamp(240px,16vw,320px)] md:w-[clamp(200px,26vw,260px)] sm:w-[clamp(160px,33vw,220px)] max-w-[400px] bg-card">
      {/* Render directly assigned mitigations */}
      {filteredDirectMitigations.map((mitigation, index) => {
        // Find the full mitigation data from the abilities array
        const fullMitigation = mitigationAbilities.find(a => a.id === mitigation.id);
        if (!fullMitigation) return null;

        // Use the full mitigation data for rendering, but preserve assignment-specific data like tankPosition
        const displayMitigation = { ...fullMitigation, ...mitigation };

        // Compute tooltip content directly (no useMemo)
        let tooltipContent = `${displayMitigation.name}${displayMitigation.tankPosition && displayMitigation.tankPosition !== 'shared' ? ` (${displayMitigation.tankPosition === 'mainTank' ? 'Main Tank' : 'Off Tank'})` : ''}: ${getAbilityDescriptionForLevel(displayMitigation, currentBossLevel)} (Duration: ${getAbilityDurationForLevel(displayMitigation, currentBossLevel)}s, Cooldown: ${getAbilityCooldownForLevel(displayMitigation, currentBossLevel)}s${getAbilityChargeCount(displayMitigation, currentBossLevel) > 1 ? `, Charges: ${getAbilityChargeCount(displayMitigation, currentBossLevel)}` : ''}${displayMitigation.barrierPotency ? `, Barrier: ${Math.round(displayMitigation.barrierPotency * 100)}% max HP` : ''}${displayMitigation.barrierFlatPotency ? `, Barrier: ${displayMitigation.barrierFlatPotency} potency` : ''})${displayMitigation.mitigationValue ? `\nMitigation: ${typeof getAbilityMitigationValueForLevel(displayMitigation, currentBossLevel) === 'object' ? `${getAbilityMitigationValueForLevel(displayMitigation, currentBossLevel).physical * 100}% physical, ${getAbilityMitigationValueForLevel(displayMitigation, currentBossLevel).magical * 100}% magical` : `${getAbilityMitigationValueForLevel(displayMitigation, currentBossLevel) * 100}%`}` : ''}`;
        // Include precast in tooltip if present and the UI is showing precast
        if (showPrecastOptions && (displayMitigation.precastSeconds || 0) > 0) {
          tooltipContent += `\nPrecast: ${Number(displayMitigation.precastSeconds).toFixed(1)}s before`;
        }

        // Create a unique key combining id, tankPosition, and casterJobId
        const uniqueKey = `${displayMitigation.id}-${displayMitigation.tankPosition || 'shared'}-${displayMitigation.casterJobId || 'default'}-${index}`;

        const casterColor = displayMitigation.casterJobId && jobAssignment 
          ? jobAssignment.getJobAssignment(displayMitigation.casterJobId)?.color || null
          : displayMitigation.casterColor || null;

        const isMyMitigation = myUserId && 
          displayMitigation.casterUserId === myUserId && 
          displayMitigation.casterJobId === myAssignedJob;
        const highlightColor = isMyMitigation ? (myColor || '#3b82f6') : null;

        return (
          <Tooltip key={uniqueKey}>
            <TooltipTrigger asChild>
              <div 
                className={`rounded-sm px-[3px] py-[1px] text-[12px] flex items-center text-foreground font-medium mb-[1px] w-full max-w-full min-w-0 ${isMyMitigation ? 'border-l-[3px]' : 'border-l-2 border-blue-500'} ${isMyMitigation ? 'hover:opacity-90' : 'hover:bg-blue-500/10'}`}
                style={isMyMitigation ? { 
                  borderLeftColor: highlightColor, 
                  backgroundColor: `${highlightColor}10`
                } : undefined}
              >
              <span className="mr-1 inline-flex items-center justify-center w-4 h-4 shrink-0">
                {typeof displayMitigation.icon === 'string' && displayMitigation.icon.startsWith('/') ?
                  <img
                    src={displayMitigation.icon}
                    alt={displayMitigation.name}
                    className="max-h-full max-w-full block"
                  /> :
                  displayMitigation.icon
                }
              </span>
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-normal min-w-0 flex items-center">
                {displayMitigation.name}
                {displayMitigation.casterJobId && (
                  <CasterBadge color={casterColor} jobId={displayMitigation.casterJobId}>
                    {displayMitigation.casterJobId}
                  </CasterBadge>
                )}

                {displayMitigation.tankPosition && displayMitigation.tankPosition !== 'shared' && (
                  <TankPositionBadge $position={displayMitigation.tankPosition}>
                    {displayMitigation.tankPosition === 'mainTank' ? 'MT' : 'OT'}
                  </TankPositionBadge>
                )}
              </span>
              <div className="flex flex-[0_0_auto] items-center justify-end gap-1.5">
                {showPrecastOptions && getAbilityDurationForLevel(displayMitigation, currentBossLevel) > 0 && (
                  <Input
                    type="number"
                    variant="inline"
                    step="0.1"
                    min={0}
                    max={getAbilityDurationForLevel(displayMitigation, currentBossLevel) || undefined}
                    value={(() => {
                      const v = displayMitigation.precastSeconds;
                      if (v === 0 || v == null || !Number.isFinite(Number(v))) return '';
                      return String(v);
                    })()}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      if (valStr === '') {
                        onUpdatePrecast && onUpdatePrecast(
                          action.id,
                          displayMitigation.id,
                          displayMitigation.tankPosition,
                          0
                        );
                        return;
                      }
                      const raw = Number(valStr);
                      if (!Number.isFinite(raw)) {
                        return;
                      }
                      const dur = getAbilityDurationForLevel(displayMitigation, currentBossLevel) || 0;
                      const clamped = Math.max(0, Math.min(raw, dur));
                      onUpdatePrecast && onUpdatePrecast(
                        action.id,
                        displayMitigation.id,
                        displayMitigation.tankPosition,
                        clamped
                      );
                    }}
                    inputMode="decimal"
                    placeholder=""
                    title="Seconds to precast before boss action (max = ability duration)"
                  />
                )}
                <RemoveButton
                  onClick={(e) => {
                    // Prevent event bubbling
                    e.stopPropagation();
                    e.preventDefault();

                    // Add a small delay to ensure the click is processed
                    setTimeout(() => {
                      // Remove the mitigation with its tank position
                      onRemoveMitigation(action.id, displayMitigation.id, displayMitigation.tankPosition);
                    }, 10);
                  }}
                  aria-label={`Remove ${displayMitigation.name}`}
                >
                  ×
                </RemoveButton>
              </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="whitespace-pre-line max-w-xs">{tooltipContent}</TooltipContent>
          </Tooltip>
        );
      })}

      {/* Render inherited mitigations from previous boss actions */}
      {filteredActiveMitigations.length > 0 && (
        <div className="mt-2 border-t border-dashed border-gray-300 dark:border-gray-700 pt-1.5 flex flex-col gap-1.5">
          {filteredActiveMitigations.map(mitigation => {
            // Find the full mitigation data
            const fullMitigation = mitigationAbilities.find(a => a.id === mitigation.id);
            if (!fullMitigation) return null;

            const inheritedCasterColor = mitigation.casterJobId && jobAssignment 
              ? jobAssignment.getJobAssignment(mitigation.casterJobId)?.color || null
              : mitigation.casterColor || null;

            const isMyInheritedMitigation = myUserId && 
              mitigation.casterUserId === myUserId &&
              mitigation.casterJobId === myAssignedJob;
            const inheritedHighlightColor = isMyInheritedMitigation ? (myColor || '#3b82f6') : null;

            const inheritedTooltipContent = `${fullMitigation.name}${mitigation.tankPosition && mitigation.tankPosition !== 'shared' ? ` (${mitigation.tankPosition === 'mainTank' ? 'Main Tank' : 'Off Tank'})` : ''}: Applied at ${mitigation.sourceActionTime}s (${mitigation.sourceActionName})\nRemaining duration: ${mitigation.remainingDuration.toFixed(1)}s${fullMitigation.barrierPotency ? `\nBarrier: ${Math.round(fullMitigation.barrierPotency * 100)}% max HP` : ''}${fullMitigation.barrierFlatPotency ? `\nBarrier: ${fullMitigation.barrierFlatPotency} potency` : ''}${fullMitigation.mitigationValue ? `\nMitigation: ${typeof getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel) === 'object' ? `${(getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel) as { physical: number; magical: number }).physical * 100}% physical, ${(getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel) as { physical: number; magical: number }).magical * 100}% magical` : `${(getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel) as number) * 100}%`}` : ''}`;

            return (
              <Tooltip key={`inherited-${mitigation.id}-${mitigation.sourceActionId}`}>
                <TooltipTrigger asChild>
                  <div 
                    className={`rounded-sm px-[3px] py-[1px] text-[11px] flex items-center text-muted-foreground font-medium mb-[1px] w-full max-w-full min-w-0 opacity-80 italic ${isMyInheritedMitigation ? 'border-l-[3px]' : 'border-l-2 border-gray-500'} hover:bg-blue-500/5`}
                    style={isMyInheritedMitigation ? { 
                      borderLeftColor: inheritedHighlightColor, 
                      backgroundColor: `${inheritedHighlightColor}08`
                    } : undefined}
                  >
                    <span className="mr-1 inline-flex items-center justify-center w-4 h-4 shrink-0">
                      {typeof fullMitigation.icon === 'string' && fullMitigation.icon.startsWith('/') ?
                        <img
                          src={fullMitigation.icon}
                          alt={fullMitigation.name}
                          className="max-h-[18px] max-w-[18px] opacity-70 block"
                        /> :
                        fullMitigation.icon
                      }
                    </span>
                    <span className="flex-1 overflow-hidden text-ellipsis whitespace-normal flex items-center">
                      {fullMitigation.name}
                      {mitigation.casterJobId && (
                        <CasterBadge color={inheritedCasterColor} jobId={mitigation.casterJobId}>
                          {mitigation.casterJobId}
                        </CasterBadge>
                      )}

                      {mitigation.tankPosition && mitigation.tankPosition !== 'shared' && (
                        <TankPositionBadge $position={mitigation.tankPosition}>
                          {mitigation.tankPosition === 'mainTank' ? 'MT' : 'OT'}
                        </TankPositionBadge>
                      )}
                    </span>
                    <small className="text-[9px] opacity-80 shrink-0">
                      {mitigation.remainingDuration.toFixed(1)}s
                    </small>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="whitespace-pre-line max-w-xs">{inheritedTooltipContent}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
};

AssignedMitigations.displayName = 'AssignedMitigations';

export default memo(AssignedMitigations);
