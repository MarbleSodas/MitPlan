import { memo } from 'react';
import styled from 'styled-components';
import Tooltip from '../common/Tooltip/Tooltip';
import {
  getAbilityDescriptionForLevel,
  getAbilityDurationForLevel,
  getAbilityCooldownForLevel,
  getAbilityMitigationValueForLevel,
  getAbilityChargeCount,
  isMitigationAvailable
} from '../../utils';
import { mitigationAbilities } from '../../data/abilities/mitigationAbilities.js';
import { useFilterContext } from '../../contexts';
// import { useTankPositionContext } from '../../contexts';

const AssignedMitigationsContainer = styled.div`
  position: absolute;
  top: 30px;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-left: 2px solid ${props => props.theme.colors.border};
  padding: 8px 10px;
  height: calc(100% - 40px);
  overflow-y: auto;
  overflow-x: hidden;
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.8)'};
  border-bottom-right-radius: ${props => props.theme.borderRadius.medium};
  -webkit-overflow-scrolling: touch;
  z-index: 10;
  box-shadow: -3px 0 8px rgba(0, 0, 0, 0.08);

  /* Desktop styles - optimized for 1920x1080, 1440x900, 2560x1440 */
  width: clamp(220px, 16vw, 300px);
  min-width: 220px;
  max-width: 320px;

  /* Large desktop styles (2560x1440 and above) */
  @media (min-width: ${props => props.theme.breakpoints.largeDesktop}) {
    width: clamp(240px, 15vw, 320px);
    min-width: 240px;
    max-width: 340px;
    padding: 10px 12px;
    gap: 8px;
    font-size: ${props => props.theme.fontSizes.medium};
  }

  /* Standard desktop styles (1200px to 1440px) */
  @media (max-width: ${props => props.theme.breakpoints.largeDesktop}) and (min-width: ${props => props.theme.breakpoints.desktop}) {
    width: clamp(220px, 17vw, 300px);
    min-width: 220px;
    max-width: 320px;
  }

  /* Large tablet styles (992px to 1200px) */
  @media (max-width: ${props => props.theme.breakpoints.desktop}) and (min-width: ${props => props.theme.breakpoints.largeTablet}) {
    width: clamp(180px, 22vw, 240px);
    min-width: 180px;
    max-width: 240px;
    padding: 5px 6px;
    gap: 4px;
  }

  /* Tablet styles (768px to 992px) */
  @media (max-width: ${props => props.theme.breakpoints.largeTablet}) and (min-width: ${props => props.theme.breakpoints.tablet}) {
    width: clamp(160px, 26vw, 220px);
    min-width: 160px;
    max-width: 220px;
    padding: 4px 6px;
    gap: 4px;
  }

  /* Mobile styles (480px to 768px) */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) and (min-width: ${props => props.theme.breakpoints.mobile}) {
    width: clamp(120px, 30vw, 160px);
    min-width: 120px;
    max-width: 160px;
    top: 30px;
    padding: 3px 5px;
    gap: 3px;
    height: calc(100% - 30px);
  }

  /* Small mobile styles (below 480px) */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: clamp(110px, 35vw, 140px);
    min-width: 110px;
    max-width: 140px;
    top: 30px;
    padding: 3px 5px;
    gap: 3px;
    height: calc(100% - 30px);
    touch-action: pan-y;
    overscroll-behavior: contain;
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.85)'};
    border-left: 2px solid ${props => props.theme.colors.primary};
    box-shadow: -2px 0 6px rgba(0, 0, 0, 0.1);
  }
`;

const AssignedMitigationItem = styled.div`
  background-color: transparent;
  border-radius: ${props => props.theme.borderRadius.small};
  padding: 1px 3px;
  font-size: 12px;
  display: flex;
  align-items: center;
  border-left: 2px solid ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.text};
  font-weight: ${props => props.theme.mode === 'dark' ? '500' : 'normal'};
  margin-bottom: 1px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  /* Removed transition for better performance */

  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.1)' : 'rgba(51, 153, 255, 0.05)'};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 1px 2px;
    font-size: 10px;
    margin-bottom: 1px;
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.15)' : 'rgba(51, 153, 255, 0.1)'};
    border-radius: 2px;
    white-space: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    min-width: 0;
    width: 100%;
  }
`;

const InheritedMitigationsContainer = styled.div`
  margin-top: 10px;
  border-top: 1px dashed ${props => props.theme.colors.border};
  padding-top: 5px;
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.small};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    margin-top: 6px;
    padding-top: 3px;
    gap: 2px;
  }
`;

const InheritedMitigationItem = styled.div`
  background-color: transparent;
  border-radius: ${props => props.theme.borderRadius.small};
  padding: 1px 3px;
  font-size: 11px;
  display: flex;
  align-items: center;
  border-left: 2px solid ${props => props.theme.colors.lightText};
  color: ${props => props.theme.colors.lightText};
  font-weight: ${props => props.theme.mode === 'dark' ? '500' : 'normal'};
  margin-bottom: 1px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  opacity: 0.8;
  font-style: italic;
  /* Removed transition for better performance */

  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(51, 153, 255, 0.05)' : 'rgba(51, 153, 255, 0.02)'};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 1px 2px;
    font-size: 9px;
    margin-bottom: 1px;
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(150, 150, 150, 0.15)' : 'rgba(150, 150, 150, 0.1)'};
    border-radius: 2px;
    white-space: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.9;
    max-width: 100%;
    min-width: 0;
    width: 100%;
  }
`;

const MitigationIcon = styled.span`
  margin-right: 4px;
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;

  /* Tablet styles (768px to 992px) */
  @media (max-width: ${props => props.theme.breakpoints.largeTablet}) and (min-width: ${props => props.theme.breakpoints.tablet}) {
    margin-right: 3px;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  /* Mobile styles (480px to 768px) */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) and (min-width: ${props => props.theme.breakpoints.mobile}) {
    margin-right: 3px;
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }

  /* Small mobile styles (below 480px) */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    margin-right: 2px;
    width: 11px;
    height: 11px;
    flex-shrink: 0;
  }
`;

const PrecastInput = styled.input`
  width: 28px;
  padding: 0 0;
  border: 1px solid ${props => props.theme.colors.border} !important;
  border-radius: 4px;
  background: ${props => props.theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'white'};
  // color: inherit;
  text-align: center;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }

  /* Hide default number input steppers for a clean look */
  -moz-appearance: textfield;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const RemoveButton = styled.button`
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  min-width: 24px;
  min-height: 24px;
  max-width: 24px;
  max-height: 24px;
  border-radius: 50%;
  border: none;
  background-color: ${props => props.theme?.colors?.error || '#ef4444'};
  color: white;
  /* Removed transition for better performance */
  padding: 0;
  margin-left: 6px;
  line-height: 1;
  flex-shrink: 0;
  /* Ensure button is above other elements and can receive clicks */
  position: relative;
  z-index: 15; /* Higher z-index to ensure clickability */
  /* Ensure button stays within container bounds */
  box-sizing: border-box;
  /* Touch optimization */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;

  &:hover {
    background-color: ${props => props.theme?.colors?.errorHover || '#dc2626'};
  }

  &:active {
    background-color: rgba(255, 100, 100, 0.35);
    transform: scale(0.95);
  }

  /* Tablet styles (768px to 992px) */
  @media (max-width: ${props => props.theme.breakpoints.largeTablet}) and (min-width: ${props => props.theme.breakpoints.tablet}) {
    width: 26px;
    height: 26px;
    min-width: 26px;
    min-height: 26px;
    max-width: 26px;
    max-height: 26px;
    font-size: 16px;
    margin-left: 5px;
  }

  /* Mobile styles (480px to 768px) */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) and (min-width: ${props => props.theme.breakpoints.mobile}) {
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
    max-width: 28px;
    max-height: 28px;
    font-size: 16px;
    margin-left: 4px;
  }

  /* Small mobile styles (below 480px) */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 30px;
    height: 30px;
    min-width: 30px;
    min-height: 30px;
    max-width: 30px;
    max-height: 30px;
    font-size: 16px;
    margin-left: 3px;
  }
`;


const CasterBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: 4px;
  background-color: ${props => props.theme.mode === 'dark' ? 'rgba(150, 150, 150, 0.25)' : 'rgba(150, 150, 150, 0.2)'};
  color: ${props => props.theme.colors.text};
`;

const TankPositionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: bold;
  padding: 1px 3px;
  border-radius: 3px;
  margin-left: 4px;
  background-color: ${props => {
    if (props.$position === 'mainTank') {
      return props.theme.mode === 'dark' ? 'rgba(0, 150, 255, 0.3)' : 'rgba(0, 150, 255, 0.2)';
    } else if (props.$position === 'offTank') {
      return props.theme.mode === 'dark' ? 'rgba(100, 200, 255, 0.3)' : 'rgba(100, 200, 255, 0.2)';
    }
    return 'transparent';
  }};
  color: ${props => props.theme.colors.text};
  text-transform: uppercase;
  letter-spacing: 0.5px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 7px;
    padding: 1px 2px;
    margin-left: 2px;
  }
`;

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
  // Get tank position context
  // const { tankPositions } = useTankPositionContext();

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
    <AssignedMitigationsContainer>
      {/* Render directly assigned mitigations */}
      {filteredDirectMitigations.map(mitigation => {
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

        return (
          <Tooltip
            key={displayMitigation.id}
            content={tooltipContent}
          >
            <AssignedMitigationItem>
              <MitigationIcon>
                {typeof displayMitigation.icon === 'string' && displayMitigation.icon.startsWith('/') ?
                  <img src={displayMitigation.icon} alt={displayMitigation.name} style={{
                    maxHeight: '100%',
                    maxWidth: '100%',
                    display: 'block'
                  }} /> :
                  displayMitigation.icon
                }
              </MitigationIcon>
              <span
                style={{
                  flex: '1 1 auto',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'normal',
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {displayMitigation.name}
                {displayMitigation.casterJobId && (
                  <CasterBadge>
                    {displayMitigation.casterJobId}
                  </CasterBadge>
                )}

                {displayMitigation.tankPosition && displayMitigation.tankPosition !== 'shared' && (
                  <TankPositionBadge $position={displayMitigation.tankPosition}>
                    {displayMitigation.tankPosition === 'mainTank' ? 'MT' : 'OT'}
                  </TankPositionBadge>
                )}
              </span>
              <div style={{ display: 'flex', flex: '0 0 auto', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                {showPrecastOptions && getAbilityDurationForLevel(displayMitigation, currentBossLevel) > 0 && (
                  <PrecastInput
                    type="number"
                    step="0.1"
                    min={0}
                    max={getAbilityDurationForLevel(displayMitigation, currentBossLevel) || undefined}
                    value={(() => {
                      const v = displayMitigation.precastSeconds;
                      // Render empty for 0, null/undefined, or non-finite values to avoid React warnings
                      if (v === 0 || v == null || !Number.isFinite(Number(v))) return '';
                      return String(v);
                    })()}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      // Allow clearing the field without errors and persist as 0
                      if (valStr === '') {
                        onUpdatePrecast && onUpdatePrecast(
                          action.id,
                          displayMitigation.id,
                          displayMitigation.tankPosition,
                          0
                        );
                        return;
                      }
                      // Coerce to number safely
                      const raw = Number(valStr);
                      if (!Number.isFinite(raw)) {
                        // Ignore transient non-numeric states (e.g., '-')
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
            </AssignedMitigationItem>
          </Tooltip>
        );
      })}

      {/* Render inherited mitigations from previous boss actions */}
      {filteredActiveMitigations.length > 0 && (
        <InheritedMitigationsContainer>
          {filteredActiveMitigations.map(mitigation => {
            // Find the full mitigation data
            const fullMitigation = mitigationAbilities.find(a => a.id === mitigation.id);
            if (!fullMitigation) return null;

            return (
              <Tooltip
                key={`inherited-${mitigation.id}-${mitigation.sourceActionId}`}
                content={`${fullMitigation.name}${mitigation.tankPosition && mitigation.tankPosition !== 'shared' ? ` (${mitigation.tankPosition === 'mainTank' ? 'Main Tank' : 'Off Tank'})` : ''}: Applied at ${mitigation.sourceActionTime}s (${mitigation.sourceActionName})\nRemaining duration: ${mitigation.remainingDuration.toFixed(1)}s${fullMitigation.barrierPotency ? `\nBarrier: ${Math.round(fullMitigation.barrierPotency * 100)}% max HP` : ''}${fullMitigation.barrierFlatPotency ? `\nBarrier: ${fullMitigation.barrierFlatPotency} potency` : ''}${fullMitigation.mitigationValue ? `\nMitigation: ${typeof getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel) === 'object' ? `${getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel).physical * 100}% physical, ${getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel).magical * 100}% magical` : `${getAbilityMitigationValueForLevel(fullMitigation, currentBossLevel) * 100}%`}` : ''}`}
              >
                <InheritedMitigationItem>
                  <MitigationIcon>
                    {typeof fullMitigation.icon === 'string' && fullMitigation.icon.startsWith('/') ?
                      <img src={fullMitigation.icon} alt={fullMitigation.name} style={{
                        maxHeight: '18px',
                        maxWidth: '18px',
                        opacity: 0.7,
                        display: 'block'
                      }} /> :
                      fullMitigation.icon
                    }
                  </MitigationIcon>
                  <span style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'normal',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {fullMitigation.name}
                    {mitigation.casterJobId && (
                      <CasterBadge>
                        {mitigation.casterJobId}
                      </CasterBadge>
                    )}

                    {mitigation.tankPosition && mitigation.tankPosition !== 'shared' && (
                      <TankPositionBadge $position={mitigation.tankPosition}>
                        {mitigation.tankPosition === 'mainTank' ? 'MT' : 'OT'}
                      </TankPositionBadge>
                    )}
                  </span>
                  <small style={{
                    fontSize: '9px',
                    opacity: 0.8,
                    flexShrink: 0
                  }}>{mitigation.remainingDuration.toFixed(1)}s</small>
                </InheritedMitigationItem>
              </Tooltip>
            );
          })}
        </InheritedMitigationsContainer>
      )}
    </AssignedMitigationsContainer>
  );
};

AssignedMitigations.displayName = 'AssignedMitigations';

export default memo(AssignedMitigations);
