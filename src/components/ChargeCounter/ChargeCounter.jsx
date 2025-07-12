import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useEnhancedMitigation } from '../../contexts/EnhancedMitigationContext';

// Styled component for charge count display
const ChargeCountContainer = styled.span`
  display: inline-block;
  padding: 1px 5px;
  border-radius: 10px;
  background-color: ${props => props.$available === 0 ?
    props.theme.colors.error || '#ff5555' :
    props.theme.colors.primary};
  color: ${props => props.theme.colors.buttonText};
  font-weight: bold;
  margin-left: 4px;
  font-size: 0.8rem;
  opacity: ${props => props.$available === 0 ? 0.8 : 1};
  transition: all 0.3s ease;
  position: relative;

  &.flash-update {
    animation: flash 0.5s;
  }

  @keyframes flash {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;

/**
 * ChargeCounter component for displaying charge/instance counts
 *
 * @param {Object} props - Component props
 * @param {string} props.mitigationId - ID of the mitigation ability
 * @param {string} props.bossActionId - ID of the boss action (optional)
 * @param {string} props.type - Type of counter ('charges' or 'instances')
 * @param {number} props.totalCount - Total number of charges/instances
 * @param {number} props.availableCount - Available number of charges/instances
 * @returns {JSX.Element} - Rendered component
 */
const ChargeCounter = ({
  mitigationId,
  bossActionId,
  type = 'charges',
  totalCount,
  availableCount
}) => {
  const {
    checkAbilityAvailability,
    pendingAssignments,
    currentBossActions
  } = useEnhancedMitigation();

  // Local state for animation
  const [isFlashing, setIsFlashing] = useState(false);

  // Use a ref to track previous available count for comparison
  const prevAvailableRef = useRef();

  // Get the appropriate count using enhanced availability checking
  let total = totalCount || 1;
  let available = availableCount;

  // If counts are not provided, get them from enhanced availability checking
  if (available === undefined || totalCount === undefined) {
    // Find the boss action to get the time for availability checking
    const bossAction = bossActionId ? currentBossActions?.find(action => action.id === bossActionId) : null;
    const targetTime = bossAction?.time || 0;

    const availability = checkAbilityAvailability(mitigationId, targetTime, bossActionId);

    if (type === 'charges') {
      total = totalCount || availability.totalCharges;
      available = availableCount !== undefined ? availableCount : availability.availableCharges;
    } else {
      total = totalCount || availability.totalInstances;
      available = availableCount !== undefined ? availableCount : availability.availableInstances;
    }
  }

  // We don't need to check for pending assignments here because the context already decremented the count
  // This prevents double-decrementing in the mobile view
  // The desktop view handles this differently through the context

  // Flash effect when the count changes
  useEffect(() => {
    // Only flash if the available count has actually changed
    if (prevAvailableRef.current !== undefined && prevAvailableRef.current !== available) {
      setIsFlashing(true);
      const timer = setTimeout(() => {
        setIsFlashing(false);
      }, 500);

      return () => clearTimeout(timer);
    }

    // Update the ref with the current value
    prevAvailableRef.current = available;
  }, [available, pendingAssignments]);

  return (
    <ChargeCountContainer
      $available={available}
      data-mitigation-id={mitigationId}
      data-charge-type={type}
      className={isFlashing ? 'flash-update' : ''}
    >
      {available}/{total} {type === 'charges' ? 'Charges' : 'Instances'}
    </ChargeCountContainer>
  );
};

export default ChargeCounter;
