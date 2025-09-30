import React, { memo } from 'react';
import ChargeCounter from '../ChargeCounter';
import {
  getAbilityDescriptionForLevel,
  getAbilityDurationForLevel,
  getAbilityCooldownForLevel,
  getAbilityChargeCount,
  getRoleSharedAbilityCount,
  isSelfTargetingAbilityUsableByTank
} from '../../utils';
import { useTankPositionContext } from '../../contexts';

const MitigationItemContainer = ({ children, className = '', $disabled, ...rest }) => {
  const base = 'group relative w-full transition-all border-l-4 rounded-sm px-3 py-2 mb-[2px] select-none';
  const state = $disabled
    ? 'cursor-not-allowed opacity-70 border-l-red-500 bg-neutral-100/80 dark:bg-neutral-700/50'
    : 'cursor-grab opacity-100 border-l-blue-500 hover:bg-black/5 dark:hover:bg-white/5';
  return (
    <div {...rest} className={`${base} ${state} ${className}`}>
      {children}
    </div>
  );
};

const MitigationIcon = ({ children, className = '', ...rest }) => (
  <span {...rest} className={`mr-2 inline-flex items-center justify-center w-5 h-5 sm:w-4 sm:h-4 shrink-0 align-middle ${className}`}>{children}</span>
);

const MitigationName = ({ children, className = '', ...rest }) => (
  <h4 {...rest} className={`m-0 mb-[5px] inline-block ${className}`}>{children}</h4>
);

const MitigationDescription = ({ children, className = '', ...rest }) => (
  <p {...rest} className={`m-0 text-sm text-neutral-600 dark:text-neutral-300 ${className}`}>{children}</p>
);

const CooldownOverlay = ({ children, className = '', ...rest }) => (
  <div
    {...rest}
    className={`absolute inset-0 bg-black/70 text-white flex items-center justify-center text-center text-[12px] p-[5px] rounded-[inherit] z-20 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 ${className}`}
  >
    {children}
  </div>
);

const MitigationItem = memo(({
  mitigation,
  isDisabled,
  cooldownReason,
  currentBossLevel,
  selectedBossAction,
  pendingAssignments = [],
  checkAbilityAvailability,
  selectedJobs,
  isDragging = false
}) => {
  // Get the tank position context
  const { tankPositions } = useTankPositionContext();
  // Render charge counter for abilities with multiple charges
  const renderChargeCounter = () => {
    if (getAbilityChargeCount(mitigation, currentBossLevel) <= 1) {
      return null;
    }

    // Get the availability result to check available charges
    const availabilityResult = selectedBossAction && checkAbilityAvailability ?
      checkAbilityAvailability(
        mitigation.id,
        selectedBossAction.time,
        selectedBossAction.id,
        {
          isBeingAssigned: selectedBossAction.assignments?.some(m => m.id === mitigation.id) ||
            pendingAssignments.some(pa =>
              pa.mitigationId === mitigation.id &&
              pa.bossActionId === selectedBossAction.id
            )
        }
      ) :
      {
        availableCharges: getAbilityChargeCount(mitigation, currentBossLevel),
        totalCharges: getAbilityChargeCount(mitigation, currentBossLevel),
        isRoleShared: mitigation.isRoleShared
      };

    // Get the available charges
    let availableCharges = availabilityResult.availableCharges || 0;

    // Check if there are any pending assignments for this mitigation
    // This ensures the UI updates immediately after assignment
    const hasPendingAssignment = selectedBossAction ? pendingAssignments.some(pa =>
      pa.mitigationId === mitigation.id &&
      pa.bossActionId === selectedBossAction.id &&
      !selectedBossAction.assignments?.some(m => m.id === mitigation.id)
    ) : false;

    // If there's a pending assignment, decrement the available charges
    if (hasPendingAssignment) {
      availableCharges = Math.max(0, availableCharges - 1);
    }

    return (
      <> | <ChargeCounter
        mitigationId={mitigation.id}
        bossActionId={selectedBossAction?.id}
        type="charges"
        totalCount={availabilityResult.totalCharges}
        availableCount={availableCharges}
      /></>
    );
  };

  // Render instance counter for role-shared abilities
  const renderInstanceCounter = () => {
    if (!mitigation.isRoleShared) {
      return null;
    }

    // Get the availability result to check available instances
    const instanceAvailability = selectedBossAction && checkAbilityAvailability ?
      checkAbilityAvailability(
        mitigation.id,
        selectedBossAction.time,
        selectedBossAction.id,
        {
          isBeingAssigned: selectedBossAction.assignments?.some(m => m.id === mitigation.id) ||
            pendingAssignments.some(pa =>
              pa.mitigationId === mitigation.id &&
              pa.bossActionId === selectedBossAction.id
            )
        }
      ) :
      {
        isRoleShared: true,
        totalInstances: getRoleSharedAbilityCount(mitigation, selectedJobs),
        availableInstances: getRoleSharedAbilityCount(mitigation, selectedJobs)
      };

    // Only show if we have multiple instances available
    const totalInstances = instanceAvailability.totalInstances || 0;
    if (totalInstances <= 1) return null;

    // Calculate available instances
    let availableInstances = instanceAvailability.availableInstances || 0;

    // Check if there are any pending assignments for this mitigation
    const hasPendingAssignment = selectedBossAction ? pendingAssignments.some(pa =>
      pa.mitigationId === mitigation.id &&
      pa.bossActionId === selectedBossAction.id &&
      !selectedBossAction.assignments?.some(m => m.id === mitigation.id)
    ) : false;

    // If there's a pending assignment, decrement the available instances
    if (hasPendingAssignment) {
      availableInstances = Math.max(0, availableInstances - 1);
    }

    return (
      <> | <ChargeCounter
        mitigationId={mitigation.id}
        bossActionId={selectedBossAction?.id}
        type="instances"
        totalCount={totalInstances}
        availableCount={availableInstances}
      /></>
    );
  };

  // Check if this is a self-targeting ability that's not usable by the current tank
  const isSelfTargetingAbility = mitigation.target === 'self' && mitigation.forTankBusters;

  // Check if the ability is usable by the main tank or off tank
  const isUsableByMainTank = !isSelfTargetingAbility || isSelfTargetingAbilityUsableByTank(mitigation, tankPositions.mainTank, tankPositions);
  const isUsableByOffTank = !isSelfTargetingAbility || isSelfTargetingAbilityUsableByTank(mitigation, tankPositions.offTank, tankPositions);

  // If this is a self-targeting ability and it's not usable by either tank, disable it
  const isTankSpecificDisabled = isSelfTargetingAbility && !isUsableByMainTank && !isUsableByOffTank;

  // Combine the original disabled state with the tank-specific disabled state
  const finalDisabled = isDisabled || isTankSpecificDisabled;

  // Create a custom reason for tank-specific abilities
  const finalReason = isTankSpecificDisabled && !isDisabled ?
    `This ability can only be used by ${mitigation.jobs.join(', ')}` :
    cooldownReason;

  return (
    <MitigationItemContainer $disabled={finalDisabled}>
      <MitigationIcon>
        {typeof mitigation.icon === 'string' && mitigation.icon.startsWith('/') ?
          <img src={mitigation.icon} alt={mitigation.name} className="h-6 w-6 object-contain" /> :
          mitigation.icon
        }
      </MitigationIcon>
      <MitigationName>{mitigation.name}</MitigationName>
      <MitigationDescription>
        {getAbilityDescriptionForLevel(mitigation, currentBossLevel)}<br />
        <small>
          {getAbilityDurationForLevel(mitigation, currentBossLevel) > 0 && (
            <>Duration: {getAbilityDurationForLevel(mitigation, currentBossLevel)}s | </>
          )}
          Cooldown: {getAbilityCooldownForLevel(mitigation, currentBossLevel)}s
          {mitigation.barrierPotency ? ` | Barrier: ${Math.round(mitigation.barrierPotency * 100)}% max HP` : ''}
          {mitigation.barrierFlatPotency ? ` | Barrier: ${mitigation.barrierFlatPotency} potency` : ''}
          {renderChargeCounter()}
          {renderInstanceCounter()}
        </small>
      </MitigationDescription>
      {finalDisabled && finalReason && (
        <CooldownOverlay className="cooldown-reason">
          {finalReason}
        </CooldownOverlay>
      )}
    </MitigationItemContainer>
  );
});

MitigationItem.displayName = 'MitigationItem';

export default MitigationItem;
