import React from 'react';
import { ThemeProvider } from './ThemeContext.jsx';
import { BossProvider } from './BossContext.jsx';
import { JobProvider } from './JobContext.jsx';
import { MitigationProvider } from './MitigationContext.jsx';
import { FilterProvider } from './FilterContext.jsx';
import BossContext from './BossContext.jsx';
import JobContext from './JobContext.jsx';

/**
 * Combined provider component for all contexts
 * This allows us to nest all providers in a single component
 */
const AppProvider = ({ children }) => {
  return (
    <ThemeProvider>
      <BossProvider>
        <JobProvider>
          {/* MitigationProvider needs access to boss actions, level, and selected jobs */}
          <BossContext.Consumer>
            {({ currentBossActions, currentBossLevel }) => (
              <JobContext.Consumer>
                {({ selectedJobs }) => (
                  <MitigationProvider
                    bossActions={currentBossActions}
                    bossLevel={currentBossLevel}
                    selectedJobs={selectedJobs}
                  >
                    <FilterProvider>
                      {children}
                    </FilterProvider>
                  </MitigationProvider>
                )}
              </JobContext.Consumer>
            )}
          </BossContext.Consumer>
        </JobProvider>
      </BossProvider>
    </ThemeProvider>
  );
};

export default AppProvider;
