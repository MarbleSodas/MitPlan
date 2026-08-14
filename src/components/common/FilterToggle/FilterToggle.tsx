import React from 'react';
import { useFilterContext } from '../../../contexts';
import { useUserJobAssignmentOptional } from '../../../contexts/UserJobAssignmentContext';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

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
    <div className="flex flex-wrap items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center rounded-md shadow-sm px-2 sm:px-3 py-2 bg-card border border-border">
            <span className="mr-2 whitespace-nowrap text-sm font-medium text-foreground hidden sm:inline">
              Filter Mitigations:
            </span>
            <span className="mr-2 whitespace-nowrap text-sm font-medium text-foreground sm:hidden">
              Filter:
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={checked} onChange={toggleFilterMode} />
              <div className="peer h-6 w-11 rounded-full bg-muted-foreground/30 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-background after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 dark:bg-muted-foreground/40"></div>
            </label>
          </div>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>

      {hasJobAssigned && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center rounded-md shadow-sm px-2 sm:px-3 py-2 bg-card border border-border">
              <span className="mr-2 whitespace-nowrap text-sm font-medium text-foreground hidden sm:inline">
                My Abilities:
              </span>
              <span className="mr-2 whitespace-nowrap text-sm font-medium text-foreground sm:hidden">
                Mine:
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={showOnlyMyAbilities} 
                  onChange={toggleMyAbilitiesFilter} 
                />
                <div className="peer h-6 w-11 rounded-full bg-muted-foreground/30 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-background after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 dark:bg-muted-foreground/40"></div>
              </label>
            </div>
          </TooltipTrigger>
          <TooltipContent>{myAbilitiesTooltip}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};

export default FilterToggle;
