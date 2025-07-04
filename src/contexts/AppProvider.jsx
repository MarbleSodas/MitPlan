import React from 'react';
import { ThemeProvider } from './ThemeContext.jsx';
import { BossProvider } from './BossContext.jsx';
import { JobProvider } from './JobContext.jsx';
import { LegacyEnhancedMitigationProvider } from './EnhancedMitigationContext.jsx';
import { FilterProvider } from './FilterContext.jsx';
import { TankPositionProvider } from './TankPositionContext.jsx';
import { TankSelectionModalProvider } from './TankSelectionModalContext.jsx';
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
          <TankPositionProvider>
            {/* EnhancedMitigationProvider automatically gets data from other contexts */}
            <LegacyEnhancedMitigationProvider>
              <FilterProvider>
                <TankSelectionModalProvider>
                  {children}
                </TankSelectionModalProvider>
              </FilterProvider>
            </LegacyEnhancedMitigationProvider>
          </TankPositionProvider>
        </JobProvider>
      </BossProvider>
    </ThemeProvider>
  );
};

export default AppProvider;
