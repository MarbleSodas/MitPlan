import React from 'react';
import { RealtimePlanProvider } from './RealtimePlanContext';
import { RealtimeBossProvider } from './RealtimeBossContext';
import { RealtimeJobProvider } from './RealtimeJobContext';
import { EnhancedMitigationProvider } from './EnhancedMitigationContext';
import { TankPositionProvider } from './TankPositionContext';
import { FilterProvider } from './FilterContext';
import { TankSelectionModalProvider } from './TankSelectionModalContext';
import { CollaborationProvider } from './CollaborationContext';

/**
 * Real-time App Provider that wraps all the real-time contexts
 * This replaces the regular AppProvider when using real-time collaboration
 * Now uses the Enhanced Mitigation System for improved cooldown management
 */
export const RealtimeAppProvider = ({ children, planId }) => {
  return (
    <CollaborationProvider>
      <RealtimePlanProvider planId={planId}>
        <RealtimeBossProvider>
          <RealtimeJobProvider>
            <TankPositionProvider>
              <EnhancedMitigationProvider>
                <FilterProvider>
                  <TankSelectionModalProvider>
                    {children}
                  </TankSelectionModalProvider>
                </FilterProvider>
              </EnhancedMitigationProvider>
            </TankPositionProvider>
          </RealtimeJobProvider>
        </RealtimeBossProvider>
      </RealtimePlanProvider>
    </CollaborationProvider>
  );
};

export default RealtimeAppProvider;
