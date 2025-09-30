import React, { memo, useMemo } from 'react';
import {
  getAbilityDescriptionForLevel,
  getAbilityDurationForLevel,
  getAbilityCooldownForLevel,
  getAbilityChargeCount,
  getRoleSharedAbilityCount
} from '../../utils';
import { useEnhancedMitigation } from '../../contexts/EnhancedMitigationContext';
import { useTankPositionContext } from '../../contexts/TankPositionContext';

// Tailwind components
const MitigationItemContainer = ({ children, className = '', $isDisabled, $isDragging, ...rest }) => {
  const base = 'group relative flex flex-col items-center p-3 m-2 rounded-lg transition-all min-w-[120px] max-w-[180px]';
  const state = $isDisabled
    ? 'cursor-not-allowed opacity-60 border-2 border-neutral-300 dark:border-neutral-600 border-l-4 border-l-red-500 bg-neutral-50 dark:bg-neutral-800'
    : 'cursor-grab opacity-100 border-2 border-blue-500/50 dark:border-blue-400/40 border-l-4 border-l-blue-500 bg-white dark:bg-neutral-800 hover:-translate-y-0.5 hover:shadow';
  const responsive = 'sm:min-w-[100px] sm:max-w-[140px] sm:p-2 sm:m-1';
  return (
    <div {...rest} className={`${base} ${state} ${responsive} ${className}`}>
      {children}
    </div>
  );
};

const MitigationIcon = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`w-12 h-12 mb-2 flex items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-700 sm:w-10 sm:h-10 ${className}`}>
    {children}
  </div>
);

const MitigationName = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`font-semibold text-sm sm:text-xs text-neutral-900 dark:text-neutral-100 text-center mb-1 leading-tight ${className}`}>{children}</div>
);

const MitigationDescription = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`text-xs text-neutral-600 dark:text-neutral-300 text-center leading-snug sm:text-[10px] ${className}`}>{children}</div>
);

const CooldownOverlay = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`absolute inset-0 bg-black/80 text-white flex items-center justify-center rounded-lg text-xs font-semibold text-center p-1 leading-tight ${className}`}>{children}</div>
);

const StatusIndicators = ({ children, className = '', ...rest }) => (
  <div {...rest} className={`flex gap-1 mt-1 flex-wrap justify-center ${className}`}>{children}</div>
);

const StatusBadge = ({ children, className = '', $type, $available, ...rest }) => {
  const color = $type === 'charges'
    ? ($available === 0 ? 'bg-red-500' : 'bg-emerald-600')
    : $type === 'instances'
      ? ($available === 0 ? 'bg-red-500' : 'bg-blue-600')
      : $type === 'aetherflow'
        ? ($available === 0 ? 'bg-red-500' : 'bg-purple-600')
        : 'bg-neutral-500';
  return (
    <span {...rest} className={`inline-block px-[6px] py-[2px] rounded-[10px] text-[10px] font-bold text-white ${color} ${className}`}>
      {children}
    </span>
  );
};

const EnhancedMitigationItem = memo(({
  mitigation,
  currentBossLevel,
  selectedBossAction,
  selectedJobs,
  isDragging = false,
  onClick = null
}) => {
  // Get enhanced mitigation context
  const { checkAbilityAvailability, hasPendingAssignment } = useEnhancedMitigation();

  // Check availability if we have a selected boss action
  const availability = useMemo(() => {
    if (!selectedBossAction) {
      return {
        isAvailable: true,
        canAssign: () => true,
        getUnavailabilityReason: () => null,
        availableCharges: getAbilityChargeCount(mitigation, currentBossLevel),
        totalCharges: getAbilityChargeCount(mitigation, currentBossLevel),
        availableInstances: getRoleSharedAbilityCount(mitigation, selectedJobs),
        totalInstances: getRoleSharedAbilityCount(mitigation, selectedJobs),
        isRoleShared: mitigation.isRoleShared || false
      };
    }

    return checkAbilityAvailability(
      mitigation.id,
      selectedBossAction.time,
      selectedBossAction.id,
      { isBeingAssigned: false }
    );
  }, [mitigation, selectedBossAction, checkAbilityAvailability, currentBossLevel, selectedJobs]);

  // Check for pending assignments
  const isPending = selectedBossAction ? hasPendingAssignment(
    selectedBossAction.id,
    mitigation.id
  ) : false;

  // Determine if the item should be disabled
  const isDisabled = !availability.canAssign() && !isPending;
  const cooldownReason = availability.getUnavailabilityReason();

  // Render charge counter for abilities with multiple charges
  const renderChargeCounter = () => {
    if (availability.totalCharges <= 1) return null;

    return (
      <StatusBadge
        $type="charges"
        $available={availability.availableCharges}
        className={isPending ? 'animate-pulse' : ''}
      >
        {availability.availableCharges}/{availability.totalCharges} Charges
      </StatusBadge>
    );
  };

  // Render instance counter for role-shared abilities
  const renderInstanceCounter = () => {
    if (!availability.isRoleShared || availability.totalInstances <= 1) return null;

    return (
      <StatusBadge
        $type="instances"
        $available={availability.availableInstances}
        className={isPending ? 'animate-pulse' : ''}
      >
        {availability.availableInstances}/{availability.totalInstances} Instances
      </StatusBadge>
    );
  };

  // Render Aetherflow indicator for Aetherflow-consuming abilities
  const renderAetherflowIndicator = () => {
    if (!mitigation.consumesAetherflow) return null;

    // This would need to be enhanced to show actual Aetherflow stacks
    // For now, just show that it consumes Aetherflow
    return (
      <StatusBadge $type="aetherflow" $available={1}>
        Aetherflow
      </StatusBadge>
    );
  };

  return (
    <MitigationItemContainer
      $isDisabled={isDisabled}
      $isDragging={isDragging}
      onClick={onClick}
    >
      <MitigationIcon>
        {typeof mitigation.icon === 'string' && mitigation.icon.startsWith('/') ? (
          <img src={mitigation.icon} alt={mitigation.name} />
        ) : (
          mitigation.icon
        )}
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
        </small>
      </MitigationDescription>

      <StatusIndicators>
        {renderChargeCounter()}
        {renderInstanceCounter()}
        {renderAetherflowIndicator()}
      </StatusIndicators>

      {isDisabled && cooldownReason && (
        <CooldownOverlay>
          {cooldownReason}
        </CooldownOverlay>
      )}
    </MitigationItemContainer>
  );
});

EnhancedMitigationItem.displayName = 'EnhancedMitigationItem';

export default EnhancedMitigationItem;
