import React from 'react';
import { ThemeProvider } from './ThemeContext.jsx';
import { BossProvider } from './BossContext.jsx';
import { JobProvider } from './JobContext.jsx';
import { MitigationProvider } from './MitigationContext.jsx';
import BossContext from './BossContext.jsx';

/**
 * Combined provider component for all contexts
 * This allows us to nest all providers in a single component
 */
const AppProvider = ({ children }) => {
  return (
    <ThemeProvider>
      <BossProvider>
        <JobProvider>
          {/* MitigationProvider needs access to boss actions and level */}
          <BossContext.Consumer>
            {({ currentBossActions, currentBossLevel }) => (
              <MitigationProvider bossActions={currentBossActions} bossLevel={currentBossLevel}>
                {children}
              </MitigationProvider>
            )}
          </BossContext.Consumer>
        </JobProvider>
      </BossProvider>
    </ThemeProvider>
  );
};

export default AppProvider;
