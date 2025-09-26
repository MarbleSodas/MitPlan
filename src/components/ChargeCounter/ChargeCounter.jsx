import React, { useState, useEffect, useRef } from 'react';
import { useEnhancedMitigation } from '../../contexts/EnhancedMitigationContext';
import { useTheme } from '../../contexts/ThemeContext';

const ChargeCounter = ({
  mitigationId,
  bossActionId,
  type = 'charges',
  totalCount,
  availableCount,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  const { checkAbilityAvailability, pendingAssignments, currentBossActions } = useEnhancedMitigation();

  const [isFlashing, setIsFlashing] = useState(false);
  const prevAvailableRef = useRef();

  let total = totalCount || 1;
  let available = availableCount;

  if (available === undefined || totalCount === undefined) {
    const bossAction = bossActionId ? currentBossActions?.find((action) => action.id === bossActionId) : null;
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

  useEffect(() => {
    if (prevAvailableRef.current !== undefined && prevAvailableRef.current !== available) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 500);
      return () => clearTimeout(timer);
    }
    prevAvailableRef.current = available;
  }, [available, pendingAssignments]);

  const bg = available === 0 ? (colors.error || '#ff5555') : (colors.primary);

  return (
    <span
      data-mitigation-id={mitigationId}
      data-charge-type={type}
      className={`inline-block px-1.5 py-[2px] rounded-[10px] ml-1 text-[0.8rem] font-bold transition-all relative ${isFlashing ? 'animate-[flash]' : ''} text-white`}
      style={{ backgroundColor: bg, opacity: available === 0 ? 0.8 : 1 }}
    >
      {available}/{total} {type === 'charges' ? 'Charges' : 'Instances'}
    </span>
  );
};

export default ChargeCounter;
