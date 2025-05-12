import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useChargeCountContext } from '../../contexts/ChargeCountContext';

// Styled component for charge count display
const ChargeCountContainer = styled.span`
  display: inline-block;
  padding: 1px 5px;
  border-radius: 10px;
  background-color: ${props => props.available === 0 ?
    props.theme.colors.error || '#ff5555' :
    props.theme.colors.primary};
  color: ${props => props.theme.colors.buttonText};
  font-weight: bold;
  margin-left: 4px;
  font-size: 0.8rem;
  opacity: ${props => props.available === 0 ? 0.8 : 1};
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
    getChargeCount, 
    getInstanceCount, 
    hasPendingAssignment 
  } = useChargeCountContext();
  
  // Local state for animation
  const [isFlashing, setIsFlashing] = useState(false);
  
  // Get the appropriate count based on the type
  let count;
  if (type === 'charges') {
    count = getChargeCount(mitigationId);
  } else {
    count = getInstanceCount(mitigationId);
  }
  
  // Use provided counts if available, otherwise use context counts
  const total = totalCount || (count ? (type === 'charges' ? count.totalCharges : count.totalInstances) : 1);
  let available = availableCount;
  
  // If available count is not provided, use context count
  if (available === undefined) {
    available = count ? (type === 'charges' ? count.availableCharges : count.availableInstances) : 0;
  }
  
  // Check if there's a pending assignment for this mitigation and boss action
  const isPending = bossActionId && hasPendingAssignment(bossActionId, mitigationId);
  
  // If there's a pending assignment, decrement the available count
  if (isPending) {
    available = Math.max(0, available - 1);
  }
  
  // Flash effect when the count changes
  useEffect(() => {
    setIsFlashing(true);
    const timer = setTimeout(() => {
      setIsFlashing(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [available]);
  
  return (
    <ChargeCountContainer 
      available={available}
      data-mitigation-id={mitigationId}
      data-charge-type={type}
      className={isFlashing ? 'flash-update' : ''}
    >
      {available}/{total} {type === 'charges' ? 'Charges' : 'Instances'}
    </ChargeCountContainer>
  );
};

export default ChargeCounter;
