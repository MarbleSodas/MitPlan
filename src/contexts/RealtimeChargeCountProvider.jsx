import React from 'react';
import { ChargeCountProvider } from './ChargeCountContext';
import { useRealtimeBossContext } from './RealtimeBossContext';
import { useRealtimeJobContext } from './RealtimeJobContext';
import { useRealtimeMitigationContext } from './RealtimeMitigationContext';

/**
 * Wrapper component that provides real-time data to the ChargeCountProvider
 */
export const RealtimeChargeCountProvider = ({ children }) => {
  const { sortedBossActions, currentBossLevel } = useRealtimeBossContext();
  const { selectedJobs } = useRealtimeJobContext();
  const { assignments } = useRealtimeMitigationContext();

  return (
    <ChargeCountProvider
      bossActions={sortedBossActions}
      bossLevel={currentBossLevel}
      selectedJobs={selectedJobs}
      assignments={assignments}
    >
      {children}
    </ChargeCountProvider>
  );
};

export default RealtimeChargeCountProvider;
