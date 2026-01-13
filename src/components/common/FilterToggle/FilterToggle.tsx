import React from 'react';
import { useFilterContext } from '../../../contexts';
import { useUserJobAssignmentOptional } from '../../../contexts/UserJobAssignmentContext';
import Tooltip from '../Tooltip/Tooltip';

const FilterToggle = () => {
  const { showAllMitigations, toggleFilterMode, showOnlyMyAbilities, toggleMyAbilitiesFilter } = useFilterContext();
  const jobAssignment = useUserJobAssignmentOptional();
  const checked = !showAllMitigations;

  const tooltipText = showAllMitigations ? 'Showing all mitigations' : 'Showing only relevant mitigations for each boss action';
  const myAbilitiesTooltip = showOnlyMyAbilities 
    ? 'Showing only abilities your assigned job can cast' 
    : 'Showing all available abilities';

  const hasJobAssigned = !!jobAssignment?.myAssignedJob;

  return (
    <div className="flex items-center gap-3">
      <Tooltip content={tooltipText}>
        <div className="flex items-center rounded-md shadow-sm px-3 py-2 bg-card border border-border">
          <span className="mr-2 whitespace-nowrap text-sm font-medium text-foreground">
            Filter Mitigations:
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={checked} onChange={toggleFilterMode} />
            <div className="w-11 h-6 bg-muted-foreground/30 dark:bg-muted-foreground/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </Tooltip>

      {hasJobAssigned && (
        <Tooltip content={myAbilitiesTooltip}>
          <div className="flex items-center rounded-md shadow-sm px-3 py-2 bg-card border border-border">
            <span className="mr-2 whitespace-nowrap text-sm font-medium text-foreground">
              My Abilities:
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={showOnlyMyAbilities} 
                onChange={toggleMyAbilitiesFilter} 
              />
              <div className="w-11 h-6 bg-muted-foreground/30 dark:bg-muted-foreground/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </Tooltip>
      )}
    </div>
  );
};

export default FilterToggle;
