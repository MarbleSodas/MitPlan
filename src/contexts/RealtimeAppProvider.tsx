import React from 'react';
import { RealtimePlanProvider } from './RealtimePlanContext';
import { RealtimeBossProvider } from './RealtimeBossContext';
import { RealtimeJobProvider } from './RealtimeJobContext';
import { EnhancedMitigationProvider } from './EnhancedMitigationContext';
import { TankPositionProvider } from './TankPositionContext';
import { FilterProvider } from './FilterContext';
import { TankSelectionModalProvider } from './TankSelectionModalContext';
import { CollaborationProvider } from './CollaborationContext';
import { ClassSelectionModalProvider } from './ClassSelectionModalContext';
import { PresenceProvider } from './PresenceContext';
import { UserJobAssignmentProvider } from './UserJobAssignmentContext';

/**
 * Real-time App Provider that wraps all the real-time contexts
 * This replaces the regular AppProvider when using real-time collaboration
 * Now uses the Enhanced Mitigation System for improved cooldown management
 * Includes PresenceProvider for real-time element selection tracking
 */
export const RealtimeAppProvider = ({ children, planId, readOnly = false, enableCollaboration = !readOnly }) => {
  const appTree = (
    <RealtimePlanProvider planId={planId} readOnly={readOnly}>
      <RealtimeBossProvider>
        <RealtimeJobProvider>
          <TankPositionProvider>
            {enableCollaboration ? (
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
            ) : (
              <EnhancedMitigationProvider>
                <FilterProvider>
                  <ClassSelectionModalProvider>
                    <TankSelectionModalProvider>
                      {children}
                    </TankSelectionModalProvider>
                  </ClassSelectionModalProvider>
                </FilterProvider>
              </EnhancedMitigationProvider>
            )}
          </TankPositionProvider>
        </RealtimeJobProvider>
      </RealtimeBossProvider>
    </RealtimePlanProvider>
  );

  return (
      <CollaborationProvider enabled={enableCollaboration}>
      {enableCollaboration ? (
        <PresenceProvider roomId={planId}>
          {appTree}
        </PresenceProvider>
      ) : (
        appTree
      )}
    </CollaborationProvider>
  );
};

export default RealtimeAppProvider;
