import React from 'react';
import { ThemeProvider } from './ThemeContext.jsx';
import { BossProvider } from './BossContext.jsx';
import { JobProvider } from './JobContext.jsx';
import { MitigationProvider } from './MitigationContext.jsx';
import { ChargeCountProvider } from './ChargeCountContext.jsx';
import { FilterProvider } from './FilterContext.jsx';
import { AetherflowProvider } from './AetherflowContext.jsx';
import { TankPositionProvider } from './TankPositionContext.jsx';
import BossContext from './BossContext.jsx';
import JobContext from './JobContext.jsx';
import MitigationContext from './MitigationContext.jsx';

/**
 * Combined provider component for all contexts
 * This allows us to nest all providers in a single component
 */
const AppProvider = ({ children }) => {
  return (
    <ThemeProvider>
      <BossProvider>
        <JobProvider>
          <TankPositionProvider>
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
                      <MitigationContext.Consumer>
                        {({ assignments }) => (
                          <ChargeCountProvider
                            bossActions={currentBossActions}
                            bossLevel={currentBossLevel}
                            selectedJobs={selectedJobs}
                            assignments={assignments}
                          >
                            <AetherflowProvider>
                              <FilterProvider>
                                {children}
                              </FilterProvider>
                            </AetherflowProvider>
                          </ChargeCountProvider>
                        )}
                      </MitigationContext.Consumer>
                    </MitigationProvider>
                  )}
                </JobContext.Consumer>
              )}
            </BossContext.Consumer>
          </TankPositionProvider>
        </JobProvider>
      </BossProvider>
    </ThemeProvider>
  );
};

export default AppProvider;
