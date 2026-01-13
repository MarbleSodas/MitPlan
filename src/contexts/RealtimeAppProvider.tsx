import React from 'react';
import { RealtimePlanProvider } from './RealtimePlanContext';
import { RealtimeBossProvider } from './RealtimeBossContext';
import { RealtimeJobProvider } from './RealtimeJobContext';
import { EnhancedMitigationProvider } from './EnhancedMitigationContext';
import { TankPositionProvider } from './TankPositionContext';
import { FilterProvider } from './FilterContext';
import { TankSelectionModalProvider } from './TankSelectionModalContext';
import { CollaborationProvider } from './CollaborationContext';
import { ClassSelectionModalProvider } from './ClassSelectionModalContext.jsx';
import { PresenceProvider } from './PresenceContext';
import { UserJobAssignmentProvider } from './UserJobAssignmentContext';

/**
 * Real-time App Provider that wraps all the real-time contexts
 * This replaces the regular AppProvider when using real-time collaboration
 * Now uses the Enhanced Mitigation System for improved cooldown management
 * Includes PresenceProvider for real-time element selection tracking
 */
export const RealtimeAppProvider = ({ children, planId }) => {
  return (
    <CollaborationProvider>
      <PresenceProvider planId={planId}>
        <RealtimePlanProvider planId={planId}>
          <RealtimeBossProvider>
            <RealtimeJobProvider>
              <TankPositionProvider>
                <UserJobAssignmentProvider>
                  <EnhancedMitigationProvider>
                    <FilterProvider>
                      <ClassSelectionModalProvider>
                        <TankSelectionModalProvider>
                          {children}
                        </TankSelectionModalProvider>
                      </ClassSelectionModalProvider>
                    </FilterProvider>
                  </EnhancedMitigationProvider>
                </UserJobAssignmentProvider>
              </TankPositionProvider>
            </RealtimeJobProvider>
          </RealtimeBossProvider>
        </RealtimePlanProvider>
      </PresenceProvider>
    </CollaborationProvider>
  );
};

export default RealtimeAppProvider;
